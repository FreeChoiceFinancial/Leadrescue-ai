import { afterEach, describe, expect, it, vi } from "vitest";
import {
  A2P_LIMITS,
  A2P_RECEIVED_CONFIRMATION,
  DEFAULT_CAMPAIGN_DESCRIPTION,
  DEFAULT_OPT_IN_DESCRIPTION,
  a2pAttestationLabel,
  defaultHelpMessage,
  defaultStopMessage,
  maskEin,
  redactEinText,
  sampleMissedCall,
  sampleSchedulingReply,
} from "@/lib/compliance/a2p-copy";
import { FAQS } from "@/lib/marketing/faq";
import { BRAND_ENTITY_NAME } from "@/lib/brand";
import { buildTrustHubBundle, submitA2pRegistration } from "@/lib/integrations/a2p-trust-hub";
import { a2pRegistrationSchema, type A2pRegistration } from "@/lib/onboarding/a2p-schema";
import { handleA2pPost, parseStoredA2p, publicReceipt, registrationRow, sandboxCookieValue } from "@/lib/onboarding/a2p-submit";

const EIN = "12-3456789";
const KEYS = ["A2P_SUBMIT_LIVE", "DEMO_MODE", "PUBLIC_DEMO"] as const;

function registration(overrides: Record<string, unknown> = {}) {
  return {
    legalBusinessName: "Northwind HVAC LLC",
    ein: EIN,
    businessType: "Limited Liability Corporation",
    street: "10 Fictional St",
    city: "Austin",
    region: "tx",
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
    ...overrides,
  };
}

function parsed(overrides: Record<string, unknown> = {}): A2pRegistration {
  const result = a2pRegistrationSchema.safeParse(registration(overrides));
  if (!result.success) throw new Error(result.error.issues.map((issue) => issue.message).join("; "));
  return result.data;
}

describe("A2P 10DLC registration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const key of KEYS) delete process.env[key];
  });

  it("validates the EIN, required attestation, use case, and message length", () => {
    const input = parsed();
    expect(input.ein).toBe(EIN);
    expect(input.region).toBe("TX");
    expect(input.contactPhone).toBe("+15125550191");
    expect(parsed({ ein: "123456789" }).ein).toBe(EIN);
    expect(a2pRegistrationSchema.safeParse(registration({ ein: "12-345678" })).success).toBe(false);
    expect(a2pRegistrationSchema.safeParse(registration({ ein: "AB-1234567" })).success).toBe(false);
    expect(a2pRegistrationSchema.safeParse(registration({ attested: false })).success).toBe(false);
    expect(a2pRegistrationSchema.safeParse(registration({ useCase: "marketing" })).success).toBe(false);
    expect(a2pRegistrationSchema.safeParse(registration({ legalBusinessName: " " })).success).toBe(false);
    const short = a2pRegistrationSchema.safeParse(registration({ sampleMessages: ["too short", sampleMissedCall("Northwind HVAC")] }));
    expect(short.success).toBe(false);
    const oneSample = a2pRegistrationSchema.safeParse(registration({ sampleMessages: [sampleMissedCall("Northwind HVAC")] }));
    expect(oneSample.success).toBe(false);
    const longHelp = a2pRegistrationSchema.safeParse(registration({ helpMessage: "H".repeat(A2P_LIMITS.keywordMax + 1) }));
    expect(longHelp.success).toBe(false);
    expect(DEFAULT_CAMPAIGN_DESCRIPTION.length).toBeGreaterThanOrEqual(A2P_LIMITS.descriptionMin);
    expect(DEFAULT_OPT_IN_DESCRIPTION.length).toBeGreaterThanOrEqual(A2P_LIMITS.optInMin);
    expect(defaultStopMessage("Your shop").length).toBeGreaterThanOrEqual(A2P_LIMITS.keywordMin);
    expect(defaultHelpMessage("Your shop").length).toBeLessThanOrEqual(A2P_LIMITS.keywordMax);
    expect(a2pAttestationLabel()).toContain(BRAND_ENTITY_NAME);
    expect(a2pAttestationLabel()).toContain("LeadRescue AI");
  });

  it("masks the EIN and keeps it out of the receipt and cookie", () => {
    const input = parsed();
    expect(maskEin(input.ein)).toBe("••-•••6789");
    expect(maskEin("123456789")).toBe("••-•••6789");
    const receipt = publicReceipt(input);
    const cookie = sandboxCookieValue(input);
    const row = registrationRow("tenant-1", input);
    expect(row.ein).toBe(EIN);
    expect(row.status).toBe("pending_review");
    const visible = JSON.stringify({ receipt, cookie: parseStoredA2p(cookie) });
    expect(visible).not.toContain(EIN);
    expect(visible).not.toContain("123456789");
    expect(visible).toContain(A2P_RECEIVED_CONFIRMATION);
    expect(visible).toContain("••-•••6789");
    const poisoned = parseStoredA2p(JSON.stringify({ legalBusinessName: "Northwind HVAC LLC", status: "pending_review", ein: EIN, einMasked: EIN, useCase: "customer_care" }));
    expect(JSON.stringify(poisoned)).not.toContain(EIN);
    expect(poisoned?.einMasked).toBe("••-•••6789");
    expect(redactEinText(`failed for ${EIN}`)).not.toContain(EIN);
  });

  it("builds a Trust Hub bundle and never calls Twilio", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const input = parsed({ useCase: "mixed" });
    const logs = ["log", "info", "warn", "error", "debug"] as const;
    const spies = logs.map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));

    delete process.env.A2P_SUBMIT_LIVE;
    delete process.env.DEMO_MODE;
    const flaggedOff = await submitA2pRegistration(input);
    expect(flaggedOff).toMatchObject({ filed: false, mode: "sandbox", reason: "flag_off" });

    process.env.A2P_SUBMIT_LIVE = "true";
    process.env.DEMO_MODE = "true";
    const demo = await submitA2pRegistration(input);
    expect(demo).toMatchObject({ filed: false, mode: "sandbox", reason: "demo" });

    delete process.env.DEMO_MODE;
    process.env.PUBLIC_DEMO = "yes";
    const publicDemo = await submitA2pRegistration(input);
    expect(publicDemo.reason).toBe("demo");
    expect(publicDemo.filed).toBe(false);

    delete process.env.PUBLIC_DEMO;
    process.env.A2P_SUBMIT_LIVE = "true";
    const refused = await submitA2pRegistration(input);
    expect(refused).toMatchObject({ filed: false, mode: "sandbox", reason: "live_disabled", prepared: { useCase: "MIXED", sampleCount: 2, einPresent: true } });

    const bundle = buildTrustHubBundle(input);
    expect(bundle.customerProfile.businessRegistrationIdentifier).toBe("EIN");
    expect(bundle.campaign.optOutKeywords).toEqual(["STOP"]);
    expect(bundle.campaign.messageFlow).toContain("missed call");
    expect(fetchImpl).not.toHaveBeenCalled();
    const logged = spies.flatMap((spy) => spy.mock.calls).join(" ");
    expect(logged).not.toContain(EIN);
  });

  it("returns the review confirmation and does not echo the EIN", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const logs = ["log", "info", "warn", "error", "debug"] as const;
    const spies = logs.map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
    let cookie = "";
    const saved: unknown[] = [];
    const request = new Request("http://localhost/api/onboarding/10dlc", {
      method: "POST",
      body: JSON.stringify(registration()),
    });
    const response = await handleA2pPost(request, {
      supabaseEnabled: false,
      async getTenantId() {
        return { signedIn: false, tenantId: null };
      },
      async save(tenantId, input) {
        saved.push(registrationRow(tenantId, input));
        return { ok: true };
      },
      setCookie(_name, value) {
        cookie = value;
      },
    });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.confirmation).toBe(A2P_RECEIVED_CONFIRMATION);
    expect(payload.filed).toBe(false);
    expect(payload.status).toBe("pending_review");
    expect(payload.einMasked).toBe("••-•••6789");
    expect(JSON.stringify(payload)).not.toContain(EIN);
    expect(cookie).not.toContain(EIN);
    expect(saved).toHaveLength(0);
    expect(fetchImpl).not.toHaveBeenCalled();

    const invalid = await handleA2pPost(
      new Request("http://localhost/api/onboarding/10dlc", {
        method: "POST",
        body: JSON.stringify(registration({ ein: "99-123" })),
      }),
      {
        supabaseEnabled: false,
        async getTenantId() {
          return { signedIn: true, tenantId: "tenant-1" };
        },
        async save() {
          return { ok: true };
        },
        setCookie() {
          throw new Error("cookie should not be set");
        },
      },
    );
    const errorBody = await invalid.json();
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(errorBody)).not.toContain("99-123");

    const stored = await handleA2pPost(
      new Request("http://localhost/api/onboarding/10dlc", {
        method: "POST",
        body: JSON.stringify(registration()),
      }),
      {
        supabaseEnabled: true,
        async getTenantId() {
          return { signedIn: true, tenantId: "tenant-1" };
        },
        async save() {
          return { ok: true };
        },
        setCookie() {
          throw new Error("supabase path should not write the sandbox cookie");
        },
      },
    );
    expect(stored.status).toBe(200);
    expect(JSON.stringify(await stored.json())).not.toContain(EIN);
    const logged = spies.flatMap((spy) => spy.mock.calls).join(" ");
    expect(logged).not.toContain(EIN);
    expect(FAQS.find((item) => item.q === "How do I register A2P 10DLC?")?.href).toBe("/onboarding/10dlc");
  });
});
