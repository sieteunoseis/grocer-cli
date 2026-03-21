# Kroger CLI

A command-line tool for interacting with the [Kroger API](https://developer.kroger.com/) — search products, manage recipes locally with SQLite, and add items to your Kroger cart.

## Install

```bash
npm install -g .
```

Or via [skills.sh](https://skills.sh):

```bash
skills install kroger-cli
```

## Setup

1. Register an app at [Kroger Developer Portal](https://developer.kroger.com/) to get your client ID and secret.

2. Configure credentials:

```bash
kroger config --client-id YOUR_ID --client-secret YOUR_SECRET
```

3. Log in via OAuth:

```bash
kroger login
```

4. Find and set your preferred store:

```bash
kroger locations 45202 --set
```

## Usage

### Products

```bash
kroger search "organic milk"
kroger search "chicken breast" --brand "Simple Truth" --limit 5
kroger product <productId>
```

### Recipes

```bash
kroger recipe create "Taco Tuesday" --description "Weekly taco night"
kroger recipe list
kroger recipe show 1
kroger recipe add-item 1 "Ground Beef" --product-id 0001234567890 --quantity 2
kroger recipe remove-item 3
kroger recipe delete 1
```

### Cart

```bash
kroger cart add <upc> --quantity 2
kroger cart add-recipe 1
```

### Auth & Config

```bash
kroger login          # OAuth2 browser flow
kroger logout         # Clear stored tokens
kroger status         # Check auth status
kroger config --show  # View configuration
```

## Skills

Standalone scripts in the `skills/` folder for quick workflows. See [SKILLS.md](SKILLS.md) for details.

## Data Storage

All data is stored locally in `~/.kroger-cli/`:
- `config.json` — API credentials and preferences
- `kroger.db` — SQLite database for recipes and OAuth tokens
