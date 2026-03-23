import { Command } from "commander";
import { readFileSync } from "fs";
import { getActiveProvider } from "../providers/registry.js";
import { getConfig } from "../lib/config.js";
import {
  createPurchase,
  addPurchaseItem,
  listPurchases,
  getPurchase,
  getPurchaseItems,
  deletePurchase,
  getPurchaseStats,
} from "../lib/db.js";
import chalk from "chalk";

const purchasesCmd = new Command("purchases").description(
  "Track and view purchase history",
);

// --- import ---
purchasesCmd
  .command("import")
  .description("Import purchases from a receipt email file (.eml or .html)")
  .argument("<file>", "Path to receipt email file")
  .action(async (file) => {
    try {
      const provider = getActiveProvider();
      if (!provider.parseReceipt) {
        console.log(
          chalk.yellow(
            `Receipt parsing is not supported for ${provider.label} yet.`,
          ),
        );
        return;
      }

      let content;
      try {
        content = readFileSync(file, "utf-8");
      } catch {
        console.error(chalk.red(`Could not read file: ${file}`));
        process.exit(1);
      }

      // For .eml files, extract the HTML or text body
      const body = extractEmailBody(content);
      const receipt = provider.parseReceipt(body);

      if (!receipt.items.length) {
        console.log(
          chalk.yellow(
            "No items could be parsed from this receipt. The email format may not be recognized.",
          ),
        );
        console.log(
          chalk.dim(
            "Tip: You can manually add purchases with: grocer-cli purchases add",
          ),
        );
        return;
      }

      const config = getConfig();
      const purchaseId = createPurchase({
        chain: config.chain,
        store: receipt.store,
        date: receipt.date || new Date().toISOString().split("T")[0],
        subtotal: receipt.subtotal,
        tax: receipt.tax,
        total: receipt.total,
        savings: receipt.savings,
        source: "email",
      });

      for (const item of receipt.items) {
        addPurchaseItem(purchaseId, {
          productName: item.productName,
          productId: item.productId,
          upc: item.upc,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          savings: item.savings,
        });
      }

      console.log(chalk.green(`\nImported purchase #${purchaseId}:`));
      if (receipt.store) console.log(`  Store: ${receipt.store}`);
      if (receipt.date) console.log(`  Date:  ${receipt.date}`);
      console.log(`  Items: ${receipt.items.length}`);
      if (receipt.total) console.log(`  Total: $${receipt.total.toFixed(2)}`);
      if (receipt.savings)
        console.log(chalk.green(`  Saved: $${receipt.savings.toFixed(2)}`));
      console.log();
    } catch (err) {
      console.error(chalk.red(`Import failed: ${err.message}`));
      process.exit(1);
    }
  });

// --- add (manual) ---
purchasesCmd
  .command("add")
  .description("Manually log a purchase")
  .argument("<item>", "Item name")
  .option("-p, --price <price>", "Price paid")
  .option("-q, --quantity <n>", "Quantity", "1")
  .option("-d, --date <date>", "Purchase date (YYYY-MM-DD)", () => {
    return new Date().toISOString().split("T")[0];
  })
  .action((item, opts) => {
    try {
      const config = getConfig();
      const date = opts.date || new Date().toISOString().split("T")[0];
      const price = opts.price ? parseFloat(opts.price) : null;
      const quantity = parseInt(opts.quantity, 10);

      // Find or create today's purchase
      const purchaseId = createPurchase({
        chain: config.chain || "unknown",
        date,
        total: price ? price * quantity : null,
        source: "manual",
      });

      addPurchaseItem(purchaseId, {
        productName: item,
        quantity,
        unitPrice: price,
        totalPrice: price ? price * quantity : null,
      });

      console.log(
        chalk.green(
          `Logged: ${quantity}x "${item}"${price ? ` @ $${price.toFixed(2)}` : ""}`,
        ),
      );
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- list ---
purchasesCmd
  .command("list")
  .description("List recent purchases")
  .option("-n, --limit <n>", "Number of purchases to show", "20")
  .action((opts) => {
    const purchases = listPurchases(parseInt(opts.limit, 10));
    if (!purchases.length) {
      console.log(chalk.yellow("No purchases recorded yet."));
      console.log(
        chalk.dim("Import a receipt: grocer-cli purchases import <file>"),
      );
      return;
    }

    console.log(chalk.bold("\nRecent Purchases:\n"));
    for (const p of purchases) {
      const total = p.total ? `$${p.total.toFixed(2)}` : "";
      const savings = p.savings
        ? chalk.green(` saved $${p.savings.toFixed(2)}`)
        : "";
      console.log(
        `  ${chalk.cyan(String(p.id).padStart(3))}  ${p.date}  ${p.item_count} items  ${total}${savings}  ${chalk.dim(p.source)}`,
      );
    }
    console.log();
  });

// --- show ---
purchasesCmd
  .command("show")
  .description("Show details of a specific purchase")
  .argument("<id>", "Purchase ID")
  .action((id) => {
    const purchase = getPurchase(parseInt(id, 10));
    if (!purchase) {
      console.log(chalk.yellow("Purchase not found."));
      return;
    }

    const items = getPurchaseItems(purchase.id);
    console.log(chalk.bold(`\nPurchase #${purchase.id}`));
    console.log(`  Date:   ${purchase.date}`);
    if (purchase.store) console.log(`  Store:  ${purchase.store}`);
    console.log(`  Source: ${purchase.source}`);
    console.log();

    if (items.length) {
      console.log(chalk.bold("  Items:"));
      for (const item of items) {
        const qty = item.quantity !== 1 ? `${item.quantity}x ` : "";
        const price = item.total_price
          ? chalk.green(`$${item.total_price.toFixed(2)}`)
          : "";
        const unit =
          item.unit_price && item.quantity > 1
            ? chalk.dim(` @ $${item.unit_price.toFixed(2)}`)
            : "";
        console.log(`    ${qty}${item.product_name} ${price}${unit}`);
      }
    }

    console.log();
    if (purchase.subtotal)
      console.log(`  Subtotal: $${purchase.subtotal.toFixed(2)}`);
    if (purchase.tax) console.log(`  Tax:      $${purchase.tax.toFixed(2)}`);
    if (purchase.total)
      console.log(chalk.bold(`  Total:    $${purchase.total.toFixed(2)}`));
    if (purchase.savings)
      console.log(chalk.green(`  Savings:  $${purchase.savings.toFixed(2)}`));
    console.log();
  });

// --- stats ---
purchasesCmd
  .command("stats")
  .description("View spending stats and most-purchased items")
  .action(() => {
    const { totals, topItems, monthly } = getPurchaseStats();

    if (!totals.trip_count) {
      console.log(chalk.yellow("No purchase data yet."));
      return;
    }

    console.log(chalk.bold("\nPurchase Stats\n"));

    console.log(chalk.bold("  Overview:"));
    console.log(`    Trips:          ${totals.trip_count}`);
    if (totals.total_spent)
      console.log(`    Total spent:    $${totals.total_spent.toFixed(2)}`);
    if (totals.avg_per_trip)
      console.log(`    Avg per trip:   $${totals.avg_per_trip.toFixed(2)}`);
    if (totals.total_savings)
      console.log(
        chalk.green(`    Total savings:  $${totals.total_savings.toFixed(2)}`),
      );
    console.log();

    if (topItems.length) {
      console.log(chalk.bold("  Most Purchased:"));
      for (const item of topItems) {
        const avgPrice = item.avg_price
          ? chalk.dim(` avg $${item.avg_price.toFixed(2)}`)
          : "";
        console.log(
          `    ${item.product_name} — ${item.appearances} trips, ${item.total_qty} total${avgPrice}`,
        );
      }
      console.log();
    }

    if (monthly.length) {
      console.log(chalk.bold("  Monthly Spending:"));
      for (const m of monthly) {
        const saved = m.saved
          ? chalk.green(` saved $${m.saved.toFixed(2)}`)
          : "";
        console.log(
          `    ${m.month}  ${m.trips} trips  $${(m.spent || 0).toFixed(2)}${saved}`,
        );
      }
      console.log();
    }
  });

// --- delete ---
purchasesCmd
  .command("delete")
  .description("Delete a purchase record")
  .argument("<id>", "Purchase ID")
  .action((id) => {
    const result = deletePurchase(parseInt(id, 10));
    if (result.changes === 0) {
      console.log(chalk.yellow("Purchase not found."));
    } else {
      console.log(chalk.green("Purchase deleted."));
    }
  });

/**
 * Extract the body from an .eml file (simplified MIME parser).
 * Returns HTML body if available, otherwise plain text.
 */
function extractEmailBody(raw) {
  // If it doesn't look like an email (no headers), return as-is
  if (!raw.match(/^(From|Subject|Content-Type|MIME-Version):/im)) {
    return raw;
  }

  // Find boundary for multipart emails
  const boundaryMatch = raw.match(/boundary="?([^";\s]+)"?/i);
  if (!boundaryMatch) {
    // Single-part email — strip headers
    const headerEnd = raw.indexOf("\n\n");
    return headerEnd > 0 ? raw.slice(headerEnd + 2) : raw;
  }

  const boundary = boundaryMatch[1];
  const parts = raw.split(`--${boundary}`);

  // Prefer HTML part, fall back to plain text
  let htmlPart = null;
  let textPart = null;

  for (const part of parts) {
    if (part.includes("Content-Type: text/html")) {
      const bodyStart = part.indexOf("\n\n");
      if (bodyStart > 0) htmlPart = part.slice(bodyStart + 2);
    } else if (part.includes("Content-Type: text/plain")) {
      const bodyStart = part.indexOf("\n\n");
      if (bodyStart > 0) textPart = part.slice(bodyStart + 2);
    }
  }

  return htmlPart || textPart || raw;
}

export default purchasesCmd;
