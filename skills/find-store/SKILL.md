---
name: find-store
description: >
  Find store locations near a given zip code and optionally set the
  closest one as the preferred store. Use when a user wants to locate nearby
  stores, pick a store for pricing and availability, or change their
  preferred store location.
---

# Find Store

Search for stores near a zip code.

## Usage

```bash
node scripts/find-store.js <zip> [--set]
```

### Options

- `--set` — Automatically set the first (closest) result as the preferred store

## Output

Tab-separated rows: `locationId\tstoreName\taddress`

## Requirements

- Grocery chain must be configured (`grocer init`)
- User must be authenticated (`grocer login`)

## Example

```bash
# Find stores near Cincinnati
node scripts/find-store.js 45202

# Find and set preferred store
node scripts/find-store.js 45202 --set
```
