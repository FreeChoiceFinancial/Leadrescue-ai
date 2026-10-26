"use client";

import { useState } from "react";
import { PAID_PLANS, type BillingInterval } from "@/lib/billing/plans";
import { usd } from "@/lib/format";

export function BillingActions({ current }: { current: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("month");

  async function checkout(plan: string) {
    setPending(plan);
    setMessage(null);
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval }),
    });
    const payload = (await response.json()) as { error?: string; mode?: string; url?: string };
    if (!response.ok || !payload.url) {
      setMessage(payload.error ?? "Checkout failed.");
      setPending(null);
      return;
    }
    if (payload.mode === "sandbox") {
      setMessage("Sandbox checkout. Stripe is not configured, so no session and no charge were created.");
      setPending(null);
      return;
    }
    window.location.href = payload.url;
  }

  async function portal() {
    setPending("portal");
    setMessage(null);
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const payload = (await response.json()) as { error?: string; mode?: string; url?: string };
    if (!response.ok || !payload.url) {
      setMessage(payload.error ?? "Portal failed.");
      setPending(null);
      return;
    }
    if (payload.mode === "sandbox") {
      setMessage("Sandbox customer portal. There is no Stripe customer to open.");
      setPending(null);
      return;
    }
    window.location.href = payload.url;
  }

  return (
    <div>
      <div role="group" aria-label="Billing interval" className="mb-4 inline-flex rounded-full border border-ink/15 bg-paper p-1">
        <button type="button" aria-pressed={interval === "month"} className={`rounded-full px-4 py-2 text-sm font-semibold ${interval === "month" ? "bg-ink text-cream" : ""}`} onClick={() => setInterval("month")}>
          Monthly
        </button>
        <button type="button" aria-pressed={interval === "year"} className={`rounded-full px-4 py-2 text-sm font-semibold ${interval === "year" ? "bg-ink text-cream" : ""}`} onClick={() => setInterval("year")}>
          Annual
        </button>
      </div>
      <p className="mb-4 text-sm text-ink/70">
        {interval === "month" ? "Month to month. No contract. Cancel anytime." : "Annual is a 12-month commitment, billed once per year."}
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {Object.values(PAID_PLANS).map((plan) => (
          <button
            key={plan.id}
            className="rounded-2xl border border-ink/10 bg-cream p-4 text-left"
            type="button"
            disabled={pending !== null}
            onClick={() => void checkout(plan.id)}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-copper">{plan.id === current ? "Current" : "Choose"}</span>
            <span className="mt-2 block font-display text-3xl">{plan.name}</span>
            <span className="mt-1 block text-sm">
              {interval === "year"
                ? `${usd(plan.annualMonthlyUsd)} / month, ${usd(plan.annualYearlyUsd)} / year`
                : `${usd(plan.monthlyUsd)} / month`}
            </span>
            <span className="mt-2 block text-xs text-ink/60">{pending === plan.id ? "Contacting Stripe…" : "Open checkout"}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-ghost mt-4" type="button" disabled={pending !== null} onClick={() => void portal()}>
        {pending === "portal" ? "Opening…" : "Open customer portal"}
      </button>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </div>
  );
}
