import { z } from "zod";
import {
  A2P_LIMITS,
  BUSINESS_TYPES,
  USE_CASES,
  VERTICALS,
} from "@/lib/compliance/a2p-copy";
import { normalizePhone } from "@/lib/domain/phone";

const verticalValues = VERTICALS.map(([value]) => value) as [(typeof VERTICALS)[number][0], ...(typeof VERTICALS)[number][0][]];
const useCaseValues = USE_CASES.map(([value]) => value) as [(typeof USE_CASES)[number][0], ...(typeof USE_CASES)[number][0][]];

const phoneField = z.string().trim().transform((value, ctx) => {
  const phone = normalizePhone(value);
  if (!phone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use a 10-digit US contact phone or E.164." });
    return z.NEVER;
  }
  return phone;
});

const einField = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ""))
  .superRefine((value, ctx) => {
    if (!/^\d{2}-?\d{7}$/.test(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a 9-digit EIN, like 12-3456789." });
    }
  })
  .transform((value) => {
    const digits = value.replace(/\D/g, "");
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  });

const boundedText = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const a2pRegistrationSchema = z.object({
  legalBusinessName: z.string().trim().min(2, "Enter the legal business name.").max(120),
  ein: einField,
  businessType: z.enum(BUSINESS_TYPES, { errorMap: () => ({ message: "Choose a business type." }) }),
  street: z.string().trim().min(4, "Enter the street address.").max(120),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  region: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Use the 2-letter state.")
    .transform((value) => value.toUpperCase()),
  postalCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/, "Use a 5-digit ZIP code."),
  country: z.literal("US"),
  website: z
    .string()
    .trim()
    .url("Enter a website that starts with https://.")
    .refine((value) => value.startsWith("https://"), "Enter a website that starts with https://.")
    .refine((value) => value.length <= 200, "Website must be 200 characters or fewer."),
  contactName: z.string().trim().min(2, "Enter the contact name.").max(80),
  contactEmail: z.string().trim().email("Enter a contact email.").max(120),
  contactPhone: phoneField,
  vertical: z.enum(verticalValues, { errorMap: () => ({ message: "Choose a vertical." }) }),
  useCase: z.enum(useCaseValues, { errorMap: () => ({ message: "Choose customer care or mixed." }) }),
  campaignDescription: boundedText(A2P_LIMITS.descriptionMin, A2P_LIMITS.descriptionMax, "Campaign description"),
  sampleMessages: z
    .array(
      boundedText(A2P_LIMITS.sampleMin, A2P_LIMITS.sampleMax, "Each sample message"),
    )
    .min(A2P_LIMITS.sampleCountMin, "Add at least two sample messages.")
    .max(A2P_LIMITS.sampleCountMax, "Five sample messages is the maximum."),
  optInDescription: boundedText(A2P_LIMITS.optInMin, A2P_LIMITS.optInMax, "Opt-in description"),
  stopMessage: boundedText(A2P_LIMITS.keywordMin, A2P_LIMITS.keywordMax, "STOP message"),
  helpMessage: boundedText(A2P_LIMITS.keywordMin, A2P_LIMITS.keywordMax, "HELP message"),
  attested: z.literal(true, {
    errorMap: () => ({ message: "Check the box to attest the information is accurate and to authorize the submission." }),
  }),
  smsConsent: z.boolean().optional().default(false),
});

export type A2pRegistration = z.infer<typeof a2pRegistrationSchema>;

export function a2pIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form.";
}
