/**
 * Public results promise. Change the sentence here only.
 * Pending legal review. Do not describe this as a signed policy.
 */
export const RESULTS_GUARANTEE =
  "If LeadRescue doesn't book at least one job you would have otherwise missed in your first 60 days live, we refund every dollar you paid.";

export const GUARANTEE_PATH = "/guarantee";

/** Placeholder mailbox, same kind of address as the privacy draft. It is not a live inbox. */
export const GUARANTEE_REQUEST_EMAIL = "refunds@leadrescue.example";

export const GUARANTEE_TERMS_TEXT = `Live means after this shop's own A2P 10DLC brand and campaign are approved. The refund covers subscription fees and setup fees. Request it by email at ${GUARANTEE_REQUEST_EMAIL} within 14 days after the 60-day window. This promise is pending legal review.`;

export const GUARANTEE_PENDING_LEGAL_REVIEW = "Pending legal review.";

/** Homepage, pricing, FAQ, footer, and /guarantee stay hidden unless this is exactly true. */
export function showGuarantee(): boolean {
  return (process.env.SHOW_GUARANTEE ?? "").trim() === "true";
}
