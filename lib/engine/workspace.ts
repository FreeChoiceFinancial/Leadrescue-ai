import { randomId } from "@/lib/domain/ids";
import type {
  Activity,
  ConsentEvent,
  Conversation,
  Effects,
  Lead,
  Message,
  Tenant,
  Workspace,
} from "@/lib/domain/types";

export function emptyEffects(): Effects {
  return { sms: [], ownerSms: [], ownerEmails: [] };
}

export function blankWorkspace(tenant: Tenant): Workspace {
  return {
    tenant,
    leads: [],
    conversations: [],
    messages: [],
    consentEvents: [],
    appointments: [],
    activity: [],
    escalations: [],
    followUps: [],
    usageEvents: [],
    reports: [],
  };
}

export function cloneWorkspace(workspace: Workspace): Workspace {
  return structuredClone(workspace);
}

export function addActivity(workspace: Workspace, kind: string, summary: string, at: string, id: string): Workspace {
  const activity: Activity = { id, tenantId: workspace.tenant.id, kind, summary, createdAt: at };
  return { ...workspace, activity: [activity, ...workspace.activity] };
}

export function addConsent(
  workspace: Workspace,
  event: Omit<ConsentEvent, "id" | "tenantId" | "createdAt"> & { id: string; createdAt: string },
): Workspace {
  const row: ConsentEvent = { ...event, tenantId: workspace.tenant.id };
  return { ...workspace, consentEvents: [row, ...workspace.consentEvents] };
}

export function upsertLead(workspace: Workspace, lead: Lead): Workspace {
  const exists = workspace.leads.some((item) => item.id === lead.id);
  return {
    ...workspace,
    leads: exists ? workspace.leads.map((item) => (item.id === lead.id ? lead : item)) : [...workspace.leads, lead],
  };
}

export function upsertConversation(workspace: Workspace, conversation: Conversation): Workspace {
  const exists = workspace.conversations.some((item) => item.id === conversation.id);
  return {
    ...workspace,
    conversations: exists
      ? workspace.conversations.map((item) => (item.id === conversation.id ? conversation : item))
      : [...workspace.conversations, conversation],
  };
}

export function addMessage(workspace: Workspace, message: Message): Workspace {
  return { ...workspace, messages: [...workspace.messages, message] };
}

export function openConversation(workspace: Workspace, leadId: string): Conversation | undefined {
  return workspace.conversations.find(
    (conversation) =>
      conversation.leadId === leadId &&
      !["booked", "opted_out", "closed"].includes(conversation.stage),
  );
}

export function newId(ids: (() => string) | undefined): string {
  return ids ? ids() : randomId();
}
