---
name: kroger-search
description: Search for grocery products by keyword and return matching results with product IDs, descriptions, and prices. Use when a user wants to find grocery products, compare prices, or look up items available at their local store.
metadata:
  author: sieteunoseis
  version: "1.0.0"
---

# Product Search

Search the product catalog by keyword via the configured grocery chain.

## Commands

```bash
# Basic search
grocer-cli search "organic milk"

# Search with filters
grocer-cli search "chicken breast" --brand "Simple Truth" --limit 5

# Get details for a specific product
grocer-cli product <productId>
```

## Requirements

- grocer-cli must be installed (`npm install -g grocer-cli`)
- Grocery chain must be configured (`grocer-cli init`)
- User must be authenticated (`grocer-cli login`)
- A preferred store location should be set for accurate pricing (`grocer-cli locations <zip> --set`)

## Workflow

1. Run `grocer-cli search "<term>"` with the user's query
2. Present results with product IDs, descriptions, and prices
3. If the user wants more details, run `grocer-cli product <productId>`
4. Note the UPC/product ID for use with cart or recipe commands
