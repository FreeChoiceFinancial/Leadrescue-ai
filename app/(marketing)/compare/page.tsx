import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { COMPARED_AS_OF } from "@/lib/marketing/trust";

export const metadata: Metadata = {
  title: "Compare",
  description: "LeadRescue compared with Podium, Hatch, and HighLevel using published prices and product pages.",
};

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">Comparison</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-tight">LeadRescue, Podium, Hatch, and HighLevel.</h1>
      <p className="mt-4 max-w-3xl text-lg text-ink/75">
        Each cell is a fact from a public page, with the link under it. Where a dollar price is not on that page, the cell says quote-based / not published. {COMPARED_AS_OF}
      </p>
      <div className="mt-8">
        <ComparisonTable />
      </div>
      <p className="mt-8 text-sm text-ink/70">
        <Link href="/pricing" className="link font-semibold text-copper">
          LeadRescue pricing
        </Link>
        {" · "}
        <Link href="/signup" className="link font-semibold text-copper">
          Start a trial
        </Link>
      </p>
    </div>
  );
}
