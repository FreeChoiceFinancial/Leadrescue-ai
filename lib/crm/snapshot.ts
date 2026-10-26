import type { Workspace } from "@/lib/domain/types";
import type { CrmStage } from "@/lib/crm/mapping";

export type CrmLeadSnapshot = {
  leadId: string;
  phone: string;
  email: string | null;
  name: string | null;
  dealName: string;
  stage: CrmStage;
  note: string;
  appointmentAt: string | null;
};

export function snapshotLead(workspace: Workspace, leadId: string, stage: CrmStage): CrmLeadSnapshot | null {
  const lead = workspace.leads.find((item) => item.id === leadId);
  if (!lead) return null;
  const note = workspace.messages
    .filter((message) => message.leadId === lead.id)
    .map((message) => `${message.direction === "inbound" ? "Caller" : "Shop"}: ${message.body}`)
    .join("\n")
    .slice(0, 4000);
  const appointment = workspace.appointments.find((item) => item.leadId === lead.id && item.status === "booked");
  const name = lead.displayName ?? lead.qualifying.customerName ?? null;
  return {
    leadId: lead.id,
    phone: lead.phone,
    email: null,
    name,
    dealName: name ? `${name} · ${lead.service}` : lead.service,
    stage,
    note,
    appointmentAt: appointment?.startsAt ?? null,
  };
}
