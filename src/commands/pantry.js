import { Command } from "commander";
import {
  addPantryItem,
  getPantryItems,
  getExpiringItems,
  markConsumed,
  updateBestBy,
  removePantryItem,
  getPurchase,
  getPurchaseItems,
} from "../lib/db.js";
import { estimateBestBy, getShelfLifeDays, getAllShelfLifeEntries } from "../lib/shelflife.js";
import chalk from "chalk";

const pantryCmd = new Command("pantry").description(
  "Track what's in your fridge/pantry and when it expires"
);

// --- status ---
pantryCmd
  .command("status")
  .description("Show pantry overview with expiration alerts")
  .action(() => {
    const items = getPantryItems();
    if (!items.length) {
      console.log(chalk.yellow("\nPantry is empty."));
      console.log(chalk.dim("Add items: grocer pantry add \"milk\" or auto-track from purchases.\n"));
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const expired = items.filter((i) => i.best_by < today);
    const expiringSoon = items.filter(
      (i) => i.best_by >= today && daysUntil(i.best_by) <= 3
    );
    const fresh = items.filter((i) => daysUntil(i.best_by) > 3);

    console.log(chalk.bold("\nPantry Status\n"));
    console.log(`  ${chalk.green(fresh.length)} fresh   ${chalk.yellow(expiringSoon.length)} expiring soon   ${chalk.red(expired.length)} expired`);
    console.log(`  ${items.length} items tracked\n`);

    if (expired.length) {
      console.log(chalk.red.bold("  ⚠ Expired:"));
      for (const item of expired) {
        console.log(chalk.red(`    ${item.product_name} — expired ${item.best_by} (${Math.abs(daysUntil(item.best_by))}d ago)  [#${item.id}]`));
      }
      console.log();
    }

    if (expiringSoon.length) {
      console.log(chalk.yellow.bold("  Expiring soon:"));
      for (const item of expiringSoon) {
        const d = daysUntil(item.best_by);
        const label = d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d}d`;
        console.log(chalk.yellow(`    ${item.product_name} — best by ${item.best_by} (${label})  [#${item.id}]`));
      }
      console.log();
    }

    if (fresh.length) {
      console.log(chalk.dim("  Fresh:"));
      for (const item of fresh.slice(0, 10)) {
        console.log(chalk.dim(`    ${item.product_name} — best by ${item.best_by} (${daysUntil(item.best_by)}d)  [#${item.id}]`));
      }
      if (fresh.length > 10) {
        console.log(chalk.dim(`    ... and ${fresh.length - 10} more`));
      }
      console.log();
    }
  });

// --- list ---
pantryCmd
  .command("list")
  .description("List all pantry items")
  .option("-a, --all", "Include consumed items")
  .action((opts) => {
    const items = getPantryItems({ includeConsumed: !!opts.all });
    if (!items.length) {
      console.log(chalk.yellow("\nNo pantry items found.\n"));
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    console.log(chalk.bold("\nPantry Items\n"));
    for (const item of items) {
      const days = daysUntil(item.best_by);
      let color = chalk.green;
      let status = `${days}d left`;
      if (item.consumed) {
        color = chalk.dim;
        status = "consumed";
      } else if (item.best_by < today) {
        color = chalk.red;
        status = `expired ${Math.abs(days)}d ago`;
      } else if (days <= 3) {
        color = chalk.yellow;
        status = days === 0 ? "expires today" : `${days}d left`;
      }

      console.log(
        color(`  #${String(item.id).padEnd(4)} ${item.product_name.padEnd(30)} ${item.best_by}  (${status})`)
      );
    }
    console.log();
  });

// --- add ---
pantryCmd
  .command("add")
  .description("Manually add an item to the pantry")
  .argument("<name>", "Product name")
  .option("-q, --quantity <n>", "Quantity", "1")
  .option("-d, --date <date>", "Purchase date (YYYY-MM-DD)", () => new Date().toISOString().split("T")[0])
  .option("-b, --best-by <date>", "Override best-by date (YYYY-MM-DD)")
  .action((name, opts) => {
    const purchaseDate = opts.date || new Date().toISOString().split("T")[0];
    let bestBy, shelfLifeDays;

    if (opts.bestBy) {
      bestBy = opts.bestBy;
      const d = new Date(bestBy);
      const p = new Date(purchaseDate);
      shelfLifeDays = Math.round((d - p) / (1000 * 60 * 60 * 24));
    } else {
      const est = estimateBestBy(name, purchaseDate);
      bestBy = est.bestBy;
      shelfLifeDays = est.shelfLifeDays;
    }

    const id = addPantryItem({
      productName: name,
      quantity: parseFloat(opts.quantity),
      purchaseDate,
      bestBy,
      shelfLifeDays,
    });

    console.log(chalk.green(`\nAdded to pantry: ${name}`));
    console.log(chalk.dim(`  Best by: ${bestBy} (~${shelfLifeDays} days)`));
    console.log(chalk.dim(`  Pantry item #${id}\n`));
  });

// --- track-purchase ---
pantryCmd
  .command("track")
  .description("Auto-add all items from a purchase to pantry")
  .argument("<purchaseId>", "Purchase ID to track")
  .action((purchaseId) => {
    const purchase = getPurchase(parseInt(purchaseId, 10));
    if (!purchase) {
      console.log(chalk.yellow("Purchase not found."));
      return;
    }

    const items = getPurchaseItems(purchase.id);
    if (!items.length) {
      console.log(chalk.yellow("No items in this purchase."));
      return;
    }

    console.log(chalk.bold(`\nTracking ${items.length} items from purchase #${purchase.id} (${purchase.date}):\n`));

    for (const item of items) {
      const { bestBy, shelfLifeDays } = estimateBestBy(item.product_name, purchase.date);
      const id = addPantryItem({
        purchaseItemId: item.id,
        productName: item.product_name,
        productId: item.product_id,
        upc: item.upc,
        quantity: item.quantity,
        purchaseDate: purchase.date,
        bestBy,
        shelfLifeDays,
      });

      const color = shelfLifeDays <= 3 ? chalk.yellow : chalk.green;
      console.log(
        color(`  ${item.product_name.padEnd(30)} best by ${bestBy}  (~${shelfLifeDays}d)`)
      );
    }
    console.log();
  });

// --- consumed ---
pantryCmd
  .command("consumed")
  .description("Mark an item as consumed/used up")
  .argument("<id>", "Pantry item ID")
  .action((id) => {
    markConsumed(parseInt(id, 10));
    console.log(chalk.green(`Marked #${id} as consumed.`));
  });

// --- extend ---
pantryCmd
  .command("extend")
  .description("Update the best-by date for an item")
  .argument("<id>", "Pantry item ID")
  .argument("<date>", "New best-by date (YYYY-MM-DD)")
  .action((id, date) => {
    updateBestBy(parseInt(id, 10), date);
    console.log(chalk.green(`Updated #${id} best-by to ${date}.`));
  });

// --- toss ---
pantryCmd
  .command("toss")
  .description("Remove an item from the pantry")
  .argument("<id>", "Pantry item ID")
  .action((id) => {
    removePantryItem(parseInt(id, 10));
    console.log(chalk.green(`Removed #${id} from pantry.`));
  });

// --- shelf-life ---
pantryCmd
  .command("shelf-life")
  .description("Look up estimated shelf life for a product")
  .argument("<name>", "Product name")
  .action((name) => {
    const days = getShelfLifeDays(name);
    const { bestBy } = estimateBestBy(name, new Date().toISOString().split("T")[0]);
    console.log(`\n  ${chalk.bold(name)}: ~${days} days`);
    console.log(chalk.dim(`  If purchased today → best by ${bestBy}`));
    console.log();
  });

// --- expiring (quick check) ---
pantryCmd
  .command("expiring")
  .description("Show items expiring within N days")
  .option("-d, --days <n>", "Days ahead to check", "3")
  .action((opts) => {
    const days = parseInt(opts.days, 10);
    const items = getExpiringItems(days);

    if (!items.length) {
      console.log(chalk.green(`\nNothing expiring within ${days} days.\n`));
      return;
    }

    console.log(chalk.bold(`\nExpiring within ${days} days:\n`));
    const today = new Date().toISOString().split("T")[0];
    for (const item of items) {
      const d = daysUntil(item.best_by);
      let color = chalk.yellow;
      let label = d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d}d`;
      if (item.best_by < today) {
        color = chalk.red;
        label = `${Math.abs(d)}d ago`;
      }
      console.log(color(`  ${item.product_name.padEnd(30)} ${item.best_by}  (${label})  [#${item.id}]`));
    }
    console.log();
  });

function daysUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export default pantryCmd;
