#!/usr/bin/env node

/**
 * Skill: shelf-life-check — list pantry items
 * Outputs tab-separated: id, productName, purchaseDate, bestBy, shelfLifeDays
 */

import { getPantryItems } from "../../../src/lib/db.js";

const items = getPantryItems();

if (!items.length) {
  console.error(
    "Pantry is empty. Add items with: grocer-cli pantry add or grocer-cli pantry track <purchaseId>",
  );
  process.exit(1);
}

for (const item of items) {
  console.log(
    [
      item.id,
      item.product_name,
      item.purchase_date,
      item.best_by,
      item.shelf_life_days,
    ].join("\t"),
  );
}
