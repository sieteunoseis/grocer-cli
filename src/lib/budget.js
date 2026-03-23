import { getSpendingForPeriod } from "./db.js";

/**
 * Calculate the current budget period boundaries.
 */
export function getCurrentPeriod(budget) {
  const periodDays = budget.period === "biweekly" ? 14 : 7;
  const start = new Date(budget.start_date);
  const today = new Date();

  const daysSinceStart = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  const currentPeriodIndex = Math.max(
    0,
    Math.floor(daysSinceStart / periodDays),
  );

  const periodStart = new Date(start);
  periodStart.setDate(periodStart.getDate() + currentPeriodIndex * periodDays);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + periodDays - 1);

  const periodStartStr = periodStart.toISOString().split("T")[0];
  const periodEndStr = periodEnd.toISOString().split("T")[0];
  const periodLabel = `${periodStartStr} → ${periodEndStr}`;

  return {
    periodStart: periodStartStr,
    periodEnd: periodEndStr,
    periodLabel,
  };
}

/**
 * Get spending data for recent periods (for sparklines).
 */
export function getRecentPeriodSpending(budget, count) {
  const periodDays = budget.period === "biweekly" ? 14 : 7;
  const start = new Date(budget.start_date);
  const today = new Date();
  const daysSinceStart = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  const currentPeriodIndex = Math.floor(daysSinceStart / periodDays);

  const data = [];
  for (
    let i = Math.max(0, currentPeriodIndex - count + 1);
    i <= currentPeriodIndex;
    i++
  ) {
    const periodStart = new Date(start);
    periodStart.setDate(periodStart.getDate() + i * periodDays);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + periodDays - 1);

    const startStr = periodStart.toISOString().split("T")[0];
    const endStr = periodEnd.toISOString().split("T")[0];
    const spending = getSpendingForPeriod(startStr, endStr);

    data.push({
      spent: spending.spent,
      trips: spending.trips,
      label: startStr.slice(5), // MM-DD
    });
  }

  return data;
}
