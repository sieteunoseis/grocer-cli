import { Command } from "commander";
import { select } from "@inquirer/prompts";
import {
  createRecipe,
  listRecipes,
  getRecipe,
  deleteRecipe,
  addRecipeItem,
  getRecipeItems,
  removeRecipeItem,
  updateRecipeItem,
} from "../lib/db.js";
import { getActiveProvider } from "../providers/registry.js";
import chalk from "chalk";

const recipesCmd = new Command("recipe").description(
  "Manage locally stored recipes",
);

recipesCmd
  .command("list")
  .description("List all recipes, or show ingredients for a specific recipe")
  .argument("[id]", "Recipe ID (optional — show ingredients)")
  .action((id) => {
    if (id) {
      // Show specific recipe (same as "show")
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
        console.log(
          "  No items yet. Add items with: grocer-cli recipe add-item",
        );
      } else {
        console.log(chalk.bold("  Items:"));
        for (const item of items) {
          console.log(
            `    ${chalk.cyan(String(item.id).padStart(3))}  ${item.product_name} x${item.quantity}${item.product_id ? chalk.dim(` [${item.product_id}]`) : ""}`,
          );
        }
      }
      console.log();
      return;
    }

    const recipes = listRecipes();
    if (!recipes.length) {
      console.log(chalk.yellow("No recipes saved yet."));
      return;
    }
    console.log(chalk.bold("\nYour Recipes:\n"));
    for (const r of recipes) {
      console.log(
        `  ${chalk.cyan(String(r.id).padStart(3))}  ${r.name}${r.description ? chalk.dim(` — ${r.description}`) : ""}`,
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
      console.log("  No items yet. Add items with: grocer-cli recipe add-item");
    } else {
      console.log(chalk.bold("  Items:"));
      for (const item of items) {
        console.log(
          `    ${chalk.cyan(String(item.id).padStart(3))}  ${item.product_name} x${item.quantity}${item.product_id ? chalk.dim(` [${item.product_id}]`) : ""}`,
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
      parseInt(opts.quantity, 10),
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

recipesCmd
  .command("edit")
  .description("Interactively update recipe items — search and swap products")
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
        console.log(chalk.yellow("No items in this recipe."));
        return;
      }

      console.log(chalk.bold(`\nEditing: ${recipe.name}\n`));

      // Pick which item to edit
      const itemId = await select({
        message: "Which item do you want to update?",
        choices: [
          ...items.map((item) => ({
            name: `${item.product_name} x${item.quantity}${item.product_id ? chalk.dim(` [${item.product_id}]`) : chalk.red(" [no product linked]")}`,
            value: item.id,
          })),
          { name: chalk.dim("Cancel"), value: null },
        ],
      });

      if (!itemId) return;

      const item = items.find((i) => i.id === itemId);

      // Search for replacement
      const provider = getActiveProvider();
      const searchTerm = await select({
        message: `Search for a replacement for "${item.product_name}"?`,
        choices: [
          { name: `Search "${item.product_name}"`, value: item.product_name },
          { name: "Enter custom search...", value: "__custom__" },
          { name: chalk.dim("Cancel"), value: null },
        ],
      });

      if (!searchTerm) return;

      let term = searchTerm;
      if (searchTerm === "__custom__") {
        const { input } = await import("@inquirer/prompts");
        term = await input({ message: "Search term:" });
        if (!term) return;
      }

      console.log(chalk.dim(`\nSearching for "${term}"...\n`));
      const products = await provider.searchProducts(term, { limit: 10 });

      if (!products.length) {
        console.log(chalk.yellow("No products found."));
        return;
      }

      // Pick replacement product
      const newProductId = await select({
        message: "Select replacement product:",
        choices: [
          ...products.map((p) => {
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

      if (!newProductId) return;

      const newProduct = products.find((p) => p.productId === newProductId);
      updateRecipeItem(itemId, {
        productName: newProduct.description || item.product_name,
        productId: newProductId,
      });

      console.log(
        chalk.green(
          `\nUpdated: "${item.product_name}" → "${newProduct.description}" [${newProductId}]`,
        ),
      );
    } catch (err) {
      if (err.name === "ExitPromptError") {
        console.log(chalk.dim("\nCancelled."));
        return;
      }
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

export default recipesCmd;
