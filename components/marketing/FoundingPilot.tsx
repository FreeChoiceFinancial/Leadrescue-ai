import Link from "next/link";
import { CitationLink } from "@/components/marketing/CitationList";
import { PAID_PLANS, type PaidPlanId } from "@/lib/billing/plans";
import { FTC_ENDORSEMENTS, FOUNDING_PILOT, foundingSignupHref } from "@/lib/marketing/trust";

export function FoundingPilot({ contained = true }: { contained?: boolean }) {
  const plans = Object.keys(PAID_PLANS) as PaidPlanId[];
  const card = (
      <div className="rounded-[28px] border border-ink/10 bg-ink px-6 py-8 text-cream sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e7b089]">{FOUNDING_PILOT.eyebrow}</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl text-cream">{FOUNDING_PILOT.title}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cream/80">{FOUNDING_PILOT.lede}</p>
        <ul className="mt-6 max-w-3xl space-y-3 text-sm leading-relaxed text-cream/85">
          {FOUNDING_PILOT.points.map((point) => (
            <li key={point} className="border-t border-cream/15 pt-3">
              {point}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-cream/70">
          {FOUNDING_PILOT.ftc}{" "}
          <CitationLink source={FTC_ENDORSEMENTS} tone="cream" />.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={foundingSignupHref("starter")} className="btn btn-primary">
            Request the Starter founding pilot
          </Link>
          {plans
            .filter((plan) => plan !== "starter")
            .map((plan) => (
              <Link key={plan} href={foundingSignupHref(plan)} className="text-sm font-semibold text-cream underline decoration-cream/40 underline-offset-2">
                {PAID_PLANS[plan].name}
              </Link>
            ))}
        </div>
      </div>
  );
  if (!contained) return <div className="mt-10">{card}</div>;
  return (
    <section id="founding" className="mx-auto max-w-6xl px-6 py-16">
      {card}
    </section>
  );
}
