import Link from "next/link";
import { OVERAGE_USD, PAID_PLANS, SETUP_FEE_USD, TRIAL_DAYS } from "@/lib/billing/plans";
import { usd } from "@/lib/format";

export function PricingCards() {
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Object.values(PAID_PLANS).map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col rounded-3xl border p-6 ${plan.id === "growth" ? "border-copper bg-white shadow-ticket" : "border-ink/10 bg-cream"}`}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">{plan.name}</p>
            <p className="mt-4 font-display text-5xl">{usd(plan.monthlyUsd)}</p>
            <p className="text-sm text-ink/60">per month, cancel anytime</p>
            <p className="mt-4 text-sm leading-relaxed text-ink/80">{plan.blurb}</p>
            <p className="mt-4 text-sm font-semibold">{plan.conversations.toLocaleString()} conversations included</p>
            <p className="mt-1 text-sm text-ink/70">Then {usd(OVERAGE_USD)} each. Setup fee {usd(SETUP_FEE_USD)} once.</p>
            <Link href={`/signup?plan=${plan.id}`} className="btn btn-ink mt-6">
              Start {TRIAL_DAYS}-day trial
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink/60">
        A conversation is one caller thread, not each text. Trials include the Starter allowance. Stripe runs in test mode until you add test keys.
      </p>
    </div>
  );
}
