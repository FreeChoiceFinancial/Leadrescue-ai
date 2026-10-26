import type { Metadata } from "next";
import Link from "next/link";
import { BrandContact } from "@/components/marketing/BrandContact";
import { BRAND_ENTITY_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "SMS terms" };

export default function SmsTermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-16 text-sm leading-relaxed text-ink/80">
      <h1 className="font-display text-5xl text-ink">SMS terms</h1>
      <p className="font-display text-2xl leading-tight text-ink">LeadRescue AI by {BRAND_ENTITY_NAME}</p>
      <p>
        LeadRescue AI sends missed-call follow-up, appointment scheduling, and service updates. Message frequency varies.
        Msg & data rates may apply. Reply STOP to opt out and HELP for help.
      </p>
      <p>Carriers are not liable for delayed or undelivered messages.</p>
      <p>
        <Link className="underline" href="/privacy">
          Privacy policy
        </Link>
        {" · "}
        <Link className="underline" href="/terms">
          Terms of service
        </Link>
      </p>
      <h2 className="font-display text-2xl text-ink">Contact</h2>
      <BrandContact />
    </article>
  );
}
