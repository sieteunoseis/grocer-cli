---
name: kroger-search
description: >
  Search for products by keyword and return matching results with
  product IDs, descriptions, and prices. Use when a user wants to find grocery
  products, compare prices, or look up items available at their local store.
---

# Product Search

Search the product catalog by keyword via the configured grocery chain.

## Usage

```bash
node scripts/kroger-search.js <search term>
```

## Output

Tab-separated rows: `productId\tdescription\tprice`

## Requirements

- Grocery chain must be configured (`grocer-cli init`)
- User must be authenticated (`grocer-cli login`)
- A preferred store location should be set for accurate pricing (`grocer-cli locations <zip> --set`)

## Example

```bash
node scripts/kroger-search.js organic milk
```
