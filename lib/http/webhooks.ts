import { planFromStripePrice } from "@/lib/billing/plans";
import { applySubscriptionSnapshot, snapshotFromStripeEvent, type StripeEvent } from "@/lib/billing/stripe-events";
import { createAvailabilityProvider } from "@/lib/booking/google-provider";
import { normalizePhone } from "@/lib/domain/phone";
import type { Workspace } from "@/lib/domain/types";
import { handleInbound, handleMissedCall, runDueWork, type EngineRuntime } from "@/lib/engine/handle";
import { deliverEffects } from "@/lib/integrations/notify";
import { cronAuthorized, sandboxWebhookAllowed } from "@/lib/integrations/status";
import { stripeMode, validStripeSignature } from "@/lib/integrations/stripe";
import { twilioConfigured, validTwilioSignature } from "@/lib/integrations/twilio";
import { buildWeeklyMetrics, startOfWeek } from "@/lib/reports/weekly";
import { deliveryForTenant, getStore } from "@/lib/store/index";
import type { LeadStore } from "@/lib/store/types";

function xml(say: string): Response {
  const safe = say.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${safe}</Say><Hangup/></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } },
  );
}

function emptyTwiml(): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

async function readForm(request: Request): Promise<Record<string, string>> {
  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }
  return params;
}

function runtimeFor(workspace: Workspace): EngineRuntime {
  const provider = createAvailabilityProvider(workspace.tenant);
  return {
    channel: "sms",
    delivery: deliveryForTenant(workspace.tenant.a2pBrandStatus),
    useAssistant: true,
    async getSlots(current, from) {
      return provider.getSlots({ tenant: current.tenant, from });
    },
    async bookSlot(current, slot, summary) {
      return provider.book({ tenant: current.tenant, slot, summary });
    },
  };
}

async function authorizeTwilio(request: Request, params: Record<string, string>, urlEnv: string): Promise<Response | null> {
  if (twilioConfigured()) {
    const url = process.env[urlEnv];
    if (!url) return new Response(`${urlEnv} is not configured.`, { status: 500 });
    const ok = validTwilioSignature(url, params, process.env.TWILIO_AUTH_TOKEN as string, request.headers.get("x-twilio-signature"));
    if (!ok) return new Response("Invalid Twilio signature.", { status: 403 });
    return null;
  }
  if (!sandboxWebhookAllowed(request)) {
    return new Response("Twilio is not configured. Unsigned webhooks are refused.", { status: 503 });
  }
  return null;
}

export async function handleVoiceWebhook(request: Request, store?: LeadStore): Promise<Response> {
  const params = await readForm(request);
  const denied = await authorizeTwilio(request, params, "TWILIO_VOICE_WEBHOOK_URL");
  if (denied) return denied;
  const from = normalizePhone(params.From);
  const to = normalizePhone(params.To);
  if (!from || !to) return xml("This call could not be identified.");
  const resolved = store ?? (await getStore());
  const workspace = await resolved.getBySmsNumber(to);
  if (!workspace) return xml("This number is not set up yet.");
  const result = await handleMissedCall(workspace, { from }, runtimeFor(workspace));
  await deliverEffects(result.effects, workspace.tenant.smsFromNumber);
  await resolved.save(result.workspace);
  return xml(`${workspace.tenant.name} missed your call. We will text you about this call. You can reply STOP to opt out.`);
}

export async function handleSmsWebhook(request: Request, store?: LeadStore): Promise<Response> {
  const params = await readForm(request);
  const denied = await authorizeTwilio(request, params, "TWILIO_SMS_WEBHOOK_URL");
  if (denied) return denied;
  const from = normalizePhone(params.From);
  const to = normalizePhone(params.To);
  const body = params.Body ?? "";
  if (!from || !to) return emptyTwiml();
  const resolved = store ?? (await getStore());
  const workspace = await resolved.getBySmsNumber(to);
  if (!workspace) return emptyTwiml();
  const result = await handleInbound(workspace, { from, body }, runtimeFor(workspace));
  await deliverEffects(result.effects, workspace.tenant.smsFromNumber);
  await resolved.save(result.workspace);
  return emptyTwiml();
}

export async function handleStripeWebhook(request: Request, store?: LeadStore): Promise<Response> {
  const raw = await request.text();
  const mode = stripeMode();
  let event: StripeEvent & { sandbox?: boolean };
  if (mode === "refused") {
    return Response.json({ error: "Live Stripe keys are refused. Use an sk_test_ key." }, { status: 400 });
  }
  if (mode === "test") {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
    if (!validStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
      return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
    }
    event = JSON.parse(raw) as StripeEvent;
  } else if (!sandboxWebhookAllowed(request)) {
    return Response.json({ error: "Stripe is not configured. Unsigned webhooks are refused." }, { status: 503 });
  } else {
    event = JSON.parse(raw) as StripeEvent & { sandbox?: boolean };
    if (event.sandbox !== true) {
      return Response.json({ error: "Sandbox Stripe events must set sandbox: true." }, { status: 400 });
    }
  }
  const snapshot = snapshotFromStripeEvent(event);
  if (!snapshot) return Response.json({ received: true, ignored: true, mode: mode === "test" ? "test" : "sandbox" });
  if (snapshot.priceId && !snapshot.plan) {
    const plan = planFromStripePrice(snapshot.priceId);
    if (plan) snapshot.plan = plan;
  }
  const resolved = store ?? (await getStore());
  const metadata = (event.data.object.metadata ?? {}) as Record<string, unknown>;
  const tenantId = typeof metadata.tenant_id === "string" ? metadata.tenant_id : null;
  const clientReference = typeof event.data.object.client_reference_id === "string" ? event.data.object.client_reference_id : null;
  let workspace = tenantId ? await resolved.getById(tenantId) : null;
  if (!workspace && clientReference) workspace = await resolved.getById(clientReference);
  if (!workspace && snapshot.customerId) {
    const all = await resolved.list();
    workspace = all.find((item) => item.tenant.stripeCustomerId === snapshot.customerId) ?? null;
  }
  if (!workspace) return Response.json({ received: true, unmatched: true, mode: mode === "test" ? "test" : "sandbox" });
  const tenant = applySubscriptionSnapshot(workspace.tenant, snapshot);
  await resolved.save({ ...workspace, tenant });
  return Response.json({ received: true, mode: mode === "test" ? "test" : "sandbox", status: tenant.subscriptionStatus });
}

export async function handleFollowUpCron(request: Request, store?: LeadStore, now = new Date()): Promise<Response> {
  if (!cronAuthorized(request)) return Response.json({ error: "Unauthorized cron." }, { status: 401 });
  const resolved = store ?? (await getStore());
  const workspaces = await resolved.list();
  let sent = 0;
  for (const workspace of workspaces) {
    const result = await runDueWork(workspace, now, { ...runtimeFor(workspace), useAssistant: false });
    sent += result.effects.sms.length;
    await deliverEffects(result.effects, workspace.tenant.smsFromNumber);
    await resolved.save(result.workspace);
  }
  return Response.json({ ok: true, mode: resolved.mode, sent });
}

export async function handleWeeklyReportCron(request: Request, store?: LeadStore, now = new Date()): Promise<Response> {
  if (!cronAuthorized(request)) return Response.json({ error: "Unauthorized cron." }, { status: 401 });
  const resolved = store ?? (await getStore());
  const weekStart = startOfWeek(now);
  const weekKey = weekStart.toISOString().slice(0, 10);
  let generated = 0;
  for (const workspace of await resolved.list()) {
    const metrics = buildWeeklyMetrics(workspace, weekStart);
    const existing = workspace.reports.find((report) => report.weekStart === weekKey);
    const report = {
      id: existing?.id ?? crypto.randomUUID(),
      tenantId: workspace.tenant.id,
      weekStart: weekKey,
      metrics,
      generatedAt: now.toISOString(),
    };
    await resolved.save({
      ...workspace,
      reports: [report, ...workspace.reports.filter((item) => item.weekStart !== weekKey)],
    });
    generated += 1;
  }
  return Response.json({ ok: true, mode: resolved.mode, generated, weekStart: weekKey });
}
