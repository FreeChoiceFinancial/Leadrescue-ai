import { BillingActions } from "@/components/portal/BillingActions";
import { OVERAGE_USD, SETUP_FEE_USD, allowanceFor } from "@/lib/billing/plans";
import { overageAmountUsd } from "@/lib/billing/plans";
import { usd } from "@/lib/format";
import { getPortalModel } from "@/lib/portal/load";
import { StatusChip } from "@/components/portal/StatusChip";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ sandbox_checkout?: string; checkout?: string }> }) {
  const query = await searchParams;
  const { workspace, mode } = await getPortalModel();
  const tenant = workspace.tenant;
  const allowance = tenant.conversationAllowance || allowanceFor(tenant.plan);
  const used = tenant.conversationsUsed;
  const width = Math.min(100, Math.round((used / Math.max(allowance, 1)) * 100));
  return (
    <div>
      <h1 className="font-display text-4xl">Billing</h1>
      <p className="mt-2 text-sm text-ink/70">
        {mode === "sandbox"
          ? "Stripe test mode is not connected. Buttons below explain the sandbox instead of charging anyone."
          : "Checkout uses Stripe test keys only. A live secret key is refused."}
      </p>
      {query.sandbox_checkout ? (
        <p className="mt-4 rounded-2xl bg-[#fde8d8] px-4 py-3 text-sm">Sandbox checkout for {query.sandbox_checkout}. No Stripe session was created.</p>
      ) : null}
      {query.checkout === "success" ? <p className="mt-4 text-sm">Checkout returned. Webhooks update the plan after Stripe confirms it.</p> : null}
      <section className="mt-6 rounded-3xl bg-cream p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-3xl capitalize">{tenant.plan}</h2>
          <StatusChip value={tenant.subscriptionStatus} />
        </div>
        <p className="mt-3 text-sm">
          {used} of {allowance} conversations used. Overage {usd(overageAmountUsd(tenant.overageConversations))} at {usd(OVERAGE_USD)} each. Setup fee {tenant.setupFeePaid ? "paid" : `${usd(SETUP_FEE_USD)} on month-to-month, $0 on annual`}.
        </p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-paper">
          <div className="h-full bg-copper" style={{ width: `${width}%` }} />
        </div>
      </section>
      <div className="mt-6">
        <BillingActions current={tenant.plan} />
      </div>
    </div>
  );
}
