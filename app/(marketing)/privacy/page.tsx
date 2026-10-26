import type { Metadata } from "next";
import { BrandContact } from "@/components/marketing/BrandContact";
import { LegalBanner } from "@/components/marketing/LegalBanner";
import { BRAND_EMAIL, BRAND_ENTITY_NAME, BRAND_PHONE_DISPLAY, BRAND_PHONE_E164, brandMailingAddress } from "@/lib/brand";
import { SMS_NO_SHARE_TEXT } from "@/lib/compliance/sms-consent";

export const metadata: Metadata = { title: "Privacy policy (draft)" };

export default function PrivacyPage() {
  const address = brandMailingAddress();
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-16 text-sm leading-relaxed text-ink/80">
      <h1 className="font-display text-5xl text-ink">Privacy policy</h1>
      <LegalBanner />
      <p>
        Operator: {BRAND_ENTITY_NAME}.
        {address ? ` Mailing address: ${address}.` : null} Contact:{" "}
        <a className="underline" href={`mailto:${BRAND_EMAIL}`}>
          {BRAND_EMAIL}
        </a>{" "}
        or{" "}
        <a className="underline" href={`tel:${BRAND_PHONE_E164}`}>
          {BRAND_PHONE_DISPLAY}
        </a>
        .
      </p>
      <BrandContact />
      <h2 className="font-display text-2xl text-ink">What we collect</h2>
      <p>Account data for the shop (name, email, phone, timezone, address), caller phone numbers, SMS content, appointment times, billing status from Stripe, and product logs needed to send or suppress messages. We do not ask callers for payment card numbers.</p>
      <h2 className="font-display text-2xl text-ink">Why we use it</h2>
      <p>To recover a missed call the person already placed, qualify HVAC service, book an appointment the shop can keep, honor STOP and quiet hours, bill the shop, and notify the owner of emergencies. The first text is about that missed call. Follow-up texts require a separate YES.</p>
      <h2 className="font-display text-2xl text-ink">Who else processes it</h2>
      <p>When you connect them: Supabase (database and login), Twilio (voice and SMS), Stripe (subscriptions), Google Calendar (free/busy and events), an LLM provider (reply wording), and an email provider (owner notices). Sandbox mode uses none of these and keeps the demo on the server handling the page.</p>
      <h2 className="font-display text-2xl text-ink">How long</h2>
      <p>Shop data stays for the life of the account and a limited wind-down period still to be set by counsel. Opt-out records are kept so we do not text that number again. You can ask for an export or deletion of a caller thread, subject to records we must retain to prove consent.</p>
      <h2 className="font-display text-2xl text-ink">SMS and mobile information</h2>
      <p>{SMS_NO_SHARE_TEXT}</p>
      <h2 className="font-display text-2xl text-ink">Cookies</h2>
      <p>The signed-in app uses cookies for the Supabase session. Sandbox onboarding stores a business profile cookie on this site. The marketing pages do not run advertising trackers.</p>
      <h2 className="font-display text-2xl text-ink">Your choices</h2>
      <p>
        Callers reply STOP to opt out or HELP for help. Shops access and correct their business profile in the dashboard. To
        raise a privacy request, email{" "}
        <a className="underline" href={`mailto:${BRAND_EMAIL}`}>
          {BRAND_EMAIL}
        </a>
        .
      </p>
    </article>
  );
}
