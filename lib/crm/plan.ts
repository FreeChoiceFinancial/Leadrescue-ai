import type { Workspace } from "@/lib/domain/types";
import { crmStageForLead, type CrmProvider, type CrmStage } from "@/lib/crm/mapping";

export const CRM_JOB_KINDS = ["contact", "deal", "note", "appointment"] as const;
export type CrmJobKind = (typeof CRM_JOB_KINDS)[number];

export type PlannedCrmJob = {
  provider: CrmProvider;
  leadId: string;
  kind: CrmJobKind;
  stage: CrmStage;
  messageCount: number;
  idempotencyKey: string;
};

export function idempotencyKey(job: Omit<PlannedCrmJob, "idempotencyKey">): string {
  return [job.provider, job.leadId, job.kind, job.stage, String(job.messageCount)].join(":");
}

/** Jobs for one shop. The snapshot with phone and message text is built at send time and is not part of the job. */
export function planCrmJobs(workspace: Workspace, provider: CrmProvider): PlannedCrmJob[] {
  const jobs: PlannedCrmJob[] = [];
  for (const lead of workspace.leads) {
    const stage = crmStageForLead(lead.status);
    const messageCount = workspace.messages.filter((message) => message.leadId === lead.id).length;
    const appointment = workspace.appointments.find((item) => item.leadId === lead.id && item.status === "booked");
    const kinds: CrmJobKind[] = ["contact", "deal"];
    if (messageCount > 0) kinds.push("note");
    if (appointment) kinds.push("appointment");
    for (const kind of kinds) {
      const partial = {
        provider,
        leadId: lead.id,
        kind,
        stage,
        messageCount: kind === "note" ? messageCount : 0,
      };
      jobs.push({ ...partial, idempotencyKey: idempotencyKey(partial) });
    }
  }
  return jobs;
}
