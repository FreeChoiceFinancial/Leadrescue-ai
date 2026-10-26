import { cookies } from "next/headers";
import { z } from "zod";
import { normalizePhone } from "@/lib/domain/phone";
import { smsConsentRecord } from "@/lib/compliance/sms-consent";

export const runtime = "nodejs";

const SMS_OPT_IN_COOKIE = "lr_sms_opt_in";

const bodySchema = z.object({
  source: z.enum(["demo", "contact"]),
  name: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().min(7).max(20),
  message: z.string().trim().max(1000).optional().default(""),
  smsConsent: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Enter a phone number." }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return Response.json({ error: "Use a 10-digit US number or E.164." }, { status: 400 });
  const consent = smsConsentRecord(parsed.data.smsConsent);
  const record = {
    source: parsed.data.source,
    name: parsed.data.name,
    phone,
    message: parsed.data.message,
    ...consent,
  };
  const jar = await cookies();
  jar.set(SMS_OPT_IN_COOKIE, JSON.stringify(record), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ saved: true, ...consent });
}
