---
name: recipe-to-cart
description: >
  Add all items from a locally saved recipe to the user's Kroger online cart
  in a single step. Use when a user wants to order ingredients for a saved
  recipe, send a meal plan to their Kroger cart, or shop for a recipe.
---

# Recipe to Cart

Add all product-linked items from a saved recipe directly to the Kroger cart.

## Usage

```bash
node scripts/recipe-to-cart.js <recipeId>
```

## Requirements

- Recipe must exist in the local SQLite database
- Recipe items must have Kroger product IDs linked (via `kroger recipe add-item ... --product-id`)
- User must be authenticated (`kroger login`)

## Example

```bash
# Add all items from recipe #1 to cart
node scripts/recipe-to-cart.js 1
```
