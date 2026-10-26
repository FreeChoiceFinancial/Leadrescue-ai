"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/dashboard", "Overview"],
  ["/dashboard/leads", "Leads"],
  ["/dashboard/appointments", "Appointments"],
  ["/dashboard/activity", "Activity"],
  ["/dashboard/reports", "Weekly report"],
  ["/dashboard/billing", "Billing"],
  ["/onboarding/10dlc", "10DLC"],
  ["/dashboard/settings", "Settings"],
];

export function PortalShell({
  tenantName,
  mode,
  view,
  plan,
  children,
}: {
  tenantName: string;
  mode: "sandbox" | "live";
  view: "sample" | "fresh";
  plan: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#ebe4d8] text-ink md:grid md:grid-cols-[230px_1fr]">
      <aside className="flex flex-col bg-ink px-4 py-6 text-cream md:min-h-screen">
        <Link href="/" className="px-2 font-display text-2xl">
          LeadRescue
        </Link>
        <p className="mt-1 px-2 text-xs uppercase tracking-[0.16em] text-cream/50">{tenantName}</p>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {LINKS.map(([href, label]) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-xl px-3 py-2 text-sm ${active ? "bg-cream text-ink" : "text-cream/80 hover:bg-white/10"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="px-2 text-xs text-cream/50">Plan · {plan}</p>
      </aside>
      <div>
        {mode === "sandbox" ? (
          <div className="border-b border-copper/30 bg-[#fde8d8] px-6 py-3 text-sm leading-relaxed">
            Sandbox mode. {view === "fresh" ? "This is your onboarding profile with an empty pipeline." : "You are looking at fictional Demo HVAC Co data."} No texts or charges are real.{" "}
            <Link className="font-semibold underline" href={view === "fresh" ? "/api/sandbox/view?mode=sample" : "/api/sandbox/view?mode=fresh"}>
              {view === "fresh" ? "Show the sample week" : "Show the onboarding shop"}
            </Link>
          </div>
        ) : null}
        <div className="px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
