import Link from "next/link";
import { StatusChip } from "@/components/portal/StatusChip";
import { formatPhone } from "@/lib/domain/phone";
import { shortWhen } from "@/lib/format";
import { getPortalModel } from "@/lib/portal/load";

export default async function LeadsPage() {
  const { workspace } = await getPortalModel();
  return (
    <div>
      <h1 className="font-display text-4xl">Leads</h1>
      <p className="mt-2 text-sm text-ink/70">Every caller thread for this shop. Other shops cannot see this list.</p>
      <div className="mt-6 overflow-x-auto rounded-3xl bg-cream">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-ink/45">
            <tr>
              <th className="px-4 py-3">Caller</th>
              <th>Phone</th>
              <th>Service</th>
              <th>Status</th>
              <th>Recovered</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {workspace.leads.map((lead) => (
              <tr key={lead.id} className="border-t border-ink/10">
                <td className="px-4 py-3">
                  <Link className="font-semibold" href={`/dashboard/leads/${lead.id}`}>
                    {lead.displayName ?? "Unknown caller"}
                  </Link>
                </td>
                <td>{formatPhone(lead.phone)}</td>
                <td>{lead.service}</td>
                <td>
                  <StatusChip value={lead.status} />
                </td>
                <td>{lead.recovered ? "Yes" : "No"}</td>
                <td>{shortWhen(lead.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {workspace.leads.length === 0 ? <p className="px-4 py-8 text-sm text-ink/60">No leads yet.</p> : null}
      </div>
    </div>
  );
}
