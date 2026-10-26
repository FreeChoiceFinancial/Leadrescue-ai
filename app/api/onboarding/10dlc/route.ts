import { registrationRow, handleA2pPost } from "@/lib/onboarding/a2p-submit";
import type { A2pRegistration } from "@/lib/onboarding/a2p-schema";
import { supabaseConfigured } from "@/lib/integrations/status";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

async function saveRegistration(tenantId: string, input: A2pRegistration): Promise<{ ok: true } | { ok: false }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false };
  const { error } = await supabase.from("a2p_registrations").upsert(registrationRow(tenantId, input), { onConflict: "tenant_id" });
  if (error) return { ok: false };
  return { ok: true };
}

export async function POST(request: Request) {
  return handleA2pPost(request, {
    supabaseEnabled: supabaseConfigured(),
    async getTenantId() {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { signedIn: false, tenantId: null };
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { signedIn: false, tenantId: null };
      const { data: membership } = await supabase.from("memberships").select("tenant_id").limit(1).maybeSingle();
      return { signedIn: true, tenantId: membership?.tenant_id ?? null };
    },
    save: saveRegistration,
    async setCookie(name, value) {
      const jar = await cookies();
      jar.set(name, value, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    },
  });
}
