import { Command } from "commander";
import { select, input, checkbox } from "@inquirer/prompts";
import {
  createRecipe,
  listRecipes,
  getRecipe,
  deleteRecipe,
  addRecipeItem,
  getRecipeItems,
  removeRecipeItem,
  updateRecipeItem,
  findPantryMatch,
  trackCartAddition,
  isInCart,
} from "../lib/db.js";
import { getActiveProvider } from "../providers/registry.js";
import { getConfig } from "../lib/config.js";
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
  .command("search-add")
  .description("Search for products and add them to a recipe")
  .argument("<recipeId>", "Recipe ID")
  .argument("[term]", "Search term (prompted if omitted)")
  .option("-q, --quantity <n>", "Quantity for all selected items", "1")
  .action(async (recipeId, term, opts) => {
    try {
      const recipe = getRecipe(parseInt(recipeId, 10));
      if (!recipe) {
        console.log(chalk.yellow("Recipe not found."));
        return;
      }

      const provider = getActiveProvider();
      const qty = parseInt(opts.quantity, 10) || 1;
      let searchTerm = term;

      while (true) {
        if (!searchTerm) {
          searchTerm = await input({ message: "Search term:" });
          if (!searchTerm) return;
        }

        console.log(chalk.dim(`\nSearching for "${searchTerm}"...\n`));
        let products;
        try {
          products = await provider.searchProducts(searchTerm, { limit: 10 });
        } catch (searchErr) {
          console.log(chalk.red(`Search failed: ${searchErr.message}`));
          searchTerm = null;
          continue;
        }

        if (!products.length) {
          console.log(chalk.yellow("No products found."));
        } else {
          const selected = await checkbox({
            message: `Select items to add to "${recipe.name}"`,
            choices: products.map((p) => {
              const price = p.items?.[0]?.price?.regular
                ? chalk.yellow(` $${p.items[0].price.regular.toFixed(2)}`)
                : "";
              return {
                name: `${p.description || "No description"} ${p.brand ? chalk.dim(`(${p.brand})`) : ""}${price}`,
                value: p.productId,
              };
            }),
          });

          if (selected.length) {
            for (const productId of selected) {
              const product = products.find((p) => p.productId === productId);
              const name = product?.description || searchTerm;
              addRecipeItem(recipe.id, name, productId, qty);
              console.log(
                chalk.green(
                  `  Added "${name}" [${productId}] to "${recipe.name}"`,
                ),
              );
            }
            console.log(
              chalk.green(
                `\n${selected.length} item(s) added to "${recipe.name}".`,
              ),
            );
          }
        }

        const again = await select({
          message: "Search for more items?",
          choices: [
            { name: "Yes", value: true },
            { name: "No, done", value: false },
          ],
        });

        if (!again) break;
        searchTerm = null; // prompt for new term
      }

      console.log();
    } catch (err) {
      if (err.name === "ExitPromptError") {
        console.log(chalk.dim("\nCancelled."));
        return;
      }
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
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

recipesCmd
  .command("add")
  .description("Add all recipe items to your cart (with pantry check)")
  .argument("<recipeIds...>", "Recipe ID(s)")
  .option("--no-check", "Skip pantry check")
  .option("--allow-duplicates", "Allow duplicate products across recipes")
  .action(async (recipeIds, opts) => {
    try {
      const provider = getActiveProvider();
      const seen = new Set();
      let totalAdded = 0;

      for (const rawId of recipeIds) {
        const recipe = getRecipe(parseInt(rawId, 10));
        if (!recipe) {
          console.log(chalk.yellow(`Recipe ${rawId} not found, skipping.`));
          continue;
        }

        const items = getRecipeItems(recipe.id);
        const linkedItems = items.filter((i) => i.product_id);

        if (!linkedItems.length) {
          console.log(
            chalk.yellow(
              `"${recipe.name}" has no linked products. Use: grocer-cli recipe search-add ${rawId}`,
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

        // Dedup
        if (!opts.allowDuplicates) {
          toAdd = toAdd.filter((i) => {
            if (seen.has(i.product_id)) return false;
            if (isInCart(i.product_id)) return false;
            seen.add(i.product_id);
            return true;
          });
        } else {
          toAdd.forEach((i) => seen.add(i.product_id));
        }

        if (!toAdd.length) {
          console.log(chalk.dim(`Nothing new to add from "${recipe.name}".`));
          continue;
        }

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
        const config = getConfig();
        const chainConfig = config[config.chain] || {};
        const banner = chainConfig.banner || config.chain;
        const cartUrl = provider.cartUrls?.[banner] || null;
        if (cartUrl) console.log(chalk.dim(`\nReview your cart: ${cartUrl}`));
      }
      console.log();
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

export default recipesCmd;
