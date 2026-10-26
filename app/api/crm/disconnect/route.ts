import { crmTokenKey, decryptSecret } from "@/lib/crm/crypto";
import { disconnectCrm } from "@/lib/crm/disconnect";
import { CRM_SANDBOX_LABEL, crmLiveEnabled } from "@/lib/crm/mode";
import type { ZohoRegion } from "@/lib/crm/mapping";
import { safeCrmDetail } from "@/lib/crm/redact";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { provider?: string } | null;
  const provider = body?.provider === "zoho" || body?.provider === "hubspot" ? body.provider : null;
  if (!provider) return Response.json({ error: "Choose HubSpot or Zoho." }, { status: 400 });
  if (!crmLiveEnabled()) {
    return Response.json({ revoked: false, mode: "sandbox", detail: CRM_SANDBOX_LABEL });
  }
  const supabase = await createSupabaseServerClient();
  const user = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !user.data.user) return Response.json({ error: "Sign in before disconnecting a CRM." }, { status: 401 });
  const membership = await supabase.from("memberships").select("tenant_id").limit(1).maybeSingle();
  const tenantId = membership.data?.tenant_id;
  if (!tenantId) return Response.json({ error: "Create the shop before disconnecting a CRM." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const key = crmTokenKey();
  if (!admin || !key) return Response.json({ error: "CRM storage is not configured." }, { status: 400 });
  const existing = await admin
    .from("crm_connections")
    .select("region, refresh_token_encrypted")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();
  let refreshToken: string | null = null;
  const region = (existing.data?.region ?? null) as ZohoRegion | null;
  try {
    refreshToken = existing.data?.refresh_token_encrypted ? decryptSecret(existing.data.refresh_token_encrypted, key) : null;
  } catch {
    refreshToken = null;
  }
  let revoked = false;
  try {
    const result = await disconnectCrm({ provider, refreshToken, region, fetchImpl: fetch });
    revoked = result.revoked;
  } catch {
    revoked = false;
  }
  await admin
    .from("crm_connections")
    .update({
      status: "disconnected",
      refresh_token_encrypted: null,
      access_token_encrypted: null,
      access_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("provider", provider);
  await admin.from("crm_sync_log").insert({
    tenant_id: tenantId,
    provider,
    action: "disconnect",
    status: "disconnected",
    attempt: 0,
    detail: safeCrmDetail("disconnected"),
  });
  return Response.json({ revoked, mode: "live", detail: safeCrmDetail("disconnected") });
}
