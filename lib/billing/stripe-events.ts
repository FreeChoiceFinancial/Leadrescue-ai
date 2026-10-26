import { allowanceFor, normalizePaidPlan, type PaidPlanId } from "@/lib/billing/plans";
import type { SubscriptionStatus, Tenant } from "@/lib/domain/types";

export type StripeSubscriptionSnapshot = {
  customerId?: string | null;
  subscriptionId?: string | null;
  status?: string | null;
  plan?: string | null;
  priceId?: string | null;
  setupFeePaid?: boolean;
  trialEndsAt?: string | null;
};

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
  unpaid: "past_due",
};

export function applySubscriptionSnapshot(tenant: Tenant, snapshot: StripeSubscriptionSnapshot): Tenant {
  const plan: PaidPlanId | null = normalizePaidPlan(snapshot.plan ?? "");
  const status = snapshot.status ? STATUS_MAP[snapshot.status] : undefined;
  const nextPlan = plan ?? tenant.plan;
  return {
    ...tenant,
    plan: plan ?? tenant.plan,
    subscriptionStatus: status ?? tenant.subscriptionStatus,
    stripeCustomerId: snapshot.customerId ?? tenant.stripeCustomerId,
    stripeSubscriptionId: snapshot.subscriptionId ?? tenant.stripeSubscriptionId,
    trialEndsAt: snapshot.trialEndsAt === undefined ? tenant.trialEndsAt : snapshot.trialEndsAt,
    setupFeePaid: snapshot.setupFeePaid ?? tenant.setupFeePaid,
    conversationAllowance:
      nextPlan === "trial" ? tenant.conversationAllowance : allowanceFor(nextPlan),
  };
}

export type StripeEvent = {
  id?: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Map a Stripe webhook event into a subscription snapshot. Unknown events return null. */
export function snapshotFromStripeEvent(event: StripeEvent): StripeSubscriptionSnapshot | null {
  const object = event.data.object;
  if (event.type === "checkout.session.completed") {
    const metadata = (object.metadata ?? {}) as Record<string, unknown>;
    return {
      customerId: asString(object.customer),
      subscriptionId: asString(object.subscription),
      status: "trialing",
      plan: asString(metadata.plan),
      setupFeePaid: true,
    };
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const items = object.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
    const priceId = items?.data?.[0]?.price?.id ?? null;
    const metadata = (object.metadata ?? {}) as Record<string, unknown>;
    const plan = asString(metadata.plan);
    return {
      customerId: asString(object.customer),
      subscriptionId: asString(object.id),
      status: event.type === "customer.subscription.deleted" ? "canceled" : asString(object.status),
      plan,
      priceId,
      trialEndsAt: typeof object.trial_end === "number"
        ? new Date(object.trial_end * 1000).toISOString()
        : undefined,
    };
  }
  if (event.type === "invoice.paid") {
    return {
      customerId: asString(object.customer),
      subscriptionId: asString(object.subscription),
      status: "active",
    };
  }
  return null;
}
