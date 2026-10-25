import { titleCase } from "@/lib/format";

export function StatusChip({ value }: { value: string }) {
  const tone = ["booked", "active", "approved"].includes(value)
    ? "chip-good"
    : ["escalated", "opted_out", "lost", "canceled", "rejected"].includes(value)
      ? "chip-bad"
      : ["qualifying", "booking", "pending", "trialing", "sandbox", "past_due"].includes(value)
        ? "chip-warn"
        : "";
  return <span className={`chip ${tone}`}>{titleCase(value)}</span>;
}
