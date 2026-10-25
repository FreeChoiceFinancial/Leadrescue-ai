import type { Tenant } from "@/lib/domain/types";

export const DEMO_TENANT_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_CALLER_PHONE = "+15125550148";
export const DEMO_SMS_NUMBER = "+15125550199";

export function demoTenant(now = new Date()): Tenant {
  return {
    id: DEMO_TENANT_ID,
    name: "Demo HVAC Co",
    slug: "demo-hvac-co",
    timezone: "America/Chicago",
    businessPhone: "+15125550100",
    smsFromNumber: DEMO_SMS_NUMBER,
    ownerNotifyPhone: "+15125550101",
    ownerNotifyEmail: "owner@demo-hvac.example",
    quietHoursStart: 21,
    quietHoursEnd: 8,
    bookingProvider: "demo",
    googleCalendarId: null,
    a2pBrandStatus: "not_started",
    plan: "starter",
    subscriptionStatus: "sandbox",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    conversationAllowance: 150,
    conversationsUsed: 0,
    overageConversations: 0,
    setupFeePaid: false,
    physicalAddress: "1200 Fictional Ave, Austin, TX 78701",
    createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
