import { handleStripeWebhook } from "@/lib/http/webhooks";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleStripeWebhook(request);
}
