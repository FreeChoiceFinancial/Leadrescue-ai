import type { Metadata } from "next";
import { DemoConsole } from "@/components/demo/DemoConsole";

export const metadata: Metadata = { title: "Demo" };

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <p className="rounded-2xl border border-copper/30 bg-[#fde8d8] px-4 py-3 text-sm leading-relaxed">
        Fictional demo for Demo HVAC Co, 1200 Fictional Ave, Austin. Every number is a 555-01 exchange. No SMS is sent, no calendar event is created, and no card is charged.
      </p>
      <h1 className="mt-8 font-display text-5xl">Miss the call. Book the job.</h1>
      <p className="mt-3 max-w-2xl text-ink/75">
        Play the caller. The sandbox assistant — not a live model — qualifies a repair and offers demo openings. Try “I smell gas” to see the owner escalation, or STOP to see the opt-out log.
      </p>
      <div className="mt-8">
        <DemoConsole />
      </div>
    </div>
  );
}
