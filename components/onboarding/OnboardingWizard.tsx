"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SmsConsentCheckbox } from "@/components/marketing/SmsConsentCheckbox";
import { FOUNDING_PILOT } from "@/lib/marketing/trust";

const STEPS = ["Business", "Hours", "Alerts", "Review"];

export function OnboardingWizard({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<"sandbox" | "live" | null>(null);
  const [foundingPilot, setFoundingPilot] = useState(false);
  const [form, setForm] = useState({
    name: "Northwind HVAC",
    timezone: "America/Chicago",
    businessPhone: "5125550190",
    quietHoursStart: 21,
    quietHoursEnd: 8,
    ownerNotifyPhone: "5125550191",
    ownerNotifyEmail: "owner@northwind.example",
    physicalAddress: "400 Fictional St, Austin, TX 78702",
    smsFromNumber: "",
    smsConsent: false,
  });

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("lr_signup_draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as { foundingPilot?: boolean };
      setFoundingPilot(Boolean(draft.foundingPilot));
    } catch {
      setFoundingPilot(false);
    }
  }, []);

  function update(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function submit() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json()) as { error?: string; mode?: "sandbox" | "live" };
    if (!response.ok) {
      setError(payload.error ?? "Could not save the business.");
      setPending(false);
      return;
    }
    setDone(payload.mode ?? "sandbox");
    setPending(false);
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-cream p-6">
        <p className="chip chip-warn">{done === "sandbox" ? "Sandbox profile saved in a cookie" : "Business created"}</p>
        <h2 className="mt-4 font-display text-3xl">Forward no-answer calls, then wait.</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink/80">
          <li>On the shop phone, set conditional forwarding for no-answer to your LeadRescue number.</li>
          <li>
            <Link href="/onboarding/10dlc" className="font-semibold underline">
              Register A2P 10DLC
            </Link>{" "}
            for this business&apos;s own brand. The form does not file the registration. Live texts stay blocked until an operator marks the brand approved.
          </li>
          <li>Connect Google Calendar when you want real free/busy. Until then, bookings are labeled sandbox.</li>
        </ol>
        <button className="btn btn-primary mt-6" type="button" onClick={() => router.push("/dashboard")}>
          Open the dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-ink/10 bg-cream p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-copper">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      {!configured ? (
        <p className="mt-3 text-sm text-ink/70">Sandbox onboarding. Nothing is written to Supabase.</p>
      ) : null}
      {foundingPilot ? (
        <p className="mt-3 text-sm text-ink/70">{FOUNDING_PILOT.flagNote}</p>
      ) : null}
      <div className="mt-5 space-y-4">
        {step === 0 ? (
          <>
            <Field label="Business name" value={form.name} onChange={(name) => update({ name })} />
            <Field label="Business phone" value={form.businessPhone} onChange={(businessPhone) => update({ businessPhone })} />
            <SmsConsentCheckbox checked={form.smsConsent} onChange={(smsConsent) => update({ smsConsent })} />
          </>
        ) : null}
        {step === 1 ? (
          <>
            <label className="block text-sm font-semibold">
              Timezone
              <select className="field mt-1" value={form.timezone} onChange={(event) => update({ timezone: event.target.value })}>
                {["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles"].map((zone) => (
                  <option key={zone}>{zone}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Quiet hours start" value={form.quietHoursStart} onChange={(quietHoursStart) => update({ quietHoursStart })} />
              <NumberField label="Quiet hours end" value={form.quietHoursEnd} onChange={(quietHoursEnd) => update({ quietHoursEnd })} />
            </div>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Field label="Owner alert phone" value={form.ownerNotifyPhone} onChange={(ownerNotifyPhone) => update({ ownerNotifyPhone })} />
            <Field label="Owner alert email" value={form.ownerNotifyEmail} onChange={(ownerNotifyEmail) => update({ ownerNotifyEmail })} />
            <Field label="Street address" value={form.physicalAddress} onChange={(physicalAddress) => update({ physicalAddress })} />
            <Field label="LeadRescue SMS number (optional)" value={form.smsFromNumber} onChange={(smsFromNumber) => update({ smsFromNumber })} />
          </>
        ) : null}
        {step === 3 ? (
          <dl className="space-y-2 text-sm">
            {Object.entries(form).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-b border-dashed border-ink/15 py-2">
                <dt className="text-ink/55">{key}</dt>
                <dd className="text-right">{String(value || "—")}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-stamp">{error}</p> : null}
      <div className="mt-6 flex justify-between gap-3">
        <button className="btn btn-ghost" type="button" disabled={step === 0 || pending} onClick={() => setStep((value) => value - 1)}>
          Back
        </button>
        {step < 3 ? (
          <button className="btn btn-ink" type="button" onClick={() => setStep((value) => value + 1)}>
            Continue
          </button>
        ) : (
          <button className="btn btn-primary" type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? "Saving…" : "Finish onboarding"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input className="field mt-1" type="number" min={0} max={23} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
