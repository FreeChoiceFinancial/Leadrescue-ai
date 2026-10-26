import { isDemoMode } from "@/lib/assistant/live";

/** Shown on the CRM settings panel and used as the sandbox response label. */
export const CRM_SANDBOX_LABEL = "Coming soon / sandbox";

/** Pricing cards. Sync is included on every plan and is not live yet. */
export const CRM_PLAN_LINE = "HubSpot and Zoho CRM, coming soon.";

/** Live CRM calls require CRM_LIVE=true and demo mode off. The flag defaults off. */
export function crmLiveEnabled(): boolean {
  if (isDemoMode()) return false;
  return (process.env.CRM_LIVE ?? "").trim() === "true";
}
