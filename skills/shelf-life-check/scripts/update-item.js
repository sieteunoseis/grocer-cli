#!/usr/bin/env node

/**
 * Skill: shelf-life-check — update a pantry item's best-by date
 * Usage: update-item.js <pantryId> <newBestBy> [newShelfLifeDays]
 */

import db, { updateBestBy } from "../../../src/lib/db.js";

const pantryId = parseInt(process.argv[2], 10);
const newBestBy = process.argv[3];
const newShelfLifeDays = process.argv[4] ? parseInt(process.argv[4], 10) : null;

if (!pantryId || !newBestBy) {
  console.error("Usage: update-item.js <pantryId> <newBestByDate> [newShelfLifeDays]");
  console.error("  Example: update-item.js 3 2026-03-25 5");
  process.exit(1);
}

// Update best_by
updateBestBy(pantryId, newBestBy);

// Also update shelf_life_days if provided
if (newShelfLifeDays) {
  db.prepare("UPDATE pantry SET shelf_life_days = ? WHERE id = ?").run(
    newShelfLifeDays,
    pantryId
  );
}

const item = db.prepare("SELECT * FROM pantry WHERE id = ?").get(pantryId);
if (item) {
  console.log(
    `Updated #${pantryId} "${item.product_name}": best_by=${newBestBy}` +
      (newShelfLifeDays ? ` shelf_life=${newShelfLifeDays}d` : "")
  );
} else {
  console.error(`Pantry item #${pantryId} not found.`);
  process.exit(1);
}
