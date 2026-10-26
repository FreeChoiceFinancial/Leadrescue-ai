import Link from "next/link";
import { StatusChip } from "@/components/portal/StatusChip";
import { formatPhone } from "@/lib/domain/phone";
import { responseLabel, shortWhen } from "@/lib/format";
import { getPortalModel } from "@/lib/portal/load";
import { buildWeeklyMetrics, startOfWeek } from "@/lib/reports/weekly";

export default async function DashboardPage() {
  const { workspace, view } = await getPortalModel();
  const metrics = workspace.reports[0]?.metrics ?? buildWeeklyMetrics(workspace, startOfWeek(new Date()));
  const counts = workspace.leads.reduce<Record<string, number>>((bag, lead) => {
    bag[lead.status] = (bag[lead.status] ?? 0) + 1;
    return bag;
  }, {});
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-copper">{view === "fresh" ? "New shop" : "This week"}</p>
      <h1 className="mt-2 font-display text-4xl">{workspace.tenant.name}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/75">
        <Link href="/onboarding/10dlc" className="font-semibold underline">
          Register A2P 10DLC
        </Link>{" "}
        for this shop before any live texts. Saving the form does not file it with the carriers.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Leads handled", String(metrics.leadsHandled)],
          ["Avg response", responseLabel(metrics.averageResponseMinutes)],
          ["Recovered", String(metrics.recoveredConversations)],
          ["Booked", String(metrics.appointmentsBooked)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl bg-cream p-5">
            <p className="text-xs uppercase tracking-wider text-ink/50">{label}</p>
            <p className="mt-2 font-display text-4xl">{value}</p>
          </article>
        ))}
      </div>
      {workspace.leads.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-ink/20 bg-cream p-8">
          <h2 className="font-display text-3xl">No calls yet.</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/75">
            Forward no-answer calls to your LeadRescue number. Until a real caller arrives, the fictional demo shows the whole path.
          </p>
          <Link href="/demo" className="btn btn-primary mt-5">
            Run the demo
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl bg-cream p-5">
            <h2 className="font-display text-2xl">Leads</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-ink/45">
                  <tr>
                    <th className="py-2">Caller</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-ink/10">
                      <td className="py-3">
                        <Link href={`/dashboard/leads/${lead.id}`} className="font-semibold">
                          {lead.displayName ?? formatPhone(lead.phone)}
                        </Link>
                      </td>
                      <td>{lead.service}</td>
                      <td>
                        <StatusChip value={lead.status} />
                      </td>
                      <td className="text-ink/60">{shortWhen(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-3xl bg-cream p-5">
            <h2 className="font-display text-2xl">Pipeline</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(counts).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between">
                  <StatusChip value={status} />
                  <span className="font-display text-2xl">{count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
