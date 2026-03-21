# Kroger CLI Skills

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
Add all product-linked items from a saved recipe directly to your Kroger cart in one step.

```bash
node skills/recipe-to-cart/scripts/recipe-to-cart.js 1
```

Requires that recipe items have been linked to Kroger product IDs (via `kroger recipe add-item` with `--product-id`).

---

### `find-store`
Find nearby Kroger stores by zip code. Optionally set the closest one as your preferred location.

```bash
node skills/find-store/scripts/find-store.js 45202
node skills/find-store/scripts/find-store.js 45202 --set
```

**Output:** `locationId\tstoreName\taddress` (tab-separated, one per line)

---

## Creating New Skills

1. Create a new directory under `skills/` (e.g. `skills/my-skill/`)
2. Add a `SKILL.md` with YAML frontmatter (`name` and `description` are required)
3. The directory name must match the `name` field in the frontmatter
4. Place executable scripts in a `scripts/` subdirectory
5. Import from `../../../src/lib/` to reuse the Kroger API client, database, and auth modules
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
