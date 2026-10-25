import { demoTenant } from "@/lib/demo/tenant";
import { buildWeeklyMetrics, startOfWeek } from "@/lib/reports/weekly";
import type { Appointment, Lead, Message, Workspace } from "@/lib/domain/types";

const ALEX = "22222222-2222-4222-8222-222222222221";
const SAM = "22222222-2222-4222-8222-222222222222";
const RILEY = "22222222-2222-4222-8222-222222222223";
const MORGAN = "22222222-2222-4222-8222-222222222224";

function isoDaysFrom(now: Date, days: number, hourUtc: number, minute = 0): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hourUtc, minute, 0, 0);
  return date.toISOString();
}

export function buildSandboxWorkspace(now = new Date()): Workspace {
  const tenant = {
    ...demoTenant(now),
    plan: "starter" as const,
    subscriptionStatus: "active" as const,
    setupFeePaid: true,
    a2pBrandStatus: "pending" as const,
    conversationsUsed: 4,
    conversationAllowance: 150,
    stripeCustomerId: "cus_sandbox_demo",
    stripeSubscriptionId: "sub_sandbox_demo",
  };
  const created = [
    isoDaysFrom(now, -3, 15, 5),
    isoDaysFrom(now, -2, 16, 12),
    isoDaysFrom(now, -1, 14, 40),
    isoDaysFrom(now, -1, 18, 2),
  ];
  const leads: Lead[] = [
    lead({
      id: ALEX,
      tenantId: tenant.id,
      phone: "+15125550148",
      displayName: "Alex Rivera",
      service: "repair",
      status: "booked",
      createdAt: created[0],
      firstOutboundAt: isoDaysFrom(now, -3, 15, 6),
      firstInboundAt: isoDaysFrom(now, -3, 15, 11),
      recovered: true,
      followUpPermission: true,
      followUpAsked: true,
      qualifying: { issue: "AC blowing warm air", systemType: "central AC", zip: "78704", safetyClear: true, customerName: "Alex Rivera" },
    }),
    lead({
      id: SAM,
      tenantId: tenant.id,
      phone: "+15125550162",
      displayName: "Sam Patel",
      service: "maintenance",
      status: "qualifying",
      createdAt: created[1],
      firstOutboundAt: isoDaysFrom(now, -2, 16, 13),
      firstInboundAt: isoDaysFrom(now, -2, 16, 20),
      recovered: true,
      followUpPermission: true,
      followUpAsked: true,
      followUpCount: 1,
      nextFollowUpAt: isoDaysFrom(now, 1, 16),
      qualifying: { issue: "Seasonal tune-up", systemType: "furnace", zip: "78745" },
    }),
    lead({
      id: RILEY,
      tenantId: tenant.id,
      phone: "+15125550173",
      displayName: null,
      service: "emergency",
      status: "escalated",
      createdAt: created[2],
      firstOutboundAt: isoDaysFrom(now, -1, 14, 41),
      firstInboundAt: isoDaysFrom(now, -1, 14, 44),
      recovered: true,
      emergency: true,
      qualifying: { issue: "I smell gas near the furnace" },
    }),
    lead({
      id: MORGAN,
      tenantId: tenant.id,
      phone: "+15125550184",
      displayName: null,
      service: "unknown",
      status: "new",
      createdAt: created[3],
      firstOutboundAt: isoDaysFrom(now, -1, 18, 3),
      qualifying: {},
    }),
  ];
  const appointments: Appointment[] = [
    {
      id: "33333333-3333-4333-8333-333333333331",
      tenantId: tenant.id,
      leadId: ALEX,
      conversationId: "44444444-4444-4444-8444-444444444441",
      startsAt: isoDaysFrom(now, 1, 15),
      endsAt: isoDaysFrom(now, 1, 17),
      service: "repair",
      status: "booked",
      provider: "demo",
      providerMode: "sandbox",
      externalEventId: "sandbox_alex",
      customerName: "Alex Rivera",
      createdAt: isoDaysFrom(now, -3, 15, 20),
    },
  ];
  const messages: Message[] = [
    msg(tenant.id, ALEX, "44444444-4444-4444-8444-444444444441", "outbound", "Demo HVAC Co: We missed your call. This is an automated notice about that call, not a promotion. Reply STOP to opt out.", created[0]),
    msg(tenant.id, ALEX, "44444444-4444-4444-8444-444444444441", "inbound", "My AC isn't cooling", isoDaysFrom(now, -3, 15, 11)),
    msg(tenant.id, ALEX, "44444444-4444-4444-8444-444444444441", "outbound", "Demo HVAC Co: You're booked, Alex Rivera — repair on tomorrow morning.", isoDaysFrom(now, -3, 15, 20)),
    msg(tenant.id, SAM, "44444444-4444-4444-8444-444444444442", "outbound", "Demo HVAC Co: We missed your call. Reply STOP to opt out.", created[1]),
    msg(tenant.id, SAM, "44444444-4444-4444-8444-444444444442", "inbound", "Need a furnace tune-up in 78745", isoDaysFrom(now, -2, 16, 20)),
    msg(tenant.id, RILEY, "44444444-4444-4444-8444-444444444443", "inbound", "I smell gas near the furnace", isoDaysFrom(now, -1, 14, 44)),
    msg(tenant.id, RILEY, "44444444-4444-4444-8444-444444444443", "outbound", "Demo HVAC Co: This sounds urgent. Leave and call 911 if a CO alarm is sounding. Reply STOP to opt out.", isoDaysFrom(now, -1, 14, 44)),
    msg(tenant.id, MORGAN, "44444444-4444-4444-8444-444444444444", "outbound", "Demo HVAC Co: We missed your call. Reply STOP to opt out.", created[3]),
  ];
  const workspace: Workspace = {
    tenant,
    leads,
    conversations: [
      convo(tenant.id, ALEX, "44444444-4444-4444-8444-444444444441", "booked", created[0]),
      convo(tenant.id, SAM, "44444444-4444-4444-8444-444444444442", "qualify", created[1]),
      convo(tenant.id, RILEY, "44444444-4444-4444-8444-444444444443", "escalated", created[2]),
      convo(tenant.id, MORGAN, "44444444-4444-4444-8444-444444444444", "awaiting_reply", created[3]),
    ],
    messages,
    consentEvents: [
      {
        id: "55555555-5555-4555-8555-555555555551",
        tenantId: tenant.id,
        leadId: ALEX,
        phone: "+15125550148",
        eventType: "informational_textback",
        detail: "Informational missed-call text prepared.",
        createdAt: created[0],
      },
      {
        id: "55555555-5555-4555-8555-555555555552",
        tenantId: tenant.id,
        leadId: ALEX,
        phone: "+15125550148",
        eventType: "follow_up_granted",
        detail: "YES",
        createdAt: isoDaysFrom(now, -3, 15, 16),
      },
    ],
    appointments,
    activity: [
      { id: "66666666-6666-4666-8666-666666666661", tenantId: tenant.id, kind: "appointment_booked", summary: "Booked Alex Rivera for a repair visit (demo, sandbox).", createdAt: isoDaysFrom(now, -3, 15, 20) },
      { id: "66666666-6666-4666-8666-666666666662", tenantId: tenant.id, kind: "emergency", summary: "Emergency escalation for +15125550173.", createdAt: isoDaysFrom(now, -1, 14, 44) },
      { id: "66666666-6666-4666-8666-666666666663", tenantId: tenant.id, kind: "follow_up", summary: "Sent follow-up 1 of 3 to +15125550162.", createdAt: isoDaysFrom(now, -1, 16, 30) },
      { id: "66666666-6666-4666-8666-666666666664", tenantId: tenant.id, kind: "missed_call", summary: "Missed call from +15125550184. Informational text prepared (sandbox_not_sent).", createdAt: created[3] },
    ],
    escalations: [
      {
        id: "77777777-7777-4777-8777-777777777771",
        tenantId: tenant.id,
        leadId: RILEY,
        reason: "emergency",
        summary: "I smell gas near the furnace",
        ownerSms: "LeadRescue alert for Demo HVAC Co: emergency from +15125550173.",
        ownerEmailSubject: "[LeadRescue] emergency — +15125550173",
        ownerEmailText: "Demo HVAC Co\n1200 Fictional Ave, Austin, TX 78701\nService notice to the business owner.",
        delivery: "sandbox",
        createdAt: isoDaysFrom(now, -1, 14, 44),
      },
    ],
    followUps: [
      {
        id: "88888888-8888-4888-8888-888888888881",
        tenantId: tenant.id,
        leadId: SAM,
        scheduledFor: isoDaysFrom(now, -1, 16, 30),
        sentAt: isoDaysFrom(now, -1, 16, 30),
        canceledReason: null,
        createdAt: isoDaysFrom(now, -2, 16, 20),
      },
    ],
    usageEvents: leads.map((item, index) => ({
      id: `99999999-9999-4999-8999-99999999999${index + 1}`,
      tenantId: tenant.id,
      leadId: item.id,
      kind: "included" as const,
      createdAt: item.createdAt,
    })),
    reports: [],
  };
  const weekStart = startOfWeek(now);
  workspace.reports = [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      tenantId: tenant.id,
      weekStart: weekStart.toISOString().slice(0, 10),
      metrics: buildWeeklyMetrics(workspace, weekStart),
      generatedAt: now.toISOString(),
    },
  ];
  return workspace;
}

function lead(partial: Pick<Lead, "id" | "tenantId" | "phone" | "displayName" | "service" | "status" | "createdAt"> & Partial<Lead>): Lead {
  return {
    source: "missed_call",
    optedOut: false,
    followUpPermission: false,
    followUpAsked: false,
    followUpCount: 0,
    nextFollowUpAt: null,
    emergency: false,
    frustrated: false,
    pendingQuestion: null,
    qualifying: {},
    firstInboundAt: null,
    firstOutboundAt: null,
    recovered: false,
    updatedAt: partial.createdAt,
    ...partial,
  };
}

function convo(tenantId: string, leadId: string, id: string, stage: Workspace["conversations"][number]["stage"], createdAt: string) {
  return { id, tenantId, leadId, channel: "sms" as const, stage, createdAt, updatedAt: createdAt };
}

function msg(tenantId: string, leadId: string, conversationId: string, direction: "inbound" | "outbound", body: string, createdAt: string): Message {
  return {
    id: crypto.randomUUID(),
    tenantId,
    conversationId,
    leadId,
    direction,
    body,
    delivery: direction === "inbound" ? "received" : "sandbox_not_sent",
    sendAfter: null,
    createdAt,
  };
}
