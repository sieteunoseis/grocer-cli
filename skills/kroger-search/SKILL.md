---
name: kroger-search
description: >
  Search for products on Kroger by keyword and return matching results with
  product IDs, descriptions, and prices. Use when a user wants to find grocery
  products, compare prices, or look up items available at their local Kroger store.
---

# Kroger Product Search

Search the Kroger product catalog by keyword.

## Usage

```bash
node scripts/kroger-search.js <search term>
```

## Output

Tab-separated rows: `productId\tdescription\tprice`

## Requirements

- Kroger API credentials must be configured (`kroger config --client-id ... --client-secret ...`)
- User must be authenticated (`kroger login`)
- A preferred store location should be set for accurate pricing (`kroger locations <zip> --set`)

## Example

```bash
node scripts/kroger-search.js organic milk
```
