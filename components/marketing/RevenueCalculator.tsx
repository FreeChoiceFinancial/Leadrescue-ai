"use client";

import { useMemo, useState } from "react";
import { CALLRAIL_MISSED_CALLS, INVOCA_UNANSWERED, WHY_IT_MATTERS } from "@/lib/marketing/trust";
import { REVENUE_ESTIMATE_LABEL, estimateMissedRevenue, paybackLabel } from "@/lib/marketing/revenue";
import { CitationLink } from "@/components/marketing/CitationList";
import { usd } from "@/lib/format";

function readNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RevenueCalculator() {
  const [calls, setCalls] = useState("");
  const [missed, setMissed] = useState("");
  const [ticket, setTicket] = useState("");
  const [closeRate, setCloseRate] = useState("");
  const estimate = useMemo(
    () =>
      estimateMissedRevenue({
        callsPerWeek: readNumber(calls),
        missedPercent: readNumber(missed),
        averageTicketUsd: readNumber(ticket),
        closeRatePercent: readNumber(closeRate),
      }),
    [calls, missed, ticket, closeRate],
  );
  const missedEntered = missed.trim() !== "";
  return (
    <section id="estimate" className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="font-display text-4xl">What missed calls might be worth.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/75">
        {REVENUE_ESTIMATE_LABEL} It multiplies your calls per week by the percent you miss, your close rate, and your average ticket. It is not a forecast and it is not a count of jobs LeadRescue has booked.
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        Published home-services rates on this site run from {WHY_IT_MATTERS.unanswered.callRailPercent}% (
        <CitationLink source={CALLRAIL_MISSED_CALLS} />) to {WHY_IT_MATTERS.unanswered.invocaUnansweredPercent}% (
        <CitationLink source={INVOCA_UNANSWERED} />
        ). Those studies are not the same measurement. The missed-call field has no default. Enter your own percent.
      </p>
      <form className="mt-6 grid gap-4 rounded-[28px] border border-ink/10 bg-cream p-5 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
        <Field label="Calls per week" value={calls} onChange={setCalls} />
        <Field label="Percent missed" value={missed} onChange={setMissed} suffix="%" />
        <Field label="Average ticket" value={ticket} onChange={setTicket} prefix="$" />
        <Field label="Close rate" value={closeRate} onChange={setCloseRate} suffix="%" />
        <div className="sm:col-span-2 border-t border-ink/10 pt-4">
          {estimate ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Result label="Monthly revenue at risk" value={usd(estimate.monthlyUsd)} />
              <Result label="Yearly revenue at risk" value={usd(estimate.yearlyUsd)} />
              <Result
                label="Payback vs Growth"
                value={estimate.paybackMonths === null ? "—" : `${Math.round(estimate.paybackMonths * 10) / 10} mo`}
              />
              <p className="sm:col-span-3 text-sm leading-relaxed text-ink/75">{paybackLabel(estimate)}</p>
            </div>
          ) : (
            <p className="text-sm text-ink/70">
              {missedEntered
                ? "Enter calls per week, a missed-call percent from 0 to 100, an average ticket, and a close rate from 0 to 100."
                : "Enter calls per week, the percent of calls you miss, your average ticket, and your close rate."}
            </p>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink/45">{REVENUE_ESTIMATE_LABEL}</p>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-1 flex items-center gap-2">
        {prefix ? <span className="text-ink/50">{prefix}</span> : null}
        <input
          className="field"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? <span className="text-ink/50">{suffix}</span> : null}
      </span>
    </label>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl leading-tight">{value}</p>
    </div>
  );
}
