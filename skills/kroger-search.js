#!/usr/bin/env node

/**
 * Skill: kroger-search
 * Quick product search shortcut.
 * Usage: kroger-search <term>
 */

import { searchProducts } from "../src/lib/kroger.js";

const term = process.argv.slice(2).join(" ");
if (!term) {
  console.error("Usage: kroger-search <term>");
  process.exit(1);
}

const products = await searchProducts(term, { limit: 5 });
for (const p of products) {
  const price = p.items?.[0]?.price?.regular;
  console.log(
    `${p.productId}\t${p.description}\t${price ? "$" + price.toFixed(2) : "N/A"}`
  );
}
