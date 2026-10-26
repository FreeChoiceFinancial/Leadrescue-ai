"use client";

import { useState } from "react";
import { SmsConsentCheckbox } from "@/components/marketing/SmsConsentCheckbox";

export function PhoneOptInForm({
  source,
  includeMessage = false,
}: {
  source: "demo" | "contact";
  includeMessage?: boolean;
}) {
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<{ smsConsent: boolean; smsConsentAt: string | null } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/sms-opt-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        message: String(form.get("message") ?? ""),
        smsConsent,
      }),
    });
    const payload = (await response.json()) as { error?: string; smsConsent?: boolean; smsConsentAt?: string | null };
    if (!response.ok || typeof payload.smsConsent !== "boolean") {
      setError(payload.error ?? "Could not save the form.");
      setPending(false);
      return;
    }
    setSaved({ smsConsent: payload.smsConsent, smsConsentAt: payload.smsConsentAt ?? null });
    setPending(false);
  }

  if (saved) {
    return (
      <p className="rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm leading-relaxed">
        Saved. No text was sent.
        {saved.smsConsent && saved.smsConsentAt
          ? ` SMS consent was recorded at ${saved.smsConsentAt}.`
          : " SMS consent was left unchecked."}
      </p>
    );
  }

  return (
    <form className="space-y-4 rounded-3xl border border-ink/10 bg-cream p-6" onSubmit={onSubmit}>
      {includeMessage ? (
        <label className="block text-sm font-semibold">
          Name
          <input className="field mt-1" name="name" autoComplete="name" />
        </label>
      ) : null}
      <label className="block text-sm font-semibold">
        Mobile phone
        <input className="field mt-1" name="phone" type="tel" required autoComplete="tel" inputMode="tel" />
      </label>
      {includeMessage ? (
        <label className="block text-sm font-semibold">
          Message
          <textarea className="field mt-1 min-h-28" name="message" />
        </label>
      ) : null}
      <SmsConsentCheckbox checked={smsConsent} onChange={setSmsConsent} />
      <p className="text-xs leading-relaxed text-ink/60">
        The checkbox starts unchecked and is optional. Submitting this form does not send a text.
      </p>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-[#8d2f2a]">
          {error}
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
