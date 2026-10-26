import type { Metadata } from "next";
import Link from "next/link";
import { DoneForYou } from "@/components/marketing/DoneForYou";
import { FoundingPilot } from "@/components/marketing/FoundingPilot";
import { PricingChooser } from "@/components/marketing/PricingChooser";
import { ResultsGuarantee } from "@/components/marketing/ResultsGuarantee";
import { RevenueCalculator } from "@/components/marketing/RevenueCalculator";
import { OVERAGE_USD, SETUP_FEE_USD, TRIAL_DAYS } from "@/lib/billing/plans";
import { showGuarantee } from "@/lib/marketing/guarantee";
import { usd } from "@/lib/format";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">Monthly or annual</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-tight">Pay for the conversations you recover.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink/75">
        Every plan includes a {TRIAL_DAYS}-day trial and {usd(OVERAGE_USD)} for each conversation past the allowance. Ten extra conversations are {usd(OVERAGE_USD * 10)}. Month-to-month has a one-time {usd(SETUP_FEE_USD)} setup fee. Annual has no setup fee.{" "}
        <Link href="/compare" className="link font-semibold text-copper">
          See how that compares with Podium, Hatch, and HighLevel.
        </Link>
      </p>
      {showGuarantee() ? <ResultsGuarantee /> : null}
      <RevenueCalculator />
      <DoneForYou />
      <FoundingPilot contained={false} />
      <div className="mt-10">
        <PricingChooser />
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["What counts", "A conversation starts when a new caller thread is opened. Follow-up texts inside that thread do not count again."],
          ["What the setup fee covers", "On month-to-month, the setup fee covers number forwarding guidance, quiet hours, owner alerts, and the first calendar connection. It is not a deposit. Annual plans have no setup fee."],
          ["How billing stays honest", "Checkout, the customer portal, and webhooks use Stripe test mode until you connect sk_test_ keys. Live secret keys are refused."],
        ].map(([title, copy]) => (
          <article key={title} className="rounded-3xl border border-ink/10 bg-cream p-5">
            <h2 className="font-display text-2xl">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{copy}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
