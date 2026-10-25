import { integrationStatus } from "@/lib/integrations/status";

export function GET() {
  return Response.json({ ok: true, integrations: integrationStatus() });
}
