# grocer-cli

A chain-agnostic command-line tool for interacting with grocery store APIs — search products, manage recipes locally with SQLite, and add items to your cart.

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
- Choosing your grocery chain
- Entering your API credentials
- Getting started

2. Log in via OAuth:

```bash
grocer login
```

3. Find and set your preferred store:

```bash
grocer locations 45202 --set
```

## Usage

### Products

```bash
grocer search "organic milk"
grocer search "chicken breast" --brand "Simple Truth" --limit 5
grocer product <productId>
```

### Recipes

```bash
grocer recipe create "Taco Tuesday" --description "Weekly taco night"
grocer recipe list
grocer recipe show 1
grocer recipe add-item 1 "Ground Beef" --product-id 0001234567890 --quantity 2
grocer recipe remove-item 3
grocer recipe delete 1
```

### Cart

```bash
grocer cart add <upc> --quantity 2
grocer cart add-recipe 1
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
- `grocer.db` — SQLite database for recipes and OAuth tokens
