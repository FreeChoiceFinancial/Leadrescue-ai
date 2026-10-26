import { cookies } from "next/headers";
import { smsConsentRecord } from "@/lib/compliance/sms-consent";
import { normalizePhone } from "@/lib/domain/phone";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/integrations/status";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }
  const input = parsed.data;
  const businessPhone = normalizePhone(input.businessPhone);
  const ownerPhone = normalizePhone(input.ownerNotifyPhone);
  const sms = input.smsFromNumber ? normalizePhone(input.smsFromNumber) : null;
  if (!businessPhone || !ownerPhone || (input.smsFromNumber && !sms)) {
    return Response.json({ error: "Use a 10-digit US number or E.164." }, { status: 400 });
  }
  const consent = smsConsentRecord(input.smsConsent);
  if (supabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return Response.json({ error: "Supabase is unavailable." }, { status: 500 });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return Response.json({ error: "Sign in before creating a business." }, { status: 401 });
    const { data, error } = await supabase.rpc("bootstrap_tenant", {
      p_name: input.name,
      p_timezone: input.timezone,
      p_business_phone: businessPhone,
      p_owner_notify_phone: ownerPhone,
      p_owner_notify_email: input.ownerNotifyEmail,
      p_quiet_start: input.quietHoursStart,
      p_quiet_end: input.quietHoursEnd,
      p_address: input.physicalAddress,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    if (data) {
      const { error: consentError } = await supabase
        .from("tenants")
        .update({
          ...(sms ? { sms_from_number: sms } : {}),
          sms_consent: consent.smsConsent,
          sms_consent_at: consent.smsConsentAt,
        })
        .eq("id", data);
      if (consentError) return Response.json({ error: consentError.message }, { status: 400 });
    }
    return Response.json({ mode: "live", tenantId: data, ...consent });
  }
  const jar = await cookies();
  jar.set(
    "lr_sandbox_profile",
    JSON.stringify({
      ...input,
      businessPhone,
      ownerNotifyPhone: ownerPhone,
      smsFromNumber: sms,
      ...consent,
    }),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 },
  );
  jar.set("lr_sandbox_view", "fresh", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return Response.json({ mode: "sandbox" });
}
