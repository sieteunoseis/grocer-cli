import { Command } from "commander";
import { getBudget, setBudget, getSpendingForPeriod } from "../lib/db.js";
import chalk from "chalk";

const SPARK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

const budgetCmd = new Command("budget").description(
  "Set and track a grocery budget",
);

// --- set ---
budgetCmd
  .command("set")
  .description("Set your grocery budget")
  .argument("<amount>", "Budget amount in dollars")
  .option(
    "-p, --period <period>",
    "Budget period: weekly or biweekly",
    "weekly",
  )
  .option(
    "-s, --start <date>",
    "Budget start date (YYYY-MM-DD), defaults to today",
  )
  .action((amount, opts) => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      console.error(chalk.red("Budget amount must be a positive number."));
      process.exit(1);
    }

    const period = opts.period.toLowerCase();
    if (period !== "weekly" && period !== "biweekly") {
      console.error(chalk.red('Period must be "weekly" or "biweekly".'));
      process.exit(1);
    }

    const startDate = opts.start || new Date().toISOString().split("T")[0];
    setBudget(parsed, period, startDate);

    console.log(chalk.green(`\nBudget set: $${parsed.toFixed(2)} ${period}`));
    console.log(chalk.dim(`  Starting: ${startDate}`));
    console.log();
  });

// --- status ---
budgetCmd
  .command("status")
  .description("Check your current budget status")
  .action(() => {
    const budget = getBudget();
    if (!budget) {
      console.log(chalk.yellow("No budget set."));
      console.log(
        chalk.dim("Set one: grocer-cli budget set 150 --period weekly"),
      );
      return;
    }

    const { periodStart, periodEnd, periodLabel } = getCurrentPeriod(budget);
    const spending = getSpendingForPeriod(periodStart, periodEnd);
    const remaining = budget.amount - spending.spent;
    const pct = budget.amount > 0 ? (spending.spent / budget.amount) * 100 : 0;

    console.log(chalk.bold("\nBudget Status\n"));
    console.log(`  Period:    ${budget.period} (${periodLabel})`);
    console.log(`  Budget:    $${budget.amount.toFixed(2)}`);
    console.log(
      `  Spent:     $${spending.spent.toFixed(2)} (${spending.trips} trips)`,
    );

    if (remaining >= 0) {
      console.log(chalk.green(`  Remaining: $${remaining.toFixed(2)}`));
    } else {
      console.log(chalk.red(`  Over by:   $${Math.abs(remaining).toFixed(2)}`));
    }

    // Progress bar
    const barWidth = 30;
    const filled = Math.min(Math.round((pct / 100) * barWidth), barWidth);
    const empty = barWidth - filled;
    const barColor =
      pct > 100 ? chalk.red : pct > 80 ? chalk.yellow : chalk.green;
    const bar = barColor("█".repeat(filled)) + chalk.dim("░".repeat(empty));
    console.log(`\n  [${bar}] ${pct.toFixed(0)}%`);

    // Days remaining in period
    const today = new Date();
    const endDate = new Date(periodEnd);
    const daysLeft = Math.max(
      0,
      Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)),
    );
    if (remaining > 0 && daysLeft > 0) {
      const perDay = remaining / daysLeft;
      console.log(
        chalk.dim(
          `\n  ${daysLeft} days left — ~$${perDay.toFixed(2)}/day remaining`,
        ),
      );
    }

    // Sparkline of recent periods
    const sparkData = getRecentPeriodSpending(budget, 8);
    if (sparkData.some((d) => d.spent > 0)) {
      const spark = sparkline(
        sparkData.map((d) => d.spent),
        budget.amount,
      );
      console.log(
        `\n  Spending trend:  ${colorSparkline(sparkData, budget.amount)}`,
      );
      console.log(
        chalk.dim(
          `                   ${sparkData[0].label}${" ".repeat(Math.max(0, spark.length - sparkData[0].label.length - sparkData[sparkData.length - 1].label.length))}${sparkData[sparkData.length - 1].label}`,
        ),
      );
    }

    console.log();
  });

// --- history ---
budgetCmd
  .command("history")
  .description("View budget history across recent periods")
  .option("-n, --periods <n>", "Number of periods to show", "8")
  .action((opts) => {
    const budget = getBudget();
    if (!budget) {
      console.log(chalk.yellow("No budget set."));
      return;
    }

    const periodsToShow = parseInt(opts.periods, 10);
    const periodDays = budget.period === "biweekly" ? 14 : 7;
    const start = new Date(budget.start_date);

    console.log(
      chalk.bold(
        `\nBudget History ($${budget.amount.toFixed(2)} ${budget.period})\n`,
      ),
    );

    // Calculate periods going back from now
    const today = new Date();
    const daysSinceStart = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    const currentPeriodIndex = Math.floor(daysSinceStart / periodDays);

    const rows = [];
    for (
      let i = currentPeriodIndex;
      i >= Math.max(0, currentPeriodIndex - periodsToShow + 1);
      i--
    ) {
      const periodStart = new Date(start);
      periodStart.setDate(periodStart.getDate() + i * periodDays);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + periodDays - 1);

      const startStr = periodStart.toISOString().split("T")[0];
      const endStr = periodEnd.toISOString().split("T")[0];
      const spending = getSpendingForPeriod(startStr, endStr);

      const pct =
        budget.amount > 0 ? (spending.spent / budget.amount) * 100 : 0;
      const isCurrent = i === currentPeriodIndex;
      const label = isCurrent ? chalk.bold(" ← now") : "";
      const color =
        pct > 100 ? chalk.red : pct > 80 ? chalk.yellow : chalk.green;

      // Mini sparkline bar for each row
      const miniBar = miniSparkBar(pct);
      const coloredBar = (
        pct > 100 ? chalk.red : pct > 80 ? chalk.yellow : chalk.green
      )(miniBar);

      rows.push(
        `  ${startStr} → ${endStr}  ${coloredBar}  ${color(`$${spending.spent.toFixed(2).padStart(7)}`)} / $${budget.amount.toFixed(2)}  ${color(`${pct.toFixed(0).padStart(3)}%`)}  ${spending.trips} trips${label}`,
      );
    }

    for (const row of rows) console.log(row);

    // Overall sparkline at the bottom
    const sparkData = getRecentPeriodSpending(budget, periodsToShow);
    if (sparkData.some((d) => d.spent > 0)) {
      console.log(`\n  Trend: ${colorSparkline(sparkData, budget.amount)}`);
    }

    console.log();
  });

/**
 * Generate a sparkline string from an array of values.
 */
function sparkline(values, max) {
  if (!max) max = Math.max(...values);
  if (max === 0) return SPARK_CHARS[0].repeat(values.length);

  return values
    .map((v) => {
      const idx = Math.min(
        Math.round((v / max) * (SPARK_CHARS.length - 1)),
        SPARK_CHARS.length - 1,
      );
      return SPARK_CHARS[idx];
    })
    .join("");
}

/**
 * Generate a colored sparkline — green under budget, yellow near, red over.
 */
function colorSparkline(periodData, budgetAmount) {
  return periodData
    .map((d) => {
      const pct = budgetAmount > 0 ? (d.spent / budgetAmount) * 100 : 0;
      const idx = Math.min(
        Math.round((d.spent / (budgetAmount || 1)) * (SPARK_CHARS.length - 1)),
        SPARK_CHARS.length - 1,
      );
      const char = SPARK_CHARS[Math.max(0, idx)];
      if (pct > 100) return chalk.red(char);
      if (pct > 80) return chalk.yellow(char);
      return chalk.green(char);
    })
    .join("");
}

/**
 * Mini horizontal bar for history rows (8 chars wide).
 */
function miniSparkBar(pct) {
  const width = 8;
  const filled = Math.min(Math.round((pct / 100) * width), width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/**
 * Get spending data for recent periods (for sparklines).
 */
function getRecentPeriodSpending(budget, count) {
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

/**
 * Calculate the current budget period boundaries.
 */
function getCurrentPeriod(budget) {
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

export default budgetCmd;
