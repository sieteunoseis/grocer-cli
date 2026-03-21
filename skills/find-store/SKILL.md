---
name: find-store
description: >
  Find Kroger store locations near a given zip code and optionally set the
  closest one as the preferred store. Use when a user wants to locate nearby
  Kroger stores, pick a store for pricing and availability, or change their
  preferred store location.
---

# Find Kroger Store

Search for Kroger stores near a zip code.

## Usage

```bash
node scripts/find-store.js <zip> [--set]
```

### Options

- `--set` — Automatically set the first (closest) result as the preferred store

## Output

Tab-separated rows: `locationId\tstoreName\taddress`

## Requirements

- Kroger API credentials must be configured
- User must be authenticated (`kroger login`)

## Example

```bash
# Find stores near Cincinnati
node scripts/find-store.js 45202

# Find and set preferred store
node scripts/find-store.js 45202 --set
```
