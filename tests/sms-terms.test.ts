import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BRAND_EMAIL,
  BRAND_ENTITY_NAME,
  BRAND_MAILING_ADDRESS,
  BRAND_PHONE_DISPLAY,
  BRAND_PHONE_E164,
  brandMailingAddress,
} from "@/lib/brand";
import {
  DEFAULT_CAMPAIGN_DESCRIPTION,
  DEFAULT_OPT_IN_DESCRIPTION,
  defaultHelpMessage,
  defaultStopMessage,
  sampleMissedCall,
  sampleSchedulingReply,
} from "@/lib/compliance/a2p-copy";
import { SMS_CONSENT_TEXT, SMS_NO_SHARE_TEXT, smsConsentRecord } from "@/lib/compliance/sms-consent";
import { a2pRegistrationSchema } from "@/lib/onboarding/a2p-schema";
import { registrationRow } from "@/lib/onboarding/a2p-submit";
import { onboardingSchema } from "@/lib/onboarding/schema";

const PROMISE =
  "I agree to receive text messages from LeadRescue AI (Pollack Resilience LLC) about my inquiry and appointments. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See SMS Terms and Privacy Policy.";

describe("SMS program pages", () => {
  it("publishes contact details from one brand config and hides an empty address", () => {
    expect(BRAND_ENTITY_NAME).toBe("Pollack Resilience LLC");
    expect(BRAND_EMAIL).toBe("Pollackresilience.llc@gmail.com");
    expect(BRAND_PHONE_DISPLAY).toBe("(256) 286-5957");
    expect(BRAND_PHONE_E164).toBe("+12562865957");
    expect(BRAND_MAILING_ADDRESS).toBe("11552 South Breeze Place, Wellington, FL 33449");
    expect(brandMailingAddress()).toBe("11552 South Breeze Place, Wellington, FL 33449");
    const privacy = readFileSync("app/(marketing)/privacy/page.tsx", "utf8");
    const footer = readFileSync("components/marketing/SiteFooter.tsx", "utf8");
    const terms = readFileSync("app/(marketing)/terms/page.tsx", "utf8");
    const sms = readFileSync("app/(marketing)/sms-terms/page.tsx", "utf8");
    expect(privacy).toContain("SMS_NO_SHARE_TEXT");
    expect(privacy).toContain("BRAND_EMAIL");
    expect(privacy).not.toContain("privacy@leadrescue.example");
    expect(privacy).not.toContain("[Mailing address");
    expect(privacy).not.toContain("[Operator legal name");
    expect(footer).toContain('href="/sms-terms"');
    expect(footer).toContain("BrandContact");
    expect(terms).toContain("BrandContact");
    expect(sms).toContain("LeadRescue AI by");
    expect(sms).toContain("missed-call follow-up");
    expect(sms).toContain("appointment scheduling");
    expect(sms).toContain("service updates");
    expect(sms).toContain("Message frequency varies");
    expect(sms).toContain("Msg & data rates may apply");
    expect(sms).toContain("Reply STOP to opt out and HELP for help");
    expect(sms).toContain("Carriers are not liable for delayed or undelivered messages");
    expect(sms).toContain('href="/privacy"');
    expect(sms).toContain('href="/terms"');
    expect(SMS_NO_SHARE_TEXT).toBe(
      "No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties.",
    );
  });

  it("leaves the terms draft sentences in place", () => {
    const terms = readFileSync("app/(marketing)/terms/page.tsx", "utf8");
    expect(terms).toContain("These terms are a draft between [Operator legal name — complete before launch]");
    expect(terms).toContain("do not treat this draft as the contract you sell under");
    expect(terms).toContain("LegalBanner");
  });
});

describe("SMS consent checkbox", () => {
  it("starts unchecked, stays optional, and stores a boolean plus timestamp", () => {
    expect(SMS_CONSENT_TEXT).toBe(PROMISE);
    const checkbox = readFileSync("components/marketing/SmsConsentCheckbox.tsx", "utf8");
    expect(checkbox).toContain('href="/sms-terms"');
    expect(checkbox).toContain('href="/privacy"');
    expect(checkbox).not.toContain("required");
    for (const file of [
      "components/onboarding/TenDlcForm.tsx",
      "components/onboarding/OnboardingWizard.tsx",
      "components/auth/SignupForm.tsx",
      "components/marketing/PhoneOptInForm.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).toContain("SmsConsentCheckbox");
    }
    expect(readFileSync("app/(marketing)/demo/page.tsx", "utf8")).toContain("PhoneOptInForm");
    expect(readFileSync("app/(marketing)/contact/page.tsx", "utf8")).toContain("PhoneOptInForm");
    expect(readFileSync("app/(marketing)/demo/page.tsx", "utf8")).toContain("DemoConsole");
    expect(readFileSync("components/marketing/PhoneOptInForm.tsx", "utf8")).toContain("useState(false)");
    const off = smsConsentRecord(false, new Date("2026-10-26T12:00:00.000Z"));
    expect(off).toEqual({ smsConsent: false, smsConsentAt: null });
    const on = smsConsentRecord(true, new Date("2026-10-26T12:00:00.000Z"));
    expect(on.smsConsentAt).toBe("2026-10-26T12:00:00.000Z");
    expect(onboardingSchema.parse({
      name: "Northwind HVAC",
      timezone: "America/Chicago",
      businessPhone: "5125550190",
      ownerNotifyPhone: "5125550191",
      ownerNotifyEmail: "owner@northwind.example",
      quietHoursStart: 21,
      quietHoursEnd: 8,
      physicalAddress: "400 Fictional St, Austin, TX 78702",
    }).smsConsent).toBe(false);

    const base = {
      legalBusinessName: "Northwind HVAC LLC",
      ein: "12-3456789",
      businessType: "Limited Liability Corporation",
      street: "10 Fictional St",
      city: "Austin",
      region: "TX",
      postalCode: "78701",
      country: "US",
      website: "https://northwind.example",
      contactName: "Ada Owner",
      contactEmail: "owner@northwind.example",
      contactPhone: "5125550191",
      vertical: "CONSTRUCTION",
      useCase: "customer_care",
      campaignDescription: DEFAULT_CAMPAIGN_DESCRIPTION,
      sampleMessages: [sampleMissedCall("Northwind HVAC"), sampleSchedulingReply("Northwind HVAC")],
      optInDescription: DEFAULT_OPT_IN_DESCRIPTION,
      stopMessage: defaultStopMessage("Northwind HVAC"),
      helpMessage: defaultHelpMessage("Northwind HVAC"),
      attested: true,
    };
    const declined = a2pRegistrationSchema.parse(base);
    expect(declined.smsConsent).toBe(false);
    expect(registrationRow("tenant-1", declined, new Date("2026-10-26T12:00:00.000Z")).sms_consent_at).toBeNull();
    const accepted = a2pRegistrationSchema.parse({ ...base, smsConsent: true });
    const row = registrationRow("tenant-1", accepted, new Date("2026-10-26T12:00:00.000Z"));
    expect(row.sms_consent).toBe(true);
    expect(row.sms_consent_at).toBe("2026-10-26T12:00:00.000Z");
  });
});
