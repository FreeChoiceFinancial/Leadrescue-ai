import { isDemoMode } from "@/lib/assistant/live";
import type { A2pRegistration } from "@/lib/onboarding/a2p-schema";

/**
 * Trust Hub customer profile, standard A2P brand, and US campaign payload.
 * This build never POSTs it. `A2P_SUBMIT_LIVE` defaults off, and demo mode
 * forces sandbox even if that flag is set. There is no Twilio fetch here.
 */
export type TrustHubBundle = {
  customerProfile: {
    businessName: string;
    businessType: A2pRegistration["businessType"];
    businessIndustry: A2pRegistration["vertical"];
    businessRegistrationIdentifier: "EIN";
    businessRegistrationNumber: string;
    websiteUrl: string;
    businessRegionsOfOperation: "USA_AND_CANADA";
    businessIdentity: "direct_customer";
    address: {
      street: string;
      city: string;
      region: string;
      postalCode: string;
      country: "US";
    };
    authorizedRepresentative: {
      name: string;
      email: string;
      phone: string;
    };
  };
  brand: {
    brandType: "STANDARD";
  };
  campaign: {
    usAppToPersonUsecase: "CUSTOMER_CARE" | "MIXED";
    description: string;
    messageFlow: string;
    messageSamples: string[];
    optOutMessage: string;
    helpMessage: string;
    optOutKeywords: ["STOP"];
    helpKeywords: ["HELP"];
    hasEmbeddedLinks: false;
    hasEmbeddedPhone: false;
    subscriberOptIn: true;
    subscriberOptOut: true;
    subscriberHelp: true;
  };
};

export type A2pSubmitResult = {
  filed: false;
  mode: "sandbox";
  reason: "demo" | "flag_off" | "live_disabled";
  prepared: {
    brandType: "STANDARD";
    useCase: TrustHubBundle["campaign"]["usAppToPersonUsecase"];
    sampleCount: number;
    einPresent: boolean;
  };
};

export function a2pLiveFlagOn(): boolean {
  return (process.env.A2P_SUBMIT_LIVE ?? "").trim() === "true";
}

/** True only when an operator opted in and this is not a demo deploy. Still does not call Twilio. */
export function a2pLiveSubmissionRequested(): boolean {
  if (isDemoMode()) return false;
  return a2pLiveFlagOn();
}

export function buildTrustHubBundle(input: A2pRegistration): TrustHubBundle {
  return {
    customerProfile: {
      businessName: input.legalBusinessName,
      businessType: input.businessType,
      businessIndustry: input.vertical,
      businessRegistrationIdentifier: "EIN",
      businessRegistrationNumber: input.ein,
      websiteUrl: input.website,
      businessRegionsOfOperation: "USA_AND_CANADA",
      businessIdentity: "direct_customer",
      address: {
        street: input.street,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: "US",
      },
      authorizedRepresentative: {
        name: input.contactName,
        email: input.contactEmail,
        phone: input.contactPhone,
      },
    },
    brand: { brandType: "STANDARD" },
    campaign: {
      usAppToPersonUsecase: input.useCase === "mixed" ? "MIXED" : "CUSTOMER_CARE",
      description: input.campaignDescription,
      messageFlow: input.optInDescription,
      messageSamples: input.sampleMessages,
      optOutMessage: input.stopMessage,
      helpMessage: input.helpMessage,
      optOutKeywords: ["STOP"],
      helpKeywords: ["HELP"],
      hasEmbeddedLinks: false,
      hasEmbeddedPhone: false,
      subscriberOptIn: true,
      subscriberOptOut: true,
      subscriberHelp: true,
    },
  };
}

export async function submitA2pRegistration(input: A2pRegistration): Promise<A2pSubmitResult> {
  const bundle = buildTrustHubBundle(input);
  const reason = isDemoMode() ? "demo" : a2pLiveFlagOn() ? "live_disabled" : "flag_off";
  return {
    filed: false,
    mode: "sandbox",
    reason,
    prepared: {
      brandType: bundle.brand.brandType,
      useCase: bundle.campaign.usAppToPersonUsecase,
      sampleCount: bundle.campaign.messageSamples.length,
      einPresent: bundle.customerProfile.businessRegistrationNumber.length === 10,
    },
  };
}
