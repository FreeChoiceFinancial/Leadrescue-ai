"use client";

import { useState } from "react";
import { PAID_PLANS } from "@/lib/billing/plans";
import { usd } from "@/lib/format";

export function BillingActions({ current }: { current: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function checkout(plan: string) {
    setPending(plan);
    setMessage(null);
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
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
            <span className="mt-1 block text-sm">{usd(plan.monthlyUsd)} / month</span>
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
