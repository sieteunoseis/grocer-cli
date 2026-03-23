# Grocer CLI — API Setup Instructions

Step-by-step guide to setting up API credentials for grocer-cli.

---

## 1. Kroger API (Required)

The Kroger API powers product search, cart management, store locations, and user profile. It covers all Kroger family banners: **Kroger, Ralphs, Fred Meyer, Harris Teeter, Fry's, QFC, King Soopers**, and more.

### Create a Kroger Developer Account

1. Go to [developer.kroger.com](https://developer.kroger.com)
2. Click **Sign Up** and create an account
3. Verify your email address

### Register an Application

1. Log in to the [Kroger Developer Portal](https://developer.kroger.com)
2. Navigate to **My Apps** → **Create an App**
3. Fill in the application details:
   - **App Name:** grocer-cli (or whatever you like)
   - **Description:** CLI grocery tool
   - **OAuth Redirect URI:** `http://localhost:8080/callback`
     - The CLI uses a random port, but Kroger requires at least one redirect URI during registration. The actual port is determined at runtime.
   - **Scopes:** Select all of the following:
     - `product.compact` — Search and view products
     - `cart.basic:write` — Add items to cart
     - `profile.compact` — View user profile
4. Click **Create**
5. Copy your **Client ID** and **Client Secret**

### Configure the CLI

Run the interactive setup:

```bash
grocer-cli init
```

When prompted:

- **Chain:** Select `kroger` (or your specific Kroger banner)
- **Client ID:** Paste the Client ID from step above
- **Client Secret:** Paste the Client Secret

Alternatively, set credentials via environment variables:

```bash
export KROGER_CLIENT_ID=your_client_id_here
export KROGER_CLIENT_SECRET=your_client_secret_here
```

Or copy `.env.example` to `.env` and fill in the values.

### Authenticate

```bash
grocer-cli login
```

This opens your browser for Kroger's OAuth2 flow. Log in with your **Kroger store account** (the same account you use on kroger.com or the Kroger app). After authorizing, you'll be redirected back to the CLI.

### Verify

```bash
grocer-cli status
```

You should see your authentication status and token expiration.

### Set Your Store

```bash
grocer-cli locations 98101          # Search by zip code
grocer-cli locations 98101 --set    # Auto-set the closest store
```

Setting a preferred store enables local pricing and availability in search results.

### API Limits

- **Rate limit:** 10 requests per second, 10,000 per day (free tier)
- **Token lifetime:** Access tokens expire after 30 minutes; the CLI auto-refreshes using the refresh token
- **Scopes:** The CLI requests `product.compact`, `cart.basic:write`, and `profile.compact`

---

## 2. Instacart Developer Platform (Optional — for Delivery)

The Instacart integration lets you export recipes and shopping lists as Instacart links for delivery. This is useful for stores like Fred Meyer that only support pickup through their own cart.

### Get Access

1. Go to [instacart.com/company/business/developers](https://www.instacart.com/company/business/developers)
2. Click **Get Started** or **Request Access**
3. Fill out the application:
   - **Company/App Name:** grocer-cli
   - **Use Case:** Export grocery lists and recipe ingredients for delivery
   - **Platform:** CLI tool / web application
4. Instacart will review and issue an **API key**

> **Note:** The Instacart Developer Platform requires a registered business or US/Canada resident. Approval may take a few days.

### Configure the CLI

Once you have your API key:

```bash
grocer-cli config --instacart-key YOUR_API_KEY_HERE
```

### Verify

```bash
grocer-cli config
```

You should see your Instacart key listed (masked).

### Usage

```bash
# Export a local recipe
grocer-cli export recipe 1

# Export a feed recipe
grocer-cli export feed-recipe 42

# Export a quick shopping list
grocer-cli export list "milk" "eggs" "bread" "chicken"
```

Each command generates an Instacart link. When opened, the user picks their store (Fred Meyer, Kroger, etc.), reviews matched products, and checks out for delivery.

### API Details

- **Base URL:** `https://connect.instacart.com/idp/v1`
- **Auth:** Bearer token in `Authorization` header
- **Endpoints used:**
  - `POST /products/products_link` — Create a shopping list page
  - `POST /products/recipe` — Create a recipe page
- **Docs:** [docs.instacart.com/developer_platform_api](https://docs.instacart.com/developer_platform_api/)

---

## 3. Gmail Integration (Optional — for Receipt Import)

To auto-import receipt emails, you can pair grocer-cli with a Gmail MCP skill or OAuth integration.

### Option A: Gmail MCP Skill

If you're using Claude Code or an agent that supports skills:

```bash
npx skills add idanbeck/claude-skills
```

This provides Gmail access for fetching receipt emails from Kroger, Ralphs, Fred Meyer, etc.

### Option B: Manual Import

Export receipt emails as `.eml` or `.html` files and import them:

```bash
grocer-cli purchases import receipt.eml
```

The CLI parses Kroger family receipt emails and extracts items, prices, quantities, and savings.

### Supported Receipt Senders

The receipt parser recognizes emails from:

- `kroger.com`
- `ralphs.com`
- `fredmeyer.com`
- `harristeeter.com`
- `frysfood.com`
- `qfc.com`
- `kingsoopers.com`

---

## Configuration File

All credentials are stored locally in `~/.grocer-cli/config.json`:

```json
{
  "chain": "kroger",
  "kroger": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "locationId": "70100153"
  },
  "instacart": {
    "apiKey": "your-instacart-key"
  }
}
```

OAuth tokens are stored in the SQLite database at `~/.grocer-cli/grocer.db` (encrypted at rest via SQLite WAL mode). Tokens auto-refresh — you should rarely need to re-login.

### Environment Variables

As an alternative to `grocer-cli init`, you can set credentials via environment variables:

| Variable               | Description              |
| ---------------------- | ------------------------ |
| `KROGER_CLIENT_ID`     | Kroger API Client ID     |
| `KROGER_CLIENT_SECRET` | Kroger API Client Secret |

---

## Troubleshooting

### "Kroger API credentials not configured"

Run `grocer-cli init` to set up your Client ID and Secret.

### "Not logged in"

Run `grocer-cli login` to authenticate via OAuth2.

### "Session expired"

Your refresh token has expired. Run `grocer-cli login` again.

### "Instacart API key not configured"

Run `grocer-cli config --instacart-key <key>` with your Instacart Developer Platform key.

### "Instacart API error (401)"

Your Instacart API key may be invalid or expired. Request a new one from the developer portal.

### OAuth callback not working

- Make sure no other app is blocking the localhost port
- Try `grocer-cli login` again — it picks a random available port
- Check that your Kroger app has a redirect URI registered (any `http://localhost:*/callback` pattern)

### Rate limited

The free Kroger API tier allows 10 req/sec and 10,000/day. If you hit limits, wait a few seconds and retry. The CLI does not currently auto-retry on 429 responses.
