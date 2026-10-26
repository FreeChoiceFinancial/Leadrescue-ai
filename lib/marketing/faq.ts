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
    q: "How do I cancel?",
    a: "Plans are month to month. The Stripe customer portal is where a live subscription is canceled. Sandbox mode never creates a charge.",
  },
  {
    q: "Are the privacy policy and terms final?",
    a: "No. Both pages are drafts and say so. Have a lawyer review them before you rely on them or send customer traffic.",
  },
];
