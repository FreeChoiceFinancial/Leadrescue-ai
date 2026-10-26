import { CitationLink } from "@/components/marketing/CitationList";
import {
  ANGI_AC_REPLACEMENT,
  CALLRAIL_MISSED_CALLS,
  HOMEGUIDE_AC_REPAIR,
  HOMEGUIDE_HVAC_REPAIR,
  INVOCA_REPORT,
  INVOCA_UNANSWERED,
  WHY_IT_MATTERS,
} from "@/lib/marketing/trust";
import { usd } from "@/lib/format";

export function WhyItMatters() {
  const repair = WHY_IT_MATTERS.acRepair.usd;
  const replacement = WHY_IT_MATTERS.replacement.usd;
  return (
    <section id="why" className="border-y border-ink/10 bg-cream">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">Why it matters</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl">Published numbers, with the page they came from.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
          These figures describe other companies’ datasets and homeowner cost guides. They are not a promise of calls recovered or revenue earned.
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-ink/10 bg-paper p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/50">Unanswered home-services calls</p>
            <p className="mt-3 font-display text-4xl">
              {WHY_IT_MATTERS.unanswered.callRailPercent}%–{WHY_IT_MATTERS.unanswered.invocaUnansweredPercent}%
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{WHY_IT_MATTERS.unanswered.summary}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{WHY_IT_MATTERS.unanswered.callRail}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{WHY_IT_MATTERS.unanswered.invoca}</p>
            <p className="mt-4 text-xs leading-relaxed text-ink/55">
              <CitationLink source={CALLRAIL_MISSED_CALLS} />
              {". "}
              <CitationLink source={INVOCA_REPORT} />
              {". "}
              <CitationLink source={INVOCA_UNANSWERED} />
              .
            </p>
          </article>
          <article className="rounded-3xl border border-ink/10 bg-paper p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/50">AC repair, national average</p>
            <p className="mt-3 font-display text-4xl">{usd(repair)}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{WHY_IT_MATTERS.acRepair.summary}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{WHY_IT_MATTERS.acRepair.hvacNote}</p>
            <p className="mt-4 text-xs leading-relaxed text-ink/55">
              <CitationLink source={HOMEGUIDE_AC_REPAIR} />
              {". "}
              <CitationLink source={HOMEGUIDE_HVAC_REPAIR} />
              .
            </p>
          </article>
          <article className="rounded-3xl border border-ink/10 bg-paper p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/50">AC replacement, national average</p>
            <p className="mt-3 font-display text-4xl">{usd(replacement)}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{WHY_IT_MATTERS.replacement.summary}</p>
            <p className="mt-4 text-xs leading-relaxed text-ink/55">
              <CitationLink source={ANGI_AC_REPLACEMENT} />.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
