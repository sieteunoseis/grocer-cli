# Kroger CLI Skills

Skills are standalone scripts in the `skills/` folder that provide quick shortcuts for common workflows. They can be run directly or integrated into other tooling.

## Available Skills

### `kroger-search`
Quick product search that outputs tab-separated results.

```bash
node skills/kroger-search.js organic milk
```

**Output:** `productId\tdescription\tprice` (one per line)

---

### `recipe-to-cart`
Add all linked items from a saved recipe directly to your Kroger cart in one step.

```bash
node skills/recipe-to-cart.js 1
```

Requires that recipe items have been linked to Kroger product IDs (via `kroger recipe add-item` with `--product-id`).

---

### `find-store`
Find nearby Kroger stores by zip code. Optionally set the closest one as your preferred location.

```bash
node skills/find-store.js 45202
node skills/find-store.js 45202 --set
```

**Output:** `locationId\tstoreName\taddress` (one per line)

---

## Creating New Skills

1. Create a new `.js` file in the `skills/` folder
2. Add the shebang line: `#!/usr/bin/env node`
3. Import from `../src/lib/` to reuse the Kroger API client, database, and auth modules
4. Accept input via `process.argv`
5. Output machine-readable results (tab-separated, JSON, etc.) for easy piping
6. Document the skill in this file

### Integration with skills.sh

This CLI is designed to be installable via [skills.sh](https://skills.sh). The skills in this folder can be registered and discovered through the skills.sh platform, allowing other tools and agents to leverage Kroger API functionality.
