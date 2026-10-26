import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { TenDlcForm, type TenDlcSaved } from "@/components/onboarding/TenDlcForm";
import {
  DEFAULT_CAMPAIGN_DESCRIPTION,
  DEFAULT_OPT_IN_DESCRIPTION,
  defaultHelpMessage,
  defaultStopMessage,
  sampleMissedCall,
  sampleSchedulingReply,
  type A2pStatus,
} from "@/lib/compliance/a2p-copy";
import { supabaseConfigured } from "@/lib/integrations/status";
import { A2P_COOKIE, parseStoredA2p } from "@/lib/onboarding/a2p-submit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "A2P 10DLC registration" };
export const dynamic = "force-dynamic";

async function loadSaved(): Promise<TenDlcSaved | null> {
  if (supabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("a2p_registrations")
      .select("legal_business_name, status, ein_last4, use_case")
      .limit(1)
      .maybeSingle();
    if (!data?.ein_last4 || !data.legal_business_name) return null;
    const status = data.status as A2pStatus;
    const useCase = data.use_case === "mixed" ? "mixed" : "customer_care";
    return {
      legalBusinessName: data.legal_business_name,
      status,
      einMasked: `••-•••${data.ein_last4}`,
      useCase,
    };
  }
  const jar = await cookies();
  const stored = parseStoredA2p(jar.get(A2P_COOKIE)?.value);
  if (!stored) return null;
  return stored;
}

export default async function TenDlcPage() {
  const saved = await loadSaved();
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <Link href="/dashboard" className="text-sm font-semibold">
        Dashboard
      </Link>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-copper">A2P 10DLC</p>
      <h1 className="mt-2 font-display text-4xl">Register this shop with the carriers.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/75">
        Each shop files its own brand and campaign. Send the details here for review. Saving this form does not file anything, and approval typically takes days to weeks after it is submitted to the carriers.
      </p>
      <div className="mt-8">
        <TenDlcForm
          saved={saved}
          defaults={{
            campaignDescription: DEFAULT_CAMPAIGN_DESCRIPTION,
            sampleMessages: [sampleMissedCall("Your shop"), sampleSchedulingReply("Your shop")],
            optInDescription: DEFAULT_OPT_IN_DESCRIPTION,
            stopMessage: defaultStopMessage("Your shop"),
            helpMessage: defaultHelpMessage("Your shop"),
          }}
        />
      </div>
    </div>
  );
}
