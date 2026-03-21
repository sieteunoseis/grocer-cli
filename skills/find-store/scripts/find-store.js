#!/usr/bin/env node

/**
 * Skill: find-store
 * Find the nearest Kroger store and optionally set it as preferred.
 * Usage: find-store <zip> [--set]
 */

import { searchLocations } from "../../../src/lib/kroger.js";
import { setConfig } from "../../../src/lib/config.js";

const args = process.argv.slice(2);
const shouldSet = args.includes("--set");
const zip = args.find((a) => !a.startsWith("--"));

if (!zip) {
  console.error("Usage: find-store <zip> [--set]");
  process.exit(1);
}

const locations = await searchLocations(zip, 10);
if (!locations.length) {
  console.error("No stores found.");
  process.exit(1);
}

for (const loc of locations) {
  const addr = loc.address || {};
  console.log(
    `${loc.locationId}\t${loc.name || "Kroger"}\t${addr.addressLine1}, ${addr.city} ${addr.state} ${addr.zipCode}`
  );
}

if (shouldSet) {
  setConfig({ locationId: locations[0].locationId });
  console.log(`\nPreferred store set to ${locations[0].locationId}`);
}
