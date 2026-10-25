import { createHmac, timingSafeEqual } from "node:crypto";
import { isPaidPlan, SETUP_FEE_USD, TRIAL_DAYS, type PaidPlanId } from "@/lib/billing/plans";

export function stripeMode(): "test" | "sandbox" | "refused" {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return "sandbox";
  if (key.startsWith("sk_test_")) return "test";
  return "refused";
}

export function validStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowMs = Date.now(),
  toleranceSec = 300,
): boolean {
  if (!header) return false;
  const timestamp = header
    .split(",")
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signatures = header
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(nowMs / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  const left = Buffer.from(expected);
  return signatures.some((signature) => {
    const right = Buffer.from(signature);
    return left.length === right.length && timingSafeEqual(left, right);
  });
}

export async function createCheckoutSession(input: {
  plan: PaidPlanId;
  tenantId: string;
  customerId: string | null;
  setupFeePaid: boolean;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ mode: "test" | "sandbox"; url: string }> {
  const mode = stripeMode();
  if (mode === "refused") {
    throw new Error("Refusing a live Stripe secret. This MVP only accepts sk_test_ keys.");
  }
  if (mode === "sandbox") {
    return { mode: "sandbox", url: `/dashboard/billing?sandbox_checkout=${input.plan}` };
  }
  const price = priceIdFor(input.plan);
  if (!price) throw new Error(`Missing Stripe price id for ${input.plan}.`);
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("client_reference_id", input.tenantId);
  params.set("metadata[tenant_id]", input.tenantId);
  params.set("metadata[plan]", input.plan);
  params.set("subscription_data[trial_period_days]", String(TRIAL_DAYS));
  params.set("subscription_data[metadata][tenant_id]", input.tenantId);
  params.set("subscription_data[metadata][plan]", input.plan);
  params.set("line_items[0][price]", price);
  params.set("line_items[0][quantity]", "1");
  if (!input.setupFeePaid && process.env.STRIPE_PRICE_SETUP) {
    params.set("line_items[1][price]", process.env.STRIPE_PRICE_SETUP);
    params.set("line_items[1][quantity]", "1");
  }
  if (input.customerId) params.set("customer", input.customerId);
  const payload = await stripeForm("/v1/checkout/sessions", params);
  const url = payload.url;
  if (typeof url !== "string") throw new Error("Stripe did not return a checkout URL.");
  return { mode: "test", url };
}

export async function createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ mode: "test" | "sandbox"; url: string }> {
  const mode = stripeMode();
  if (mode === "refused") throw new Error("Refusing a live Stripe secret. This MVP only accepts sk_test_ keys.");
  if (mode === "sandbox") return { mode: "sandbox", url: "/dashboard/billing?sandbox_portal=1" };
  const params = new URLSearchParams({ customer: input.customerId, return_url: input.returnUrl });
  const payload = await stripeForm("/v1/billing_portal/sessions", params);
  if (typeof payload.url !== "string") throw new Error("Stripe did not return a portal URL.");
  return { mode: "test", url: payload.url };
}

export async function reportOverageUsage(input: { subscriptionItemId: string; quantity: number }): Promise<{ mode: "test" | "sandbox" }> {
  if (stripeMode() !== "test" || !process.env.STRIPE_PRICE_OVERAGE) return { mode: "sandbox" };
  const params = new URLSearchParams({
    quantity: String(input.quantity),
    timestamp: String(Math.floor(Date.now() / 1000)),
    action: "set",
  });
  await stripeForm(`/v1/subscription_items/${input.subscriptionItemId}/usage_records`, params);
  return { mode: "test" };
}

function priceIdFor(plan: PaidPlanId): string | undefined {
  if (plan === "starter") return process.env.STRIPE_PRICE_STARTER;
  if (plan === "growth") return process.env.STRIPE_PRICE_GROWTH;
  return process.env.STRIPE_PRICE_PREMIUM;
}

async function stripeForm(path: string, params: URLSearchParams): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof payload.error === "object" && payload.error && "message" in payload.error
      ? String((payload.error as { message: unknown }).message)
      : `Stripe request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

export function assertPaidPlan(value: unknown): PaidPlanId {
  if (typeof value !== "string" || !isPaidPlan(value)) {
    throw new Error("Choose starter, growth, or premium.");
  }
  return value;
}

export const SETUP_FEE_LABEL = `$${SETUP_FEE_USD} one-time setup`;
