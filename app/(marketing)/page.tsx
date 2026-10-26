import Link from "next/link";
import { CitationLink } from "@/components/marketing/CitationList";
import { FoundingPilot } from "@/components/marketing/FoundingPilot";
import { PricingCards } from "@/components/marketing/PricingCards";
import { WhyItMatters } from "@/components/marketing/WhyItMatters";
import { PAID_PLANS } from "@/lib/billing/plans";
import { AC_REPAIR_AVERAGE_USD, HOMEGUIDE_AC_REPAIR } from "@/lib/marketing/trust";
import { usd } from "@/lib/format";

const steps = [
  ["Missed", "The shop line forwards a no-answer call to your Twilio number."],
  ["Text back", "We send one informational text: business name, why we texted, and STOP."],
  ["Qualify", "The assistant asks repair, maintenance, or install — and stops for emergencies."],
  ["Book", "Openings come from Google Calendar free/busy, or the labeled demo calendar."],
];

export default function HomePage() {
  const starter = PAID_PLANS.starter.monthlyUsd;
  const ticket = AC_REPAIR_AVERAGE_USD;
  return (
    <>
      <section className="ruled border-b border-ink/10">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-copper">Owner-operated HVAC · 2–15 people</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.02] sm:text-6xl">
              The call you missed is the job your competitor booked.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/75">
              LeadRescue texts that caller, finds out whether they need a repair, a tune-up, or an install, and offers a real opening before they dial the next shop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary">
                Start the free trial
              </Link>
              <Link href="/demo" className="btn btn-ghost">
                Run the fictional demo
              </Link>
            </div>
            <p className="mt-4 max-w-lg text-sm text-ink/60">
              Month to month. {usd(starter)} Starter. HomeGuide’s national average for an AC repair is {usd(ticket)} (
              <CitationLink source={HOMEGUIDE_AC_REPAIR} />
              ). One repair at that average covers the plan and leaves {usd(ticket - starter)}. Your tickets will differ.
            </p>
          </div>
          <div className="rounded-[28px] bg-ink p-3 shadow-ticket">
            <div className="rounded-[22px] bg-cream p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">Work order · fictional</p>
                  <h2 className="mt-1 font-display text-3xl">Rescued call</h2>
                </div>
                <span className="stamp">Rescued</span>
              </div>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-dashed border-ink/15 pb-2">
                  <dt className="text-ink/55">Caller</dt>
                  <dd>(512) 555-0148</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-dashed border-ink/15 pb-2">
                  <dt className="text-ink/55">Job</dt>
                  <dd>AC blowing warm air</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-dashed border-ink/15 pb-2">
                  <dt className="text-ink/55">Booked</dt>
                  <dd>Tue, 9:00–11:00 AM</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/55">Shop</dt>
                  <dd>Demo HVAC Co</dd>
                </div>
              </dl>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-ink/10 pt-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink/50">AC repair average</p>
                  <p className="font-display text-4xl">{usd(ticket)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink/50">Starter</p>
                  <p className="font-display text-4xl">{usd(starter)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-pine">
                One repair at the {usd(ticket)} average covers the month, with {usd(ticket - starter)} left over.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-4xl">From a ringing phone to a name on the board.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {steps.map(([title, copy], index) => (
            <article key={title} className="rounded-3xl border border-ink/10 bg-cream p-5">
              <p className="font-display text-3xl text-copper">0{index + 1}</p>
              <h3 className="mt-3 font-display text-2xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/75">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <WhyItMatters />

      <section className="border-b border-ink/10 bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-3">
          <div>
            <h2 className="font-display text-3xl">Built for the rules, not around them.</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink/75">
            The first text is informational: your business name, the missed call, and Reply STOP to opt out. Follow-ups wait for a YES, stay under three, and stay inside quiet hours.
          </p>
          <p className="text-sm leading-relaxed text-ink/75">
            Each shop registers its own A2P 10DLC brand and campaign. Gas, smoke, and CO alarms stop the bot, tell the caller to leave and call 911, and text the owner.
          </p>
        </div>
      </section>

      <FoundingPilot />

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl">Simple monthly pricing.</h2>
            <p className="mt-2 max-w-xl text-ink/70">
              These prices are month to month, with no contract. Annual pricing is a 12-month commitment and is on the pricing page. The setup fee is {usd(99)} once. Extra conversations are half a dollar.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/compare" className="link text-sm font-semibold text-copper">
              Compare with Podium, Hatch, and HighLevel
            </Link>
            <Link href="/pricing" className="link text-sm font-semibold text-copper">
              See the full pricing page
            </Link>
          </div>
        </div>
        <PricingCards />
      </section>
    </>
  );
}
