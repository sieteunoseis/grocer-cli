---
name: shelf-life-check
description: Check and update shelf life estimates for pantry items using USDA FoodKeeper, StillTasty, and FDA guidelines. Use when a user wants to verify expiration estimates, check freshness dates, or get more accurate best-by dates for their groceries.
metadata:
  author: sieteunoseis
  version: "1.0.0"
---

# Shelf Life Check

Research and update best-by dates for pantry items using authoritative food safety sources.

## When to Use

- User asks to verify or check shelf life estimates
- User adds unusual items not in the default lookup table
- User wants more accurate dates for specific products or brands
- After running `grocer-cli pantry track` when the user wants to refine estimates

## Commands

```bash
# View current pantry items with best-by dates
grocer-cli pantry list

# Check what's expiring soon
grocer-cli pantry status
grocer-cli pantry expiring --days 3

# Look up shelf life for any item
grocer-cli pantry shelf-life "chicken breast"

# Update a best-by date
grocer-cli pantry extend <pantryId> <newBestByDate>

# Mark items as consumed or toss
grocer-cli pantry consumed <pantryId>
grocer-cli pantry toss <pantryId>
```

## Workflow

1. Run `grocer-cli pantry list` to see current pantry items with their estimated best-by dates

2. For each item (or items the user specifies), search the web for the actual shelf life:
   - Search: `"<product name>" shelf life refrigerator how long does it last`
   - Prioritize results from: **USDA FoodKeeper**, **StillTasty.com**, **FDA.gov**, **EatByDate.com**
   - Look for the **refrigerated** shelf life after opening (or after purchase for fresh items)
   - For canned/dry goods, look for **pantry** shelf life

3. Compare the researched shelf life against the current estimate

4. If the estimate differs significantly (off by more than 2 days for perishables, or more than 30 days for shelf-stable items):
   - Calculate the corrected best-by date from the purchase date
   - Update it with `grocer-cli pantry extend <pantryId> <newBestByDate>`
   - Tell the user what you found and what you changed

5. Report a summary:
   - Which items you checked
   - What sources you used
   - What changed vs. what was already accurate
   - Any items where shelf life varies a lot by brand/storage method

## Notes

- Always cite the source (USDA FoodKeeper, StillTasty, etc.)
- When in doubt, use the more conservative (shorter) estimate
- Frozen items last much longer — note if the user might freeze something
- "Best by" on the package always wins over generic estimates

## Requirements

- grocer-cli must be installed (`npm install -g grocer-cli`)
- Pantry items must exist (via `grocer-cli pantry track <purchaseId>` or `grocer-cli pantry add`)
