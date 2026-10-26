import type { Metadata } from "next";
import { LegalBanner } from "@/components/marketing/LegalBanner";
import { foundingPilotPlainText } from "@/lib/marketing/trust";

export const metadata: Metadata = { title: "Terms of service (draft)" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-16 text-sm leading-relaxed text-ink/80">
      <h1 className="font-display text-5xl text-ink">Terms of service</h1>
      <LegalBanner />
      <p>These terms are a draft between [Operator legal name — complete before launch] and the HVAC business that creates an account. They are not an offer to consumers who text the shop.</p>
      <h2 className="font-display text-2xl text-ink">The service</h2>
      <p>LeadRescue sends informational texts after missed calls, qualifies repair, maintenance, and install requests, offers appointment times, and notifies the owner of emergencies or frustrated callers. It does not dispatch technicians, guarantee revenue, or replace 911.</p>
      <h2 className="font-display text-2xl text-ink">Your responsibilities</h2>
      <p>You provide a number you control, complete your own A2P 10DLC brand and campaign, keep quiet hours accurate, and only enable live sending after carrier approval. You are responsible for the calls you forward and for honoring opt-outs. You will not upload purchased lists.</p>
      <h2 className="font-display text-2xl text-ink">Plans and fees</h2>
      <p>
        Public month-to-month prices are Starter $199, Growth $399, and Premium $699 per month, with no contract. Annual is a 12-month commitment at Starter $124 per month ($1,488 per year), Growth $249 per month ($2,988 per year), and Premium $437 per month ($5,244 per year). A $99 setup fee and $0.50 per conversation over the plan allowance still apply. A 14-day trial applies as described at signup. {foundingPilotPlainText()} Taxes and carrier fees are extra. Stripe test mode does not collect real funds, and this app does not create live Stripe products.
      </p>
      <h2 className="font-display text-2xl text-ink">Acceptable use</h2>
      <p>You will not use the product to deceive callers, hide the business identity, evade STOP, or message outside the consent described in the compliance notes. We may suspend live sending if a campaign is rejected or complaint rates spike.</p>
      <h2 className="font-display text-2xl text-ink">Disclaimers</h2>
      <p>The product is provided as available. Appointment slots are only as accurate as the calendar you connect. Sandbox and demo data are fictional. The $360 figure on the homepage is HomeGuide’s published national average for AC repair. It is a cost benchmark. Your jobs will differ.</p>
      <h2 className="font-display text-2xl text-ink">Liability</h2>
      <p>Counsel should set a liability cap, exclusions, and the governing state before launch. Until that review, do not treat this draft as the contract you sell under.</p>
    </article>
  );
}
