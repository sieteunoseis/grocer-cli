---
name: recipe-to-cart
description: Add all items from one or more locally saved recipes to the user's online grocery cart in a single step. Automatically deduplicates across recipes and checks the pantry first to avoid re-buying items you already have. Use when the user wants to shop for a recipe or add meal ingredients to their cart.
metadata:
  author: sieteunoseis
  version: "1.0.0"
---

# Recipe to Cart

Add all product-linked items from saved recipes directly to the user's cart. Supports multiple recipes in one command with automatic deduplication — shared items (like milk across "Weekly Staples" and "Taco Tuesday") are only added once.

## Important: Cart Limitations

**The Kroger API is write-only for cart operations.** This CLI can add items to the cart but **cannot read or verify cart contents.** Always remind the user to review their cart on the store website before checkout.

## Commands

```bash
# Add a single recipe to cart
grocer-cli cart add-recipe 1

# Add multiple recipes (duplicates skipped automatically)
grocer-cli cart add-recipe 1 2 3

# Skip pantry check
grocer-cli cart add-recipe 1 2 --no-check

# Allow duplicates across recipes
grocer-cli cart add-recipe 1 2 --allow-duplicates
```

## Related Commands

```bash
# Create a recipe
grocer-cli recipe create "Taco Tuesday" --description "Weekly taco night"

# Search for a product to get its UPC
grocer-cli search "ground beef"

# Link a product to a recipe
grocer-cli recipe add-item 1 "Ground Beef" --product-id <UPC>

# View a recipe's ingredients
grocer-cli recipe show 1

# List all recipes
grocer-cli recipe list
```

## How the Pantry Check Works

1. For each recipe ingredient, looks for a matching unconsumed pantry item
2. Matches by product ID first, then by product name (fuzzy)
3. If found and still before the best-by date — **skipped** (not re-purchased)
4. If expired or not in pantry — **added to cart**

## Requirements

- grocer-cli must be installed (`npm install -g grocer-cli`)
- Recipe items must have product IDs linked (via `grocer-cli recipe add-item ... --product-id`)
- User must be authenticated (`grocer-cli login`)
- For pantry checks to work, track purchases with `grocer-cli pantry track <purchaseId>`

## Workflow

1. Run `grocer-cli recipe list` to show available recipes
2. Run `grocer-cli cart add-recipe <id>` to add ingredients to cart
3. Review any pantry check warnings — items already in pantry are skipped
4. Always end with: "Review your cart at the store website before checkout"
