"use client";

import { useState } from "react";
import { PricingCards } from "@/components/marketing/PricingCards";
import { SETUP_FEE_USD, type BillingInterval } from "@/lib/billing/plans";
import { usd } from "@/lib/format";

export function PricingChooser() {
  const [interval, setInterval] = useState<BillingInterval>("month");
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label="Billing interval" className="inline-flex rounded-full border border-ink/15 bg-cream p-1">
          <IntervalButton current={interval} value="month" onSelect={setInterval}>
            Monthly
          </IntervalButton>
          <IntervalButton current={interval} value="year" onSelect={setInterval}>
            Annual
          </IntervalButton>
        </div>
        <p className="max-w-xl text-sm text-ink/75">
          {interval === "month"
            ? `Month to month. No contract. Cancel anytime. Setup fee ${usd(SETUP_FEE_USD)}.`
            : "Annual is a 12-month commitment, billed once per year. No setup fee."}
        </p>
      </div>
      <div className="mt-6">
        <PricingCards interval={interval} />
      </div>
    </div>
  );
}

function IntervalButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: BillingInterval;
  value: BillingInterval;
  onSelect: (value: BillingInterval) => void;
  children: string;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${selected ? "bg-ink text-cream" : "text-ink/70"}`}
      onClick={() => onSelect(value)}
    >
      {children}
    </button>
  );
}
