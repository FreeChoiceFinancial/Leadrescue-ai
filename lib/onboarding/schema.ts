import { z } from "zod";

export const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  timezone: z.string().trim().min(3).max(80),
  businessPhone: z.string().trim().min(7).max(20),
  ownerNotifyPhone: z.string().trim().min(7).max(20),
  ownerNotifyEmail: z.string().trim().email().max(120),
  quietHoursStart: z.number().int().min(0).max(23),
  quietHoursEnd: z.number().int().min(0).max(23),
  physicalAddress: z.string().trim().min(8).max(180),
  smsFromNumber: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  smsConsent: z.boolean().optional().default(false),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
