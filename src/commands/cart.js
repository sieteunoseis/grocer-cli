import { Command } from "commander";
import { createInterface } from "readline";
import { getActiveProvider } from "../providers/registry.js";
import { getRecipe, getRecipeItems, findPantryMatch } from "../lib/db.js";
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
  .option("--no-check", "Skip pantry check (add everything without asking)")
  .action(async (recipeId, opts) => {
    try {
      const provider = getActiveProvider();
      const recipe = getRecipe(parseInt(recipeId, 10));
      if (!recipe) {
        console.log(chalk.yellow("Recipe not found."));
        return;
      }

      const items = getRecipeItems(recipe.id);
      const linkedItems = items.filter((i) => i.product_id);

      if (!linkedItems.length) {
        console.log(
          chalk.yellow(
            "No items with product IDs in this recipe. Search and link products first."
          )
        );
        return;
      }

      let cartItems;

      if (opts.check) {
        // Smart pantry check — skip items you already have
        const toAdd = [];
        const skipped = [];

        for (const item of linkedItems) {
          const pantryMatch = findPantryMatch(item.product_name, item.product_id);
          if (pantryMatch) {
            const today = new Date().toISOString().split("T")[0];
            const daysLeft = Math.round(
              (new Date(pantryMatch.best_by + "T00:00:00") - new Date(today + "T00:00:00")) /
              (1000 * 60 * 60 * 24)
            );

            if (daysLeft > 0) {
              skipped.push({ item, pantryMatch, daysLeft });
              continue;
            }
          }
          toAdd.push(item);
        }

        if (skipped.length) {
          console.log(chalk.bold("\nPantry check — you already have:\n"));
          for (const { item, pantryMatch, daysLeft } of skipped) {
            const freshness = daysLeft > 7
              ? chalk.green(`${daysLeft}d left`)
              : chalk.yellow(`${daysLeft}d left`);
            console.log(
              `  ${chalk.cyan(item.product_name.padEnd(30))} bought ${pantryMatch.purchase_date}  best by ${pantryMatch.best_by}  (${freshness})`
            );
          }
          console.log();

          if (toAdd.length) {
            console.log(chalk.dim(`  Skipping ${skipped.length} item(s), adding ${toAdd.length} to cart.\n`));
          } else {
            console.log(chalk.green("  You already have everything! Nothing to add.\n"));

            // Ask if they want to add anyway
            const answer = await askYesNo("Add all items to cart anyway?");
            if (answer) {
              toAdd.push(...linkedItems);
            } else {
              return;
            }
          }

          // For partially skipped lists, ask about each skipped item
          if (skipped.length && toAdd.length < linkedItems.length) {
            const addSkipped = await askYesNo(
              `Re-buy the ${skipped.length} skipped item(s) too?`
            );
            if (addSkipped) {
              for (const { item } of skipped) {
                toAdd.push(item);
              }
            }
          }
        }

        cartItems = toAdd.map((i) => ({ upc: i.product_id, quantity: i.quantity }));
      } else {
        cartItems = linkedItems.map((i) => ({ upc: i.product_id, quantity: i.quantity }));
      }

      if (!cartItems.length) {
        console.log(chalk.yellow("No items to add."));
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

function askYesNo(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith("y"));
    });
  });
}

export default cartCmd;
