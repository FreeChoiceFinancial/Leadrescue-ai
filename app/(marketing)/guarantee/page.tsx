import type { Metadata } from "next";
import { LegalBanner } from "@/components/marketing/LegalBanner";
import {
  GUARANTEE_PENDING_LEGAL_REVIEW,
  GUARANTEE_REQUEST_EMAIL,
  GUARANTEE_TERMS_TEXT,
  RESULTS_GUARANTEE,
} from "@/lib/marketing/guarantee";

export const metadata: Metadata = { title: "Results guarantee (draft)" };

export default function GuaranteePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-16 text-sm leading-relaxed text-ink/80">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">{GUARANTEE_PENDING_LEGAL_REVIEW}</p>
      <h1 className="font-display text-5xl text-ink">Results guarantee</h1>
      <LegalBanner />
      <p className="font-display text-3xl leading-tight text-ink">{RESULTS_GUARANTEE}</p>
      <p>{GUARANTEE_TERMS_TEXT}</p>
      <h2 className="font-display text-2xl text-ink">What live means</h2>
      <p>The 60 days start after this shop&apos;s own A2P 10DLC brand and campaign are approved. Days before that approval do not count. A sandbox or demo account is not live.</p>
      <h2 className="font-display text-2xl text-ink">What the refund covers</h2>
      <p>The refund covers subscription fees and setup fees this shop paid to LeadRescue during that 60-day window. It does not cover carrier fees, Twilio usage, or a job the shop would have booked without the missed call.</p>
      <h2 className="font-display text-2xl text-ink">How to ask</h2>
      <p>
        Email{" "}
        <a className="underline" href={`mailto:${GUARANTEE_REQUEST_EMAIL}`}>
          {GUARANTEE_REQUEST_EMAIL}
        </a>{" "}
        within 14 days after the 60-day window ends. That address is a placeholder until the operator mailbox exists. The note should name the shop and the dates the campaign was approved.
      </p>
      <p>{GUARANTEE_PENDING_LEGAL_REVIEW} A lawyer has not signed this promise. Do not treat this page as a final contract.</p>
    </article>
  );
}
