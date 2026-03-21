#!/usr/bin/env node

/**
 * Skill: recipe-to-cart
 * Add all items from a recipe directly to your cart.
 * Checks pantry first — skips items you already have that are still good.
 *
 * Usage: recipe-to-cart <recipeId> [--no-check]
 */

import { getRecipe, getRecipeItems, findPantryMatch } from "../../../src/lib/db.js";
import { registerProvider, getActiveProvider } from "../../../src/providers/registry.js";
import krogerProvider from "../../../src/providers/kroger/index.js";

registerProvider("kroger", krogerProvider);

const args = process.argv.slice(2);
const noCheck = args.includes("--no-check");
const recipeId = parseInt(args.find((a) => !a.startsWith("--")), 10);

if (!recipeId) {
  console.error("Usage: recipe-to-cart <recipeId> [--no-check]");
  process.exit(1);
}

const recipe = getRecipe(recipeId);
if (!recipe) {
  console.error(`Recipe ${recipeId} not found.`);
  process.exit(1);
}

const items = getRecipeItems(recipe.id);
const linkedItems = items.filter((i) => i.product_id);

if (!linkedItems.length) {
  console.error("No items with product IDs. Link products to recipe items first.");
  process.exit(1);
}

const toAdd = [];
const skipped = [];

if (!noCheck) {
  const today = new Date().toISOString().split("T")[0];

  for (const item of linkedItems) {
    const pantryMatch = findPantryMatch(item.product_name, item.product_id);
    if (pantryMatch) {
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
} else {
  toAdd.push(...linkedItems);
}

if (skipped.length) {
  console.log(`\nPantry check — already have (still good):`);
  for (const { item, pantryMatch, daysLeft } of skipped) {
    console.log(`  SKIP\t${item.product_name}\tbought ${pantryMatch.purchase_date}\tbest by ${pantryMatch.best_by}\t${daysLeft}d left`);
  }
  console.log();
}

if (!toAdd.length) {
  console.log("You already have everything for this recipe! Nothing added to cart.");
  process.exit(0);
}

const cartItems = toAdd.map((i) => ({ upc: i.product_id, quantity: i.quantity }));
const provider = getActiveProvider();
await provider.addToCart(cartItems);

console.log(`Added ${cartItems.length} items from "${recipe.name}" to cart.`);
if (skipped.length) {
  console.log(`Skipped ${skipped.length} items already in pantry.`);
}
