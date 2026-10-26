/** Operating company. Change the entity name here only. */
export const BRAND_ENTITY_NAME = "Pollack Resilience LLC";

export const BRAND_EMAIL = "hello@leadrescue.cloud";

/** Public site. Metadata, the sitemap, and Open Graph use this origin. */
export const BRAND_SITE_URL = "https://leadrescue.cloud";

/** Public display. The tel link uses BRAND_PHONE_E164. */
export const BRAND_PHONE_DISPLAY = "(256) 286-5957";

export const BRAND_PHONE_E164 = "+12562865957";

/** Public mailing address. An empty string stays hidden. */
export const BRAND_MAILING_ADDRESS = "11552 South Breeze Place, Wellington, FL 33449";

export const BRAND_LINE = `LeadRescue AI is a brand of ${BRAND_ENTITY_NAME}.`;

export function brandMailingAddress(): string | null {
  const address = BRAND_MAILING_ADDRESS.trim();
  return address.length > 0 ? address : null;
}
