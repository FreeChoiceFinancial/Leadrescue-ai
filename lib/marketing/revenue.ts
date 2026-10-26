import { PAID_PLANS } from "@/lib/billing/plans";

/** Weeks in a year divided by months. There is no default missed-call rate. */
const WEEKS_PER_MONTH = 52 / 12;

export type RevenueInputs = {
  callsPerWeek: number | null;
  missedPercent: number | null;
  averageTicketUsd: number | null;
  closeRatePercent: number | null;
};

export type RevenueEstimate = {
  missedCallsPerMonth: number;
  monthlyUsd: number;
  yearlyUsd: number;
  growthMonthlyUsd: number;
  paybackMonths: number | null;
};

export const REVENUE_ESTIMATE_LABEL = "Estimate based on the shop's inputs.";

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

export function estimateMissedRevenue(input: RevenueInputs): RevenueEstimate | null {
  const calls = input.callsPerWeek;
  const missed = input.missedPercent;
  const ticket = input.averageTicketUsd;
  const close = input.closeRatePercent;
  if (calls === null || missed === null || ticket === null || close === null) return null;
  if (![calls, missed, ticket, close].every((value) => Number.isFinite(value))) return null;
  if (calls < 0 || ticket < 0 || missed < 0 || missed > 100 || close < 0 || close > 100) return null;
  const missedCallsPerMonth = calls * (missed / 100) * WEEKS_PER_MONTH;
  const monthlyUsd = roundUsd(missedCallsPerMonth * (close / 100) * ticket);
  const yearlyUsd = roundUsd(monthlyUsd * 12);
  const growthMonthlyUsd = PAID_PLANS.growth.monthlyUsd;
  return {
    missedCallsPerMonth,
    monthlyUsd,
    yearlyUsd,
    growthMonthlyUsd,
    paybackMonths: monthlyUsd > 0 ? growthMonthlyUsd / monthlyUsd : null,
  };
}

export function paybackLabel(estimate: RevenueEstimate): string {
  const price = `$${estimate.growthMonthlyUsd}`;
  if (estimate.paybackMonths === null) {
    return `This estimate is $0 a month, so it does not show a payback against the Growth plan (${price} per month).`;
  }
  const months = Math.round(estimate.paybackMonths * 10) / 10;
  if (months < 0.1) {
    return `Less than 0.1 months of this estimate covers the Growth plan (${price} per month, month to month).`;
  }
  return `${months} months of this estimate covers the Growth plan (${price} per month, month to month).`;
}
