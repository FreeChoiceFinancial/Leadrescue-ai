import { isDemoMode } from "@/lib/assistant/live";
import { integrationStatus } from "@/lib/integrations/status";

export function GET() {
  return Response.json({ ok: true, demoMode: isDemoMode(), integrations: integrationStatus() });
}
