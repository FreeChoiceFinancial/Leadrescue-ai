import type { Metadata } from "next";
import { PricingCards } from "@/components/marketing/PricingCards";
import { OVERAGE_USD, SETUP_FEE_USD, TRIAL_DAYS } from "@/lib/billing/plans";
import { usd } from "@/lib/format";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">Month to month</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-tight">Pay for the conversations you recover. Cancel when you want.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink/75">
        Every plan includes a {TRIAL_DAYS}-day trial, a one-time {usd(SETUP_FEE_USD)} setup fee, and {usd(OVERAGE_USD)} for each conversation past the allowance. Ten extra conversations are {usd(OVERAGE_USD * 10)}.
      </p>
      <div className="mt-10">
        <PricingCards />
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["What counts", "A conversation starts when a new caller thread is opened. Follow-up texts inside that thread do not count again."],
          ["What the setup fee covers", "Number forwarding guidance, quiet hours, owner alerts, and the first calendar connection. It is not a deposit."],
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
