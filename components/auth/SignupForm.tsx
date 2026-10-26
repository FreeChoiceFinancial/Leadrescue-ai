"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignupForm({
  configured,
  plan,
  foundingPilot = false,
  interval = "month",
}: {
  configured: boolean;
  plan: string;
  foundingPilot?: boolean;
  interval?: "month" | "year";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("business") ?? "");
    if (!configured) {
      window.sessionStorage.setItem(
        "lr_signup_draft",
        JSON.stringify({ email, name, plan, interval, mode: "sandbox", foundingPilot }),
      );
      router.push("/onboarding");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setPending(false);
      return;
    }
    const redirect = `${window.location.origin}/auth/callback?next=/onboarding`;
    const { error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirect,
        data: { business_name: name, ...(foundingPilot ? { founding_pilot: true } : {}) },
      },
    });
    if (signError) {
      setError(signError.message);
      setPending(false);
      return;
    }
    router.push("/onboarding");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-ink/10 bg-cream p-6">
      {foundingPilot ? (
        <p className="rounded-2xl bg-[#e4f3ea] px-3 py-2 text-sm">
          Founding pilot flag is on. The discount does not depend on a review.
        </p>
      ) : null}
      {!configured ? (
        <p className="rounded-2xl bg-[#fde8d8] px-3 py-2 text-sm">
          Sandbox signup. Supabase Auth is not configured, so this does not create a login and the password is not stored.
        </p>
      ) : null}
      <label className="block text-sm font-semibold">
        Work email
        <input className="field mt-1" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input className="field mt-1" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <label className="block text-sm font-semibold">
        Business name
        <input className="field mt-1" name="business" required minLength={2} placeholder="Northwind HVAC" />
      </label>
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="interval" value={interval} />
      <input type="hidden" name="offer" value={foundingPilot ? "founding-pilot" : ""} />
      {error ? <p className="text-sm text-stamp">{error}</p> : null}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Starting…" : configured ? "Create account" : "Continue in sandbox"}
      </button>
    </form>
  );
}
