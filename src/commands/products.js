import { Command } from "commander";
import { getActiveProvider } from "../providers/registry.js";
import chalk from "chalk";

const searchCmd = new Command("search")
  .description("Search for products")
  .argument("<term>", "Search term (e.g. 'milk', 'organic eggs')")
  .option("-b, --brand <brand>", "Filter by brand")
  .option("-l, --limit <n>", "Max results (default 10)", "10")
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

      console.log(chalk.bold(`\nFound ${products.length} products:\n`));
      for (const p of products) {
        const desc = p.description || "No description";
        const brand = p.brand || "";
        const price = p.items?.[0]?.price?.regular
          ? `$${p.items[0].price.regular.toFixed(2)}`
          : "";
        console.log(
          `  ${chalk.cyan(p.productId)}  ${desc} ${brand ? chalk.dim(`(${brand})`) : ""} ${price ? chalk.green(price) : ""}`
        );
      }
      console.log();
    } catch (err) {
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
          `  Price:      ${price.regular ? "$" + price.regular.toFixed(2) : "N/A"}${price.promo ? chalk.green(` (promo: $${price.promo.toFixed(2)})`) : ""}`
        );
      }
      console.log();
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

export { searchCmd, productCmd };
