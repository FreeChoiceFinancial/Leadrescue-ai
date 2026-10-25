import { shortWhen } from "@/lib/format";
import { getPortalModel } from "@/lib/portal/load";

export default async function ActivityPage() {
  const { workspace } = await getPortalModel();
  const consent = workspace.consentEvents;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h1 className="font-display text-4xl">Activity</h1>
        <ul className="mt-4 space-y-3">
          {workspace.activity.map((item) => (
            <li key={item.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-ink/45">
                {item.kind} · {shortWhen(item.createdAt)}
              </p>
              <p className="mt-1">{item.summary}</p>
            </li>
          ))}
          {workspace.activity.length === 0 ? <li className="text-sm text-ink/60">No activity yet.</li> : null}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-3xl">Consent log</h2>
        <ul className="mt-4 space-y-3">
          {consent.map((event) => (
            <li key={event.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-ink/45">
                {event.eventType} · {shortWhen(event.createdAt)}
              </p>
              <p className="mt-1">
                {event.phone} — {event.detail}
              </p>
            </li>
          ))}
          {consent.length === 0 ? <li className="text-sm text-ink/60">No consent events yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
