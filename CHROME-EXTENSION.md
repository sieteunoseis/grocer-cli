# Chrome & Browser Integration

## Why This Exists

The Kroger public API is **write-only for cart operations** — it can add items but cannot read cart contents, check stock, or retrieve prices. Browser integration bridges this gap by reading the store website directly.

This is a workaround for current API limitations. If Kroger adds cart read endpoints in the future, these manual steps can be replaced with direct API calls.

## Integration Options

### Option 1: Claude Code with Chrome (Recommended)

Claude Code can control Chrome directly — no copy/paste needed. This is the most seamless workflow.

**Setup:**

1. Install the [Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) (v1.0.36+)
2. Run `claude --chrome` or type `/chrome` in an existing session

**Workflow:**

```
claude --chrome
```

Then ask:

```
Go to https://www.fredmeyer.com/cart, read my cart contents,
extract UPC codes from product URLs, and run grocer cart import
with the data. Then fix any unavailable items with grocer cart fix.
```

Claude Code will:

1. Open the cart page in Chrome
2. Read all items, prices, and stock status
3. Extract UPC codes from product URLs
4. Run `grocer cart import` to sync local tracking
5. Run `grocer cart fix` for any unavailable items
6. All in one automated session

### Option 2: Claude Desktop with Skill

Create a custom skill in Claude Desktop (Customize > Skills > +) to help manage grocery shopping when viewing the cart page.

**Skill name:** `grocery-cart-manager`

**Description:**

```
Help manage grocery shopping with the grocer-cli tool. Use when the user asks about grocery lists, recipes, shopping, adding items to cart, or fixing unavailable items. The user has grocer-cli installed and can run commands in their terminal.
```

**Instructions:**

```
You help the user manage their grocery shopping using the grocer-cli command-line tool. The user runs commands in their terminal — you guide them on what to run.

## Available Commands

- `grocer search "term"` — Search for products (returns product name and UPC)
- `grocer cart add <UPC>` — Add a product to the online cart
- `grocer cart add-recipe <id> [id...]` — Add recipe ingredients to cart (auto-deduplicates)
- `grocer cart fix <UPC or URL>` — Replace an unavailable item with an alternative
- `grocer cart list` — Show items added to cart recently
- `grocer cart import` — Import cart data (paste from this chat when reading the cart page)
- `grocer recipe list` — List saved recipes
- `grocer recipe list <id>` — Show recipe ingredients
- `grocer recipe edit <id>` — Interactively swap a product in a recipe
- `grocer recipe create "name"` — Create a new recipe
- `grocer recipe add-item <recipeId> "name" --product-id <UPC>` — Add ingredient

## Reading the Cart Page

When the user is on their store cart page, read the contents and format as:

Unavailable items:
Product Name (size) — UPC: 0001234567890

Available items (tab-separated):
#	Item	Price	UPC
1	Product Name (size)	$X.XX	0001234567890

Extract UPC codes from product URLs (the 13-digit number in the URL path).

## Important Limitations

- The Kroger API is WRITE-ONLY for cart — cannot read cart contents or prices
- You CAN read the cart by looking at the store website when the user has it open
- Always remind the user to review their cart on the website before checkout
- Substitution preferences and special instructions must be set on the website

## Workflow

1. Help user find products: suggest `grocer search "term"` commands
2. Add to cart: suggest `grocer cart add <UPC>` or `grocer cart add-recipe`
3. If user shows cart page: read it, cross-reference with recipes, identify missing items
4. Fix unavailable items: suggest `grocer cart fix <UPC>`
5. Always end with: "Review your cart at [store URL]/cart before checkout"
```

**Example prompt to test:**

```
I want to make Matthew McConaughey's viral tuna salad this week.
Can you help me get everything in my Fred Meyer cart?
I already have the recipe saved as recipe 1 in grocer-cli.
```

### Option 3: Manual Copy/Paste

For environments without Claude Code Chrome integration:

1. Open your cart on the store website
2. Ask the Claude Chrome extension to read your cart with this prompt:

```
List every item in my cart in this exact tab-separated format.
Extract the UPC code from each product's URL (the 13-digit number).

For unavailable items:
Product Name (size) — UPC: 0001234567890

For available items, use this tab-separated table:
#	Item	Price	UPC
1	Product Name (size)	$X.XX	0001234567890

Include "Unavailable Items" and "Available Items" as section headers.
Include the estimated total at the end.
```

3. Copy the output
4. Run `grocer cart import` and paste it

## CLI Commands

### Import cart data

```bash
# Interactive paste
grocer cart import

# Pipe from a file
cat cart-snapshot.txt | grocer cart import
```

After import, the CLI shows:

- How many items are available vs unavailable
- Estimated total based on real prices
- Instructions to fix unavailable items

### Fix unavailable items

```bash
# By UPC
grocer cart fix 0002000012138

# By product URL from the store website
grocer cart fix https://www.fredmeyer.com/p/green-giant-nibblers-corn-on-the-cob/0002000012138
```

## Limitations

- Cart reading requires browser access (API does not support it)
- Prices are point-in-time snapshots and may change
- Out-of-stock detection only works by reading the website
- Substitution preferences and special shopper instructions must be set on the website
