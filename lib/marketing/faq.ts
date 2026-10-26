import { PAID_PLANS } from "@/lib/billing/plans";
import { usd } from "@/lib/format";
import { foundingPilotPlainText } from "@/lib/marketing/trust";

export const FAQS = [
  {
    q: "Who gets a text?",
    a: "Only someone who called the shop and was not answered, plus the replies in that thread. LeadRescue does not buy lists or text cold prospects.",
  },
  {
    q: "What does the first text say?",
    a: "It names the business, says the call was missed, says it is not a promotion, and includes Reply STOP to opt out and Reply HELP for help.",
  },
  {
    q: "Can I add my team?",
    a: "Yes, unlimited users on every plan; pricing is based on conversations, not seats.",
  },
  {
    q: "Do HubSpot and Zoho come with every plan?",
    a: "Coming soon. HubSpot and Zoho CRM sync is included on Starter, Growth, and Premium. The connection stays in sandbox until CRM sync is turned on, and LeadRescue does not claim a live sync.",
  },
  {
    q: "What is a conversation on the invoice?",
    a: "One caller thread. The qualifying texts and up to three permission-based follow-ups sit inside that same conversation.",
  },
  {
    q: "Can you text after 9pm?",
    a: "The missed-call text and follow-ups wait until quiet hours end. The default window is 9:00pm to 8:00am in the shop's timezone. A reply to someone who just texted you can go out immediately.",
  },
  {
    q: "Whose phone number sends the message?",
    a: "The shop's own number, after that shop's A2P 10DLC brand and campaign are approved. LeadRescue does not share one campaign across customers.",
  },
  {
    q: "How do I register A2P 10DLC?",
    a: "Each shop registers its own brand and campaign. The form collects the legal business details, sample messages, the missed-call opt-in, and STOP and HELP text. Saving the form does not file anything. We review it, then submit it to the carriers. Approval typically takes days to weeks.",
    href: "/onboarding/10dlc",
    linkLabel: "Open the 10DLC form",
  },
  {
    q: "What if the caller smells gas?",
    a: "The assistant stops booking, tells them to leave and call 911 if there is gas, smoke, or a CO alarm, and notifies the owner by SMS and email. This is not a life-safety monitoring service.",
  },
  {
    q: "Where do the appointment times come from?",
    a: "Google Calendar free/busy when that account is connected. Without credentials, the product shows demo openings and labels them as sandbox. Nothing is written to a real calendar in that mode.",
  },
  {
    q: "Where does the $360 repair figure come from?",
    a: "HomeGuide’s AC repair guide lists a $360 national average, from member-reported project costs, with a typical range of $150 to $650. HomeGuide’s HVAC repair guide lists a different national average, $293. Angi lists a 2026 national average of $5,978 for AC replacement, from 24,979 verified projects. These are published cost benchmarks. Your tickets, close rate, and season will differ.",
  },
  {
    q: "What is the founding pilot?",
    a: foundingPilotPlainText(),
  },
  {
    q: "What does annual billing cost?",
    a: `Annual is a 12-month commitment, billed once per year. Starter is ${usd(PAID_PLANS.starter.annualMonthlyUsd)} per month (${usd(PAID_PLANS.starter.annualYearlyUsd)} per year), Growth is ${usd(PAID_PLANS.growth.annualMonthlyUsd)} per month (${usd(PAID_PLANS.growth.annualYearlyUsd)} per year), and Premium is ${usd(PAID_PLANS.premium.annualMonthlyUsd)} per month (${usd(PAID_PLANS.premium.annualYearlyUsd)} per year). Month-to-month stays ${usd(PAID_PLANS.starter.monthlyUsd)}, ${usd(PAID_PLANS.growth.monthlyUsd)}, and ${usd(PAID_PLANS.premium.monthlyUsd)}, with no contract and cancel anytime. The month-to-month price is 60% higher than the annual per-month price.`,
  },
  {
    q: "How do I cancel?",
    a: "Month-to-month plans have no contract and cancel anytime in the Stripe customer portal. Annual is a 12-month commitment. Sandbox mode never creates a charge.",
  },
  {
    q: "Are the privacy policy and terms final?",
    a: "No. Both pages are drafts and say so. Have a lawyer review them before you rely on them or send customer traffic.",
  },
];
