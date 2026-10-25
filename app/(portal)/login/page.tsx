import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { supabaseConfigured } from "@/lib/integrations/status";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  const configured = supabaseConfigured();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="font-display text-2xl">
        LeadRescue
      </Link>
      <h1 className="mt-6 font-display text-4xl">Log in</h1>
      <p className="mt-2 text-sm text-ink/70">The customer dashboard is separate from the public marketing site.</p>
      <div className="mt-6 rounded-3xl border border-ink/10 bg-cream p-6">
        <LoginForm configured={configured} />
      </div>
      {!configured ? (
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/dashboard">Open sandbox dashboard</Link>
          <Link href="/demo">Run the demo</Link>
        </div>
      ) : (
        <Link href="/signup" className="mt-4 text-sm font-semibold">
          Need an account? Start a trial
        </Link>
      )}
    </div>
  );
}
