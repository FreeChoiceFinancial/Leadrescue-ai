import { shortWhen } from "@/lib/format";
import { getPortalModel } from "@/lib/portal/load";
import { StatusChip } from "@/components/portal/StatusChip";

export default async function AppointmentsPage() {
  const { workspace } = await getPortalModel();
  return (
    <div>
      <h1 className="font-display text-4xl">Appointments</h1>
      <p className="mt-2 text-sm text-ink/70">Sandbox bookings are labeled so they are never confused with Google Calendar.</p>
      <div className="mt-6 space-y-3">
        {workspace.appointments.map((appointment) => (
          <article key={appointment.id} className="rounded-3xl bg-cream p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl">{appointment.customerName}</h2>
              <StatusChip value={appointment.status} />
            </div>
            <p className="mt-2 text-sm">
              {appointment.service} · {shortWhen(appointment.startsAt)} – {shortWhen(appointment.endsAt)}
            </p>
            <p className="text-sm text-ink/60">
              {appointment.provider} provider · {appointment.providerMode}
              {appointment.externalEventId ? ` · ${appointment.externalEventId}` : ""}
            </p>
          </article>
        ))}
        {workspace.appointments.length === 0 ? <p className="text-sm text-ink/60">No appointments yet.</p> : null}
      </div>
    </div>
  );
}
