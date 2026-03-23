# Grocer CLI Skills

Skills are modular capabilities following the [Agent Skills](https://agentskills.io) open standard. Each skill lives in its own subdirectory under `skills/` with a `SKILL.md` manifest and optional `scripts/`, `references/`, and `assets/` folders.

## Installation

```bash
npx skills add sieteunoseis/kroger-cli
```

## Available Skills

### `kroger-search`

Search for products on Kroger by keyword and return matching results with product IDs, descriptions, and prices.

```bash
node skills/kroger-search/scripts/kroger-search.js organic milk
```

**Output:** `productId\tdescription\tprice` (tab-separated, one per line)

---

### `recipe-to-cart`

Add all product-linked items from a saved recipe directly to your cart in one step.

```bash
node skills/recipe-to-cart/scripts/recipe-to-cart.js 1
```

Requires that recipe items have been linked to product IDs (via `grocer-cli recipe add-item` with `--product-id`).

---

### `find-store`

Find nearby stores by zip code. Optionally set the closest one as your preferred location.

```bash
node skills/find-store/scripts/find-store.js 45202
node skills/find-store/scripts/find-store.js 45202 --set
```

**Output:** `locationId\tstoreName\taddress` (tab-separated, one per line)

---

### `shelf-life-check`

Research actual shelf life for pantry items using USDA FoodKeeper, StillTasty, and FDA sources, then update best-by dates in the database.

```bash
# Agent runs these scripts as part of the skill workflow:
node skills/shelf-life-check/scripts/list-pantry.js
node skills/shelf-life-check/scripts/update-item.js <pantryId> <newBestBy> [shelfLifeDays]
```

The agent searches the web for each item, compares against current estimates, and updates any that are significantly off. Cites sources for all changes.

---

## Creating New Skills

1. Create a new directory under `skills/` (e.g. `skills/my-skill/`)
2. Add a `SKILL.md` with YAML frontmatter (`name` and `description` are required)
3. The directory name must match the `name` field in the frontmatter
4. Place executable scripts in a `scripts/` subdirectory
5. Import from `../../../src/providers/` and `../../../src/lib/` to reuse the provider APIs, database, and auth modules
6. Keep `SKILL.md` under 500 lines; move detailed docs to `references/`

### Skill Folder Structure

```
skills/
└── my-skill/
    ├── SKILL.md           # Required — frontmatter + instructions
    ├── scripts/           # Executable scripts
    │   └── my-skill.js
    ├── references/        # Additional docs (loaded on demand)
    └── assets/            # Templates, static files
```

### SKILL.md Template

```markdown
---
name: my-skill
description: >
  What this skill does and when to use it. Include keywords that help
  agents match tasks to this skill.
---

# My Skill

Instructions for the agent go here.
```
