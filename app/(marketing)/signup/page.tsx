import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";
import { supabaseConfigured } from "@/lib/integrations/status";
import { PAID_PLANS, isBillingInterval, normalizePaidPlan, TRIAL_DAYS } from "@/lib/billing/plans";
import { usd } from "@/lib/format";
import { FOUNDING_PILOT, foundingPlanSummary, isFoundingPilotOffer } from "@/lib/marketing/trust";

export const metadata: Metadata = { title: "Start a trial" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string; offer?: string; interval?: string }> }) {
  const params = await searchParams;
  const plan = normalizePaidPlan(params.plan ?? "") ?? "starter";
  const foundingPilot = isFoundingPilotOffer(params.offer);
  const requested = params.interval && isBillingInterval(params.interval) ? params.interval : "month";
  const interval = foundingPilot ? "month" : requested;
  const chosen = PAID_PLANS[plan];
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">
          {foundingPilot ? FOUNDING_PILOT.eyebrow : `${TRIAL_DAYS}-day trial`}
        </p>
        <h1 className="mt-3 font-display text-5xl">
          {foundingPilot ? "Join the founding pilot." : "Set up the shop before the next missed call."}
        </h1>
        <p className="mt-4 text-ink/75">
          You chose <span className="font-semibold capitalize">{plan}</span>
          {interval === "year" ? (
            <>
              {" "}
              on the annual price, {usd(chosen.annualMonthlyUsd)} per month ({usd(chosen.annualYearlyUsd)} per year). Annual is a 12-month commitment.
            </>
          ) : (
            <> on the month-to-month price, {usd(chosen.monthlyUsd)} per month. No contract. Cancel anytime.</>
          )}
          {" "}
          The trial does not charge a card in sandbox mode. After onboarding you will forward no-answer calls to your LeadRescue number.
        </p>
        {foundingPilot ? (
          <p className="mt-4 text-sm leading-relaxed text-ink/75">
            {foundingPlanSummary(plan)}
          </p>
        ) : null}
      </div>
      <SignupForm configured={supabaseConfigured()} plan={plan} foundingPilot={foundingPilot} interval={interval} />
    </div>
  );
}
