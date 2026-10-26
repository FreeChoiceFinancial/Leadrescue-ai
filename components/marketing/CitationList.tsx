import Link from "next/link";
import type { Citation } from "@/lib/marketing/trust";

export function CitationList({ sources }: { sources: Citation[] }) {
  return (
    <span>
      {sources.map((source, index) => (
        <span key={source.href}>
          {index > 0 ? "; " : null}
          <CitationLink source={source} />
        </span>
      ))}
    </span>
  );
}

export function CitationLink({ source, tone = "ink" }: { source: Citation; tone?: "ink" | "cream" }) {
  const className =
    tone === "cream"
      ? "underline decoration-cream/50 underline-offset-2 hover:decoration-cream"
      : "underline decoration-ink/30 underline-offset-2 hover:decoration-ink";
  if (source.href.startsWith("/")) {
    return (
      <Link href={source.href} className={className}>
        {source.label}
      </Link>
    );
  }
  return (
    <a href={source.href} className={className} target="_blank" rel="noopener noreferrer">
      {source.label}
    </a>
  );
}
