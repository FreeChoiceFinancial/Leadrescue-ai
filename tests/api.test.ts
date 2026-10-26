import { afterEach, describe, expect, it, vi } from "vitest";
import { planFromStripePrice, stripePriceId } from "@/lib/billing/plans";
import { demoTenant } from "@/lib/demo/tenant";
import { createCheckoutSession } from "@/lib/integrations/stripe";
import { handleFollowUpCron, handleSmsWebhook, handleStripeWebhook, handleVoiceWebhook, handleWeeklyReportCron } from "@/lib/http/webhooks";
import { blankWorkspace } from "@/lib/engine/workspace";
import { createMemoryStore } from "@/lib/store/memory";

const tenantA = {
  ...demoTenant(),
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  name: "Northwind HVAC",
  slug: "northwind",
  smsFromNumber: "+15125551001",
};
const tenantB = {
  ...demoTenant(),
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
  name: "Southwind HVAC",
  slug: "southwind",
  smsFromNumber: "+15125551002",
};

function formRequest(path: string, fields: Record<string, string>, headers: Record<string, string> = {}) {
  const body = new URLSearchParams(fields);
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "x-leadrescue-sandbox": "1", ...headers },
    body,
  });
}

describe("webhook routes", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects unsigned Twilio webhooks when credentials are absent", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    const response = await handleVoiceWebhook(
      formRequest("/api/twilio/voice", { From: "+15125550148", To: "+15125551001", CallSid: "CA1" }, { "x-leadrescue-sandbox": "0" }),
    );
    expect(response.status).toBe(503);
  });

  it("texts back for a missed call and keeps the other tenant untouched", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T18:00:00Z"));
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.OPENAI_API_KEY;
    const store = createMemoryStore([blankWorkspace(tenantA), blankWorkspace(tenantB)]);
    const response = await handleVoiceWebhook(
      formRequest("/api/twilio/voice", { From: "+15125550148", To: "+15125551001", CallSid: "CA1", CallStatus: "ringing" }),
      store,
    );
    expect(response.status).toBe(200);
    const xml = await response.text();
    expect(xml).toContain("Northwind HVAC");
    expect(xml).not.toContain("Southwind HVAC");
    const north = await store.getById(tenantA.id);
    const south = await store.getById(tenantB.id);
    expect(north?.leads).toHaveLength(1);
    expect(north?.messages[0]?.body).toContain("Reply STOP to opt out");
    expect(north?.messages[0]?.delivery).toBe("sandbox_not_sent");
    expect(south?.leads).toHaveLength(0);

    const sms = await handleSmsWebhook(
      formRequest("/api/twilio/sms", { From: "+15125550148", To: "+15125551001", Body: "STOP", MessageSid: "SM1" }),
      store,
    );
    expect(sms.status).toBe(200);
    const after = await store.getById(tenantA.id);
    expect(after?.leads[0]?.optedOut).toBe(true);
    expect(after?.consentEvents.some((event) => event.eventType === "stop")).toBe(true);
    expect((await store.getById(tenantB.id))?.leads).toHaveLength(0);
  });

  it("checks out in sandbox and refuses live Stripe keys without creating products", async () => {
    const keys = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_STARTER", "STRIPE_PRICE_STARTER_ANNUAL"] as const;
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    delete process.env.STRIPE_SECRET_KEY;
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    try {
      const sandbox = await createCheckoutSession({
        plan: "starter",
        interval: "year",
        tenantId: tenantA.id,
        customerId: null,
        setupFeePaid: false,
        successUrl: "http://localhost/ok",
        cancelUrl: "http://localhost/cancel",
      });
      expect(sandbox).toEqual({ mode: "sandbox", url: "/dashboard/billing?sandbox_checkout=starter&interval=year" });
      expect(fetchImpl).not.toHaveBeenCalled();

      process.env.STRIPE_SECRET_KEY = "sk_live_should_not_create_products";
      await expect(
        createCheckoutSession({
          plan: "growth",
          interval: "year",
          tenantId: tenantA.id,
          customerId: null,
          setupFeePaid: false,
          successUrl: "http://localhost/ok",
          cancelUrl: "http://localhost/cancel",
        }),
      ).rejects.toThrow(/live Stripe secret/);
      expect(fetchImpl).not.toHaveBeenCalled();

      process.env.STRIPE_SECRET_KEY = "sk_test_example";
      delete process.env.STRIPE_PRICE_STARTER_ANNUAL;
      await expect(
        createCheckoutSession({
          plan: "starter",
          interval: "year",
          tenantId: tenantA.id,
          customerId: null,
          setupFeePaid: false,
          successUrl: "http://localhost/ok",
          cancelUrl: "http://localhost/cancel",
        }),
      ).rejects.toThrow(/test price id/);
      expect(fetchImpl).not.toHaveBeenCalled();

      process.env.STRIPE_PRICE_STARTER = "price_month";
      process.env.STRIPE_PRICE_STARTER_ANNUAL = "price_year";
      expect(stripePriceId("starter", "year")).toBe("price_year");
      expect(planFromStripePrice("price_year")).toBe("starter");
      expect(planFromStripePrice("price_month")).toBe("starter");
    } finally {
      vi.unstubAllGlobals();
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });

  it("accepts a labeled sandbox Stripe event and refuses a live-looking key", async () => {
    const workspace = blankWorkspace({ ...tenantA, stripeCustomerId: "cus_sandbox" });
    const store = createMemoryStore([workspace]);
    delete process.env.STRIPE_SECRET_KEY;
    const response = await handleStripeWebhook(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-leadrescue-sandbox": "1" },
        body: JSON.stringify({
          sandbox: true,
          type: "customer.subscription.updated",
          data: {
            object: {
              id: "sub_sandbox",
              customer: "cus_sandbox",
              status: "active",
              metadata: { tenant_id: tenantA.id, plan: "premium" },
            },
          },
        }),
      }),
      store,
    );
    expect(response.status).toBe(200);
    const saved = await store.getById(tenantA.id);
    expect(saved?.tenant.plan).toBe("premium");
    expect(saved?.tenant.conversationAllowance).toBe(1000);
    expect(saved?.tenant.subscriptionStatus).toBe("active");

    process.env.STRIPE_SECRET_KEY = "sk_live_should_not_be_used";
    const refused = await handleStripeWebhook(
      new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }),
      store,
    );
    expect(refused.status).toBe(400);
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("requires a cron secret and writes a weekly report in sandbox", async () => {
    delete process.env.CRON_SECRET;
    const store = createMemoryStore([blankWorkspace(tenantA)]);
    const denied = await handleFollowUpCron(
      new Request("http://localhost/api/cron/follow-ups", { method: "POST" }),
      store,
    );
    expect(denied.status).toBe(401);
    const report = await handleWeeklyReportCron(
      new Request("http://localhost/api/cron/weekly-report", {
        method: "POST",
        headers: { "x-leadrescue-sandbox": "1" },
      }),
      store,
      new Date("2026-10-26T15:00:00.000Z"),
    );
    expect(report.status).toBe(200);
    const saved = await store.getById(tenantA.id);
    expect(saved?.reports).toHaveLength(1);
    expect(saved?.reports[0]?.metrics.leadsHandled).toBe(0);
  });
});
