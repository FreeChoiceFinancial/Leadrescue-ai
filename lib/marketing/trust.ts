import { OVERAGE_USD, PAID_PLANS, SETUP_FEE_USD, type PaidPlanId } from "@/lib/billing/plans";
import { usd } from "@/lib/format";

export type Citation = {
  label: string;
  href: string;
};

export type CitedFact = {
  text: string;
  sources: Citation[];
};

/** Public comparison footnote. Competitor pages can change after this date. */
export const COMPARED_AS_OF = "As of Oct 2026, terms may change.";

export const CALLRAIL_MISSED_CALLS: Citation = {
  label: "CallRail, January 2025 release via BusinessWire",
  href: "https://www.businesswire.com/news/home/20250114793850/en/CallRail-Releases-Report-Benchmarking-Marketing-Efforts-for-Small-Businesses",
};

export const INVOCA_REPORT: Citation = {
  label: "Invoca Home Services Lead Conversion Benchmarks Report, July 2026",
  href: "https://www.invoca.com/reports/the-invoca-home-services-lead-conversion-benchmarks-report-2026",
};

export const INVOCA_UNANSWERED: Citation = {
  label: "Invoca, August 26, 2026",
  href: "https://www.invoca.com/blog/3-ways-home-services-marketers-can-convert-more-leads-with-ai-sms-messaging-agents",
};

export const HOMEGUIDE_AC_REPAIR: Citation = {
  label: "HomeGuide, AC repair cost",
  href: "https://homeguide.com/costs/ac-repair-cost",
};

export const HOMEGUIDE_HVAC_REPAIR: Citation = {
  label: "HomeGuide, HVAC repair cost",
  href: "https://homeguide.com/costs/hvac-repair-cost",
};

export const ANGI_AC_REPLACEMENT: Citation = {
  label: "Angi, AC replacement cost (2026 data)",
  href: "https://www.angi.com/articles/how-much-does-installing-new-ac-cost.htm",
};

export const FTC_ENDORSEMENTS: Citation = {
  label: "FTC Endorsement Guides: What People Are Asking",
  href: "https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking",
};

/** HomeGuide's AC repair guide, not its HVAC-wide repair average ($293). */
export const AC_REPAIR_AVERAGE_USD = 360;

/** Angi 2026 national average, 24,979 verified projects. */
export const AC_REPLACEMENT_AVERAGE_USD = 5978;

export const WHY_IT_MATTERS = {
  unanswered: {
    callRailPercent: 14,
    invocaUnansweredPercent: 48,
    invocaSpeakWithPersonPercent: 52,
    summary:
      "Home-services missed-call rates in two vendor datasets run from 14% (CallRail) to 48% (Invoca, 2026). They measure different customer bases, so this is a range, not a single study.",
    callRail:
      "CallRail’s January 2025 benchmark release says home services had a 14% missed-call rate, in a set of 1.1 million de-identified conversations across seven industries.",
    invoca:
      "Invoca’s July 2026 home-services report says 52% of callers speak with a person. Invoca’s August 26, 2026 article, citing that report, says 48% of calls to home-services businesses go unanswered.",
  },
  acRepair: {
    usd: AC_REPAIR_AVERAGE_USD,
    summary:
      "HomeGuide lists a $360 national average for AC repair, from research and project costs reported by HomeGuide members. The typical range on that page is $150 to $650.",
    hvacNote:
      "HomeGuide’s separate HVAC repair guide lists a $293 national average. The $360 figure is the AC repair average.",
  },
  replacement: {
    usd: AC_REPLACEMENT_AVERAGE_USD,
    summary:
      "Angi says the 2026 national average for AC replacement is $5,978, based on 24,979 verified projects from Angi Pros. Most homeowners on that page pay $3,887 to $8,073 before extra ductwork.",
  },
} as const;

export const FOUNDING_PILOT_SHOPS = 5;
export const FOUNDING_PILOT_OFFER = "founding-pilot";
export const FOUNDING_FREE_MONTHS = 3;
export const FOUNDING_DISCOUNT_RATE = 0.25;
export const FOUNDING_DISCOUNT_YEARS = 2;

/** 25% off a published monthly list price, rounded to the cent. */
export function foundingMonthlyUsd(listUsd: number): number {
  return Math.round(listUsd * (1 - FOUNDING_DISCOUNT_RATE) * 100) / 100;
}

const FOUNDING_MONTHLY = {
  starter: foundingMonthlyUsd(PAID_PLANS.starter.monthlyUsd),
  growth: foundingMonthlyUsd(PAID_PLANS.growth.monthlyUsd),
  pro: foundingMonthlyUsd(PAID_PLANS.pro.monthlyUsd),
} as const;

const FOUNDING_PRICE_LINE = `After the ${FOUNDING_FREE_MONTHS} free months, the price is 25% off the month-to-month price for ${FOUNDING_DISCOUNT_YEARS} years: Starter ${usd(FOUNDING_MONTHLY.starter)}, Growth ${usd(FOUNDING_MONTHLY.growth)}, and Pro ${usd(FOUNDING_MONTHLY.pro)} per month.`;

export const FOUNDING_PILOT = {
  shops: FOUNDING_PILOT_SHOPS,
  offer: FOUNDING_PILOT_OFFER,
  freeMonths: FOUNDING_FREE_MONTHS,
  discountYears: FOUNDING_DISCOUNT_YEARS,
  monthly: FOUNDING_MONTHLY,
  eyebrow: "Founding pilot",
  title: "The first 5 HVAC shops.",
  lede: "The first 5 HVAC shops get 3 months free: no subscription fee and no $99 setup fee during the pilot.",
  points: [
    FOUNDING_PRICE_LINE,
    "The plan stays month to month. Cancel anytime. The founding discount is not combined with annual.",
    "We ask for honest feedback on what helped and what did not.",
    "A public review or a case study happens only if you are happy with the product, and only if you want to. The 3 free months and the 25% discount do not depend on a review, a star rating, or a case study.",
    "If we publish a case study, it will say the shop joined as a founding pilot.",
  ],
  ftc: "The FTC says a business cannot condition a discount on a review being positive. This offer does not condition the discount on any review.",
  flagNote: "Founding pilot flag is on for this signup. A review is not required for the 3 free months or the later discount.",
};

export function foundingPilotPlainText(): string {
  return [FOUNDING_PILOT.lede, ...FOUNDING_PILOT.points].join(" ");
}

export function foundingPlanSummary(plan: PaidPlanId): string {
  const list = PAID_PLANS[plan].monthlyUsd;
  const pilot = foundingMonthlyUsd(list);
  return `This signup is flagged as a founding pilot for one of the first ${FOUNDING_PILOT_SHOPS} HVAC shops. The first ${FOUNDING_FREE_MONTHS} months have no subscription fee and no $99 setup fee. After that, ${PAID_PLANS[plan].name} is ${usd(pilot)} per month for ${FOUNDING_DISCOUNT_YEARS} years, 25% off the ${usd(list)} month-to-month price. The plan stays month to month, and you can cancel anytime. The founding discount is not combined with annual. A review is optional and is not required for the discount.`;
}

export function isFoundingPilotOffer(value: string | undefined): boolean {
  return value === FOUNDING_PILOT_OFFER;
}

export function foundingSignupHref(plan: PaidPlanId = "starter"): string {
  return `/signup?plan=${plan}&offer=${FOUNDING_PILOT_OFFER}`;
}

export const COMPARISON_ATTRIBUTES = [
  ["price", "Public price"],
  ["contract", "Contract"],
  ["setup", "Setup"],
  ["focus", "HVAC focus"],
  ["textBack", "Missed-call text-back"],
  ["qualification", "Qualification"],
  ["booking", "Calendar booking"],
] as const;

export type ComparisonAttribute = (typeof COMPARISON_ATTRIBUTES)[number][0];

export type ComparisonColumn = {
  id: "leadrescue" | "podium" | "hatch" | "highlevel";
  name: string;
  note: string;
  facts: Record<ComparisonAttribute, CitedFact>;
};

const LEADRESCUE_PRICING: Citation = { label: "LeadRescue pricing", href: "/pricing" };
const LEADRESCUE_FAQ: Citation = { label: "LeadRescue FAQ", href: "/faq" };

export const COMPARISON_COLUMNS: ComparisonColumn[] = [
  {
    id: "leadrescue",
    name: "LeadRescue",
    note: "This product. Prices below are the ones published on this site.",
    facts: {
      price: {
        text: `List price is Starter ${usd(PAID_PLANS.starter.monthlyUsd)}, Growth ${usd(PAID_PLANS.growth.monthlyUsd)}, and Pro ${usd(PAID_PLANS.pro.monthlyUsd)} per month. Extra conversations are ${usd(OVERAGE_USD)}. A 14-day trial is included. The founding pilot for the first ${FOUNDING_PILOT_SHOPS} HVAC shops is ${FOUNDING_FREE_MONTHS} months with no subscription fee and no setup fee, then 25% off the month-to-month price for ${FOUNDING_DISCOUNT_YEARS} years (${usd(FOUNDING_MONTHLY.starter)}, ${usd(FOUNDING_MONTHLY.growth)}, and ${usd(FOUNDING_MONTHLY.pro)}). That discount is not combined with annual. Annual is a 12-month commitment at Starter ${usd(PAID_PLANS.starter.annualMonthlyUsd)} per month (${usd(PAID_PLANS.starter.annualYearlyUsd)} per year), Growth ${usd(PAID_PLANS.growth.annualMonthlyUsd)} per month (${usd(PAID_PLANS.growth.annualYearlyUsd)} per year), and Pro ${usd(PAID_PLANS.pro.annualMonthlyUsd)} per month (${usd(PAID_PLANS.pro.annualYearlyUsd)} per year).`,
        sources: [LEADRESCUE_PRICING],
      },
      contract: {
        text: "Month to month has no contract and cancels from the Stripe customer portal once a live subscription exists. Annual is a 12-month commitment.",
        sources: [LEADRESCUE_PRICING],
      },
      setup: {
        text: `Month-to-month plans include a ${usd(SETUP_FEE_USD)} setup fee once, for forwarding guidance, quiet hours, owner alerts, and the first calendar connection. Annual plans have no setup fee. Founding-pilot shops pay no subscription fee and no ${usd(SETUP_FEE_USD)} setup fee during the first ${FOUNDING_FREE_MONTHS} months.`,
        sources: [LEADRESCUE_PRICING],
      },
      focus: {
        text: "Built for US owner-operated HVAC companies with about 2–15 people.",
        sources: [{ label: "LeadRescue homepage", href: "/" }],
      },
      textBack: {
        text: "After a no-answer forward, one informational text names the business, says the call was missed, and includes STOP.",
        sources: [LEADRESCUE_FAQ],
      },
      qualification: {
        text: "The text thread asks whether the job is a repair, a tune-up, or an install, and stops booking for gas, smoke, or a CO alarm.",
        sources: [LEADRESCUE_FAQ],
      },
      booking: {
        text: "Openings come from Google Calendar free/busy when that account is connected. Without those credentials, openings are labeled sandbox and nothing is written to a real calendar.",
        sources: [LEADRESCUE_FAQ],
      },
    },
  },
  {
    id: "podium",
    name: "Podium",
    note: "Home-services AI employee sold by Podium.",
    facts: {
      price: {
        text: "Quote-based / not published. The public pricing page asks for a custom quote and does not list a dollar price.",
        sources: [{ label: "Podium pricing", href: "https://www.podium.com/getpricing" }],
      },
      contract: {
        text: "Standard terms set an initial subscription of 12 months unless the order says otherwise. It renews for the same length unless either party gives written notice at least 30 days before the term ends. The client agrees to pay for the whole term.",
        sources: [{ label: "Podium Terms, section 8.1", href: "https://legal.podium.com/" }],
      },
      setup: {
        text: "Quote-based / not published. The terms allow one-time fees for setup, implementation, or onboarding when they are written on the order. No dollar amount is on the public pricing page.",
        sources: [
          { label: "Podium pricing", href: "https://www.podium.com/getpricing" },
          { label: "Podium Terms, section 7.1", href: "https://legal.podium.com/" },
        ],
      },
      focus: {
        text: "The home-services site covers HVAC, plumbing, electrical, and garage door. It is not an HVAC-only product.",
        sources: [{ label: "Podium home-services communications", href: "https://homeservices.podium.com/features/communications" }],
      },
      textBack: {
        text: "Podium says its AI answers calls 24 hours a day, qualifies the caller, and books onto the dispatch board, and that it replies to text leads. The feature copy we reviewed does not state a separate automatic text after an unanswered call.",
        sources: [{ label: "Podium home-services communications", href: "https://homeservices.podium.com/features/communications" }],
      },
      qualification: {
        text: "On a live call, Podium says the AI qualifies the customer, collects job details, and books before the call ends.",
        sources: [{ label: "Podium home-services communications", href: "https://homeservices.podium.com/features/communications" }],
      },
      booking: {
        text: "Podium says the AI books onto the customer’s calendar and dispatch board.",
        sources: [{ label: "Podium home-services communications", href: "https://homeservices.podium.com/features/communications" }],
      },
    },
  },
  {
    id: "hatch",
    name: "Hatch",
    note: "AI communications platform for service businesses.",
    facts: {
      price: {
        text: "Quote-based / not published. Hatch describes a platform fee plus usage across Standard, Pro, and Enterprise, and says it quotes from locations and volume. No dollar price is on the pricing page.",
        sources: [{ label: "Hatch pricing", href: "https://www.usehatchapp.com/pricing" }],
      },
      contract: {
        text: "Plans are an annual agreement, paid monthly per location. Hatch says the exact length, billing start, and cancellation terms are set in each agreement. The pricing page says there is no published pilot or trial.",
        sources: [{ label: "Hatch pricing", href: "https://www.usehatchapp.com/pricing" }],
      },
      setup: {
        text: "The pricing page includes AI setup and support, and describes white-glove onboarding. A separate setup fee is not published.",
        sources: [{ label: "Hatch pricing", href: "https://www.usehatchapp.com/pricing" }],
      },
      focus: {
        text: "Hatch says it serves home services and home improvement businesses, from one location to multi-brand companies. It is not described as HVAC-only.",
        sources: [{ label: "Hatch documentation", href: "https://docs.usehatchapp.com/getting-started/intro-to-hatch/what-is-hatch" }],
      },
      textBack: {
        text: "Hatch’s published voice product answers the inbound call, including nights, weekends, and holidays. SMS is part of the multichannel CSR. A missed-call text-back feature is not described on the pricing or voice pages reviewed.",
        sources: [
          { label: "Hatch Voice AI", href: "https://www.usehatchapp.com/product/voice-ai" },
          { label: "Hatch pricing", href: "https://www.usehatchapp.com/pricing" },
        ],
      },
      qualification: {
        text: "Hatch says the voice agent identifies the call type, answers from the business’s knowledge, and qualifies the lead.",
        sources: [{ label: "Hatch Voice AI", href: "https://www.usehatchapp.com/product/voice-ai" }],
      },
      booking: {
        text: "Hatch says the agent books onto a live calendar while the caller is on the line, including ServiceTitan and LeadPerfection for most major trade software.",
        sources: [{ label: "Hatch Voice AI", href: "https://www.usehatchapp.com/product/voice-ai" }],
      },
    },
  },
  {
    id: "highlevel",
    name: "HighLevel",
    note: "The published GoHighLevel platform, sold as an all-in-one agency tool. This column is that product, not a blend of similar tools.",
    facts: {
      price: {
        text: "Starter $97 per month ($970 per year), Unlimited $297 per month ($2,970 per year), and Agency Pro $497 per month ($4,970 per year). Enterprise is custom. Phone, SMS, and AI usage are billed separately.",
        sources: [{ label: "HighLevel pricing", href: "https://www.gohighlevel.com/pricing" }],
      },
      contract: {
        text: "Month to month. HighLevel’s pricing FAQ says there is no long-term contract, and that you can upgrade, downgrade, or cancel from the dashboard. A 14-day trial is published. Billing starts at the end of the trial unless it is canceled.",
        sources: [{ label: "HighLevel pricing", href: "https://www.gohighlevel.com/pricing" }],
      },
      setup: {
        text: "No setup fee is listed. Signup is a self-serve 14-day trial. Usage charges for phone, SMS, or AI can apply during the trial.",
        sources: [{ label: "HighLevel pricing", href: "https://www.gohighlevel.com/pricing" }],
      },
      focus: {
        text: "Marketed to agencies and many industries. The pricing FAQ gives snapshot examples for real estate, dentists, and gyms. It is not an HVAC-only product.",
        sources: [{ label: "HighLevel pricing", href: "https://www.gohighlevel.com/pricing" }],
      },
      textBack: {
        text: "Missed Call Text Back sends a custom text when a call goes unanswered. The message can include a calendar booking link, and it can run after hours.",
        sources: [{ label: "HighLevel, missed-call text back", href: "https://www.gohighlevel.com/post/missed-call-text-back-appointments" }],
      },
      qualification: {
        text: "The missed-call text is a message you write. Conversation AI and Voice AI are separate core features, and usage charges apply. The missed-call post does not describe that text as an AI qualification conversation.",
        sources: [
          { label: "HighLevel, missed-call text back", href: "https://www.gohighlevel.com/post/missed-call-text-back-appointments" },
          { label: "HighLevel pricing", href: "https://www.gohighlevel.com/pricing" },
        ],
      },
      booking: {
        text: "Booking calendars are a listed core feature. HighLevel says a missed-call text can include a booking link and that a booked appointment is added to the HighLevel calendar.",
        sources: [
          { label: "HighLevel pricing", href: "https://www.gohighlevel.com/pricing" },
          { label: "HighLevel, missed-call text back", href: "https://www.gohighlevel.com/post/missed-call-text-back-appointments" },
        ],
      },
    },
  },
];
