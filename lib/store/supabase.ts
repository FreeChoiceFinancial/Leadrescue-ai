import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/domain/phone";
import type {
  Activity,
  Appointment,
  ConsentEvent,
  Conversation,
  Escalation,
  FollowUp,
  Lead,
  Message,
  Tenant,
  UsageEvent,
  WeeklyReport,
  Workspace,
} from "@/lib/domain/types";
import type { LeadStore } from "@/lib/store/types";

type Row = Record<string, unknown>;

export function createSupabaseStore(): LeadStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials are missing.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    mode: "live",
    async getBySmsNumber(to) {
      const phone = normalizePhone(to);
      if (!phone) return null;
      const { data, error } = await client.from("tenants").select("id").eq("sms_from_number", phone).maybeSingle();
      if (error) throw error;
      if (!data?.id) return null;
      return loadWorkspace(client, data.id);
    },
    getById(tenantId) {
      return loadWorkspace(client, tenantId);
    },
    async save(workspace) {
      await saveWorkspace(client, workspace);
    },
    async list() {
      const { data, error } = await client.from("tenants").select("id");
      if (error) throw error;
      const workspaces: Workspace[] = [];
      for (const row of data ?? []) {
        const workspace = await loadWorkspace(client, row.id as string);
        if (workspace) workspaces.push(workspace);
      }
      return workspaces;
    },
  };
}

export async function loadTenantWorkspace(client: SupabaseClient, tenantId: string): Promise<Workspace | null> {
  return loadWorkspace(client, tenantId);
}

async function loadWorkspace(client: SupabaseClient, tenantId: string): Promise<Workspace | null> {
  const [tenantResult, subscriptionResult, leads, conversations, messages, consent, appointments, activity, escalations, followUps, usage, reports] =
    await Promise.all([
      client.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
      client.from("subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
      client.from("leads").select("*").eq("tenant_id", tenantId),
      client.from("conversations").select("*").eq("tenant_id", tenantId),
      client.from("messages").select("*").eq("tenant_id", tenantId),
      client.from("consent_events").select("*").eq("tenant_id", tenantId),
      client.from("appointments").select("*").eq("tenant_id", tenantId),
      client.from("activity_log").select("*").eq("tenant_id", tenantId),
      client.from("escalations").select("*").eq("tenant_id", tenantId),
      client.from("follow_ups").select("*").eq("tenant_id", tenantId),
      client.from("usage_events").select("*").eq("tenant_id", tenantId),
      client.from("weekly_reports").select("*").eq("tenant_id", tenantId),
    ]);
  for (const result of [tenantResult, subscriptionResult, leads, conversations, messages, consent, appointments, activity, escalations, followUps, usage, reports]) {
    if (result.error) throw result.error;
  }
  if (!tenantResult.data) return null;
  return {
    tenant: mapTenant(tenantResult.data as Row, (subscriptionResult.data ?? {}) as Row),
    leads: ((leads.data ?? []) as Row[]).map(mapLead),
    conversations: ((conversations.data ?? []) as Row[]).map(mapConversation),
    messages: ((messages.data ?? []) as Row[]).map(mapMessage),
    consentEvents: ((consent.data ?? []) as Row[]).map(mapConsent),
    appointments: ((appointments.data ?? []) as Row[]).map(mapAppointment),
    activity: ((activity.data ?? []) as Row[]).map(mapActivity),
    escalations: ((escalations.data ?? []) as Row[]).map(mapEscalation),
    followUps: ((followUps.data ?? []) as Row[]).map(mapFollowUp),
    usageEvents: ((usage.data ?? []) as Row[]).map(mapUsage),
    reports: ((reports.data ?? []) as Row[]).map(mapReport),
  };
}

async function saveWorkspace(client: SupabaseClient, workspace: Workspace): Promise<void> {
  const tenant = workspace.tenant;
  const { error: tenantError } = await client.from("tenants").upsert({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    timezone: tenant.timezone,
    business_phone: tenant.businessPhone,
    sms_from_number: tenant.smsFromNumber,
    owner_notify_phone: tenant.ownerNotifyPhone,
    owner_notify_email: tenant.ownerNotifyEmail,
    quiet_hours_start: tenant.quietHoursStart,
    quiet_hours_end: tenant.quietHoursEnd,
    booking_provider: tenant.bookingProvider,
    google_calendar_id: tenant.googleCalendarId,
    a2p_brand_status: tenant.a2pBrandStatus,
    physical_address: tenant.physicalAddress,
    created_at: tenant.createdAt,
  });
  if (tenantError) throw tenantError;
  const { error: subError } = await client.from("subscriptions").upsert({
    tenant_id: tenant.id,
    plan: tenant.plan,
    status: tenant.subscriptionStatus,
    stripe_customer_id: tenant.stripeCustomerId,
    stripe_subscription_id: tenant.stripeSubscriptionId,
    trial_ends_at: tenant.trialEndsAt,
    conversation_allowance: tenant.conversationAllowance,
    conversations_used: tenant.conversationsUsed,
    overage_conversations: tenant.overageConversations,
    setup_fee_paid: tenant.setupFeePaid,
  });
  if (subError) throw subError;
  await upsert(client, "leads", workspace.leads.map(leadToRow));
  await upsert(client, "conversations", workspace.conversations.map(conversationToRow));
  await upsert(client, "messages", workspace.messages.map(messageToRow));
  await upsert(client, "consent_events", workspace.consentEvents.map(consentToRow));
  await upsert(client, "appointments", workspace.appointments.map(appointmentToRow));
  await upsert(client, "activity_log", workspace.activity.map(activityToRow));
  await upsert(client, "escalations", workspace.escalations.map(escalationToRow));
  await upsert(client, "follow_ups", workspace.followUps.map(followUpToRow));
  await upsert(client, "usage_events", workspace.usageEvents.map(usageToRow));
  await upsert(client, "weekly_reports", workspace.reports.map(reportToRow));
}

async function upsert(client: SupabaseClient, table: string, rows: Row[]) {
  if (rows.length === 0) return;
  const { error } = await client.from(table).upsert(rows);
  if (error) throw error;
}

function mapTenant(row: Row, subscription: Row): Tenant {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    timezone: String(row.timezone),
    businessPhone: (row.business_phone as string | null) ?? null,
    smsFromNumber: (row.sms_from_number as string | null) ?? null,
    ownerNotifyPhone: (row.owner_notify_phone as string | null) ?? null,
    ownerNotifyEmail: (row.owner_notify_email as string | null) ?? null,
    quietHoursStart: Number(row.quiet_hours_start),
    quietHoursEnd: Number(row.quiet_hours_end),
    bookingProvider: row.booking_provider === "google" ? "google" : "demo",
    googleCalendarId: (row.google_calendar_id as string | null) ?? null,
    a2pBrandStatus: (row.a2p_brand_status as Tenant["a2pBrandStatus"]) ?? "not_started",
    plan: (subscription.plan as Tenant["plan"]) ?? "trial",
    subscriptionStatus: (subscription.status as Tenant["subscriptionStatus"]) ?? "trialing",
    stripeCustomerId: (subscription.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (subscription.stripe_subscription_id as string | null) ?? null,
    trialEndsAt: (subscription.trial_ends_at as string | null) ?? null,
    conversationAllowance: Number(subscription.conversation_allowance ?? 150),
    conversationsUsed: Number(subscription.conversations_used ?? 0),
    overageConversations: Number(subscription.overage_conversations ?? 0),
    setupFeePaid: Boolean(subscription.setup_fee_paid),
    physicalAddress: (row.physical_address as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapLead(row: Row): Lead {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    phone: String(row.phone),
    displayName: (row.display_name as string | null) ?? null,
    service: row.service as Lead["service"],
    status: row.status as Lead["status"],
    source: row.source as Lead["source"],
    optedOut: Boolean(row.opted_out),
    followUpPermission: Boolean(row.follow_up_permission),
    followUpAsked: Boolean(row.follow_up_asked),
    followUpCount: Number(row.follow_up_count ?? 0),
    nextFollowUpAt: (row.next_follow_up_at as string | null) ?? null,
    emergency: Boolean(row.emergency),
    frustrated: Boolean(row.frustrated),
    pendingQuestion: (row.pending_question as Lead["pendingQuestion"]) ?? null,
    qualifying: (row.qualifying as Lead["qualifying"]) ?? {},
    firstInboundAt: (row.first_inbound_at as string | null) ?? null,
    firstOutboundAt: (row.first_outbound_at as string | null) ?? null,
    recovered: Boolean(row.recovered),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapConversation(row: Row): Conversation {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    leadId: String(row.lead_id),
    channel: row.channel === "demo" ? "demo" : "sms",
    stage: row.stage as Conversation["stage"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapMessage(row: Row): Message {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    conversationId: String(row.conversation_id),
    leadId: String(row.lead_id),
    direction: row.direction === "inbound" ? "inbound" : "outbound",
    body: String(row.body),
    delivery: row.delivery as Message["delivery"],
    sendAfter: (row.send_after as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapConsent(row: Row): ConsentEvent {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    leadId: (row.lead_id as string | null) ?? null,
    phone: String(row.phone),
    eventType: row.event_type as ConsentEvent["eventType"],
    detail: String(row.detail ?? ""),
    createdAt: String(row.created_at),
  };
}

function mapAppointment(row: Row): Appointment {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    leadId: String(row.lead_id),
    conversationId: String(row.conversation_id),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    service: row.service as Appointment["service"],
    status: row.status === "cancelled" ? "cancelled" : "booked",
    provider: row.provider === "google" ? "google" : "demo",
    providerMode: row.provider_mode === "live" ? "live" : "sandbox",
    externalEventId: (row.external_event_id as string | null) ?? null,
    customerName: String(row.customer_name),
    createdAt: String(row.created_at),
  };
}

function mapActivity(row: Row): Activity {
  return { id: String(row.id), tenantId: String(row.tenant_id), kind: String(row.kind), summary: String(row.summary), createdAt: String(row.created_at) };
}

function mapEscalation(row: Row): Escalation {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    leadId: String(row.lead_id),
    reason: row.reason === "frustration" ? "frustration" : "emergency",
    summary: String(row.summary),
    ownerSms: (row.owner_sms as string | null) ?? null,
    ownerEmailSubject: (row.owner_email_subject as string | null) ?? null,
    ownerEmailText: (row.owner_email_text as string | null) ?? null,
    delivery: row.delivery === "live" ? "live" : "sandbox",
    createdAt: String(row.created_at),
  };
}

function mapFollowUp(row: Row): FollowUp {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    leadId: String(row.lead_id),
    scheduledFor: String(row.scheduled_for),
    sentAt: (row.sent_at as string | null) ?? null,
    canceledReason: (row.canceled_reason as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapUsage(row: Row): UsageEvent {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    leadId: String(row.lead_id),
    kind: row.kind === "overage" ? "overage" : "included",
    createdAt: String(row.created_at),
  };
}

function mapReport(row: Row): WeeklyReport {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    weekStart: String(row.week_start),
    metrics: row.metrics as WeeklyReport["metrics"],
    generatedAt: String(row.generated_at),
  };
}

function leadToRow(lead: Lead): Row {
  return {
    id: lead.id,
    tenant_id: lead.tenantId,
    phone: lead.phone,
    display_name: lead.displayName,
    service: lead.service,
    status: lead.status,
    source: lead.source,
    opted_out: lead.optedOut,
    follow_up_permission: lead.followUpPermission,
    follow_up_asked: lead.followUpAsked,
    follow_up_count: lead.followUpCount,
    next_follow_up_at: lead.nextFollowUpAt,
    emergency: lead.emergency,
    frustrated: lead.frustrated,
    pending_question: lead.pendingQuestion,
    qualifying: lead.qualifying,
    first_inbound_at: lead.firstInboundAt,
    first_outbound_at: lead.firstOutboundAt,
    recovered: lead.recovered,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  };
}

function conversationToRow(conversation: Conversation): Row {
  return {
    id: conversation.id,
    tenant_id: conversation.tenantId,
    lead_id: conversation.leadId,
    channel: conversation.channel,
    stage: conversation.stage,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  };
}

function messageToRow(message: Message): Row {
  return {
    id: message.id,
    tenant_id: message.tenantId,
    conversation_id: message.conversationId,
    lead_id: message.leadId,
    direction: message.direction,
    body: message.body,
    delivery: message.delivery,
    send_after: message.sendAfter,
    created_at: message.createdAt,
  };
}

function consentToRow(event: ConsentEvent): Row {
  return {
    id: event.id,
    tenant_id: event.tenantId,
    lead_id: event.leadId,
    phone: event.phone,
    event_type: event.eventType,
    detail: event.detail,
    created_at: event.createdAt,
  };
}

function appointmentToRow(appointment: Appointment): Row {
  return {
    id: appointment.id,
    tenant_id: appointment.tenantId,
    lead_id: appointment.leadId,
    conversation_id: appointment.conversationId,
    starts_at: appointment.startsAt,
    ends_at: appointment.endsAt,
    service: appointment.service,
    status: appointment.status,
    provider: appointment.provider,
    provider_mode: appointment.providerMode,
    external_event_id: appointment.externalEventId,
    customer_name: appointment.customerName,
    created_at: appointment.createdAt,
  };
}

function activityToRow(activity: Activity): Row {
  return { id: activity.id, tenant_id: activity.tenantId, kind: activity.kind, summary: activity.summary, created_at: activity.createdAt };
}

function escalationToRow(escalation: Escalation): Row {
  return {
    id: escalation.id,
    tenant_id: escalation.tenantId,
    lead_id: escalation.leadId,
    reason: escalation.reason,
    summary: escalation.summary,
    owner_sms: escalation.ownerSms,
    owner_email_subject: escalation.ownerEmailSubject,
    owner_email_text: escalation.ownerEmailText,
    delivery: escalation.delivery,
    created_at: escalation.createdAt,
  };
}

function followUpToRow(followUp: FollowUp): Row {
  return {
    id: followUp.id,
    tenant_id: followUp.tenantId,
    lead_id: followUp.leadId,
    scheduled_for: followUp.scheduledFor,
    sent_at: followUp.sentAt,
    canceled_reason: followUp.canceledReason,
    created_at: followUp.createdAt,
  };
}

function usageToRow(event: UsageEvent): Row {
  return { id: event.id, tenant_id: event.tenantId, lead_id: event.leadId, kind: event.kind, created_at: event.createdAt };
}

function reportToRow(report: WeeklyReport): Row {
  return {
    id: report.id,
    tenant_id: report.tenantId,
    week_start: report.weekStart,
    metrics: report.metrics,
    generated_at: report.generatedAt,
  };
}
