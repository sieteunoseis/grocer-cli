#!/usr/bin/env node

/**
 * Skill: recipe-to-cart
 * Add all items from a recipe directly to your cart.
 * Usage: recipe-to-cart <recipeId>
 */

import { getRecipe, getRecipeItems } from "../../../src/lib/db.js";
import { registerProvider, getActiveProvider } from "../../../src/providers/registry.js";
import krogerProvider from "../../../src/providers/kroger/index.js";

registerProvider("kroger", krogerProvider);

const recipeId = parseInt(process.argv[2], 10);
if (!recipeId) {
  console.error("Usage: recipe-to-cart <recipeId>");
  process.exit(1);
}

const recipe = getRecipe(recipeId);
if (!recipe) {
  console.error(`Recipe ${recipeId} not found.`);
  process.exit(1);
}

const items = getRecipeItems(recipe.id);
const cartItems = items
  .filter((i) => i.product_id)
  .map((i) => ({ upc: i.product_id, quantity: i.quantity }));

if (!cartItems.length) {
  console.error("No items with product IDs. Link products to recipe items first.");
  process.exit(1);
}

const provider = getActiveProvider();
await provider.addToCart(cartItems);
console.log(`Added ${cartItems.length} items from "${recipe.name}" to cart.`);
