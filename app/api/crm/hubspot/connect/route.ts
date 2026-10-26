import { crmTokenKey, signCrmState } from "@/lib/crm/crypto";
import { CRM_SANDBOX_LABEL, crmLiveEnabled } from "@/lib/crm/mode";
import { hubspotAuthorizeUrl } from "@/lib/crm/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!crmLiveEnabled()) return Response.json({ mode: "sandbox", label: CRM_SANDBOX_LABEL, redirect: null });
  const key = crmTokenKey();
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  if (!key || !clientId) return Response.json({ mode: "sandbox", label: CRM_SANDBOX_LABEL, redirect: null });
  const supabase = await createSupabaseServerClient();
  const user = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !user.data.user) return Response.json({ error: "Sign in before connecting a CRM." }, { status: 401 });
  const membership = await supabase.from("memberships").select("tenant_id").limit(1).maybeSingle();
  if (!membership.data?.tenant_id) return Response.json({ error: "Create the shop before connecting a CRM." }, { status: 400 });
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const state = signCrmState(
    { tenantId: membership.data.tenant_id, provider: "hubspot", region: null, exp: Date.now() + 10 * 60 * 1000 },
    key,
  );
  return Response.redirect(hubspotAuthorizeUrl({ clientId, redirectUri: `${origin}/api/crm/hubspot/callback`, state }));
}
