#!/usr/bin/env node

/**
 * Skill: find-store
 * Find the nearest store and optionally set it as preferred.
 * Usage: find-store <zip> [--set]
 */

import { registerProvider, getActiveProvider } from "../../../src/providers/registry.js";
import krogerProvider from "../../../src/providers/kroger/index.js";
import { getConfig, setConfig } from "../../../src/lib/config.js";

registerProvider("kroger", krogerProvider);

const args = process.argv.slice(2);
const shouldSet = args.includes("--set");
const zip = args.find((a) => !a.startsWith("--"));

if (!zip) {
  console.error("Usage: find-store <zip> [--set]");
  process.exit(1);
}

const provider = getActiveProvider();
const locations = await provider.searchLocations(zip, 10);
if (!locations.length) {
  console.error("No stores found.");
  process.exit(1);
}

for (const loc of locations) {
  const addr = loc.address || {};
  console.log(
    `${loc.locationId}\t${loc.name || provider.label}\t${addr.addressLine1}, ${addr.city} ${addr.state} ${addr.zipCode}`
  );
}

if (shouldSet) {
  const config = getConfig();
  const chain = config.chain;
  setConfig({
    [chain]: { ...config[chain], locationId: locations[0].locationId },
  });
  console.log(`\nPreferred store set to ${locations[0].locationId}`);
}
