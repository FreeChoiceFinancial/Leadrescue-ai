import Link from "next/link";

const links = [
  ["How it works", "/#how"],
  ["Pricing", "/pricing"],
  ["FAQ", "/faq"],
  ["Demo", "/demo"],
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="link font-display text-xl tracking-tight">
          LeadRescue
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-ink/75 md:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="link hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="link hidden text-sm font-semibold sm:inline">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Start trial
          </Link>
        </div>
      </div>
    </header>
  );
}
