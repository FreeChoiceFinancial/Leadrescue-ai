import { describe, expect, it } from "vitest";
import { demoTenant } from "@/lib/demo/tenant";
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
  it("rejects unsigned Twilio webhooks when credentials are absent", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    const response = await handleVoiceWebhook(
      formRequest("/api/twilio/voice", { From: "+15125550148", To: "+15125551001", CallSid: "CA1" }, { "x-leadrescue-sandbox": "0" }),
    );
    expect(response.status).toBe(503);
  });

  it("texts back for a missed call and keeps the other tenant untouched", async () => {
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
