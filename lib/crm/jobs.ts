import type { CrmStage } from "@/lib/crm/mapping";
import type { CrmJobKind, PlannedCrmJob } from "@/lib/crm/plan";
import type { QueueJobState } from "@/lib/crm/queue";

export type StoredCrmJob = {
  idempotency_key: string;
  lead_id: string | null;
  kind: CrmJobKind;
  stage: CrmStage;
  message_count: number;
  status: QueueJobState["status"];
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  external_id: string | null;
};

const SAFE_ERROR = /^CRM request failed \(\d+\)\.$/;

/** Keep the queue row free of phones, emails, and tokens. */
export function storedCrmError(value: string | null): string | null {
  if (!value) return null;
  return SAFE_ERROR.test(value) ? value : "CRM request failed (0).";
}

export function queueStateFromRows(rows: StoredCrmJob[]): Map<string, QueueJobState> {
  const state = new Map<string, QueueJobState>();
  for (const row of rows) {
    const at = Date.parse(row.next_attempt_at);
    state.set(row.idempotency_key, {
      status: row.status,
      attempts: row.attempts,
      nextAttemptAt: Number.isFinite(at) ? at : 0,
      externalId: row.external_id,
      lastError: storedCrmError(row.last_error),
    });
  }
  return state;
}

export function linksFromRows(provider: PlannedCrmJob["provider"], rows: StoredCrmJob[]): Map<string, string> {
  const links = new Map<string, string>();
  for (const row of rows) {
    if ((row.kind === "contact" || row.kind === "deal") && row.status === "succeeded" && row.external_id && row.lead_id) {
      links.set(`${provider}:${row.lead_id}:${row.kind}`, row.external_id);
    }
  }
  return links;
}

export function jobRowsFromState(input: { jobs: PlannedCrmJob[]; state: Map<string, QueueJobState>; nowIso: string }): StoredCrmJob[] {
  return input.jobs.map((job) => {
    const current = input.state.get(job.idempotencyKey);
    return {
      idempotency_key: job.idempotencyKey,
      lead_id: job.leadId,
      kind: job.kind,
      stage: job.stage,
      message_count: job.messageCount,
      status: current?.status ?? "pending",
      attempts: current?.attempts ?? 0,
      next_attempt_at: current ? new Date(current.nextAttemptAt).toISOString() : input.nowIso,
      last_error: storedCrmError(current?.lastError ?? null),
      external_id: current?.externalId ?? null,
    };
  });
}
