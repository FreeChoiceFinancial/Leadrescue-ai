import { isBillingInterval } from "@/lib/billing/plans";
import { assertPaidPlan, createCheckoutSession } from "@/lib/integrations/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { plan?: string; interval?: string };
    const plan = assertPaidPlan(body.plan);
    const interval = body.interval && isBillingInterval(body.interval) ? body.interval : "month";
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    let tenantId = "sandbox";
    let customerId: string | null = null;
    let setupFeePaid = false;
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return Response.json({ error: "Sign in before checkout." }, { status: 401 });
      const membership = await supabase.from("memberships").select("tenant_id").limit(1).maybeSingle();
      if (!membership.data?.tenant_id) return Response.json({ error: "Finish onboarding before checkout." }, { status: 400 });
      tenantId = membership.data.tenant_id;
      const subscription = await supabase
        .from("subscriptions")
        .select("stripe_customer_id, setup_fee_paid")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      customerId = (subscription.data?.stripe_customer_id as string | null) ?? null;
      setupFeePaid = Boolean(subscription.data?.setup_fee_paid);
    }
    const session = await createCheckoutSession({
      plan,
      interval,
      tenantId,
      customerId,
      setupFeePaid,
      successUrl: `${origin}/dashboard/billing?checkout=success`,
      cancelUrl: `${origin}/dashboard/billing?checkout=cancel`,
    });
    return Response.json(session);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Checkout failed." }, { status: 400 });
  }
}
