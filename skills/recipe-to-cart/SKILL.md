---
name: recipe-to-cart
description: >
  Add all items from one or more locally saved recipes to the user's online cart
  in a single step. Automatically deduplicates across recipes and checks the
  pantry first — if you already bought an ingredient and it's still good
  (not expired), it skips re-buying it.
---

# Recipe to Cart

Add all product-linked items from saved recipes directly to your cart.
Supports multiple recipes in one command with automatic deduplication —
shared items (like milk across "Weekly Staples" and "Taco Tuesday") are
only added once.

## Important: Cart Limitations

**The Kroger API is write-only for cart operations.** This CLI can add items
to the cart but **cannot read or verify cart contents.** This means:

- There is no way to check what is already in the cart before adding
- Duplicate detection only works across recipes added in the same command
- The user must review their cart on the store website before checkout
- Always remind the user to check their cart at the provided URL

## Usage

```bash
# Add a single recipe
grocer-cli cart add-recipe 1

# Add multiple recipes (duplicates skipped automatically)
grocer-cli cart add-recipe 1 2 3

# Skip pantry check
grocer-cli cart add-recipe 1 2 --no-check

# Allow duplicates across recipes
grocer-cli cart add-recipe 1 2 --allow-duplicates
```

## How Deduplication Works

1. Items are tracked by product ID across all recipes in the command
2. If recipe 2 has an item already added from recipe 1 → **skipped**
3. This is enabled by default; use `--allow-duplicates` to override

## How the Pantry Check Works

1. For each recipe ingredient, looks for a matching unconsumed pantry item
2. Matches by product ID first, then by product name (fuzzy)
3. If found and still before the best-by date → **skipped** (not re-purchased)
4. If expired or not in pantry → **added to cart**

## Weekly Staples Pattern

Create a recipe for items you buy every week:

```bash
grocer-cli recipe create "Weekly Staples" --description "Regular weekly groceries"
grocer-cli recipe add-item 1 "2% Milk" --product-id 0001111041700
grocer-cli recipe add-item 1 "Eggs" --product-id 0001111060933
# ... etc
```

Then combine with meal recipes each week:

```bash
grocer-cli cart add-recipe 1 2    # Staples + Taco Tuesday, no duplicates
```

## Requirements

- Recipe must exist in the local SQLite database
- Recipe items must have product IDs linked (via `grocer-cli recipe add-item ... --product-id`)
- User must be authenticated (`grocer-cli login`)
- For pantry checks to work, track purchases with `grocer-cli pantry track <purchaseId>`
