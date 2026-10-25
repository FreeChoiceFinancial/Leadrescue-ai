import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl">LeadRescue AI</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream/75">
            Missed-call recovery for owner-operated HVAC companies. Month to month, with the price on the page.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-cream/60">Product</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/pricing">Pricing</Link>
            <Link href="/demo">Interactive demo</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/signup">Trial signup</Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-cream/60">Legal drafts</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of service</Link>
          </div>
          <p className="mt-4 text-cream/60">Policies are drafts and need legal review before launch.</p>
        </div>
      </div>
    </footer>
  );
}
