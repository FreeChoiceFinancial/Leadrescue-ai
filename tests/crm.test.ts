import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_CALLER_PHONE, demoTenant } from "@/lib/demo/tenant";
import { blankWorkspace } from "@/lib/engine/workspace";
import { crmTokenKey, decryptSecret, encryptSecret, readCrmState, signCrmState } from "@/lib/crm/crypto";
import { disconnectCrm } from "@/lib/crm/disconnect";
import { executeLiveJob, type LiveCrmContext } from "@/lib/crm/execute";
import { hubspotUpsertContact } from "@/lib/crm/hubspot";
import { jobRowsFromState, linksFromRows, queueStateFromRows } from "@/lib/crm/jobs";
import { crmStageForLead, defaultFieldMapping, sanitizeFieldMapping } from "@/lib/crm/mapping";
import { CRM_PLAN_LINE, CRM_SANDBOX_LABEL, crmLiveEnabled } from "@/lib/crm/mode";
import { HUBSPOT_SCOPES, ZOHO_ACCOUNTS, ZOHO_APIS, connectDecision, exchangeHubSpotCode, hubspotAuthorizeUrl, refreshZohoToken, zohoAuthorizeUrl } from "@/lib/crm/oauth";
import { idempotencyKey, planCrmJobs, type PlannedCrmJob } from "@/lib/crm/plan";
import { backoffMs, runCrmQueue } from "@/lib/crm/queue";
import { redactCrmText } from "@/lib/crm/redact";
import { snapshotLead } from "@/lib/crm/snapshot";
import { noteCrmSync } from "@/lib/crm/sync";
import { zohoUpsertRecord } from "@/lib/crm/zoho";
import type { Appointment, Lead, Message, Workspace } from "@/lib/domain/types";
import { FAQS } from "@/lib/marketing/faq";

const PHONE = DEMO_CALLER_PHONE;
const REFRESH = "refresh-secret";
const NOTE = "AC is out at the fictional shop";
const LEAD_ID = "22222222-2222-4222-8222-222222222222";
const KEY = Buffer.alloc(32, 9);

function lead(status: Lead["status"]): Lead {
  return {
    id: LEAD_ID,
    tenantId: demoTenant().id,
    phone: PHONE,
    displayName: "Riley Caller",
    service: "repair",
    status,
    source: "missed_call",
    optedOut: false,
    followUpPermission: false,
    followUpAsked: false,
    followUpCount: 0,
    nextFollowUpAt: null,
    emergency: false,
    frustrated: false,
    pendingQuestion: null,
    qualifying: { customerName: "Riley Caller" },
    firstInboundAt: "2026-06-15T18:00:00.000Z",
    firstOutboundAt: "2026-06-15T18:01:00.000Z",
    recovered: status === "booked",
    createdAt: "2026-06-15T18:00:00.000Z",
    updatedAt: "2026-06-15T18:05:00.000Z",
  };
}

function workspace(status: Lead["status"] = "booked"): Workspace {
  const tenant = demoTenant();
  const base = blankWorkspace(tenant);
  const message: Message = {
    id: "33333333-3333-4333-8333-333333333333",
    tenantId: tenant.id,
    conversationId: "44444444-4444-4444-8444-444444444444",
    leadId: LEAD_ID,
    direction: "inbound",
    body: NOTE,
    delivery: "received",
    sendAfter: null,
    createdAt: "2026-06-15T18:02:00.000Z",
  };
  const appointment: Appointment = {
    id: "55555555-5555-4555-8555-555555555555",
    tenantId: tenant.id,
    leadId: LEAD_ID,
    conversationId: message.conversationId,
    startsAt: "2026-06-16T15:00:00.000Z",
    endsAt: "2026-06-16T17:00:00.000Z",
    service: "repair",
    status: "booked",
    provider: "demo",
    providerMode: "sandbox",
    externalEventId: null,
    customerName: "Riley Caller",
    createdAt: "2026-06-15T18:05:00.000Z",
  };
  return { ...base, leads: [lead(status)], messages: [message], appointments: status === "booked" ? [appointment] : [] };
}

function silence() {
  return (["log", "info", "warn", "error", "debug"] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
}

function logged(spies: Array<ReturnType<typeof vi.spyOn>>): string {
  return spies.flatMap((spy) => spy.mock.calls).join(" ");
}

afterEach(() => {
  delete process.env.CRM_LIVE;
  delete process.env.DEMO_MODE;
  delete process.env.PUBLIC_DEMO;
  delete process.env.CRM_TOKEN_KEY;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CRM sandbox gate", () => {
  it("stays off unless CRM_LIVE is exactly true and demo mode is off", () => {
    expect(crmLiveEnabled()).toBe(false);
    expect(CRM_SANDBOX_LABEL).toBe("Coming soon / sandbox");
    expect(CRM_PLAN_LINE).toBe("HubSpot and Zoho CRM, coming soon.");
    process.env.CRM_LIVE = "true";
    expect(crmLiveEnabled()).toBe(true);
    process.env.DEMO_MODE = "true";
    expect(crmLiveEnabled()).toBe(false);
    delete process.env.DEMO_MODE;
    process.env.PUBLIC_DEMO = "yes";
    expect(crmLiveEnabled()).toBe(false);
    expect(connectDecision("https://app.hubspot.com/oauth/authorize")).toMatchObject({ mode: "sandbox", redirect: null, label: CRM_SANDBOX_LABEL });
    delete process.env.PUBLIC_DEMO;
    expect(connectDecision("https://app.hubspot.com/oauth/authorize").mode).toBe("live");
  });

  it("does not call the network or log the caller when the flag is off", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const spies = silence();
    await noteCrmSync(workspace());
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logged(spies)).not.toContain(PHONE);
    expect(logged(spies)).not.toContain(REFRESH);
  });

  it("describes HubSpot and Zoho as coming soon on every plan", () => {
    const example = readFileSync(".env.example", "utf8");
    for (const name of ["CRM_LIVE", "CRM_TOKEN_KEY", "HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET", "ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET"]) {
      expect(example).toMatch(new RegExp(`^${name}=$`, "m"));
    }
    expect(example).not.toMatch(/HUBSPOT_CLIENT_SECRET=.+/);
    expect(example).not.toMatch(/ZOHO_CLIENT_SECRET=.+/);
    const faq = FAQS.find((item) => item.q === "Do HubSpot and Zoho come with every plan?");
    expect(faq?.a.startsWith("Coming soon.")).toBe(true);
    expect(faq?.a).toContain("Starter, Growth, and Premium");
    expect(faq?.a).toContain("does not claim a live sync");
  });
});

describe("CRM tokens and OAuth", () => {
  it("encrypts refresh tokens and rejects a tampered or expired state", () => {
    expect(crmTokenKey()).toBeNull();
    process.env.CRM_TOKEN_KEY = Buffer.alloc(16).toString("base64");
    expect(crmTokenKey()).toBeNull();
    process.env.CRM_TOKEN_KEY = KEY.toString("base64");
    expect(crmTokenKey()?.equals(KEY)).toBe(true);
    const packed = encryptSecret(REFRESH, KEY);
    expect(packed.startsWith("v1.")).toBe(true);
    expect(packed).not.toContain(REFRESH);
    expect(decryptSecret(packed, KEY)).toBe(REFRESH);
    expect(() => decryptSecret(packed, Buffer.alloc(32, 1))).toThrow(/could not be read/);
    const state = signCrmState({ tenantId: demoTenant().id, provider: "zoho", region: "eu", exp: 5_000 }, KEY);
    expect(readCrmState(state, KEY, 4_000)?.region).toBe("eu");
    expect(readCrmState(state, KEY, 5_000)).toBeNull();
    expect(readCrmState(`${state}x`, KEY, 1)).toBeNull();
  });

  it("builds HubSpot and region-aware Zoho authorize URLs", () => {
    const hubspot = new URL(hubspotAuthorizeUrl({ clientId: "hub-client", redirectUri: "https://app.example/api/crm/hubspot/callback", state: "signed" }));
    expect(hubspot.origin).toBe("https://app.hubspot.com");
    expect(hubspot.searchParams.get("scope")?.split(" ")).toEqual([...HUBSPOT_SCOPES]);
    for (const region of ["com", "eu", "in", "com.au"] as const) {
      const zoho = new URL(zohoAuthorizeUrl({ clientId: "zoho-client", redirectUri: "https://app.example/api/crm/zoho/callback", state: "signed", region }));
      expect(zoho.origin).toBe(ZOHO_ACCOUNTS[region]);
      expect(ZOHO_APIS[region]).toMatch(/^https:\/\/www\.zohoapis\./);
      expect(zoho.searchParams.get("access_type")).toBe("offline");
      expect(zoho.searchParams.get("scope")).toContain("ZohoCRM.modules.contacts.ALL");
      expect(zoho.searchParams.get("scope")).toContain("ZohoCRM.modules.deals.ALL");
      expect(zoho.searchParams.get("scope")).toContain("ZohoCRM.modules.leads.ALL");
      expect(zoho.searchParams.get("scope")).toContain("ZohoCRM.modules.notes.ALL");
    }
    expect(ZOHO_ACCOUNTS["com.au"]).toBe("https://accounts.zoho.com.au");
    expect(ZOHO_APIS["com.au"]).toBe("https://www.zohoapis.com.au");
  });

  it("refreshes tokens without logging them", async () => {
    const spies = silence();
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ access_token: "access-new", expires_in: 1800 }), { status: 200 }));
    const tokens = await refreshZohoToken({ refreshToken: REFRESH, clientId: "id", clientSecret: "secret", region: "in" }, fetchImpl);
    expect(tokens.refreshToken).toBe(REFRESH);
    expect(tokens.accessToken).toBe("access-new");
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url.startsWith("https://accounts.zoho.in/oauth/v2/token")).toBe(true);
    expect(logged(spies)).not.toContain(REFRESH);
    expect(logged(spies)).not.toContain("secret");
    const failed = vi.fn(async () => new Response("nope", { status: 401 }));
    await expect(exchangeHubSpotCode({ code: "code", redirectUri: "https://app.example/cb", clientId: "id", clientSecret: "secret" }, failed)).rejects.toThrow("CRM request failed (401).");
  });
});

describe("CRM sync queue", () => {
  it("plans contact, deal, note, and appointment without storing the caller", () => {
    expect(crmStageForLead("new")).toBe("new");
    expect(crmStageForLead("qualifying")).toBe("qualified");
    expect(crmStageForLead("booking")).toBe("qualified");
    expect(crmStageForLead("booked")).toBe("booked");
    expect(crmStageForLead("lost")).toBe("lost");
    expect(crmStageForLead("opted_out")).toBe("lost");
    const jobs = planCrmJobs(workspace(), "hubspot");
    expect(jobs.map((job) => job.kind)).toEqual(["contact", "deal", "note", "appointment"]);
    expect(jobs.every((job) => job.stage === "booked")).toBe(true);
    const serialized = JSON.stringify(jobs);
    expect(serialized).not.toContain(PHONE);
    expect(serialized).not.toContain(NOTE);
    expect(serialized).not.toContain("Riley");
    const snapshot = snapshotLead(workspace(), LEAD_ID, "booked");
    expect(snapshot?.phone).toBe(PHONE);
    expect(snapshot?.note).toContain(NOTE);
    expect(snapshot?.appointmentAt).toBe("2026-06-16T15:00:00.000Z");
    expect(planCrmJobs(workspace("qualifying"), "zoho").some((job) => job.kind === "appointment")).toBe(false);
    const mapping = sanitizeFieldMapping("hubspot", { phone: "mobile", refresh_token: REFRESH, zohoModule: "Leads", stageBooked: " won " });
    expect(mapping.phone).toBe("mobile");
    expect(mapping.zohoModule).toBe("Leads");
    expect(mapping.stageBooked).toBe("won");
    expect(JSON.stringify(mapping)).not.toContain(REFRESH);
    expect(defaultFieldMapping("zoho").zohoModule).toBe("Deals");
  });

  it("records a sandbox attempt once and does not call the adapter again", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const jobs = planCrmJobs(workspace(), "zoho");
    const run = vi.fn();
    const first = await runCrmQueue({ jobs, state: new Map(), adapter: { mode: "sandbox", run }, now: 1_000 });
    expect(run).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(first.logs.every((entry) => entry.detail === "Not sent." && entry.status === "sandbox")).toBe(true);
    const second = await runCrmQueue({ jobs, state: first.state, adapter: { mode: "sandbox", run }, now: 2_000 });
    expect(second.logs).toHaveLength(0);
    expect(backoffMs(0)).toBe(60_000);
    expect(backoffMs(1)).toBe(120_000);
    expect(backoffMs(20)).toBe(6 * 60 * 60 * 1000);
  });

  it("retries with backoff and stops after five failures without keeping the error text", async () => {
    const jobs = [planCrmJobs(workspace(), "hubspot")[0] as PlannedCrmJob];
    const key = jobs[0]?.idempotencyKey ?? "";
    const run = vi.fn(async () => {
      throw new Error(`CRM request failed (429). ${PHONE} ${REFRESH} ${NOTE}`);
    });
    let state = new Map();
    let now = 1_000_000;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const result = await runCrmQueue({ jobs, state, adapter: { mode: "live", run }, now });
      state = result.state;
      expect(result.logs[0]?.status).toBe("retry");
      expect(result.logs[0]?.detail).toBe("Will retry.");
      const row = state.get(key);
      expect(row?.lastError).toBe("CRM request failed (429).");
      expect(row?.attempts).toBe(attempt);
      const waiting = await runCrmQueue({ jobs, state, adapter: { mode: "live", run }, now: now + 1_000 });
      expect(waiting.logs).toHaveLength(0);
      now = row?.nextAttemptAt ?? now;
    }
    const stopped = await runCrmQueue({ jobs, state, adapter: { mode: "live", run }, now });
    expect(stopped.logs[0]?.status).toBe("failed");
    expect(stopped.logs[0]?.detail).toBe("Stopped.");
    expect(JSON.stringify([...stopped.state.values()])).not.toContain(PHONE);
    expect(JSON.stringify([...stopped.state.values()])).not.toContain(REFRESH);
    expect(JSON.stringify([...stopped.state.values()])).not.toContain(NOTE);
    expect(run).toHaveBeenCalledTimes(5);
  });

  it("keeps succeeded jobs idempotent across a reloaded queue", () => {
    const job = planCrmJobs(workspace(), "hubspot")[0] as PlannedCrmJob;
    const poisoned = queueStateFromRows([
      {
        idempotency_key: job.idempotencyKey,
        lead_id: job.leadId,
        kind: job.kind,
        stage: job.stage,
        message_count: job.messageCount,
        status: "succeeded",
        attempts: 1,
        next_attempt_at: "2026-06-15T18:00:00.000Z",
        last_error: `caller ${PHONE} token ${REFRESH}`,
        external_id: "c1",
      },
    ]);
    expect(poisoned.get(job.idempotencyKey)?.lastError).toBe("CRM request failed (0).");
    const rows = jobRowsFromState({ jobs: [job], state: poisoned, nowIso: "2026-06-15T19:00:00.000Z" });
    expect(JSON.stringify(rows)).not.toContain(PHONE);
    expect(JSON.stringify(rows)).not.toContain(REFRESH);
    expect(linksFromRows("hubspot", rows).get(`hubspot:${LEAD_ID}:contact`)).toBe("c1");
    expect(idempotencyKey(job)).toBe(job.idempotencyKey);
  });
});

describe("CRM HTTP adapters", () => {
  it("upserts a HubSpot contact, deal, note, and appointment and refreshes once", async () => {
    const spies = silence();
    const calls: Array<{ url: string; method: string; body: string }> = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const href = String(url);
      const body = typeof init?.body === "string" ? init.body : "";
      calls.push({ url: href, method: init?.method ?? "GET", body });
      if (href.includes("/oauth/v1/token")) {
        return new Response(JSON.stringify({ access_token: "access-new", refresh_token: "refresh-next", expires_in: 1800 }), { status: 200 });
      }
      if (href.endsWith("/contacts/search")) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (href.endsWith("/contacts")) return new Response(JSON.stringify({ id: "c1" }), { status: 201 });
      if (href.endsWith("/deals")) return new Response(JSON.stringify({ id: "d1" }), { status: 201 });
      if (href.endsWith("/notes")) return new Response(JSON.stringify({ id: "n1" }), { status: 201 });
      if (href.endsWith("/deals/d1")) return new Response(null, { status: 204 });
      return new Response("no", { status: 500 });
    });
    const ctx: LiveCrmContext = {
      accessToken: "",
      refreshToken: REFRESH,
      expiresAt: 0,
      clientId: "hub-client",
      clientSecret: "hub-secret",
      region: "com",
      fetchImpl,
      now: () => 1_700_000_000_000,
      mapping: defaultFieldMapping("hubspot"),
      links: new Map(),
    };
    const shop = workspace();
    for (const job of planCrmJobs(shop, "hubspot")) {
      const snapshot = snapshotLead(shop, job.leadId, job.stage);
      if (!snapshot) throw new Error("missing snapshot");
      await executeLiveJob(job, snapshot, ctx);
    }
    expect(calls[0]?.url).toBe("https://api.hubapi.com/oauth/v1/token");
    expect(calls.filter((call) => call.url.includes("/oauth/"))).toHaveLength(1);
    expect(calls[1]?.body).toContain(PHONE);
    const deal = calls.find((call) => call.url.endsWith("/deals"));
    expect(deal?.body).toContain("closedwon");
    expect(deal?.body).toContain("\"associationTypeId\":3");
    const note = calls.find((call) => call.url.endsWith("/notes"));
    expect(note?.body).toContain(NOTE);
    expect(note?.body).toContain("\"associationTypeId\":202");
    const appointment = calls.find((call) => call.url.endsWith("/deals/d1"));
    expect(appointment?.body).toContain("2026-06-16T15:00:00.000Z");
    expect(logged(spies)).not.toContain(PHONE);
    expect(logged(spies)).not.toContain(REFRESH);
    expect(logged(spies)).not.toContain(NOTE);
    expect(logged(spies)).not.toContain("hub-secret");
  });

  it("patches an existing HubSpot contact found by phone", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith("/search")) return new Response(JSON.stringify({ results: [{ id: "c9" }] }), { status: 200 });
      return new Response(JSON.stringify({ id: "c9" }), { status: 200 });
    });
    const id = await hubspotUpsertContact(
      {
        accessToken: "access-still-valid",
        refreshToken: REFRESH,
        expiresAt: Date.now() + 120_000,
        clientId: "hub-client",
        clientSecret: "hub-secret",
        fetchImpl,
        now: () => Date.now(),
      },
      { phone: PHONE, email: "riley@example.com", name: "Riley", externalId: null, mapping: defaultFieldMapping("hubspot") },
    );
    expect(id).toBe("c9");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const patch = String(fetchImpl.mock.calls[1]?.[0]);
    expect(patch).toBe("https://api.hubapi.com/crm/v3/objects/contacts/c9");
  });

  it("uses the Zoho accounts and API host for the shop region and the Lead or Deal module", async () => {
    const calls: string[] = [];
    const bodies: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(url));
      bodies.push(typeof init?.body === "string" ? init.body : "");
      if (String(url).includes("/oauth/")) return new Response(JSON.stringify({ access_token: "access-new", refresh_token: REFRESH, expires_in: 1800 }), { status: 200 });
      return new Response(JSON.stringify({ data: [{ details: { id: "z1" } }] }), { status: 200 });
    });
    const base = {
      accessToken: "",
      refreshToken: REFRESH,
      expiresAt: 0,
      clientId: "zoho-client",
      clientSecret: "zoho-secret",
      fetchImpl,
      now: () => 1_700_000_000_000,
      onTokens: undefined,
    };
    const leads = sanitizeFieldMapping("zoho", { zohoModule: "Leads" });
    await zohoUpsertRecord({ ...base, region: "eu" }, { name: "Riley · repair", stage: "qualified", externalId: null, contactId: null, mapping: leads });
    expect(calls[0]).toBe("https://accounts.zoho.eu/oauth/v2/token");
    expect(calls[1]).toBe("https://www.zohoapis.eu/crm/v2/Leads/upsert");
    expect(bodies[1]).toContain("\"Lead_Status\":\"Needs Analysis\"");
    const deals = defaultFieldMapping("zoho");
    await zohoUpsertRecord(
      { ...base, region: "com.au", accessToken: "access-new", expiresAt: Date.now() + 120_000 },
      { name: "Riley · repair", stage: "booked", externalId: null, contactId: "contact-1", mapping: deals },
    );
    expect(calls.at(-1)).toBe("https://www.zohoapis.com.au/crm/v2/Deals/upsert");
    expect(bodies.at(-1)).toContain("\"Stage\":\"Closed Won\"");
    expect(bodies.at(-1)).toContain("\"Contact_Name\":{\"id\":\"contact-1\"}");
    expect(redactCrmText(`mail riley@example.com phone ${PHONE} Bearer abc.def refresh_token=${REFRESH}`)).not.toContain(PHONE);
    expect(redactCrmText(`mail riley@example.com phone ${PHONE} Bearer abc.def refresh_token=${REFRESH}`)).not.toContain(REFRESH);
  });

  it("revokes a live connection and does nothing in sandbox", async () => {
    const spies = silence();
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));
    const sandboxed = await disconnectCrm({ provider: "hubspot", refreshToken: REFRESH, region: "com", fetchImpl });
    expect(sandboxed).toEqual({ revoked: false, mode: "sandbox", detail: CRM_SANDBOX_LABEL });
    expect(fetchImpl).not.toHaveBeenCalled();
    process.env.CRM_LIVE = "true";
    const hubspot = await disconnectCrm({ provider: "hubspot", refreshToken: REFRESH, region: null, fetchImpl });
    expect(hubspot).toEqual({ revoked: true, mode: "live", detail: "Tokens cleared." });
    expect(String(fetchImpl.mock.calls[0]?.[0]).startsWith("https://api.hubapi.com/oauth/v1/refresh-tokens/")).toBe(true);
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("DELETE");
    const zoho = await disconnectCrm({ provider: "zoho", refreshToken: REFRESH, region: "com.au", fetchImpl });
    expect(zoho.revoked).toBe(true);
    const revokeUrl = new URL(String(fetchImpl.mock.calls[1]?.[0]));
    expect(revokeUrl.origin).toBe("https://accounts.zoho.com.au");
    expect(revokeUrl.pathname).toBe("/oauth/v2/token/revoke");
    expect(revokeUrl.searchParams.get("token")).toBe(REFRESH);
    expect(logged(spies)).not.toContain(REFRESH);
    expect(logged(spies)).not.toContain(PHONE);
  });
});
