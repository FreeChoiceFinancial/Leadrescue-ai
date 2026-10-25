import { assistantIsLive } from "@/lib/assistant/live";
import { googleCredentialsPresent } from "@/lib/booking/google-provider";

export type ModeLabel = "live" | "sandbox" | "refused";

export type IntegrationStatus = {
  supabase: "live" | "sandbox";
  twilio: "live" | "sandbox";
  assistant: "live" | "sandbox";
  google: "live" | "sandbox";
  email: "live" | "sandbox";
  stripe: "test" | "sandbox" | "refused";
};

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function supabasePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export function integrationStatus(): IntegrationStatus {
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  let stripe: IntegrationStatus["stripe"] = "sandbox";
  if (stripeKey.startsWith("sk_test_")) stripe = "test";
  else if (stripeKey) stripe = "refused";
  return {
    supabase: supabaseConfigured() && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) ? "live" : "sandbox",
    twilio: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? "live" : "sandbox",
    assistant: assistantIsLive() ? "live" : "sandbox",
    google: googleCredentialsPresent() ? "live" : "sandbox",
    email: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "live" : "sandbox",
    stripe,
  };
}

export function sandboxWebhookAllowed(request: Request): boolean {
  if (request.headers.get("x-leadrescue-sandbox") !== "1") return false;
  if (process.env.NODE_ENV === "production" && process.env.LEADRESCUE_ALLOW_SANDBOX_WEBHOOKS !== "1") return false;
  return true;
}

export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return request.headers.get("authorization") === `Bearer ${secret}`;
  }
  return sandboxWebhookAllowed(request);
}
