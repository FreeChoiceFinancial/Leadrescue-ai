"use client";

import { useState } from "react";
import { SmsConsentCheckbox } from "@/components/marketing/SmsConsentCheckbox";
import {
  A2P_LIMITS,
  A2P_RECEIVED_CONFIRMATION,
  A2P_STATUS_LABELS,
  BUSINESS_TYPES,
  USE_CASES,
  VERTICALS,
  a2pAttestationLabel,
  type A2pStatus,
} from "@/lib/compliance/a2p-copy";

export type TenDlcDefaults = {
  campaignDescription: string;
  sampleMessages: [string, string];
  optInDescription: string;
  stopMessage: string;
  helpMessage: string;
};

export type TenDlcSaved = {
  legalBusinessName: string;
  status: A2pStatus;
  einMasked: string;
  useCase: "customer_care" | "mixed";
};

type Receipt = {
  confirmation: string;
  einMasked: string;
  status: A2pStatus;
  filed: false;
};

export function TenDlcForm({ defaults, saved }: { defaults: TenDlcDefaults; saved: TenDlcSaved | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [samples, setSamples] = useState<string[]>(defaults.sampleMessages);
  const [campaignDescription, setCampaignDescription] = useState(defaults.campaignDescription);
  const [optInDescription, setOptInDescription] = useState(defaults.optInDescription);
  const [stopMessage, setStopMessage] = useState(defaults.stopMessage);
  const [helpMessage, setHelpMessage] = useState(defaults.helpMessage);
  const [useCase, setUseCase] = useState<"customer_care" | "mixed">(saved?.useCase ?? "customer_care");
  const [attested, setAttested] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/onboarding/10dlc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalBusinessName: form.get("legalBusinessName"),
        ein: form.get("ein"),
        businessType: form.get("businessType"),
        street: form.get("street"),
        city: form.get("city"),
        region: form.get("region"),
        postalCode: form.get("postalCode"),
        country: "US",
        website: form.get("website"),
        contactName: form.get("contactName"),
        contactEmail: form.get("contactEmail"),
        contactPhone: form.get("contactPhone"),
        vertical: form.get("vertical"),
        useCase,
        campaignDescription,
        sampleMessages: samples.map((sample) => sample.trim()).filter(Boolean),
        optInDescription,
        stopMessage,
        helpMessage,
        attested,
        smsConsent,
      }),
    });
    const payload = (await response.json()) as Partial<Receipt> & { error?: string; ein?: string };
    if (!response.ok || payload.filed !== false || payload.confirmation !== A2P_RECEIVED_CONFIRMATION || !payload.einMasked) {
      setError(payload.error ?? "Could not save the registration.");
      setPending(false);
      return;
    }
    setReceipt({
      confirmation: payload.confirmation,
      einMasked: payload.einMasked,
      status: "pending_review",
      filed: false,
    });
    setPending(false);
  }

  if (receipt) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-cream p-6">
        <p className="chip chip-warn">Pending review</p>
        <h2 className="mt-4 font-display text-3xl">Registration received for review.</h2>
        <p className="mt-3 text-sm leading-relaxed">{receipt.confirmation}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink/75">
          Nothing has been filed with Twilio or the carriers. Status: {A2P_STATUS_LABELS[receipt.status]}. EIN on file {receipt.einMasked}.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-8" onSubmit={submit} autoComplete="on">
      {saved ? (
        <p className="rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed">
          {saved.legalBusinessName} is {A2P_STATUS_LABELS[saved.status].toLowerCase()}. EIN on file {saved.einMasked}. Enter the EIN again only to replace it. Nothing is filed from this page.
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-ink/70">
          This saves a review request for the shop. It does not file a brand or campaign with Twilio or the carriers.
        </p>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Business</h2>
        <Field label="Legal business name" name="legalBusinessName" defaultValue={saved?.legalBusinessName ?? ""} required />
        <Field label="EIN" name="ein" required autoComplete="off" inputMode="numeric" placeholder="12-3456789" spellCheck={false} />
        <Select label="Business type" name="businessType" options={BUSINESS_TYPES.map((type) => [type, type])} />
        <Select label="Vertical" name="vertical" options={VERTICALS} />
        <Field label="Website" name="website" type="url" required placeholder="https://example.com" />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Address</h2>
        <Field label="Street" name="street" required />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" name="city" required />
          <Field label="State" name="region" required maxLength={2} placeholder="TX" />
          <Field label="ZIP" name="postalCode" required inputMode="numeric" placeholder="78701" />
        </div>
        <label className="block text-sm font-semibold">
          Country
          <input className="field mt-1" value="United States" readOnly name="countryDisplay" />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Authorized contact</h2>
        <Field label="Contact name" name="contactName" required autoComplete="name" />
        <Field label="Contact email" name="contactEmail" type="email" required autoComplete="email" />
        <Field label="Contact phone" name="contactPhone" type="tel" required autoComplete="tel" />
        <SmsConsentCheckbox checked={smsConsent} onChange={setSmsConsent} />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Campaign</h2>
        <fieldset>
          <legend className="text-sm font-semibold">Use case</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {USE_CASES.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="useCase" value={value} checked={useCase === value} onChange={() => setUseCase(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <TextBlock
          label="Campaign description"
          value={campaignDescription}
          onChange={setCampaignDescription}
          min={A2P_LIMITS.descriptionMin}
          max={A2P_LIMITS.descriptionMax}
        />
        <TextBlock
          label="How people opt in"
          hint="Missed-call text-back. Edit this if the shop's forwarding path is different, and keep the consent language."
          value={optInDescription}
          onChange={setOptInDescription}
          min={A2P_LIMITS.optInMin}
          max={A2P_LIMITS.optInMax}
        />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Sample messages</h3>
            <button
              type="button"
              className="text-sm font-semibold underline"
              onClick={() => {
                if (samples.length >= A2P_LIMITS.sampleCountMax) return;
                setSamples((current) => [...current, ""]);
              }}
            >
              Add a sample
            </button>
          </div>
          {samples.map((sample, index) => (
            <TextBlock
              key={index}
              label={`Sample ${index + 1}`}
              value={sample}
              onChange={(value) => setSamples((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))}
              min={A2P_LIMITS.sampleMin}
              max={A2P_LIMITS.sampleMax}
            />
          ))}
        </div>
        <TextBlock label="STOP message" value={stopMessage} onChange={setStopMessage} min={A2P_LIMITS.keywordMin} max={A2P_LIMITS.keywordMax} />
        <TextBlock label="HELP message" value={helpMessage} onChange={setHelpMessage} min={A2P_LIMITS.keywordMin} max={A2P_LIMITS.keywordMax} />
      </section>

      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <input className="mt-1" type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} required />
        <span>{a2pAttestationLabel()}</span>
      </label>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-[#8d2f2a]">
          {error}
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending || !attested}>
        {pending ? "Saving…" : "Save for review"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...props
}: {
  label: string;
  name: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input className="field mt-1" name={name} type={type} {...props} />
    </label>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: readonly (readonly [string, string])[] }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select className="field mt-1" name={name} defaultValue={options[0]?.[0]}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextBlock({
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
}) {
  const length = value.trim().length;
  return (
    <label className="block text-sm font-semibold">
      <span className="flex items-baseline justify-between gap-3">
        {label}
        <span className="text-xs font-medium text-ink/50">
          {length}/{max}
          {length < min ? ` · at least ${min}` : ""}
        </span>
      </span>
      {hint ? <span className="mt-1 block text-xs font-normal text-ink/60">{hint}</span> : null}
      <textarea className="field mt-1 min-h-28" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
