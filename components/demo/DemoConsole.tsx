"use client";

import { useMemo, useState } from "react";
import { DEMO_CALLER_PHONE } from "@/lib/demo/tenant";
import { createDemoWorkspace, demoCustomerReply, demoMissedCall } from "@/lib/demo/session";
import { formatPhone } from "@/lib/domain/phone";
import type { Workspace } from "@/lib/domain/types";

const SUGGESTIONS = [
  "My AC isn't cooling",
  "78704, no gas smell",
  "YES",
  "1",
  "Alex Rivera",
  "I smell gas",
  "STOP",
];

export function DemoConsole() {
  const started = useMemo(() => new Date(), []);
  const [workspace, setWorkspace] = useState<Workspace>(() => createDemoWorkspace(started));
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("No messages have been sent. This thread is fictional.");
  const [busy, setBusy] = useState(false);

  const lead = workspace.leads[0];
  const messages = workspace.messages.filter((message) => !lead || message.leadId === lead.id);
  const appointment = workspace.appointments[0];

  async function run(action: () => Promise<{ workspace: Workspace; effects: { sms: Array<{ delivery: string }> } }>, label: string) {
    setBusy(true);
    try {
      const result = await action();
      setWorkspace(result.workspace);
      const delivery = result.effects.sms.at(-1)?.delivery;
      setNote(
        delivery
          ? `Last action: ${label}. Delivery marked ${delivery}. Twilio was not called.`
          : `Last action: ${label}. No outbound text was produced.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
      <div className="rounded-[32px] bg-ink p-3 text-cream shadow-ticket">
        <div className="rounded-[26px] border border-white/10 bg-[#241e19] p-4">
          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-cream/50">
            <span>Demo HVAC Co</span>
            <span>{formatPhone(DEMO_CALLER_PHONE)}</span>
          </div>
          <div className="flex min-h-[420px] flex-col gap-2">
            {messages.length === 0 ? (
              <p className="m-auto max-w-[16rem] text-center text-sm text-cream/60">
                Simulate a missed call. The shop text will appear here, and you can answer as the caller.
              </p>
            ) : (
              messages.map((message) => (
                <p
                  key={message.id}
                  className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.direction === "outbound" ? "bg-cream text-ink" : "ml-auto bg-[#8e4318] text-cream"
                  }`}
                >
                  {message.body}
                </p>
              ))
            )}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const body = draft.trim();
              if (!body) return;
              setDraft("");
              void run(() => demoCustomerReply(workspace, body, started), `reply “${body}”`);
            }}
          >
            <label className="sr-only" htmlFor="demo-reply">
              Reply as the caller
            </label>
            <input
              id="demo-reply"
              className="field bg-white text-ink"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Reply as the caller"
            />
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Send
            </button>
          </form>
        </div>
      </div>
      <div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ink" type="button" disabled={busy} onClick={() => void run(() => demoMissedCall(workspace, started), "missed call")}>
            Simulate missed call
          </button>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              className="btn btn-ghost"
              type="button"
              disabled={busy}
              onClick={() => void run(() => demoCustomerReply(workspace, suggestion, started), suggestion)}
            >
              {suggestion}
            </button>
          ))}
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setWorkspace(createDemoWorkspace(started));
              setNote("Demo reset. Still fictional. Still no Twilio.");
            }}
          >
            Reset
          </button>
        </div>
        <p className="mt-4 text-sm text-ink/70">{note}</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["Service", lead?.service ?? "—"],
            ["Status", lead?.status ?? "waiting"],
            ["Emergency", lead?.emergency ? "yes" : "no"],
            ["Follow-up permission", lead?.followUpPermission ? "yes" : "no"],
            ["Recovered", lead?.recovered ? "yes" : "no"],
            ["Appointment", appointment ? `${appointment.customerName} · ${appointment.providerMode}` : "none"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-ink/10 bg-cream px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-ink/50">{label}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
