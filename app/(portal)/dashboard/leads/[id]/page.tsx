import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/portal/StatusChip";
import { formatPhone } from "@/lib/domain/phone";
import { shortWhen } from "@/lib/format";
import { getPortalModel } from "@/lib/portal/load";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace } = await getPortalModel();
  const lead = workspace.leads.find((item) => item.id === id);
  if (!lead) notFound();
  const messages = workspace.messages.filter((message) => message.leadId === lead.id);
  const appointment = workspace.appointments.find((item) => item.leadId === lead.id);
  const escalation = workspace.escalations.find((item) => item.leadId === lead.id);
  return (
    <div>
      <Link href="/dashboard/leads" className="text-sm font-semibold">
        All leads
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl">{lead.displayName ?? formatPhone(lead.phone)}</h1>
        <StatusChip value={lead.status} />
      </div>
      <p className="mt-2 text-sm text-ink/65">
        {formatPhone(lead.phone)} · {lead.service} · {lead.source}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl bg-cream p-5">
          <h2 className="font-display text-2xl">Conversation</h2>
          <div className="mt-4 space-y-3">
            {messages.map((message) => (
              <article key={message.id} className="rounded-2xl border border-ink/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wider text-ink/45">
                  {message.direction} · {message.delivery} · {shortWhen(message.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
              </article>
            ))}
            {messages.length === 0 ? <p className="text-sm text-ink/60">No messages.</p> : null}
          </div>
        </section>
        <aside className="space-y-4">
          <section className="rounded-3xl bg-cream p-5 text-sm">
            <h2 className="font-display text-2xl">Qualifying</h2>
            <dl className="mt-3 space-y-2">
              {Object.entries(lead.qualifying).filter(([key]) => key !== "offeredSlots").map(([key, value]) => (
                <div key={key}>
                  <dt className="text-ink/50">{key}</dt>
                  <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3">Follow-up permission: {lead.followUpPermission ? "yes" : "no"}</p>
            <p>Follow-ups sent: {lead.followUpCount} of 3</p>
            <p>Opted out: {lead.optedOut ? "yes" : "no"}</p>
          </section>
          {appointment ? (
            <section className="rounded-3xl bg-cream p-5 text-sm">
              <h2 className="font-display text-2xl">Appointment</h2>
              <p className="mt-2">{shortWhen(appointment.startsAt)}</p>
              <p>
                {appointment.provider} · {appointment.providerMode}
              </p>
            </section>
          ) : null}
          {escalation ? (
            <section className="rounded-3xl bg-[#f8e2df] p-5 text-sm">
              <h2 className="font-display text-2xl">Escalation</h2>
              <p className="mt-2">{escalation.reason}</p>
              <p>{escalation.summary}</p>
              <p className="mt-2 text-ink/70">Owner notice delivery: {escalation.delivery}</p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
