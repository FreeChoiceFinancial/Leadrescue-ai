import { crmTokenKey, encryptSecret, readCrmState } from "@/lib/crm/crypto";
import { crmLiveEnabled } from "@/lib/crm/mode";
import { defaultFieldMapping } from "@/lib/crm/mapping";
import { exchangeHubSpotCode, HUBSPOT_SCOPES } from "@/lib/crm/oauth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function back(request: Request, flag: string): Response {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return Response.redirect(new URL(`/dashboard/settings?crm=${flag}`, origin));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!crmLiveEnabled()) return back(request, "sandbox");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const key = crmTokenKey();
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!code || !state || !key || !clientId || !clientSecret) return back(request, "sandbox");
  const parsed = readCrmState(state, key, Date.now());
  if (!parsed || parsed.provider !== "hubspot") return back(request, "sandbox");
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  try {
    const tokens = await exchangeHubSpotCode(
      { code, redirectUri: `${origin}/api/crm/hubspot/callback`, clientId, clientSecret },
      fetch,
    );
    const admin = createSupabaseAdminClient();
    if (!admin) return back(request, "sandbox");
    const { error } = await admin.from("crm_connections").upsert(
      {
        tenant_id: parsed.tenantId,
        provider: "hubspot",
        status: "connected",
        region: null,
        scopes: HUBSPOT_SCOPES.join(" "),
        refresh_token_encrypted: encryptSecret(tokens.refreshToken, key),
        access_token_encrypted: encryptSecret(tokens.accessToken, key),
        access_token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
        field_mapping: defaultFieldMapping("hubspot"),
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,provider" },
    );
    if (error) return back(request, "sandbox");
  } catch {
    return back(request, "sandbox");
  }
  return back(request, "saved");
}
