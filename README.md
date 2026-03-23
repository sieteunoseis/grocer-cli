# grocer-cli

A chain-agnostic command-line tool for interacting with grocery store APIs — search products, manage recipes, track purchases, subscribe to recipe feeds, and budget your grocery spending.

**Supported chains:** Kroger (and Kroger family: Ralphs, Fred Meyer, Harris Teeter, etc.)

## Install

```bash
npm install -g grocer-cli
```

Requires Node.js >= 22.5.0 (uses the built-in `node:sqlite` module).

## Add Skills

Skills teach Claude how to use grocer-cli on your behalf. They do **not** install the CLI — you need both.

### Claude Code (recommended)

```bash
npx skills add sieteunoseis/grocer-cli
```

### Claude Desktop

Download the [`grocery-cart-manager.skill`](https://github.com/sieteunoseis/grocer-cli/releases/latest/download/grocery-cart-manager.skill) file from the [latest release](https://github.com/sieteunoseis/grocer-cli/releases/latest). Open it and Claude Desktop will prompt you to add the skill.

Or set it up manually:

1. Open Claude Desktop
2. Go to **Customize > Skills > +**
3. Fill in:
   - **Skill name:** `grocery-cart-manager`
   - **Description:** `Help manage grocery shopping with the grocer-cli tool. Use when the user asks about grocery lists, recipes, shopping, adding items to cart, or fixing unavailable items.`
   - **Instructions:** Copy from [docs/CLAUDE-BROWSER-INTEGRATION.md](docs/CLAUDE-BROWSER-INTEGRATION.md#option-2-claude-desktop-with-skill)

## Claude Code + Chrome

For a fully automated workflow (no copy/paste), use Claude Code with Chrome:

```bash
claude --chrome
```

When you're on your store's cart page, Claude can:

- Read your cart and cross-reference against saved recipes
- Identify missing ingredients and suggest `grocer-cli` commands to add them
- Spot unavailable items and suggest replacements

See [docs/CLAUDE-BROWSER-INTEGRATION.md](docs/CLAUDE-BROWSER-INTEGRATION.md) for full details.

## Setup

1. Run the interactive setup:

```bash
grocer-cli init
```

This walks you through:

- Choosing your grocery chain (e.g. Kroger, Fred Meyer, Ralphs)
- Entering your API credentials
- Getting started

2. Log in via OAuth:

```bash
grocer-cli login
```

3. Find and set your preferred store:

```bash
grocer-cli locations 98101 --set
```

## Usage

### Products

```bash
grocer-cli search "organic milk"
grocer-cli search "chicken breast" --brand "Simple Truth" --limit 5
grocer-cli product <productId>
```

### Recipes

Create and manage local recipes, then add all ingredients to your cart in one step.

```bash
grocer-cli recipe create "Taco Tuesday" --description "Weekly taco night"
grocer-cli recipe list
grocer-cli recipe show 1
grocer-cli recipe add-item 1 "Ground Beef" --product-id 0001234567890 --quantity 2
grocer-cli recipe remove-item 3
grocer-cli recipe delete 1
```

### Recipe Feeds

Subscribe to RSS feeds from your favorite food blogs. The CLI extracts ingredients automatically so you can search and shop for them.

```bash
# Subscribe to a recipe blog
grocer-cli feeds add https://www.budgetbytes.com/feed/

# List your subscriptions
grocer-cli feeds list

# Fetch new recipes from all feeds
grocer-cli feeds fetch

# Browse recipes and view ingredients
grocer-cli feeds recipes
grocer-cli feeds recipes --feed 1 --limit 10
grocer-cli feeds show 42

# Unsubscribe
grocer-cli feeds remove 1
```

Example workflow — discover a recipe and shop for it:

```bash
grocer-cli feeds fetch                          # Grab latest recipes
grocer-cli feeds show 42                        # View ingredients
grocer-cli search "chicken breast"              # Find it at your store
grocer-cli cart add 0001234567890 --quantity 2   # Add to cart
grocer-cli export feed-recipe 42                # Or send to Instacart for delivery
```

### Cart

```bash
grocer-cli cart add <upc> --quantity 2
grocer-cli cart add-recipe 1
```

### Purchases

Track what you've bought by importing receipt emails or logging manually.

```bash
# Import from a receipt email
grocer-cli purchases import receipt.eml

# Log a purchase manually
grocer-cli purchases add "Almond Milk" --price 3.99 --quantity 2

# View history
grocer-cli purchases list
grocer-cli purchases show 1

# Spending stats — top items, monthly trends, total savings
grocer-cli purchases stats

# Clean up
grocer-cli purchases delete 1
```

Pair with a Gmail skill like [idanbeck/claude-skills](https://github.com/idanbeck/claude-skills) to auto-fetch receipt emails from your inbox.

### Budget

Set a weekly or biweekly grocery budget and track spending against it. The budget tracks automatically from your imported/logged purchases.

```bash
# Set a $150/week budget
grocer-cli budget set 150 --period weekly

# Or biweekly
grocer-cli budget set 300 --period biweekly

# Check how you're doing this period
grocer-cli budget status

# View past periods
grocer-cli budget history
```

Example `budget status` output:

```
Budget Status

  Period:    weekly (2026-03-21 → 2026-03-27)
  Budget:    $150.00
  Spent:     $107.80 (2 trips)
  Remaining: $42.20

  [██████████████████████░░░░░░░░] 72%

  6 days left — ~$7.03/day remaining

  Spending trend:  ▅█▇▆▃▅█▅
                   01-25  03-21
```

`budget history` shows mini spark bars per period with a trend sparkline at the bottom.

### Instacart Export

Export recipes and shopping lists to [Instacart](https://www.instacart.com) for delivery. Works with any store Instacart supports (Fred Meyer, Kroger, etc.).

```bash
# Set up your Instacart API key (get one at developer portal)
grocer-cli config --instacart-key <your-key>

# Export a local recipe — generates a shoppable Instacart link
grocer-cli export recipe 1

# Export a feed recipe
grocer-cli export feed-recipe 42

# Export a quick list of items
grocer-cli export list "milk" "eggs" "bread" "chicken breast"
```

The generated link opens Instacart where you pick your store (e.g. Fred Meyer), review matched products, and check out for delivery.

### Pantry / Best-By Tracking

Track what's in your fridge and when it expires. Items get estimated "best by" dates based on USDA/FDA shelf life guidelines (~120 common grocery items).

```bash
# Auto-track from a purchase — estimates best-by for each item
grocer-cli pantry track 1

# Or add manually
grocer-cli pantry add "milk"
grocer-cli pantry add "salmon" --best-by 2026-03-23

# Check what's expiring
grocer-cli pantry status
grocer-cli pantry expiring --days 3

# Look up shelf life for any item
grocer-cli pantry shelf-life "chicken breast"
#   chicken breast: ~2 days

# Manage items
grocer-cli pantry consumed 3     # Mark as used
grocer-cli pantry extend 2 2026-03-28  # Adjust date
grocer-cli pantry toss 5         # Remove
grocer-cli pantry list            # Full list
```

Example `pantry status`:

```
Pantry Status

  3 fresh   2 expiring soon   0 expired
  5 items tracked

  Expiring soon:
    Chicken Breast — best by 2026-03-21 (today)  [#2]
    Bananas — best by 2026-03-24 (in 3d)  [#3]

  Fresh:
    2% Milk 1 Gal — best by 2026-03-26 (5d)  [#1]
    Canned Black Beans — best by 2026-03-26 (5d)  [#4]
```

### Auth & Config

```bash
grocer-cli login          # OAuth2 browser flow
grocer-cli logout         # Clear stored tokens
grocer-cli status         # Check auth status
grocer-cli config         # View configuration
```

**Session lifetime:** Access tokens expire after ~30 minutes, but the CLI automatically refreshes them using a long-lived refresh token whenever you run a command. You don't need to log in again unless the refresh token itself expires from extended inactivity (typically weeks without any CLI usage).

## Adding a New Chain

To add support for a new grocery chain, create a provider in `src/providers/<chain>/` with:

- `auth.js` — OAuth/authentication logic
- `api.js` — API client (searchProducts, getProduct, searchLocations, addToCart, getProfile)
- `receipt.js` — Receipt email parser (parseReceipt)
- `index.js` — Provider definition with metadata and config fields

Then register it in `src/index.js`:

```javascript
import myChainProvider from "./providers/mychain/index.js";
registerProvider("mychain", myChainProvider);
```

## Skills

Standalone scripts in the `skills/` folder for quick workflows.

## Data Storage

All data is stored locally in `~/.grocer-cli/`:

- `config.json` — Chain selection, API credentials, and preferences
- `grocer.db` — SQLite database for recipes, purchases, feeds, budget, and OAuth tokens
