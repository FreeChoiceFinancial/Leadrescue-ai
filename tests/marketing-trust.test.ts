import { describe, expect, it } from "vitest";
import { BRAND_ENTITY_NAME, BRAND_LINE } from "@/lib/brand";
import { PAID_PLANS } from "@/lib/billing/plans";
import { FAQS } from "@/lib/marketing/faq";
import {
  AC_REPAIR_AVERAGE_USD,
  AC_REPLACEMENT_AVERAGE_USD,
  ANGI_AC_REPLACEMENT,
  CALLRAIL_MISSED_CALLS,
  COMPARISON_COLUMNS,
  COMPARED_AS_OF,
  FOUNDING_FREE_MONTHS,
  FOUNDING_PILOT,
  FOUNDING_PILOT_SHOPS,
  FTC_ENDORSEMENTS,
  HOMEGUIDE_AC_REPAIR,
  HOMEGUIDE_HVAC_REPAIR,
  INVOCA_REPORT,
  INVOCA_UNANSWERED,
  WHY_IT_MATTERS,
  foundingMonthlyUsd,
  foundingPilotPlainText,
  foundingPlanSummary,
  foundingSignupHref,
  isFoundingPilotOffer,
} from "@/lib/marketing/trust";

const SCARCITY = /spots left|remaining|only \d+ left|hurry|countdown|first 10/i;

describe("marketing trust copy", () => {
  it("keeps the founding pilot at five shops, three free months, then 25% off", () => {
    expect(FOUNDING_PILOT_SHOPS).toBe(5);
    expect(FOUNDING_FREE_MONTHS).toBe(3);
    expect(FOUNDING_PILOT.shops).toBe(5);
    expect(FOUNDING_PILOT.title).toContain("first 5");
    expect(foundingMonthlyUsd(PAID_PLANS.starter.monthlyUsd)).toBe(149.25);
    expect(foundingMonthlyUsd(PAID_PLANS.growth.monthlyUsd)).toBe(299.25);
    expect(foundingMonthlyUsd(PAID_PLANS.premium.monthlyUsd)).toBe(524.25);
    expect(FOUNDING_PILOT.monthly).toEqual({ starter: 149.25, growth: 299.25, premium: 524.25 });
    const blob = [FOUNDING_PILOT.title, FOUNDING_PILOT.lede, ...FOUNDING_PILOT.points, FOUNDING_PILOT.ftc, foundingPlanSummary("starter")].join(" ");
    expect(blob).toMatch(/3 months free/i);
    expect(blob).toMatch(/no subscription fee and no \$99 setup fee/i);
    expect(blob).toContain("$149.25");
    expect(blob).toMatch(/25% off/);
    expect(blob).toMatch(/2 years/);
    expect(blob).toMatch(/month to month/i);
    expect(blob).toMatch(/cancel anytime/i);
    expect(blob).not.toMatch(/first month|locked/i);
    expect(blob).not.toMatch(SCARCITY);
    expect(blob).toMatch(/do not depend on a review/i);
    expect(foundingPilotPlainText()).toContain("$299.25");
    expect(FAQS.find((item) => item.q === "What is the founding pilot?")?.a).toBe(foundingPilotPlainText());
    const annual = FAQS.find((item) => item.q === "What does annual billing cost?")?.a ?? "";
    expect(annual).toMatch(/12-month commitment/);
    expect(annual).toContain("$124");
    expect(annual).toContain("$1,488");
    expect(annual).toContain("$249");
    expect(annual).toContain("$2,988");
    expect(annual).toContain("$437");
    expect(annual).toContain("$5,244");
    expect(annual).toContain(`$${PAID_PLANS.starter.monthlyUsd}`);
    expect(foundingPilotPlainText()).not.toMatch(/12-month commitment/);
    expect(FAQS.find((item) => item.q === "Can I add my team?")?.a).toBe(
      "Yes, unlimited users on every plan; pricing is based on conversations, not seats.",
    );
    expect(foundingPlanSummary("premium")).toContain("$524.25");
    expect(foundingSignupHref("growth")).toBe("/signup?plan=growth&offer=founding-pilot");
    expect(isFoundingPilotOffer("founding-pilot")).toBe(true);
    expect(isFoundingPilotOffer("founding")).toBe(false);
  });

  it("names the operating company from one constant", () => {
    expect(BRAND_ENTITY_NAME).toBe("Pollack Resilience LLC");
    expect(BRAND_LINE).toBe("LeadRescue AI is a brand of Pollack Resilience LLC.");
  });

  it("cites a real URL for every published stat", () => {
    expect(WHY_IT_MATTERS.unanswered.callRailPercent).toBe(14);
    expect(WHY_IT_MATTERS.unanswered.invocaUnansweredPercent).toBe(48);
    expect(AC_REPAIR_AVERAGE_USD).toBe(360);
    expect(AC_REPLACEMENT_AVERAGE_USD).toBe(5978);
    expect(WHY_IT_MATTERS.acRepair.hvacNote).toContain("$293");
    const citations = [
      CALLRAIL_MISSED_CALLS,
      INVOCA_REPORT,
      INVOCA_UNANSWERED,
      HOMEGUIDE_AC_REPAIR,
      HOMEGUIDE_HVAC_REPAIR,
      ANGI_AC_REPLACEMENT,
      FTC_ENDORSEMENTS,
    ];
    for (const source of citations) {
      expect(source.href.startsWith("https://")).toBe(true);
      expect(source.label.length).toBeGreaterThan(3);
    }
  });

  it("marks unpublished competitor prices and dates the comparison", () => {
    expect(COMPARED_AS_OF).toBe("As of Oct 2026, terms may change.");
    const podium = COMPARISON_COLUMNS.find((column) => column.id === "podium");
    const hatch = COMPARISON_COLUMNS.find((column) => column.id === "hatch");
    const highlevel = COMPARISON_COLUMNS.find((column) => column.id === "highlevel");
    expect(podium?.facts.price.text).toMatch(/quote-based \/ not published/i);
    expect(hatch?.facts.price.text).toMatch(/quote-based \/ not published/i);
    expect(highlevel?.facts.price.text).toContain("$97");
    expect(highlevel?.facts.price.text).toContain("$297");
    expect(highlevel?.facts.price.text).toContain("$497");
    for (const column of COMPARISON_COLUMNS) {
      for (const fact of Object.values(column.facts)) {
        expect(fact.sources.length).toBeGreaterThan(0);
        for (const source of fact.sources) {
          expect(source.href.startsWith("https://") || source.href.startsWith("/")).toBe(true);
        }
      }
    }
    expect(COMPARISON_COLUMNS[0]?.facts.price.text).toContain(`$${PAID_PLANS.starter.monthlyUsd}`);
  });
});
