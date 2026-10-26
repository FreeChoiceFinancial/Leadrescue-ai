import { describe, expect, it } from "vitest";
import { PAID_PLANS } from "@/lib/billing/plans";
import {
  AC_REPAIR_AVERAGE_USD,
  AC_REPLACEMENT_AVERAGE_USD,
  ANGI_AC_REPLACEMENT,
  CALLRAIL_MISSED_CALLS,
  COMPARISON_COLUMNS,
  COMPARED_AS_OF,
  FOUNDING_PILOT,
  FOUNDING_PILOT_SHOPS,
  FTC_ENDORSEMENTS,
  HOMEGUIDE_AC_REPAIR,
  HOMEGUIDE_HVAC_REPAIR,
  INVOCA_REPORT,
  INVOCA_UNANSWERED,
  WHY_IT_MATTERS,
  foundingSignupHref,
  isFoundingPilotOffer,
} from "@/lib/marketing/trust";

const SCARCITY = /spots left|remaining|only \d+ left|hurry|countdown|first 10/i;

describe("marketing trust copy", () => {
  it("keeps the founding pilot at five shops and off any scarcity counter", () => {
    expect(FOUNDING_PILOT_SHOPS).toBe(5);
    expect(FOUNDING_PILOT.shops).toBe(5);
    expect(FOUNDING_PILOT.title).toContain("first 5");
    const blob = [FOUNDING_PILOT.title, FOUNDING_PILOT.lede, ...FOUNDING_PILOT.points, FOUNDING_PILOT.ftc].join(" ");
    expect(blob).not.toMatch(SCARCITY);
    expect(blob).toMatch(/do not depend on a review/i);
    expect(foundingSignupHref("growth")).toBe("/signup?plan=growth&offer=founding-pilot");
    expect(isFoundingPilotOffer("founding-pilot")).toBe(true);
    expect(isFoundingPilotOffer("founding")).toBe(false);
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
