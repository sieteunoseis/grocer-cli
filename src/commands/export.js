import { Command } from "commander";
import { getRecipe, getRecipeItems, getFeedRecipe } from "../lib/db.js";
import { createShoppingListLink, createRecipeLink } from "../lib/instacart.js";
import chalk from "chalk";

const exportCmd = new Command("export").description(
  "Export recipes and lists to Instacart for delivery"
);

// --- recipe ---
exportCmd
  .command("recipe")
  .description("Export a local recipe to Instacart")
  .argument("<id>", "Recipe ID")
  .action(async (id) => {
    try {
      const recipe = getRecipe(parseInt(id, 10));
      if (!recipe) {
        console.log(chalk.yellow("Recipe not found."));
        return;
      }

      const items = getRecipeItems(recipe.id);
      if (!items.length) {
        console.log(
          chalk.yellow("Recipe has no items. Add items first with: grocer recipe add-item")
        );
        return;
      }

      const ingredients = items.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        ...(i.product_id && { upc: i.product_id }),
      }));

      console.log(chalk.dim("Creating Instacart link..."));
      const url = await createRecipeLink({
        title: recipe.name,
        ingredients,
      });

      console.log(chalk.green(`\nInstacart link for "${recipe.name}":\n`));
      console.log(`  ${url}\n`);
      console.log(
        chalk.dim(
          "Open this link to pick your store, review items, and check out for delivery."
        )
      );
      console.log();
    } catch (err) {
      console.error(chalk.red(`Export failed: ${err.message}`));
      process.exit(1);
    }
  });

// --- feed-recipe ---
exportCmd
  .command("feed-recipe")
  .description("Export a feed recipe to Instacart")
  .argument("<id>", "Feed recipe ID")
  .action(async (id) => {
    try {
      const recipe = getFeedRecipe(parseInt(id, 10));
      if (!recipe) {
        console.log(chalk.yellow("Feed recipe not found."));
        return;
      }

      const ingredients = recipe.ingredients
        ? JSON.parse(recipe.ingredients)
        : [];
      if (!ingredients.length) {
        console.log(
          chalk.yellow(
            "No ingredients found in this recipe. Visit the recipe URL for details."
          )
        );
        return;
      }

      console.log(chalk.dim("Creating Instacart link..."));
      const url = await createRecipeLink({
        title: recipe.title,
        ingredients: ingredients.map((i) => (typeof i === "string" ? i : i.name)),
        ...(recipe.url && { sourceUrl: recipe.url }),
      });

      console.log(chalk.green(`\nInstacart link for "${recipe.title}":\n`));
      console.log(`  ${url}\n`);
      console.log(
        chalk.dim(
          "Open this link to pick your store (e.g. Fred Meyer), review items, and check out."
        )
      );
      console.log();
    } catch (err) {
      console.error(chalk.red(`Export failed: ${err.message}`));
      process.exit(1);
    }
  });

// --- list ---
exportCmd
  .command("list")
  .description("Export a custom item list to Instacart")
  .argument("<items...>", 'Item names (e.g. "milk" "eggs" "bread")')
  .action(async (items) => {
    try {
      const lineItems = items.map((name) => ({ name }));

      console.log(chalk.dim("Creating Instacart link..."));
      const url = await createShoppingListLink(lineItems, {
        title: "Grocery List",
      });

      console.log(chalk.green("\nInstacart shopping list link:\n"));
      console.log(`  ${url}\n`);
      console.log(
        chalk.dim(`  ${items.length} items — open to pick your store and check out.`)
      );
      console.log();
    } catch (err) {
      console.error(chalk.red(`Export failed: ${err.message}`));
      process.exit(1);
    }
  });

export default exportCmd;
