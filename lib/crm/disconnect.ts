import { CRM_SANDBOX_LABEL, crmLiveEnabled } from "@/lib/crm/mode";
import type { ZohoRegion } from "@/lib/crm/mapping";
import { revokeHubSpotToken, revokeZohoToken } from "@/lib/crm/oauth";
import { safeCrmDetail } from "@/lib/crm/redact";

export async function disconnectCrm(input: {
  provider: "hubspot" | "zoho";
  refreshToken: string | null;
  region: ZohoRegion | null;
  fetchImpl: typeof fetch;
}): Promise<{ revoked: boolean; mode: "sandbox" | "live"; detail: string }> {
  if (!crmLiveEnabled()) {
    return { revoked: false, mode: "sandbox", detail: CRM_SANDBOX_LABEL };
  }
  if (!input.refreshToken) {
    return { revoked: false, mode: "live", detail: safeCrmDetail("disconnected") };
  }
  if (input.provider === "hubspot") await revokeHubSpotToken(input.refreshToken, input.fetchImpl);
  else await revokeZohoToken(input.refreshToken, input.region ?? "com", input.fetchImpl);
  return { revoked: true, mode: "live", detail: safeCrmDetail("disconnected") };
}
