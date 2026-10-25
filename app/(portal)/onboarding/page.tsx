import Link from "next/link";
import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { supabaseConfigured } from "@/lib/integrations/status";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-14">
      <Link href="/" className="text-sm font-semibold">
        LeadRescue
      </Link>
      <h1 className="mt-4 font-display text-4xl">Tell us about the shop.</h1>
      <p className="mt-2 text-sm text-ink/70">This takes a minute. Live texting stays off until your own 10DLC campaign is approved.</p>
      <div className="mt-6">
        <OnboardingWizard configured={supabaseConfigured()} />
      </div>
    </div>
  );
}
