"use client";

import Link from "next/link";
import { BRAND_ENTITY_NAME } from "@/lib/brand";

export function SmsConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-relaxed">
      <input
        className="mt-1"
        type="checkbox"
        name="smsConsent"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        I agree to receive text messages from LeadRescue AI ({BRAND_ENTITY_NAME}) about my inquiry and appointments. Msg
        frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of
        purchase. See <Link href="/sms-terms" className="underline">SMS Terms</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </span>
    </label>
  );
}
