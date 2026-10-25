export const SERVICES = ["unknown", "repair", "maintenance", "install", "emergency"] as const;
export type ServiceType = (typeof SERVICES)[number];

export const LEAD_STATUSES = [
  "new",
  "qualifying",
  "booking",
  "booked",
  "escalated",
  "opted_out",
  "closed",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CONVERSATION_STAGES = [
  "awaiting_reply",
  "identify_service",
  "qualify",
  "offer_slots",
  "collect_name",
  "booked",
  "escalated",
  "opted_out",
  "closed",
] as const;
export type ConversationStage = (typeof CONVERSATION_STAGES)[number];

export const PLANS = ["trial", "starter", "growth", "premium"] as const;
export type PlanId = (typeof PLANS)[number];

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "sandbox";

export type A2pBrandStatus = "not_started" | "pending" | "approved" | "rejected";

export type PendingQuestion =
  | "service"
  | "issue"
  | "system"
  | "zip"
  | "safety"
  | "follow_up"
  | "slot"
  | "name"
  | null;

export type Qualifying = {
  issue?: string;
  systemType?: string;
  zip?: string;
  safetyClear?: boolean;
  timeline?: string;
  customerName?: string;
  slotStart?: string;
  slotEnd?: string;
  slotLabel?: string;
  offeredSlots?: Array<{ start: string; end: string; label: string }>;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  businessPhone: string | null;
  smsFromNumber: string | null;
  ownerNotifyPhone: string | null;
  ownerNotifyEmail: string | null;
  quietHoursStart: number;
  quietHoursEnd: number;
  bookingProvider: "demo" | "google";
  googleCalendarId: string | null;
  a2pBrandStatus: A2pBrandStatus;
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  conversationAllowance: number;
  conversationsUsed: number;
  overageConversations: number;
  setupFeePaid: boolean;
  physicalAddress: string | null;
  createdAt: string;
};

export type Lead = {
  id: string;
  tenantId: string;
  phone: string;
  displayName: string | null;
  service: ServiceType;
  status: LeadStatus;
  source: "missed_call" | "inbound_sms" | "demo";
  optedOut: boolean;
  followUpPermission: boolean;
  followUpAsked: boolean;
  followUpCount: number;
  nextFollowUpAt: string | null;
  emergency: boolean;
  frustrated: boolean;
  pendingQuestion: PendingQuestion;
  qualifying: Qualifying;
  firstInboundAt: string | null;
  firstOutboundAt: string | null;
  recovered: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  tenantId: string;
  leadId: string;
  channel: "sms" | "demo";
  stage: ConversationStage;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryState =
  | "sent"
  | "received"
  | "queued_quiet_hours"
  | "sandbox_not_sent"
  | "blocked_opt_out"
  | "blocked_a2p";

export type Message = {
  id: string;
  tenantId: string;
  conversationId: string;
  leadId: string;
  direction: "inbound" | "outbound";
  body: string;
  delivery: DeliveryState;
  sendAfter: string | null;
  createdAt: string;
};

export type ConsentEventType =
  | "informational_textback"
  | "stop"
  | "help"
  | "start"
  | "quiet_hours_deferred"
  | "follow_up_granted"
  | "follow_up_declined";

export type ConsentEvent = {
  id: string;
  tenantId: string;
  leadId: string | null;
  phone: string;
  eventType: ConsentEventType;
  detail: string;
  createdAt: string;
};

export type Appointment = {
  id: string;
  tenantId: string;
  leadId: string;
  conversationId: string;
  startsAt: string;
  endsAt: string;
  service: ServiceType;
  status: "booked" | "cancelled";
  provider: "demo" | "google";
  providerMode: "live" | "sandbox";
  externalEventId: string | null;
  customerName: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  tenantId: string;
  kind: string;
  summary: string;
  createdAt: string;
};

export type Escalation = {
  id: string;
  tenantId: string;
  leadId: string;
  reason: "emergency" | "frustration";
  summary: string;
  ownerSms: string | null;
  ownerEmailSubject: string | null;
  ownerEmailText: string | null;
  delivery: "live" | "sandbox";
  createdAt: string;
};

export type FollowUp = {
  id: string;
  tenantId: string;
  leadId: string;
  scheduledFor: string;
  sentAt: string | null;
  canceledReason: string | null;
  createdAt: string;
};

export type UsageEvent = {
  id: string;
  tenantId: string;
  leadId: string;
  kind: "included" | "overage";
  createdAt: string;
};

export type WeeklyReport = {
  id: string;
  tenantId: string;
  weekStart: string;
  metrics: WeeklyMetrics;
  generatedAt: string;
};

export type WeeklyMetrics = {
  leadsHandled: number;
  averageResponseMinutes: number | null;
  recoveredConversations: number;
  appointmentsBooked: number;
  escalations: number;
  optOuts: number;
  conversationsIncluded: number;
  overageConversations: number;
};

export type Workspace = {
  tenant: Tenant;
  leads: Lead[];
  conversations: Conversation[];
  messages: Message[];
  consentEvents: ConsentEvent[];
  appointments: Appointment[];
  activity: Activity[];
  escalations: Escalation[];
  followUps: FollowUp[];
  usageEvents: UsageEvent[];
  reports: WeeklyReport[];
};

export type SmsEffect = {
  to: string;
  from: string | null;
  body: string;
  delivery: DeliveryState;
};

export type Effects = {
  sms: SmsEffect[];
  ownerSms: Array<{ to: string; body: string }>;
  ownerEmails: Array<{ to: string; subject: string; text: string }>;
};

export type Slot = {
  start: string;
  end: string;
  label: string;
};
