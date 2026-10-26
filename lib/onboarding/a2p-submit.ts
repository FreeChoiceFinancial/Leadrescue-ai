import {
  A2P_RECEIVED_CONFIRMATION,
  maskEin,
  redactEinText,
  type A2pStatus,
} from "@/lib/compliance/a2p-copy";
import { submitA2pRegistration } from "@/lib/integrations/a2p-trust-hub";
import { a2pIssueMessage, a2pRegistrationSchema, type A2pRegistration } from "@/lib/onboarding/a2p-schema";

export const A2P_COOKIE = "lr_a2p_registration";

export type A2pReceipt = {
  filed: false;
  mode: "sandbox";
  status: "pending_review";
  confirmation: string;
  einMasked: string;
  legalBusinessName: string;
};

export type A2pCookieView = {
  legalBusinessName: string;
  status: A2pStatus;
  einMasked: string;
  useCase: A2pRegistration["useCase"];
};

type SaveResult = { ok: true } | { ok: false };

export type A2pSubmitDeps = {
  supabaseEnabled: boolean;
  getTenantId: () => Promise<{ signedIn: boolean; tenantId: string | null }>;
  save: (tenantId: string, input: A2pRegistration) => Promise<SaveResult>;
  setCookie: (name: string, value: string) => void | Promise<void>;
};

export function registrationRow(tenantId: string, input: A2pRegistration) {
  return {
    tenant_id: tenantId,
    legal_business_name: input.legalBusinessName,
    ein: input.ein,
    business_type: input.businessType,
    street: input.street,
    city: input.city,
    region: input.region,
    postal_code: input.postalCode,
    country: input.country,
    website: input.website,
    contact_name: input.contactName,
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    vertical: input.vertical,
    use_case: input.useCase,
    campaign_description: input.campaignDescription,
    sample_messages: input.sampleMessages,
    opt_in_description: input.optInDescription,
    stop_message: input.stopMessage,
    help_message: input.helpMessage,
    attested: true,
    status: "pending_review" as const,
  };
}

export function publicReceipt(input: A2pRegistration): A2pReceipt {
  return {
    filed: false,
    mode: "sandbox",
    status: "pending_review",
    confirmation: A2P_RECEIVED_CONFIRMATION,
    einMasked: maskEin(input.ein),
    legalBusinessName: input.legalBusinessName,
  };
}

export function sandboxCookieValue(input: A2pRegistration): string {
  const view: A2pCookieView = {
    legalBusinessName: input.legalBusinessName,
    status: "pending_review",
    einMasked: maskEin(input.ein),
    useCase: input.useCase,
  };
  return JSON.stringify(view);
}

/** Drop a full EIN if a cookie was ever written with one. */
export function parseStoredA2p(raw: string | null | undefined): A2pCookieView | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<A2pCookieView> & { ein?: unknown };
    if (typeof parsed.legalBusinessName !== "string" || typeof parsed.einMasked !== "string") return null;
    const einMasked = maskEin(parsed.einMasked);
    const status = parsed.status;
    if (status !== "pending_review" && status !== "submitted" && status !== "approved" && status !== "rejected") return null;
    if (parsed.useCase !== "customer_care" && parsed.useCase !== "mixed") return null;
    return {
      legalBusinessName: parsed.legalBusinessName,
      status,
      einMasked,
      useCase: parsed.useCase,
    };
  } catch {
    return null;
  }
}

export async function handleA2pPost(request: Request, deps: A2pSubmitDeps): Promise<Response> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = a2pRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: redactEinText(a2pIssueMessage(parsed.error)) }, { status: 400 });
  }
  const input = parsed.data;
  const decision = await submitA2pRegistration(input);
  const receipt = publicReceipt(input);
  if (decision.filed !== false || receipt.filed !== false) {
    return Response.json({ error: "Registration was not filed." }, { status: 500 });
  }
  if (deps.supabaseEnabled) {
    const tenant = await deps.getTenantId();
    if (!tenant.signedIn) return Response.json({ error: "Sign in before registering 10DLC." }, { status: 401 });
    if (!tenant.tenantId) return Response.json({ error: "Create the shop before registering 10DLC." }, { status: 400 });
    const saved = await deps.save(tenant.tenantId, input);
    if (!saved.ok) return Response.json({ error: "Could not save the registration." }, { status: 400 });
    return Response.json(receipt);
  }
  await deps.setCookie(A2P_COOKIE, sandboxCookieValue(input));
  return Response.json(receipt);
}
