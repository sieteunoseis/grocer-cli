import { Command } from "commander";
import {
  createRecipe,
  listRecipes,
  getRecipe,
  deleteRecipe,
  addRecipeItem,
  getRecipeItems,
  removeRecipeItem,
} from "../lib/db.js";
import chalk from "chalk";

const recipesCmd = new Command("recipe").description(
  "Manage locally stored recipes"
);

recipesCmd
  .command("list")
  .description("List all saved recipes")
  .action(() => {
    const recipes = listRecipes();
    if (!recipes.length) {
      console.log(chalk.yellow("No recipes saved yet."));
      return;
    }
    console.log(chalk.bold("\nYour Recipes:\n"));
    for (const r of recipes) {
      console.log(
        `  ${chalk.cyan(String(r.id).padStart(3))}  ${r.name}${r.description ? chalk.dim(` — ${r.description}`) : ""}`
      );
    }
    console.log();
  });

recipesCmd
  .command("create")
  .description("Create a new recipe")
  .argument("<name>", "Recipe name")
  .option("-d, --description <desc>", "Recipe description")
  .action((name, opts) => {
    const id = createRecipe(name, opts.description);
    console.log(chalk.green(`Recipe created with ID ${id}: ${name}`));
  });

recipesCmd
  .command("show")
  .description("Show recipe details and ingredients")
  .argument("<id>", "Recipe ID")
  .action((id) => {
    const recipe = getRecipe(parseInt(id, 10));
    if (!recipe) {
      console.log(chalk.yellow("Recipe not found."));
      return;
    }
    const items = getRecipeItems(recipe.id);
    console.log(chalk.bold(`\n${recipe.name}`));
    if (recipe.description) console.log(chalk.dim(recipe.description));
    console.log(chalk.dim(`Created: ${recipe.created_at}\n`));

    if (!items.length) {
      console.log("  No items yet. Add items with: grocer recipe add-item");
    } else {
      console.log(chalk.bold("  Items:"));
      for (const item of items) {
        console.log(
          `    ${chalk.cyan(String(item.id).padStart(3))}  ${item.product_name} x${item.quantity}${item.product_id ? chalk.dim(` [${item.product_id}]`) : ""}`
        );
      }
    }
    console.log();
  });

recipesCmd
  .command("delete")
  .description("Delete a recipe")
  .argument("<id>", "Recipe ID")
  .action((id) => {
    const result = deleteRecipe(parseInt(id, 10));
    if (result.changes === 0) {
      console.log(chalk.yellow("Recipe not found."));
    } else {
      console.log(chalk.green("Recipe deleted."));
    }
  });

recipesCmd
  .command("add-item")
  .description("Add an ingredient to a recipe")
  .argument("<recipeId>", "Recipe ID")
  .argument("<productName>", "Product/ingredient name")
  .option("-p, --product-id <id>", "Kroger product ID / UPC")
  .option("-q, --quantity <n>", "Quantity", "1")
  .action((recipeId, productName, opts) => {
    const recipe = getRecipe(parseInt(recipeId, 10));
    if (!recipe) {
      console.log(chalk.yellow("Recipe not found."));
      return;
    }
    addRecipeItem(
      recipe.id,
      productName,
      opts.productId,
      parseInt(opts.quantity, 10)
    );
    console.log(chalk.green(`Added "${productName}" to "${recipe.name}".`));
  });

recipesCmd
  .command("remove-item")
  .description("Remove an ingredient from a recipe")
  .argument("<itemId>", "Item ID (from recipe show)")
  .action((itemId) => {
    const result = removeRecipeItem(parseInt(itemId, 10));
    if (result.changes === 0) {
      console.log(chalk.yellow("Item not found."));
    } else {
      console.log(chalk.green("Item removed."));
    }
  });

export default recipesCmd;
