import { BRAND_ENTITY_NAME } from "@/lib/brand";
import { missedCallText } from "@/lib/compliance/messages";

/** Twilio US A2P campaign field limits used by the form and the database. */
export const A2P_LIMITS = {
  sampleMin: 20,
  sampleMax: 1024,
  sampleCountMin: 2,
  sampleCountMax: 5,
  descriptionMin: 40,
  descriptionMax: 4096,
  optInMin: 40,
  optInMax: 2048,
  keywordMin: 20,
  keywordMax: 320,
} as const;

export const A2P_RECEIVED_CONFIRMATION =
  "Received, we'll review and submit to the carriers; approval typically takes days to weeks.";

export const BUSINESS_TYPES = [
  "Partnership",
  "Limited Liability Corporation",
  "Co-operative",
  "Non-profit Corporation",
  "Corporation",
] as const;

export const VERTICALS = [
  ["CONSTRUCTION", "Construction"],
  ["PROFESSIONAL", "Professional services"],
  ["CONSUMER", "Consumer"],
  ["ENERGY", "Energy"],
  ["REAL_ESTATE", "Real estate"],
  ["RETAIL", "Retail"],
  ["TECHNOLOGY", "Technology"],
  ["TRANSPORTATION", "Transportation"],
  ["MANUFACTURING", "Manufacturing"],
  ["HEALTHCARE", "Healthcare"],
  ["HOSPITALITY", "Hospitality"],
  ["INSURANCE", "Insurance"],
  ["LEGAL", "Legal"],
  ["EDUCATION", "Education"],
  ["GOVERNMENT", "Government"],
  ["NOT_FOR_PROFIT", "Not for profit"],
] as const;

export const USE_CASES = [
  ["customer_care", "Customer care"],
  ["mixed", "Mixed"],
] as const;

export type A2pUseCase = (typeof USE_CASES)[number][0];
export type A2pStatus = "pending_review" | "submitted" | "approved" | "rejected";

export const A2P_STATUS_LABELS: Record<A2pStatus, string> = {
  pending_review: "Pending review",
  submitted: "With the carriers",
  approved: "Approved",
  rejected: "Rejected",
};

export function a2pAttestationLabel(): string {
  return `I attest this information is accurate and I authorize LeadRescue AI (${BRAND_ENTITY_NAME}) to submit this registration on the business's behalf.`;
}

export const DEFAULT_CAMPAIGN_DESCRIPTION =
  "Customer care texts for people who called this HVAC shop and were not answered. Messages identify the shop, cover that missed call and appointment help, and are not promotions or purchased-list outreach.";

export const DEFAULT_OPT_IN_DESCRIPTION =
  "A person calls the shop. If nobody answers, the shop phone forwards that missed call to the shop's own LeadRescue number. LeadRescue texts that caller once about the missed call. The first text names the business, says it is not a promotion, and includes Reply STOP to opt out and Reply HELP for help. LeadRescue does not buy lists or text people who did not call. Later texts happen only if the caller replies.";

export function sampleMissedCall(businessName: string): string {
  return missedCallText({ name: businessName.trim() || "Your shop" });
}

export function sampleSchedulingReply(businessName: string): string {
  const name = businessName.trim() || "Your shop";
  return `${name}: Thanks for calling. Reply with the HVAC issue, the ZIP code, and whether anyone smells gas or hears an alarm. We can then offer appointment times. Reply STOP to opt out. Reply HELP for help.`;
}

export function defaultStopMessage(businessName: string): string {
  const name = businessName.trim() || "Your shop";
  return `${name}: You are opted out and will not receive more texts about missed calls to this shop. Reply START to opt back in.`;
}

export function defaultHelpMessage(businessName: string): string {
  const name = businessName.trim() || "Your shop";
  return `${name}: Help for texts about a missed call to this shop. Message frequency varies. Reply STOP to opt out. For gas, smoke, or a CO alarm, leave and call 911.`;
}

/** Last four digits only. The full EIN never belongs in the UI. */
export function maskEin(ein: string): string {
  const digits = ein.replace(/\D/g, "");
  const last4 = digits.slice(-4).padStart(4, "•");
  return `••-•••${last4}`;
}

/** Strip EIN-shaped numbers from a string before it can reach a log or an error response. */
export function redactEinText(value: string): string {
  return value.replace(/\b\d{2}-?\d{7}\b/g, "••-•••");
}
