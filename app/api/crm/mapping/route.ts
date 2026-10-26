import { CRM_SANDBOX_LABEL, crmLiveEnabled } from "@/lib/crm/mode";
import { sanitizeFieldMapping, type CrmProvider } from "@/lib/crm/mapping";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { provider?: string; mapping?: unknown } | null;
  const provider: CrmProvider | null = body?.provider === "zoho" || body?.provider === "hubspot" ? body.provider : null;
  if (!provider) return Response.json({ error: "Choose HubSpot or Zoho." }, { status: 400 });
  const mapping = sanitizeFieldMapping(provider, body?.mapping);
  if (!crmLiveEnabled()) {
    return Response.json({ saved: false, mode: "sandbox", label: CRM_SANDBOX_LABEL, mapping });
  }
  const supabase = await createSupabaseServerClient();
  const user = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !user.data.user) return Response.json({ error: "Sign in before saving field mapping." }, { status: 401 });
  const membership = await supabase.from("memberships").select("tenant_id").limit(1).maybeSingle();
  if (!membership.data?.tenant_id) return Response.json({ error: "Create the shop before saving field mapping." }, { status: 400 });
  const { error } = await supabase
    .from("crm_connections")
    .update({ field_mapping: mapping, updated_at: new Date().toISOString() })
    .eq("tenant_id", membership.data.tenant_id)
    .eq("provider", provider);
  if (error) return Response.json({ error: "Could not save the field mapping." }, { status: 400 });
  return Response.json({ saved: true, mode: "live", mapping });
}
