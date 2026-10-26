import Link from "next/link";
import { GUARANTEE_PATH, GUARANTEE_PENDING_LEGAL_REVIEW, RESULTS_GUARANTEE } from "@/lib/marketing/guarantee";

export function ResultsGuarantee() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-[28px] border border-ink/10 bg-cream px-6 py-8 sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">{GUARANTEE_PENDING_LEGAL_REVIEW}</p>
        <h2 className="mt-3 max-w-4xl font-display text-3xl leading-tight sm:text-4xl">{RESULTS_GUARANTEE}</h2>
        <Link href={GUARANTEE_PATH} className="mt-5 inline-block text-sm font-semibold underline">
          Read the guarantee terms
        </Link>
      </div>
    </section>
  );
}
