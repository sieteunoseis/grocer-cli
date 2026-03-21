import { Command } from "commander";
import { getActiveProvider } from "../providers/registry.js";
import { getRecipe, getRecipeItems } from "../lib/db.js";
import chalk from "chalk";

const cartCmd = new Command("cart").description("Manage your cart");

cartCmd
  .command("add")
  .description("Add a product to your cart")
  .argument("<upc>", "Product UPC")
  .option("-q, --quantity <n>", "Quantity", "1")
  .action(async (upc, opts) => {
    try {
      const provider = getActiveProvider();
      await provider.addToCart([{ upc, quantity: parseInt(opts.quantity, 10) }]);
      console.log(chalk.green(`Added ${opts.quantity}x ${upc} to cart.`));
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

cartCmd
  .command("add-recipe")
  .description("Add all items from a recipe to your cart")
  .argument("<recipeId>", "Recipe ID")
  .action(async (recipeId) => {
    try {
      const provider = getActiveProvider();
      const recipe = getRecipe(parseInt(recipeId, 10));
      if (!recipe) {
        console.log(chalk.yellow("Recipe not found."));
        return;
      }

      const items = getRecipeItems(recipe.id);
      const cartItems = items
        .filter((i) => i.product_id)
        .map((i) => ({ upc: i.product_id, quantity: i.quantity }));

      if (!cartItems.length) {
        console.log(
          chalk.yellow(
            "No items with product IDs in this recipe. Search and link products first."
          )
        );
        return;
      }

      await provider.addToCart(cartItems);
      console.log(
        chalk.green(
          `Added ${cartItems.length} items from "${recipe.name}" to cart.`
        )
      );
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

export default cartCmd;
