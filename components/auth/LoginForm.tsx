"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    if (!configured) {
      setError("Supabase Auth is not configured. Use the sandbox dashboard or the fictional demo.");
      return;
    }
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    if (signError) {
      setError(signError.message);
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-semibold">
        Email
        <input className="field mt-1" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input className="field mt-1" name="password" type="password" required autoComplete="current-password" />
      </label>
      {error ? <p className="text-sm text-stamp">{error}</p> : null}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
