import type { PlannedCrmJob } from "@/lib/crm/plan";
import { safeCrmDetail, safeCrmError } from "@/lib/crm/redact";

export type QueueLog = {
  provider: PlannedCrmJob["provider"];
  action: PlannedCrmJob["kind"];
  status: "sandbox" | "succeeded" | "retry" | "failed";
  attempt: number;
  detail: string;
  idempotencyKey: string;
};

export type QueueJobState = {
  status: "pending" | "sandbox" | "succeeded" | "failed";
  attempts: number;
  nextAttemptAt: number;
  externalId: string | null;
  lastError: string | null;
};

export type CrmSyncAdapter = {
  mode: "sandbox" | "live";
  run(job: PlannedCrmJob): Promise<{ externalId: string }>;
};

/** 1 minute, then double, capped at 6 hours. */
export function backoffMs(attempt: number): number {
  const step = Math.max(0, attempt);
  return Math.min(60_000 * 2 ** step, 6 * 60 * 60 * 1000);
}

export async function runCrmQueue(input: {
  jobs: PlannedCrmJob[];
  state: Map<string, QueueJobState>;
  adapter: CrmSyncAdapter;
  now: number;
}): Promise<{ state: Map<string, QueueJobState>; logs: QueueLog[] }> {
  const logs: QueueLog[] = [];
  for (const job of input.jobs) {
    const current = input.state.get(job.idempotencyKey);
    if (current?.status === "succeeded" || current?.status === "failed" || current?.status === "sandbox") continue;
    if (current && current.nextAttemptAt > input.now) continue;
    const attempts = current?.attempts ?? 0;
    if (input.adapter.mode === "sandbox") {
      input.state.set(job.idempotencyKey, { status: "sandbox", attempts, nextAttemptAt: input.now, externalId: null, lastError: null });
      logs.push({
        provider: job.provider,
        action: job.kind,
        status: "sandbox",
        attempt: attempts,
        detail: safeCrmDetail("sandbox"),
        idempotencyKey: job.idempotencyKey,
      });
      continue;
    }
    try {
      const result = await input.adapter.run(job);
      input.state.set(job.idempotencyKey, {
        status: "succeeded",
        attempts,
        nextAttemptAt: input.now,
        externalId: result.externalId,
        lastError: null,
      });
      logs.push({
        provider: job.provider,
        action: job.kind,
        status: "succeeded",
        attempt: attempts,
        detail: safeCrmDetail("succeeded"),
        idempotencyKey: job.idempotencyKey,
      });
    } catch (error) {
      const nextAttempts = attempts + 1;
      const failed = nextAttempts >= 5;
      const message = error instanceof Error ? safeCrmError(statusFromMessage(error.message)) : safeCrmError(0);
      input.state.set(job.idempotencyKey, {
        status: failed ? "failed" : "pending",
        attempts: nextAttempts,
        nextAttemptAt: input.now + backoffMs(attempts),
        externalId: current?.externalId ?? null,
        lastError: message,
      });
      logs.push({
        provider: job.provider,
        action: job.kind,
        status: failed ? "failed" : "retry",
        attempt: nextAttempts,
        detail: safeCrmDetail(failed ? "failed" : "retry"),
        idempotencyKey: job.idempotencyKey,
      });
    }
  }
  return { state: input.state, logs };
}

function statusFromMessage(message: string): number {
  const match = message.match(/\((\d+)\)/);
  return match ? Number(match[1]) : 0;
}
