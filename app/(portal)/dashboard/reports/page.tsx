import { responseLabel } from "@/lib/format";
import { getPortalModel } from "@/lib/portal/load";

export default async function ReportsPage() {
  const { workspace } = await getPortalModel();
  const report = workspace.reports[0];
  const metrics = report?.metrics;
  return (
    <div>
      <h1 className="font-display text-4xl">Weekly report</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/70">
        Week of {report?.weekStart ?? "—"}. A scheduled job regenerates this every Monday from the same numbers you see here: leads handled, response time, recovered conversations, and appointments booked.
      </p>
      {metrics ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Leads handled", String(metrics.leadsHandled)],
            ["Average response", responseLabel(metrics.averageResponseMinutes)],
            ["Recovered conversations", String(metrics.recoveredConversations)],
            ["Appointments booked", String(metrics.appointmentsBooked)],
            ["Escalations", String(metrics.escalations)],
            ["Opt-outs", String(metrics.optOuts)],
            ["Included conversations", String(metrics.conversationsIncluded)],
            ["Overage conversations", String(metrics.overageConversations)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-3xl bg-cream p-5">
              <p className="text-xs uppercase tracking-wider text-ink/50">{label}</p>
              <p className="mt-2 font-display text-4xl">{value}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm">No report yet.</p>
      )}
    </div>
  );
}
