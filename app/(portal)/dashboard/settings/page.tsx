import Link from "next/link";
import { CrmSettings, type CrmLogRow } from "@/components/portal/CrmSettings";
import { crmLiveEnabled } from "@/lib/crm/mode";
import { integrationStatus, supabaseConfigured } from "@/lib/integrations/status";
import { getPortalModel } from "@/lib/portal/load";
import { StatusChip } from "@/components/portal/StatusChip";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function loadCrmLogs(): Promise<CrmLogRow[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const result = await supabase
    .from("crm_sync_log")
    .select("id, provider, action, status, attempt, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (result.error || !result.data) return [];
  return result.data.map((row) => ({
    id: String(row.id),
    provider: String(row.provider),
    action: String(row.action),
    status: String(row.status),
    attempt: Number(row.attempt),
    detail: String(row.detail),
    createdAt: String(row.created_at),
  }));
}

export default async function SettingsPage() {
  const { workspace } = await getPortalModel();
  const tenant = workspace.tenant;
  const integrations = integrationStatus();
  const crmLogs = await loadCrmLogs();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl bg-cream p-5">
        <h1 className="font-display text-4xl">Shop settings</h1>
        <dl className="mt-4 space-y-2 text-sm">
          {[
            ["Name", tenant.name],
            ["Timezone", tenant.timezone],
            ["Quiet hours", `${tenant.quietHoursStart}:00 – ${tenant.quietHoursEnd}:00`],
            ["Business phone", tenant.businessPhone ?? "—"],
            ["SMS number", tenant.smsFromNumber ?? "—"],
            ["Owner phone", tenant.ownerNotifyPhone ?? "—"],
            ["Owner email", tenant.ownerNotifyEmail ?? "—"],
            ["Address", tenant.physicalAddress ?? "—"],
            ["Calendar", tenant.bookingProvider],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-dashed border-ink/15 py-2">
              <dt className="text-ink/55">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm">
          A2P 10DLC: <StatusChip value={tenant.a2pBrandStatus} />
        </p>
        <p className="mt-2 text-sm text-ink/70">
          <Link href="/onboarding/10dlc" className="font-semibold underline">
            Open the 10DLC form
          </Link>
          . Approval is recorded by an operator after the carrier approves this shop&apos;s own brand. The dashboard cannot flip it to approved, and the form does not file the registration.
        </p>
      </section>
      <section className="rounded-3xl bg-cream p-5">
        <h2 className="font-display text-3xl">Integrations</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {Object.entries(integrations).map(([name, mode]) => (
            <li key={name} className="flex items-center justify-between">
              <span className="capitalize">{name}</span>
              <StatusChip value={mode === "test" ? "active" : mode} />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-ink/70">
          Sandbox means the credential is absent and the product will not pretend a live send, charge, or calendar write happened. Refused means a live Stripe secret was present and blocked. CRM stays on the sandbox label until CRM sync is turned on.
        </p>
      </section>
      <CrmSettings live={crmLiveEnabled()} logs={crmLogs} />
    </div>
  );
}
