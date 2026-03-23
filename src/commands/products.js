import { Command } from "commander";
import { checkbox } from "@inquirer/prompts";
import { getActiveProvider } from "../providers/registry.js";
import { getConfig } from "../lib/config.js";
import { trackCartAddition } from "../lib/db.js";
import chalk from "chalk";

function getCartUrl(provider) {
  const config = getConfig();
  const chainConfig = config[config.chain] || {};
  const banner = chainConfig.banner || config.chain;
  return provider.cartUrls?.[banner] || null;
}

function formatProduct(p) {
  const desc = p.description || "No description";
  const brand = p.brand || "";
  const price = p.items?.[0]?.price?.regular
    ? `$${p.items[0].price.regular.toFixed(2)}`
    : "";
  const promo = p.items?.[0]?.price?.promo
    ? chalk.green(` sale $${p.items[0].price.promo.toFixed(2)}`)
    : "";
  return `${desc} ${brand ? chalk.dim(`(${brand})`) : ""} ${price ? chalk.yellow(price) : ""}${promo}`;
}

const searchCmd = new Command("search")
  .description("Search for products")
  .argument("<term>", "Search term (e.g. 'milk', 'organic eggs')")
  .option("-b, --brand <brand>", "Filter by brand")
  .option("-l, --limit <n>", "Max results (default 10)", "10")
  .option("--no-interactive", "Plain output only (for scripts/agents)")
  .action(async (term, opts) => {
    try {
      const provider = getActiveProvider();
      const products = await provider.searchProducts(term, {
        brand: opts.brand,
        limit: opts.limit,
      });

      if (!products.length) {
        console.log(chalk.yellow("No products found."));
        return;
      }

      // Non-interactive mode: plain list output
      if (!opts.interactive || !process.stdout.isTTY) {
        console.log(chalk.bold(`\nFound ${products.length} products:\n`));
        for (const p of products) {
          console.log(`  ${chalk.cyan(p.productId)}  ${formatProduct(p)}`);
        }
        console.log();
        return;
      }

      // Interactive mode: select products to add to cart
      const selected = await checkbox({
        message: `Found ${products.length} products — select items to add to cart`,
        choices: products.map((p) => ({
          name: formatProduct(p),
          value: p.productId,
        })),
      });

      if (!selected.length) {
        console.log(chalk.dim("Nothing selected."));
        return;
      }

      await provider.addToCart(selected.map((upc) => ({ upc, quantity: 1 })));
      for (const upc of selected) {
        const p = products.find((prod) => prod.productId === upc);
        trackCartAddition(upc, p?.description || null, 1);
      }
      console.log(chalk.green(`\nAdded ${selected.length} item(s) to cart.`));
      const cartUrl = getCartUrl(provider);
      if (cartUrl) console.log(chalk.dim(`View your cart: ${cartUrl}`));
      console.log();
    } catch (err) {
      if (err.name === "ExitPromptError") {
        console.log(chalk.dim("\nCancelled."));
        return;
      }
      console.error(chalk.red(`Search failed: ${err.message}`));
      process.exit(1);
    }
  });

const productCmd = new Command("product")
  .description("Get details for a specific product")
  .argument("<productId>", "Product ID")
  .action(async (productId) => {
    try {
      const provider = getActiveProvider();
      const p = await provider.getProduct(productId);
      if (!p) {
        console.log(chalk.yellow("Product not found."));
        return;
      }
      console.log(chalk.bold(`\n${p.description}`));
      console.log(`  Brand:      ${p.brand || "N/A"}`);
      console.log(`  Product ID: ${p.productId}`);
      console.log(`  UPC:        ${p.upc || "N/A"}`);
      if (p.items?.[0]?.price) {
        const price = p.items[0].price;
        console.log(
          `  Price:      ${price.regular ? "$" + price.regular.toFixed(2) : "N/A"}${price.promo ? chalk.green(` (promo: $${price.promo.toFixed(2)})`) : ""}`,
        );
      }
      console.log();
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

export { searchCmd, productCmd };
