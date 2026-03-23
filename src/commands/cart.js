import { Command } from "commander";
import { createInterface } from "readline";
import { getActiveProvider } from "../providers/registry.js";
import {
  getRecipe,
  getRecipeItems,
  findPantryMatch,
  trackCartAddition,
  isInCart,
  getRecentCartAdditions,
  clearCartTracking,
  updateRecipeItem,
  listRecipes,
  importCartSnapshot,
  getCartTotal,
  getUnavailableCartItems,
} from "../lib/db.js";
import { getConfig } from "../lib/config.js";
import chalk from "chalk";

function getCartUrl(provider) {
  const config = getConfig();
  const chainConfig = config[config.chain] || {};
  const banner = chainConfig.banner || config.chain;
  return provider.cartUrls?.[banner] || null;
}

const cartCmd = new Command("cart").description("Manage your cart");

cartCmd
  .command("add")
  .description("Add a product to your cart")
  .argument("<upc>", "Product UPC")
  .option("-q, --quantity <n>", "Quantity", "1")
  .action(async (upc, opts) => {
    try {
      const provider = getActiveProvider();
      const qty = parseInt(opts.quantity, 10);
      await provider.addToCart([{ upc, quantity: qty }]);
      trackCartAddition(upc, null, qty);
      console.log(chalk.green(`Added ${qty}x ${upc} to cart.`));
      const cartUrl = getCartUrl(provider);
      if (cartUrl) console.log(chalk.dim(`View your cart: ${cartUrl}`));
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

cartCmd
  .command("add-recipe")
  .description(
    "Add items from one or more recipes to your cart (duplicates are skipped automatically)",
  )
  .argument("<recipeIds...>", "Recipe ID(s)")
  .option("--no-check", "Skip pantry check (add everything without asking)")
  .option("--allow-duplicates", "Allow duplicate products across recipes")
  .action(async (recipeIds, opts) => {
    try {
      const provider = getActiveProvider();
      const seen = new Set();
      let totalAdded = 0;
      let totalSkippedDupes = 0;
      const recipeNames = [];

      for (const rawId of recipeIds) {
        const recipe = getRecipe(parseInt(rawId, 10));
        if (!recipe) {
          console.log(chalk.yellow(`Recipe ${rawId} not found, skipping.`));
          continue;
        }
        recipeNames.push(recipe.name);

        const items = getRecipeItems(recipe.id);
        const linkedItems = items.filter((i) => i.product_id);

        if (!linkedItems.length) {
          console.log(
            chalk.yellow(
              `"${recipe.name}" has no linked products. Search and link products first.`,
            ),
          );
          continue;
        }

        let toAdd = [];

        // Pantry check
        if (opts.check) {
          const skipped = [];
          for (const item of linkedItems) {
            const pantryMatch = findPantryMatch(
              item.product_name,
              item.product_id,
            );
            if (pantryMatch) {
              const today = new Date().toISOString().split("T")[0];
              const daysLeft = Math.round(
                (new Date(pantryMatch.best_by + "T00:00:00") -
                  new Date(today + "T00:00:00")) /
                  (1000 * 60 * 60 * 24),
              );
              if (daysLeft > 0) {
                skipped.push({ item, pantryMatch, daysLeft });
                continue;
              }
            }
            toAdd.push(item);
          }

          if (skipped.length) {
            console.log(chalk.bold(`\nPantry check for "${recipe.name}":\n`));
            for (const { item, pantryMatch, daysLeft } of skipped) {
              const freshness =
                daysLeft > 7
                  ? chalk.green(`${daysLeft}d left`)
                  : chalk.yellow(`${daysLeft}d left`);
              console.log(
                `  ${chalk.cyan(item.product_name.padEnd(30))} best by ${pantryMatch.best_by}  (${freshness})`,
              );
            }
            console.log(
              chalk.dim(`  Skipping ${skipped.length} pantry item(s).\n`),
            );
          }
        } else {
          toAdd = [...linkedItems];
        }

        // Dedup: skip items already in cart (from recent additions) and across recipes
        if (!opts.allowDuplicates) {
          const before = toAdd.length;
          toAdd = toAdd.filter((i) => {
            if (seen.has(i.product_id)) return false;
            if (isInCart(i.product_id)) return false;
            seen.add(i.product_id);
            return true;
          });
          const dupes = before - toAdd.length;
          if (dupes > 0) {
            totalSkippedDupes += dupes;
            console.log(
              chalk.dim(`  Skipped ${dupes} item(s) already in cart.`),
            );
          }
        } else {
          toAdd.forEach((i) => seen.add(i.product_id));
        }

        if (!toAdd.length) continue;

        const cartItems = toAdd.map((i) => ({
          upc: i.product_id,
          quantity: i.quantity,
        }));

        await provider.addToCart(cartItems);
        for (const item of toAdd) {
          trackCartAddition(item.product_id, item.product_name, item.quantity);
        }
        totalAdded += cartItems.length;
        console.log(
          chalk.green(
            `Added ${cartItems.length} items from "${recipe.name}" to cart.`,
          ),
        );
      }

      if (totalAdded > 0) {
        if (recipeNames.length > 1) {
          console.log(
            chalk.green(
              `\nTotal: ${totalAdded} items added from ${recipeNames.length} recipes.`,
            ),
          );
          if (totalSkippedDupes > 0) {
            console.log(
              chalk.dim(
                `${totalSkippedDupes} duplicate(s) skipped across recipes.`,
              ),
            );
          }
        }
        const cartUrl = getCartUrl(provider);
        if (cartUrl) {
          console.log(chalk.dim(`\nView your cart: ${cartUrl}`));
          console.log(
            chalk.yellow(
              "Note: Please review your cart before checkout — this CLI cannot read cart contents.",
            ),
          );
        }
      } else {
        console.log(chalk.yellow("No items to add."));
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

cartCmd
  .command("list")
  .description("Show items added to cart recently (tracked locally)")
  .option("--hours <n>", "Show items added within N hours", "24")
  .action(async (opts) => {
    const items = getRecentCartAdditions(parseInt(opts.hours, 10));
    if (!items.length) {
      console.log(chalk.yellow("No items tracked in cart."));
      return;
    }
    console.log(chalk.bold(`\nCart additions (last ${opts.hours}h):\n`));
    for (const item of items) {
      const name = item.product_name
        ? chalk.cyan(item.product_name.padEnd(35))
        : chalk.dim("(unnamed)".padEnd(35));
      console.log(
        `  ${name} x${item.quantity}  ${chalk.dim(item.product_id)}  ${chalk.dim(item.added_at)}`,
      );
    }
    const provider = getActiveProvider();
    const cartUrl = getCartUrl(provider);
    if (cartUrl) {
      console.log(chalk.dim(`\nView your cart: ${cartUrl}`));
      console.log(
        chalk.yellow(
          "Note: This is a local log — verify on the store website before checkout.",
        ),
      );
    }
    console.log();
  });

cartCmd
  .command("clear")
  .description("Clear local cart tracking (does not affect your online cart)")
  .action(async () => {
    clearCartTracking();
    console.log(chalk.green("Local cart tracking cleared."));
  });

cartCmd
  .command("import")
  .description(
    "Import cart data from store website (paste output from Chrome extension)",
  )
  .action(async () => {
    console.log(
      chalk.bold("\nPaste your cart data below (press Ctrl+D when done):\n"),
    );

    // Read stdin until EOF
    const chunks = [];
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) {
      chunks.push(line);
    }
    const text = chunks.join("\n");

    if (!text.trim()) {
      console.log(chalk.yellow("No data received."));
      return;
    }

    // Parse the pasted cart data
    const items = parseCartText(text);

    if (!items.length) {
      console.log(chalk.yellow("Could not parse any items from the input."));
      return;
    }

    const available = items.filter((i) => i.available);
    const unavailable = items.filter((i) => !i.available);

    importCartSnapshot(items);

    const total = getCartTotal();
    console.log(chalk.bold(`\nImported ${items.length} items:`));
    console.log(chalk.green(`  ${available.length} available`));
    if (unavailable.length) {
      console.log(chalk.red(`  ${unavailable.length} unavailable:`));
      for (const item of unavailable) {
        console.log(chalk.red(`    - ${item.productName} [${item.productId}]`));
      }
      console.log(
        chalk.dim(
          `\n  Use "grocer-cli cart fix <UPC>" to find replacements for unavailable items.`,
        ),
      );
    }
    if (total.total > 0) {
      console.log(
        chalk.bold(`\n  Estimated total: $${total.total.toFixed(2)}`),
      );
    }
    console.log();
  });

/**
 * Parse cart text from Chrome extension output.
 * Supports table format (# Item Price UPC) and list format.
 */
function parseCartText(text) {
  const items = [];
  const lines = text.split("\n");

  // Track unavailable section
  let inUnavailable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect unavailable section
    if (/unavailable/i.test(trimmed)) {
      inUnavailable = true;
      continue;
    }
    if (/available items/i.test(trimmed)) {
      inUnavailable = false;
      continue;
    }

    // Table row: "1  Item Name  $X.XX  0001234567890"
    const tableMatch = trimmed.match(
      /^\d+\s+(.+?)\s+\$?([\d.~]+)\s+([\d]{10,})\s*$/,
    );
    if (tableMatch) {
      items.push({
        productName: tableMatch[1].trim(),
        price: parseFloat(tableMatch[2].replace("~", "")),
        productId: tableMatch[3],
        quantity: 1,
        available: true,
      });
      continue;
    }

    // Unavailable item with UPC: "Product Name (size) — UPC: 0001234567890"
    const unavailMatch = trimmed.match(
      /^(.+?)\s*(?:—|-)?\s*(?:UPC:?\s*)?([\d]{10,})\s*$/,
    );
    if (unavailMatch && inUnavailable) {
      items.push({
        productName: unavailMatch[1].replace(/\s*[—-]\s*$/, "").trim(),
        price: null,
        productId: unavailMatch[2],
        quantity: 1,
        available: false,
      });
      continue;
    }

    // Generic line with UPC: "Product Name — $X.XX — UPC: 0001234567890"
    const genericMatch = trimmed.match(
      /(.+?)\s*(?:—|-)\s*\$?([\d.~]+).*?([\d]{10,})/,
    );
    if (genericMatch) {
      items.push({
        productName: genericMatch[1].trim(),
        price: parseFloat(genericMatch[2].replace("~", "")),
        productId: genericMatch[3],
        quantity: 1,
        available: !inUnavailable,
      });
      continue;
    }
  }

  return items;
}

cartCmd
  .command("fix")
  .description(
    "Replace an unavailable cart item — accepts a product URL, UPC, or product ID",
  )
  .argument("<product>", "Product URL, UPC, or product ID")
  .option("--no-interactive", "Non-interactive mode (for agents)")
  .action(async (product, opts) => {
    try {
      const provider = getActiveProvider();

      // Extract product ID from URL or use as-is
      let productId = product;
      const urlMatch = product.match(/\/(\d{13,})/);
      if (urlMatch) {
        productId = urlMatch[1];
      }

      // Look up the product to get its name
      let productName = productId;
      try {
        const details = await provider.getProduct(productId);
        if (details) {
          productName = details.description || productId;
        }
      } catch {
        // Product may be delisted, continue with ID
      }

      console.log(chalk.yellow(`\nUnavailable: ${productName} [${productId}]`));

      // Find which recipes contain this product
      const allRecipes = listRecipes();
      const affectedRecipes = [];
      for (const recipe of allRecipes) {
        const items = getRecipeItems(recipe.id);
        const match = items.find((i) => i.product_id === productId);
        if (match) {
          affectedRecipes.push({ recipe, item: match });
        }
      }

      // Search for similar products using the product name
      const searchTerm = productName
        .replace(/[®™©]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      console.log(chalk.dim(`Searching for replacements...\n`));
      const results = await provider.searchProducts(searchTerm, { limit: 10 });

      // Filter out the unavailable product itself
      const alternatives = results.filter((p) => p.productId !== productId);

      if (!alternatives.length) {
        console.log(chalk.yellow("No alternatives found."));
        return;
      }

      let replacementId;

      if (opts.interactive && process.stdout.isTTY) {
        const { select } = await import("@inquirer/prompts");
        replacementId = await select({
          message: "Select replacement:",
          choices: [
            ...alternatives.map((p) => {
              const price = p.items?.[0]?.price?.regular
                ? chalk.yellow(` $${p.items[0].price.regular.toFixed(2)}`)
                : "";
              return {
                name: `${p.description || "No description"} ${p.brand ? chalk.dim(`(${p.brand})`) : ""}${price}`,
                value: p.productId,
              };
            }),
            { name: chalk.dim("Cancel"), value: null },
          ],
        });
      } else {
        // Non-interactive: pick the first alternative
        replacementId = alternatives[0].productId;
        console.log("Available replacements:\n");
        for (const p of alternatives) {
          const price = p.items?.[0]?.price?.regular
            ? `$${p.items[0].price.regular.toFixed(2)}`
            : "";
          console.log(
            `  ${p.productId}  ${p.description || "No description"} ${price}`,
          );
        }
        console.log(
          chalk.dim(
            `\nAuto-selected: ${alternatives[0].description} [${replacementId}]`,
          ),
        );
      }

      if (!replacementId) return;

      const replacement = alternatives.find(
        (p) => p.productId === replacementId,
      );
      const replacementName = replacement?.description || replacementId;

      // Add replacement to cart
      await provider.addToCart([{ upc: replacementId, quantity: 1 }]);
      trackCartAddition(replacementId, replacementName, 1);
      console.log(chalk.green(`\nAdded to cart: ${replacementName}`));

      // Update affected recipes
      if (affectedRecipes.length) {
        for (const { recipe, item } of affectedRecipes) {
          updateRecipeItem(item.id, {
            productName: replacementName,
            productId: replacementId,
          });
          console.log(
            chalk.green(
              `Updated recipe "${recipe.name}": ${productName} → ${replacementName}`,
            ),
          );
        }
      }

      const cartUrl = getCartUrl(provider);
      if (cartUrl) {
        console.log(chalk.dim(`\nView your cart: ${cartUrl}`));
        console.log(
          chalk.yellow(
            "Note: Please review your cart before checkout — remove the unavailable item if still listed.",
          ),
        );
      }
    } catch (err) {
      if (err.name === "ExitPromptError") {
        console.log(chalk.dim("\nCancelled."));
        return;
      }
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

function askYesNo(question) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith("y"));
    });
  });
}

export default cartCmd;
