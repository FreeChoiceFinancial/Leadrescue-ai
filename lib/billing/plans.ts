import type { PlanId, Tenant } from "@/lib/domain/types";

export const SETUP_FEE_USD = 99;
export const OVERAGE_USD = 0.5;
export const TRIAL_DAYS = 14;
export const TRIAL_CONVERSATIONS = 150;

export const PAID_PLANS = {
  starter: {
    id: "starter" as const,
    name: "Starter",
    monthlyUsd: 199,
    conversations: 150,
    blurb: "For a two-truck shop that misses a handful of calls a week.",
  },
  growth: {
    id: "growth" as const,
    name: "Growth",
    monthlyUsd: 399,
    conversations: 400,
    blurb: "For a busy owner-operator with a dispatcher and several crews.",
  },
  premium: {
    id: "premium" as const,
    name: "Premium",
    monthlyUsd: 699,
    conversations: 1000,
    blurb: "For a 10–15 person company that wants the full recovery desk.",
  },
} as const;

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

export function planFromStripePrice(priceId: string | null | undefined): PaidPlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_GROWTH) return "growth";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  return null;
}
