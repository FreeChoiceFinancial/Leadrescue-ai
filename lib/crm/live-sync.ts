import "server-only";

import { decryptSecret, encryptSecret, crmTokenKey } from "@/lib/crm/crypto";
import { executeLiveJob, type LiveCrmContext } from "@/lib/crm/execute";
import { jobRowsFromState, linksFromRows, queueStateFromRows, type StoredCrmJob } from "@/lib/crm/jobs";
import { sanitizeFieldMapping, type CrmProvider, type ZohoRegion } from "@/lib/crm/mapping";
import { planCrmJobs } from "@/lib/crm/plan";
import { runCrmQueue, type CrmSyncAdapter } from "@/lib/crm/queue";
import { safeCrmDetail } from "@/lib/crm/redact";
import { snapshotLead } from "@/lib/crm/snapshot";
import type { Workspace } from "@/lib/domain/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type ConnectionRow = {
  provider: CrmProvider;
  region: ZohoRegion | null;
  refresh_token_encrypted: string | null;
  access_token_encrypted: string | null;
  access_token_expires_at: string | null;
  field_mapping: unknown;
};

/**
 * Sends due jobs for a connected shop. Callers must already have checked CRM_LIVE.
 * Failures are swallowed by noteCrmSync. This function does not log payloads.
 */
export async function runLiveCrmSync(workspace: Workspace): Promise<void> {
  const key = crmTokenKey();
  const admin = createSupabaseAdminClient();
  if (!key || !admin) return;
  const clientIdHub = process.env.HUBSPOT_CLIENT_ID ?? "";
  const secretHub = process.env.HUBSPOT_CLIENT_SECRET ?? "";
  const clientIdZoho = process.env.ZOHO_CLIENT_ID ?? "";
  const secretZoho = process.env.ZOHO_CLIENT_SECRET ?? "";
  const { data, error } = await admin
    .from("crm_connections")
    .select("provider, region, refresh_token_encrypted, access_token_encrypted, access_token_expires_at, field_mapping")
    .eq("tenant_id", workspace.tenant.id)
    .eq("status", "connected");
  if (error || !data) return;
  for (const row of data as ConnectionRow[]) {
    if (!row.refresh_token_encrypted) continue;
    const provider = row.provider;
    const clientId = provider === "hubspot" ? clientIdHub : clientIdZoho;
    const clientSecret = provider === "hubspot" ? secretHub : secretZoho;
    if (!clientId || !clientSecret) continue;
    let refreshToken = "";
    let accessToken = "";
    try {
      refreshToken = decryptSecret(row.refresh_token_encrypted, key);
      accessToken = row.access_token_encrypted ? decryptSecret(row.access_token_encrypted, key) : "";
    } catch {
      continue;
    }
    const mapping = sanitizeFieldMapping(provider, row.field_mapping);
    const snapshots = new Map<string, ReturnType<typeof snapshotLead>>();
    const jobs = planCrmJobs(workspace, provider);
    const stored = await admin
      .from("crm_sync_jobs")
      .select("idempotency_key, lead_id, kind, stage, message_count, status, attempts, next_attempt_at, last_error, external_id")
      .eq("tenant_id", workspace.tenant.id)
      .eq("provider", provider);
    if (stored.error || !stored.data) continue;
    const rows = stored.data as StoredCrmJob[];
    const links = linksFromRows(provider, rows);
    const ctx: LiveCrmContext = {
      accessToken,
      refreshToken,
      expiresAt: row.access_token_expires_at ? Date.parse(row.access_token_expires_at) : 0,
      clientId,
      clientSecret,
      region: row.region ?? "com",
      fetchImpl: fetch,
      now: () => Date.now(),
      mapping,
      links,
      onTokens(tokens) {
        void admin
          .from("crm_connections")
          .update({
            refresh_token_encrypted: encryptSecret(tokens.refreshToken, key),
            access_token_encrypted: encryptSecret(tokens.accessToken, key),
            access_token_expires_at: new Date(tokens.expiresAt).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", workspace.tenant.id)
          .eq("provider", provider);
      },
    };
    const adapter: CrmSyncAdapter = {
      mode: "live",
      async run(job) {
        const snapshot = snapshots.get(job.leadId) ?? snapshotLead(workspace, job.leadId, job.stage);
        snapshots.set(job.leadId, snapshot);
        if (!snapshot) throw new Error("CRM request failed (0).");
        return executeLiveJob(job, snapshot, ctx);
      },
    };
    const nowMs = Date.now();
    const { logs, state } = await runCrmQueue({ jobs, state: queueStateFromRows(rows), adapter, now: nowMs });
    const persisted = jobRowsFromState({ jobs, state, nowIso: new Date(nowMs).toISOString() }).map((job) => ({
      tenant_id: workspace.tenant.id,
      provider,
      ...job,
      updated_at: new Date(nowMs).toISOString(),
    }));
    if (persisted.length > 0) {
      await admin.from("crm_sync_jobs").upsert(persisted, { onConflict: "tenant_id,idempotency_key" });
    }
    if (logs.length === 0) continue;
    await admin.from("crm_sync_log").insert(
      logs.map((entry) => ({
        tenant_id: workspace.tenant.id,
        provider: entry.provider,
        action: entry.action,
        status: entry.status,
        attempt: entry.attempt,
        detail: safeCrmDetail(entry.status),
      })),
    );
  }
}
