---
name: find-store
description: Find store locations near a given zip code and optionally set the closest one as the preferred store. Use when a user wants to locate nearby stores, pick a store for pricing and availability, or change their preferred store location.
metadata:
  author: sieteunoseis
  version: "1.0.0"
---

# Find Store

Search for grocery stores near a zip code using the grocer-cli tool.

## Commands

```bash
# Search for stores near a zip code
grocer-cli locations <zip>

# Find and set the closest store as preferred
grocer-cli locations <zip> --set
```

## Requirements

- grocer-cli must be installed (`npm install -g grocer-cli`)
- Grocery chain must be configured (`grocer-cli init`)
- User must be authenticated (`grocer-cli login`)

## Workflow

1. Ask the user for their zip code if not provided
2. Run `grocer-cli locations <zip>` to show nearby stores
3. If the user wants to set a preferred store, run `grocer-cli locations <zip> --set`
4. Confirm the preferred store was set with `grocer-cli status`
