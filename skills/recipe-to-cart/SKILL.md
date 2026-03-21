---
name: recipe-to-cart
description: >
  Add all items from a locally saved recipe to the user's online cart
  in a single step. Automatically checks the pantry first — if you already
  bought an ingredient and it's still good (not expired), it skips re-buying it.
  Great for spices, condiments, and other long-shelf-life items.
---

# Recipe to Cart

Add all product-linked items from a saved recipe directly to your cart.
Before adding, checks your pantry for items you already have that are still
within their best-by date — so you don't end up with duplicate spices,
sour cream, or other items that last longer than a week.

## Usage

```bash
node scripts/recipe-to-cart.js <recipeId>
node scripts/recipe-to-cart.js <recipeId> --no-check   # Skip pantry check
```

## How the Pantry Check Works

1. For each recipe ingredient, looks for a matching unconsumed pantry item
2. Matches by product ID first, then by product name (fuzzy)
3. If found and still before the best-by date → **skipped** (not re-purchased)
4. If expired or not in pantry → **added to cart**

Output uses tab-separated format for skipped items:
```
SKIP	sour cream	bought 2026-03-10	best by 2026-03-31	10d left
SKIP	paprika	bought 2026-01-15	best by 2028-01-15	665d left
```

## Requirements

- Recipe must exist in the local SQLite database
- Recipe items must have product IDs linked (via `grocer recipe add-item ... --product-id`)
- User must be authenticated (`grocer login`)
- For pantry checks to work, track purchases with `grocer pantry track <purchaseId>`

## Example

```bash
# Add recipe items to cart, skipping what you already have
node scripts/recipe-to-cart.js 1

# Force add everything (no pantry check)
node scripts/recipe-to-cart.js 1 --no-check
```
