import { supabaseConfigured } from "@/lib/integrations/status";
import { getSandboxStore } from "@/lib/store/memory";
import type { LeadStore } from "@/lib/store/types";

export async function getStore(): Promise<LeadStore> {
  if (!supabaseConfigured() || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return getSandboxStore();
  }
  const { createSupabaseStore } = await import("@/lib/store/supabase");
  return createSupabaseStore();
}

export function deliveryForTenant(a2p: string): "sent" | "sandbox_not_sent" | "blocked_a2p" {
  const twilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  if (!twilio) return "sandbox_not_sent";
  if (a2p !== "approved") return "blocked_a2p";
  return "sent";
}
