import { DONE_FOR_YOU } from "@/lib/marketing/setup";

export function DoneForYou() {
  return (
    <section id="setup" className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="font-display text-4xl">{DONE_FOR_YOU.title}</h2>
      <p className="mt-3 max-w-3xl text-lg text-ink/75">{DONE_FOR_YOU.lede}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {DONE_FOR_YOU.points.map((point) => (
          <article key={point} className="rounded-3xl border border-ink/10 bg-cream p-5 text-sm leading-relaxed text-ink/75">
            {point}
          </article>
        ))}
      </div>
    </section>
  );
}
