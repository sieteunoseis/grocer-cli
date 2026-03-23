---
name: shelf-life-check
description: >
  Research actual shelf life for pantry items by searching USDA FoodKeeper,
  StillTasty, and FDA guidelines, then update best-by dates in the local
  database. Use when a user wants to verify expiration estimates, check
  freshness dates, or get more accurate best-by dates for their groceries.
---

# Shelf Life Check

Research and update best-by dates for pantry items using authoritative food safety sources.

## When to Use

- User asks to verify or check shelf life estimates
- User adds unusual items not in the default lookup table
- User wants more accurate dates for specific products or brands
- After a `grocer-cli pantry track` when the user wants to refine estimates

## Instructions

1. **Get current pantry items** by running:

   ```bash
   node skills/shelf-life-check/scripts/list-pantry.js
   ```

   This outputs tab-separated rows: `id\tproductName\tpurchaseDate\tbestBy\tshelfLifeDays`

2. **For each item (or items the user specifies)**, search the web for the actual shelf life:
   - Search: `"<product name>" shelf life refrigerator how long does it last`
   - Prioritize results from: **USDA FoodKeeper**, **StillTasty.com**, **FDA.gov**, **EatByDate.com**
   - Look for the **refrigerated** shelf life after opening (or after purchase for fresh items)
   - For canned/dry goods, look for **pantry** shelf life

3. **Compare** the researched shelf life against the current `shelfLifeDays` estimate in the database.

4. **If the estimate differs significantly** (off by more than 2 days for perishables, or more than 30 days for shelf-stable items):
   - Calculate the corrected best-by date: `purchaseDate + researchedShelfLifeDays`
   - Update it by running:
     ```bash
     node skills/shelf-life-check/scripts/update-item.js <pantryId> <newBestByDate> <newShelfLifeDays>
     ```
   - Tell the user what you found and what you changed.

5. **Report a summary** to the user:
   - Which items you checked
   - What sources you used
   - What changed vs. what was already accurate
   - Any items where shelf life varies a lot by brand/storage method

## Example Workflow

```
User: "Check the shelf life on my pantry items"

Agent:
1. Runs list-pantry.js → sees 5 items
2. Searches web for each item's actual shelf life
3. Finds that "Greek Yogurt" is typically 14-21 days (current estimate: 14d) — close enough
4. Finds that "2% Milk" opened is 5-7 days but unopened up to 7 days past sell-by — current 7d is reasonable
5. Finds that "Sourdough Bread" at room temp is 4-5 days, not 7 — updates to 5d
6. Reports findings to user
```

## Notes

- Always cite the source (USDA FoodKeeper, StillTasty, etc.)
- When in doubt, use the more conservative (shorter) estimate
- Frozen items last much longer — note if the user might freeze something
- Some items vary a lot: "best by" on the package always wins over generic estimates
