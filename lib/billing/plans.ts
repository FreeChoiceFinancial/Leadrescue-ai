import type { PlanId, Tenant } from "@/lib/domain/types";

export const SETUP_FEE_USD = 99;
export const OVERAGE_USD = 0.5;
export const TRIAL_DAYS = 14;
export const TRIAL_CONVERSATIONS = 150;
/** No per-plan seat cap. Pricing counts conversations, not team members. */
export const SEAT_LIMIT = null;
export const ANNUAL_COMMITMENT_MONTHS = 12;
/** Month-to-month list price is 60% higher than the annual per-month price. */
export const MONTHLY_OVER_ANNUAL = 1.6;

export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export function isBillingInterval(value: string): value is BillingInterval {
  return value === "month" || value === "year";
}

/** Published annual per-month price: list ÷ 1.6, rounded to the dollar. */
export function annualPerMonthUsd(monthlyUsd: number): number {
  return Math.round(monthlyUsd / MONTHLY_OVER_ANNUAL);
}

export function annualPerYearUsd(monthlyUsd: number): number {
  return annualPerMonthUsd(monthlyUsd) * ANNUAL_COMMITMENT_MONTHS;
}

function paidPlan<T extends { monthlyUsd: number }>(plan: T) {
  const annualMonthlyUsd = annualPerMonthUsd(plan.monthlyUsd);
  return {
    ...plan,
    annualMonthlyUsd,
    annualYearlyUsd: annualMonthlyUsd * ANNUAL_COMMITMENT_MONTHS,
  };
}

export const PAID_PLANS = {
  starter: paidPlan({
    id: "starter" as const,
    name: "Starter",
    monthlyUsd: 199,
    conversations: 150,
    blurb: "For a two-truck shop that misses a handful of calls a week.",
  }),
  growth: paidPlan({
    id: "growth" as const,
    name: "Growth",
    monthlyUsd: 399,
    conversations: 400,
    blurb: "For a busy owner-operator with a dispatcher and several crews.",
  }),
  premium: paidPlan({
    id: "premium" as const,
    name: "Premium",
    monthlyUsd: 699,
    conversations: 1000,
    blurb: "For a 10–15 person company that wants the full recovery desk.",
  }),
};

export type PaidPlanId = keyof typeof PAID_PLANS;

export function isPaidPlan(value: string): value is PaidPlanId {
  return value === "starter" || value === "growth" || value === "premium";
}

export function allowanceFor(plan: PlanId): number {
  if (plan === "trial") return TRIAL_CONVERSATIONS;
  return PAID_PLANS[plan].conversations;
}

export function meterConversation(tenant: Tenant): {
  tenant: Tenant;
  kind: "included" | "overage";
} {
  const conversationsUsed = tenant.conversationsUsed + 1;
  const over = conversationsUsed > tenant.conversationAllowance;
  return {
    kind: over ? "overage" : "included",
    tenant: {
      ...tenant,
      conversationsUsed,
      overageConversations: tenant.overageConversations + (over ? 1 : 0),
    },
  };
}

export function overageAmountUsd(overageConversations: number): number {
  return Math.round(overageConversations * OVERAGE_USD * 100) / 100;
}

const STRIPE_PRICE_ENV: Record<PaidPlanId, Record<BillingInterval, string>> = {
  starter: { month: "STRIPE_PRICE_STARTER", year: "STRIPE_PRICE_STARTER_ANNUAL" },
  growth: { month: "STRIPE_PRICE_GROWTH", year: "STRIPE_PRICE_GROWTH_ANNUAL" },
  premium: { month: "STRIPE_PRICE_PREMIUM", year: "STRIPE_PRICE_PREMIUM_ANNUAL" },
};

/** Test-dashboard price ids only. This app never creates Stripe products. */
export function stripePriceEnv(plan: PaidPlanId, interval: BillingInterval = "month"): string {
  return STRIPE_PRICE_ENV[plan][interval];
}

export function stripePriceId(plan: PaidPlanId, interval: BillingInterval = "month"): string | undefined {
  return process.env[stripePriceEnv(plan, interval)];
}

export function planFromStripePrice(priceId: string | null | undefined): PaidPlanId | null {
  if (!priceId) return null;
  for (const plan of Object.keys(PAID_PLANS) as PaidPlanId[]) {
    if (priceId === stripePriceId(plan, "month") || priceId === stripePriceId(plan, "year")) return plan;
  }
  return null;
}
