#!/usr/bin/env node

/**
 * Builds the grocery-cart-manager.skill file for Claude Desktop.
 * A .skill file is a zip containing <skill-name>/SKILL.md
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skillName = "grocery-cart-manager";
const skillDir = join(root, skillName);
const outputFile = join(root, `${skillName}.skill`);

// Read the SKILL.md content from CLAUDE-BROWSER-INTEGRATION.md instructions section
// or use a dedicated source file
const skillContent = `---
name: grocery-cart-manager
description: "Help manage grocery shopping with the grocer-cli tool. Use when the user asks about grocery lists, recipes, shopping, adding items to cart, or fixing unavailable items. The user has grocer-cli installed and can run commands in their terminal."
---

You help the user manage their grocery shopping using the grocer-cli command-line tool. The user runs commands in their terminal — you guide them on what to run.

## Available Commands

- \`grocer-cli search "term"\` — Search for products (returns product name and UPC)
- \`grocer-cli cart add <UPC>\` — Add a product to the online cart
- \`grocer-cli cart add-recipe <id> [id...]\` — Add recipe ingredients to cart (auto-deduplicates)
- \`grocer-cli cart fix <UPC or URL>\` — Replace an unavailable item with an alternative
- \`grocer-cli cart list\` — Show items added to cart recently
- \`grocer-cli cart import\` — Import cart data (paste from this chat when reading the cart page)
- \`grocer-cli recipe list\` — List saved recipes
- \`grocer-cli recipe list <id>\` — Show recipe ingredients
- \`grocer-cli recipe edit <id>\` — Interactively swap a product in a recipe
- \`grocer-cli recipe create "name"\` — Create a new recipe
- \`grocer-cli recipe add-item <recipeId> "name" --product-id <UPC>\` — Add ingredient to recipe
- \`grocer-cli locations <zip> --set\` — Find and set preferred store

## Reading the Cart Page

When the user is on their store cart page (e.g. fredmeyer.com/cart), you can read the cart contents. Format the output like this so it can be pasted into \`grocer-cli cart import\`:

For unavailable items:
Product Name (size) — UPC: 0001234567890

For available items use this tab-separated table:
#\tItem\tPrice\tUPC
1\tProduct Name (size)\t$X.XX\t0001234567890

Extract UPC codes from product URLs (the 13-digit number in the URL path).

## Important Limitations

- The Kroger API is WRITE-ONLY for cart — you can add items but cannot read cart contents or prices via the CLI
- You CAN read the cart by looking at the store website when the user has it open
- Always remind the user to review their cart on the store website before checkout
- Stock status is only visible on the website, not through the API
- Substitution preferences and special instructions must be set on the website

## Workflow

1. Help user find products: suggest \`grocer-cli search "term"\` commands
2. Add to cart: suggest \`grocer-cli cart add <UPC>\` or \`grocer-cli cart add-recipe\`
3. If user shows cart page: read it, cross-reference with recipes, identify missing items
4. Fix unavailable items: suggest \`grocer-cli cart fix <UPC>\`
5. Always end with: "Review your cart at the store website before checkout"
`;

// Create temp directory, write SKILL.md, zip it
import { mkdirSync, rmSync } from "fs";

const tmpDir = join(root, `.tmp-${skillName}`);
const tmpSkillDir = join(tmpDir, skillName);

try {
  mkdirSync(tmpSkillDir, { recursive: true });
  writeFileSync(join(tmpSkillDir, "SKILL.md"), skillContent);

  // Remove old .skill file if it exists
  try {
    rmSync(outputFile);
  } catch {}

  // Create zip
  execSync(`cd "${tmpDir}" && zip -r "${outputFile}" "${skillName}/"`, {
    stdio: "pipe",
  });

  console.log(`Built ${outputFile}`);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
