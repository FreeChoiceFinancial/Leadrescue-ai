import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { PAID_PLANS } from "@/lib/billing/plans";
import { FAQS, publicFaqs } from "@/lib/marketing/faq";
import {
  GUARANTEE_PATH,
  GUARANTEE_PENDING_LEGAL_REVIEW,
  GUARANTEE_REQUEST_EMAIL,
  GUARANTEE_TERMS_TEXT,
  RESULTS_GUARANTEE,
  showGuarantee,
} from "@/lib/marketing/guarantee";
import { estimateMissedRevenue, paybackLabel, REVENUE_ESTIMATE_LABEL } from "@/lib/marketing/revenue";
import { DONE_FOR_YOU } from "@/lib/marketing/setup";

const PROMISE =
  "If LeadRescue doesn't book at least one job you would have otherwise missed in your first 60 days live, we refund every dollar you paid.";

const previousGuaranteeFlag = process.env.SHOW_GUARANTEE;

afterEach(() => {
  if (previousGuaranteeFlag === undefined) delete process.env.SHOW_GUARANTEE;
  else process.env.SHOW_GUARANTEE = previousGuaranteeFlag;
});

describe("results guarantee", () => {
  it("keeps the public promise in one constant", () => {
    expect(RESULTS_GUARANTEE).toBe(PROMISE);
    expect(GUARANTEE_PATH).toBe("/guarantee");
    expect(GUARANTEE_PENDING_LEGAL_REVIEW).toBe("Pending legal review.");
    expect(GUARANTEE_TERMS_TEXT).toContain("after this shop's own A2P 10DLC brand and campaign are approved");
    expect(GUARANTEE_TERMS_TEXT).toContain("subscription fees and setup fees");
    expect(GUARANTEE_TERMS_TEXT).toContain(GUARANTEE_REQUEST_EMAIL);
    expect(GUARANTEE_TERMS_TEXT).toContain("within 14 days after the 60-day window");
    expect(GUARANTEE_TERMS_TEXT.toLowerCase()).toContain("pending legal review");
  });

  it("puts the same sentence on the FAQ and links the terms", () => {
    const item = FAQS.find((entry) => entry.q === "What if LeadRescue does not book a job?");
    expect(item?.a.startsWith(RESULTS_GUARANTEE)).toBe(true);
    expect(item?.a).toContain(GUARANTEE_TERMS_TEXT);
    expect(item?.href).toBe("/guarantee");
    expect(item?.linkLabel).toBe("Read the guarantee terms");
  });

  it("marks the promise pending legal review in the docs", () => {
    const compliance = readFileSync("docs/COMPLIANCE.md", "utf8");
    const status = readFileSync("docs/STATUS.md", "utf8");
    expect(compliance).toContain(RESULTS_GUARANTEE);
    expect(compliance.toLowerCase()).toContain("pending legal review");
    expect(status).toContain("RESULTS_GUARANTEE");
    expect(status.toLowerCase()).toContain("pending legal review");
    expect(readFileSync("app/(marketing)/guarantee/page.tsx", "utf8")).toContain("RESULTS_GUARANTEE");
    expect(compliance).toContain("SHOW_GUARANTEE");
    expect(status).toContain("SHOW_GUARANTEE");
    expect(readFileSync(".env.example", "utf8")).toContain("SHOW_GUARANTEE=");
  });

  it("hides the promise unless SHOW_GUARANTEE is exactly true", () => {
    delete process.env.SHOW_GUARANTEE;
    expect(showGuarantee()).toBe(false);
    expect(publicFaqs().some((item) => item.q === "What if LeadRescue does not book a job?")).toBe(false);
    expect(FAQS.some((item) => item.a.startsWith(RESULTS_GUARANTEE))).toBe(true);
    process.env.SHOW_GUARANTEE = "false";
    expect(showGuarantee()).toBe(false);
    process.env.SHOW_GUARANTEE = " true ";
    expect(showGuarantee()).toBe(true);
    expect(publicFaqs().some((item) => item.href === "/guarantee")).toBe(true);
    const home = readFileSync("app/(marketing)/page.tsx", "utf8");
    const pricing = readFileSync("app/(marketing)/pricing/page.tsx", "utf8");
    const guarantee = readFileSync("app/(marketing)/guarantee/page.tsx", "utf8");
    expect(home).toContain("showGuarantee() ? <ResultsGuarantee /> : null");
    expect(home).toContain("<RevenueCalculator />");
    expect(home).toContain("<DoneForYou />");
    expect(pricing).toContain("showGuarantee() ? <ResultsGuarantee /> : null");
    expect(pricing).toContain("<RevenueCalculator />");
    expect(pricing).toContain("<DoneForYou />");
    expect(readFileSync("app/(marketing)/faq/page.tsx", "utf8")).toContain("publicFaqs()");
    expect(readFileSync("components/marketing/SiteFooter.tsx", "utf8")).toContain("showGuarantee()");
    expect(guarantee).toContain("notFound()");
    expect(guarantee).toContain("showGuarantee()");
  });
});

describe("missed-revenue estimate", () => {
  it("requires a missed-call percent and does not invent 27%", () => {
    expect(
      estimateMissedRevenue({
        callsPerWeek: 40,
        missedPercent: null,
        averageTicketUsd: 360,
        closeRatePercent: 30,
      }),
    ).toBeNull();
    expect(
      estimateMissedRevenue({
        callsPerWeek: 40,
        missedPercent: 120,
        averageTicketUsd: 360,
        closeRatePercent: 30,
      }),
    ).toBeNull();
    const calculator = readFileSync("components/marketing/RevenueCalculator.tsx", "utf8");
    const revenue = readFileSync("lib/marketing/revenue.ts", "utf8");
    expect(calculator).not.toMatch(/useState\(\s*["']27/);
    expect(calculator).toContain('useState("")');
    expect(revenue).not.toMatch(/\b27\b/);
    expect(REVENUE_ESTIMATE_LABEL).toBe("Estimate based on the shop's inputs.");
    expect(calculator).toContain("REVENUE_ESTIMATE_LABEL");
  });

  it("turns shop inputs into monthly and yearly revenue and a Growth payback", () => {
    const estimate = estimateMissedRevenue({
      callsPerWeek: 40,
      missedPercent: 25,
      averageTicketUsd: 360,
      closeRatePercent: 30,
    });
    expect(estimate?.monthlyUsd).toBe(4680);
    expect(estimate?.yearlyUsd).toBe(56160);
    expect(estimate?.growthMonthlyUsd).toBe(PAID_PLANS.growth.monthlyUsd);
    expect(estimate?.paybackMonths).toBeCloseTo(279 / 4680);
    expect(paybackLabel(estimate!)).toContain("Growth plan ($279 per month");
    const zero = estimateMissedRevenue({
      callsPerWeek: 0,
      missedPercent: 25,
      averageTicketUsd: 360,
      closeRatePercent: 30,
    });
    expect(zero?.monthlyUsd).toBe(0);
    expect(zero?.paybackMonths).toBeNull();
    expect(paybackLabel(zero!)).toContain("does not show a payback");
  });
});

describe("done-for-you setup", () => {
  it("names the four setup jobs and invents no testimonials", () => {
    expect(DONE_FOR_YOU.lede).toBe(
      "We handle number setup, 10DLC registration, calendar connection, and the CRM connection.",
    );
    const blob = [DONE_FOR_YOU.lede, ...DONE_FOR_YOU.points].join(" ");
    expect(blob).toMatch(/number setup/i);
    expect(blob).toMatch(/10DLC registration/i);
    expect(blob).toMatch(/calendar connection/i);
    expect(blob).toMatch(/CRM connection/i);
    expect(blob.toLowerCase()).toContain("coming soon");
    expect(blob).not.toMatch(/testimonial|stars|customers love|% of shops/i);
    const home = readFileSync("app/(marketing)/page.tsx", "utf8");
    const pricing = readFileSync("app/(marketing)/pricing/page.tsx", "utf8");
    expect(home).toContain("DoneForYou");
    expect(home).toContain("RevenueCalculator");
    expect(home).not.toContain("half a dollar");
    expect(pricing).toContain("DoneForYou");
    expect(pricing).toContain("RevenueCalculator");
  });
});
