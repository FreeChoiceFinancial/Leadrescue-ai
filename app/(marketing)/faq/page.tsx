import type { Metadata } from "next";
import Link from "next/link";
import { publicFaqs } from "@/lib/marketing/faq";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-5xl">Questions shops ask first.</h1>
      <div className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
        {publicFaqs().map((item) => (
          <details key={item.q} className="group py-4" open>
            <summary className="cursor-pointer list-none font-display text-2xl">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{item.a}</p>
            {"href" in item && item.href ? (
              <Link href={item.href} className="mt-2 inline-block text-sm font-semibold underline">
                {item.linkLabel}
              </Link>
            ) : null}
          </details>
        ))}
      </div>
    </div>
  );
}
