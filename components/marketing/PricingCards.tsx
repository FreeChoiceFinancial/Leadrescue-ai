import Link from "next/link";
import { OVERAGE_USD, PAID_PLANS, SETUP_FEE_USD, TRIAL_DAYS, type BillingInterval } from "@/lib/billing/plans";
import { usd } from "@/lib/format";

export function PricingCards({ interval = "month" }: { interval?: BillingInterval }) {
  const annual = interval === "year";
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Object.values(PAID_PLANS).map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col rounded-3xl border p-6 ${plan.id === "growth" ? "border-copper bg-white shadow-ticket" : "border-ink/10 bg-cream"}`}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">{plan.name}</p>
            <p className="mt-4 font-display text-5xl">{usd(annual ? plan.annualMonthlyUsd : plan.monthlyUsd)}</p>
            <p className="text-sm text-ink/60">{annual ? "per month, billed yearly" : "per month, cancel anytime"}</p>
            {annual ? (
              <p className="mt-2 text-sm font-semibold">
                {usd(plan.annualYearlyUsd)} per year. Annual is a 12-month commitment.
              </p>
            ) : (
              <p className="mt-2 text-sm font-semibold">No contract. Cancel anytime.</p>
            )}
            <p className="mt-4 text-sm leading-relaxed text-ink/80">{plan.blurb}</p>
            <p className="mt-4 text-sm font-semibold">{plan.conversations.toLocaleString()} conversations included</p>
            <p className="mt-1 text-sm text-ink/70">Then {usd(OVERAGE_USD)} each. Setup fee {usd(SETUP_FEE_USD)} once.</p>
            <p className="mt-1 text-sm text-ink/70">Unlimited team members, at no extra cost.</p>
            <Link href={annual ? `/signup?plan=${plan.id}&interval=year` : `/signup?plan=${plan.id}`} className="btn btn-ink mt-6">
              Start {TRIAL_DAYS}-day trial
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink/60">
        A conversation is one caller thread, not each text. Trials include the Starter allowance. Stripe runs in test mode until you add test keys. This app does not create live Stripe products.
      </p>
    </div>
  );
}
