# grocer-cli

A chain-agnostic command-line tool for interacting with grocery store APIs — search products, manage recipes, track purchases, subscribe to recipe feeds, and budget your grocery spending.

**Supported chains:** Kroger (and Kroger family: Ralphs, Fred Meyer, Harris Teeter, etc.)

## Install

```bash
npm install -g .
```

Or install agent skills via [skills.sh](https://skills.sh):

```bash
npx skills add sieteunoseis/kroger-cli
```

## Setup

1. Run the interactive setup:

```bash
grocer init
```

This walks you through:
- Choosing your grocery chain (e.g. Kroger, Fred Meyer, Ralphs)
- Entering your API credentials
- Getting started

2. Log in via OAuth:

```bash
grocer login
```

3. Find and set your preferred store:

```bash
grocer locations 98101 --set
```

## Usage

### Products

```bash
grocer search "organic milk"
grocer search "chicken breast" --brand "Simple Truth" --limit 5
grocer product <productId>
```

### Recipes

Create and manage local recipes, then add all ingredients to your cart in one step.

```bash
grocer recipe create "Taco Tuesday" --description "Weekly taco night"
grocer recipe list
grocer recipe show 1
grocer recipe add-item 1 "Ground Beef" --product-id 0001234567890 --quantity 2
grocer recipe remove-item 3
grocer recipe delete 1
```

### Recipe Feeds

Subscribe to RSS feeds from your favorite food blogs. The CLI extracts ingredients automatically so you can search and shop for them.

```bash
# Subscribe to a recipe blog
grocer feeds add https://www.budgetbytes.com/feed/

# List your subscriptions
grocer feeds list

# Fetch new recipes from all feeds
grocer feeds fetch

# Browse recipes and view ingredients
grocer feeds recipes
grocer feeds recipes --feed 1 --limit 10
grocer feeds show 42

# Unsubscribe
grocer feeds remove 1
```

Example workflow — discover a recipe and shop for it:

```bash
grocer feeds fetch                          # Grab latest recipes
grocer feeds show 42                        # View ingredients
grocer search "chicken breast"              # Find it at your store
grocer cart add 0001234567890 --quantity 2   # Add to cart
```

### Cart

```bash
grocer cart add <upc> --quantity 2
grocer cart add-recipe 1
```

### Purchases

Track what you've bought by importing receipt emails or logging manually.

```bash
# Import from a receipt email
grocer purchases import receipt.eml

# Log a purchase manually
grocer purchases add "Almond Milk" --price 3.99 --quantity 2

# View history
grocer purchases list
grocer purchases show 1

# Spending stats — top items, monthly trends, total savings
grocer purchases stats

# Clean up
grocer purchases delete 1
```

Pair with a Gmail skill like [idanbeck/claude-skills](https://github.com/idanbeck/claude-skills) to auto-fetch receipt emails from your inbox.

### Budget

Set a weekly or biweekly grocery budget and track spending against it. The budget tracks automatically from your imported/logged purchases.

```bash
# Set a $150/week budget
grocer budget set 150 --period weekly

# Or biweekly
grocer budget set 300 --period biweekly

# Check how you're doing this period
grocer budget status

# View past periods
grocer budget history
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
```

### Auth & Config

```bash
grocer login          # OAuth2 browser flow
grocer logout         # Clear stored tokens
grocer status         # Check auth status
grocer config         # View configuration
```

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

Standalone scripts in the `skills/` folder for quick workflows. See [SKILLS.md](SKILLS.md) for details.

## Data Storage

All data is stored locally in `~/.grocer-cli/`:
- `config.json` — Chain selection, API credentials, and preferences
- `grocer.db` — SQLite database for recipes, purchases, feeds, budget, and OAuth tokens
