import type { Metadata } from "next";
import { FAQS } from "@/lib/marketing/faq";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-5xl">Questions shops ask first.</h1>
      <div className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-4" open>
            <summary className="cursor-pointer list-none font-display text-2xl">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
