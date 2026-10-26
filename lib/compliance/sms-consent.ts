import { BRAND_ENTITY_NAME } from "@/lib/brand";

/** Public checkbox sentence. The links are SMS Terms and Privacy Policy. */
export const SMS_CONSENT_TEXT = `I agree to receive text messages from LeadRescue AI (${BRAND_ENTITY_NAME}) about my inquiry and appointments. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See SMS Terms and Privacy Policy.`;

export const SMS_NO_SHARE_TEXT =
  "No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties.";

export function smsConsentRecord(consented: boolean, at: Date = new Date()): {
  smsConsent: boolean;
  smsConsentAt: string | null;
} {
  return {
    smsConsent: consented,
    smsConsentAt: consented ? at.toISOString() : null,
  };
}
