import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { detectEmergency, detectFrustration, detectService } from "@/lib/assistant/detect";
import { completeWithAssistant } from "@/lib/assistant/openai";
import { ANNUAL_COMMITMENT_MONTHS, OVERAGE_USD, PAID_PLANS, SEAT_LIMIT, SETUP_FEE_USD, annualPerMonthUsd, annualPerYearUsd, meterConversation } from "@/lib/billing/plans";
import { applySubscriptionSnapshot } from "@/lib/billing/stripe-events";
import { createAvailabilityProvider } from "@/lib/booking/google-provider";
import { subtractBusy } from "@/lib/booking/slots";
import { isQuietHours } from "@/lib/compliance/quiet-hours";
import { classifyKeyword } from "@/lib/compliance/keywords";
import { missedCallText } from "@/lib/compliance/messages";
import { DEMO_CALLER_PHONE, demoTenant } from "@/lib/demo/tenant";
import { createDemoWorkspace, demoCustomerReply, demoMissedCall } from "@/lib/demo/session";
import { handleMissedCall, runDueWork } from "@/lib/engine/handle";
import { blankWorkspace } from "@/lib/engine/workspace";
import { FOLLOW_UP_CAP } from "@/lib/followup/cadence";
import { buildWeeklyMetrics, startOfWeek } from "@/lib/reports/weekly";
import { validStripeSignature } from "@/lib/integrations/stripe";
import { twilioSignature } from "@/lib/integrations/twilio";
import type { Lead, Workspace } from "@/lib/domain/types";

const mondayMorning = new Date("2026-10-26T15:00:00.000Z");

describe("missed-call recovery and the demo booking path", () => {
  it("walks a fictional caller from missed call to a sandbox booking", async () => {
    let workspace = createDemoWorkspace(mondayMorning);
    let step = await demoMissedCall(workspace, mondayMorning);
    workspace = step.workspace;
    const first = step.effects.sms[0]?.body ?? "";
    expect(first).toContain("Demo HVAC Co");
    expect(first).toContain("Reply STOP to opt out");
    expect(first.toLowerCase()).not.toContain("% off");
    expect(first.toLowerCase()).not.toContain("sale");
    expect(step.effects.sms[0]?.delivery).toBe("sandbox_not_sent");
    expect(workspace.consentEvents.some((event) => event.eventType === "informational_textback")).toBe(true);

    step = await demoCustomerReply(workspace, "My AC isn't cooling", mondayMorning);
    workspace = step.workspace;
    expect(workspace.leads[0]?.service).toBe("repair");
    expect(workspace.leads[0]?.recovered).toBe(true);
    expect(step.effects.sms.at(-1)?.body).toMatch(/ZIP/i);

    step = await demoCustomerReply(workspace, "78704, no gas smell", mondayMorning);
    workspace = step.workspace;
    expect(step.effects.sms.at(-1)?.body).toMatch(/follow-up/i);

    step = await demoCustomerReply(workspace, "YES", mondayMorning);
    workspace = step.workspace;
    expect(workspace.leads[0]?.followUpPermission).toBe(true);
    expect(workspace.consentEvents.some((event) => event.eventType === "follow_up_granted")).toBe(true);
    expect(step.effects.sms.at(-1)?.body).toMatch(/1\)/);

    step = await demoCustomerReply(workspace, "1", mondayMorning);
    workspace = step.workspace;
    expect(step.effects.sms.at(-1)?.body).toMatch(/name/i);

    step = await demoCustomerReply(workspace, "Alex Rivera", mondayMorning);
    workspace = step.workspace;
    expect(workspace.leads[0]?.status).toBe("booked");
    expect(workspace.appointments).toHaveLength(1);
    expect(workspace.appointments[0]?.providerMode).toBe("sandbox");
    expect(workspace.appointments[0]?.customerName).toBe("Alex Rivera");
    expect(step.effects.sms.at(-1)?.body).toMatch(/You're booked, Alex Rivera/);
    expect(workspace.usageEvents).toHaveLength(1);
    expect(workspace.usageEvents[0]?.kind).toBe("included");
  });

  it("escalates gas smells, logs STOP, and suppresses later texts", async () => {
    let workspace = createDemoWorkspace(mondayMorning);
    let step = await demoMissedCall(workspace, mondayMorning);
    workspace = step.workspace;
    step = await demoCustomerReply(workspace, "I smell gas near the furnace", mondayMorning);
    workspace = step.workspace;
    expect(workspace.leads[0]?.status).toBe("escalated");
    expect(workspace.escalations[0]?.reason).toBe("emergency");
    expect(workspace.escalations[0]?.delivery).toBe("sandbox");
    expect(step.effects.ownerSms[0]?.body).toContain("Demo HVAC Co");
    expect(step.effects.ownerEmails[0]?.text).toContain("1200 Fictional Ave");
    expect(step.effects.sms.at(-1)?.body).toMatch(/911/);
    expect(workspace.appointments).toHaveLength(0);

    step = await demoCustomerReply(workspace, "STOP", mondayMorning);
    workspace = step.workspace;
    expect(workspace.leads[0]?.optedOut).toBe(true);
    expect(workspace.consentEvents.some((event) => event.eventType === "stop")).toBe(true);
    expect(step.effects.sms.at(-1)?.body).toMatch(/opted out/i);

    const later = await demoMissedCall(workspace, new Date(mondayMorning.getTime() + 60_000));
    expect(later.effects.sms).toHaveLength(0);
    expect(later.workspace.activity[0]?.kind).toBe("missed_call_suppressed");
  });

  it("defers the informational text during quiet hours", async () => {
    const night = new Date("2026-10-27T03:30:00.000Z");
    const tenant = demoTenant(night);
    expect(isQuietHours(night, tenant.timezone, tenant.quietHoursStart, tenant.quietHoursEnd)).toBe(true);
    const result = await handleMissedCall(
      blankWorkspace(tenant),
      { from: DEMO_CALLER_PHONE, at: night },
      { channel: "sms", delivery: "sandbox_not_sent", now: night, useAssistant: false },
    );
    expect(result.effects.sms).toHaveLength(0);
    expect(result.workspace.messages[0]?.delivery).toBe("queued_quiet_hours");
    expect(result.workspace.consentEvents.some((event) => event.eventType === "quiet_hours_deferred")).toBe(true);
    const releaseAt = new Date(result.workspace.messages[0]?.sendAfter as string);
    expect(isQuietHours(releaseAt, tenant.timezone, tenant.quietHoursStart, tenant.quietHoursEnd)).toBe(false);
    const released = await runDueWork(result.workspace, releaseAt, {
      channel: "sms",
      delivery: "sandbox_not_sent",
      now: releaseAt,
    });
    expect(released.effects.sms).toHaveLength(1);
    expect(released.effects.sms[0]?.body).toContain("Reply STOP to opt out");
  });

  it("caps permission-based follow-ups and skips opt-outs", async () => {
    const tenant = demoTenant(mondayMorning);
    const lead: Lead = {
      id: "lead_follow",
      tenantId: tenant.id,
      phone: DEMO_CALLER_PHONE,
      displayName: null,
      service: "repair",
      status: "qualifying",
      source: "missed_call",
      optedOut: false,
      followUpPermission: true,
      followUpAsked: true,
      followUpCount: 0,
      nextFollowUpAt: mondayMorning.toISOString(),
      emergency: false,
      frustrated: false,
      pendingQuestion: "zip",
      qualifying: { issue: "warm air" },
      firstInboundAt: mondayMorning.toISOString(),
      firstOutboundAt: mondayMorning.toISOString(),
      recovered: true,
      createdAt: mondayMorning.toISOString(),
      updatedAt: mondayMorning.toISOString(),
    };
    let workspace: Workspace = { ...blankWorkspace(tenant), leads: [lead] };
    let cursor = mondayMorning;
    for (let count = 0; count < FOLLOW_UP_CAP; count += 1) {
      const result = await runDueWork(workspace, cursor, { channel: "sms", delivery: "sandbox_not_sent", now: cursor });
      expect(result.effects.sms).toHaveLength(1);
      expect(result.effects.sms[0]?.body).toContain(`${count + 1} of ${FOLLOW_UP_CAP}`);
      workspace = result.workspace;
      const next = workspace.leads[0]?.nextFollowUpAt;
      cursor = next ? new Date(next) : new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
    const fourth = await runDueWork(workspace, cursor, { channel: "sms", delivery: "sandbox_not_sent", now: cursor });
    expect(fourth.effects.sms).toHaveLength(0);
    expect(fourth.workspace.leads[0]?.followUpCount).toBe(FOLLOW_UP_CAP);

    const opted = await runDueWork(
      { ...workspace, leads: [{ ...lead, followUpCount: 0, optedOut: true, status: "opted_out", nextFollowUpAt: mondayMorning.toISOString() }] },
      mondayMorning,
      { channel: "sms", delivery: "sandbox_not_sent", now: mondayMorning },
    );
    expect(opted.effects.sms).toHaveLength(0);
  });
});

describe("classification, billing, calendar, and reports", () => {
  it("detects service, emergencies, frustration, and keywords", () => {
    expect(detectService("need a new install estimate")).toBe("install");
    expect(detectService("seasonal tune-up")).toBe("maintenance");
    expect(detectService("AC not cooling")).toBe("repair");
    expect(detectEmergency("I smell gas")).toBe(true);
    expect(detectFrustration("This is ridiculous")).toBe(true);
    expect(classifyKeyword("stop")).toBe("stop");
    expect(classifyKeyword("HELP")).toBe("help");
    expect(classifyKeyword("UNSTOP")).toBe("start");
  });

  it("prices the public plans and meters overage at fifty cents", () => {
    expect(PAID_PLANS.starter.monthlyUsd).toBe(199);
    expect(PAID_PLANS.growth.monthlyUsd).toBe(399);
    expect(PAID_PLANS.premium.monthlyUsd).toBe(699);
    expect(annualPerMonthUsd(199)).toBe(124);
    expect(annualPerMonthUsd(399)).toBe(249);
    expect(annualPerMonthUsd(699)).toBe(437);
    expect(PAID_PLANS.starter.annualMonthlyUsd).toBe(124);
    expect(PAID_PLANS.growth.annualMonthlyUsd).toBe(249);
    expect(PAID_PLANS.premium.annualMonthlyUsd).toBe(437);
    expect(PAID_PLANS.starter.annualYearlyUsd).toBe(1488);
    expect(PAID_PLANS.growth.annualYearlyUsd).toBe(2988);
    expect(PAID_PLANS.premium.annualYearlyUsd).toBe(5244);
    expect(annualPerYearUsd(199)).toBe(124 * ANNUAL_COMMITMENT_MONTHS);
    expect(annualPerYearUsd(399)).toBe(249 * ANNUAL_COMMITMENT_MONTHS);
    expect(annualPerYearUsd(699)).toBe(437 * ANNUAL_COMMITMENT_MONTHS);
    expect(PAID_PLANS.starter.conversations).toBe(150);
    expect(PAID_PLANS.growth.conversations).toBe(400);
    expect(PAID_PLANS.premium.conversations).toBe(1000);
    expect(SETUP_FEE_USD).toBe(99);
    expect(SEAT_LIMIT).toBeNull();
    expect(OVERAGE_USD).toBe(0.5);
    const tenant = { ...demoTenant(), conversationAllowance: 1, conversationsUsed: 0, overageConversations: 0 };
    const first = meterConversation(tenant);
    const second = meterConversation(first.tenant);
    expect(first.kind).toBe("included");
    expect(second.kind).toBe("overage");
    expect(second.tenant.overageConversations).toBe(1);
  });

  it("syncs a Stripe subscription snapshot onto the tenant", () => {
    const tenant = applySubscriptionSnapshot(demoTenant(), {
      plan: "growth",
      status: "active",
      customerId: "cus_test",
      subscriptionId: "sub_test",
      setupFeePaid: true,
    });
    expect(tenant.plan).toBe("growth");
    expect(tenant.conversationAllowance).toBe(400);
    expect(tenant.stripeCustomerId).toBe("cus_test");
    expect(tenant.setupFeePaid).toBe(true);
  });

  it("labels Google Calendar as sandbox when credentials are absent and removes busy slots", async () => {
    const provider = createAvailabilityProvider({ bookingProvider: "google" }, {});
    expect(provider.mode).toBe("sandbox");
    expect(provider.reason).toMatch(/credentials are absent/i);
    const slots = await provider.getSlots({ tenant: demoTenant(), from: mondayMorning });
    expect(slots.length).toBeGreaterThan(0);
    const blocked = subtractBusy(slots, [{ start: slots[0]!.start, end: slots[0]!.end }]);
    expect(blocked.some((slot) => slot.start === slots[0]?.start)).toBe(false);
  });

  it("uses the sandbox assistant when no LLM key is configured", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const decision = await completeWithAssistant(
      { tenantName: "Demo HVAC Co", history: [], latest: "My furnace is broken", slotLabels: [] },
      "fallback",
    );
    expect(decision.mode).toBe("sandbox");
    expect(decision.service).toBe("repair");
    if (previous) process.env.OPENAI_API_KEY = previous;
  });

  it("builds a weekly scorecard from handled leads", async () => {
    let workspace = createDemoWorkspace(mondayMorning);
    const booked = await demoCustomerReply(
      (await demoCustomerReply(
        (await demoCustomerReply(
          (await demoCustomerReply(
            (await demoMissedCall(workspace, mondayMorning)).workspace,
            "My AC isn't cooling",
            mondayMorning,
          )).workspace,
          "78704, no gas smell",
          mondayMorning,
        )).workspace,
        "YES",
        mondayMorning,
      )).workspace,
      "1",
      mondayMorning,
    );
    workspace = (await demoCustomerReply(booked.workspace, "Alex Rivera", mondayMorning)).workspace;
    const metrics = buildWeeklyMetrics(workspace, startOfWeek(mondayMorning));
    expect(metrics.leadsHandled).toBe(1);
    expect(metrics.recoveredConversations).toBe(1);
    expect(metrics.appointmentsBooked).toBe(1);
    expect(metrics.averageResponseMinutes).not.toBeNull();
  });

  it("verifies Twilio and Stripe signatures", () => {
    const params = { Body: "hi", From: "+15125550148", To: "+15125550199" };
    const token = "test-token";
    const url = "https://example.com/api/twilio/sms";
    const signature = twilioSignature(url, params, token);
    const manual = createHmac("sha1", token)
      .update(url + "Body" + "hi" + "From" + "+15125550148" + "To" + "+15125550199")
      .digest("base64");
    expect(signature).toBe(manual);
    const stamp = "1700000000";
    const payload = "{\"ok\":true}";
    const secret = "whsec_test";
    const v1 = createHmac("sha256", secret).update(`${stamp}.${payload}`).digest("hex");
    expect(validStripeSignature(payload, `t=${stamp},v1=${v1}`, secret, 1700000000 * 1000)).toBe(true);
    expect(validStripeSignature(payload, `t=${stamp},v1=deadbeef`, secret, 1700000000 * 1000)).toBe(false);
  });

  it("keeps the informational copy template in the compliance helper", () => {
    const text = missedCallText({ name: "Demo HVAC Co" });
    expect(text.startsWith("Demo HVAC Co:")).toBe(true);
    expect(readFileSync("lib/compliance/messages.ts", "utf8")).toContain("not a promotion");
  });
});
