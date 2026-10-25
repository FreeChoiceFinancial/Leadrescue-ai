import { createPortalSession, stripeMode } from "@/lib/integrations/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (stripeMode() !== "test") {
      return Response.json({
        mode: "sandbox",
        url: "/dashboard/billing?sandbox_portal=1",
      });
    }
    const supabase = await createSupabaseServerClient();
    if (!supabase) return Response.json({ error: "Supabase is not configured." }, { status: 400 });
    const { data } = await supabase.auth.getUser();
    if (!data.user) return Response.json({ error: "Sign in before opening the portal." }, { status: 401 });
    const membership = await supabase.from("memberships").select("tenant_id").limit(1).maybeSingle();
    if (!membership.data?.tenant_id) return Response.json({ error: "Finish onboarding first." }, { status: 400 });
    const subscription = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("tenant_id", membership.data.tenant_id)
      .maybeSingle();
    const customerId = subscription.data?.stripe_customer_id as string | null;
    if (!customerId) return Response.json({ error: "Checkout has not created a Stripe customer yet." }, { status: 400 });
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await createPortalSession({ customerId, returnUrl: `${origin}/dashboard/billing` });
    return Response.json(session);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Portal failed." }, { status: 400 });
  }
}
