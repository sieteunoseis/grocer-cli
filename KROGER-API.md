# Kroger API Reference

Reference for the [Kroger Public API](https://developer.kroger.com) used by grocer-cli.

## Authentication

Kroger uses OAuth2 with two flows:

- **Authorization Code** — for user-scoped actions (cart, profile). Requires browser login.
- **Client Credentials** — for public data (products, locations). No user login needed.

Access tokens expire after ~30 minutes. Refresh tokens are long-lived (weeks).

## Available Endpoints

### Products API

| Method | Endpoint                    | Description                |
| ------ | --------------------------- | -------------------------- |
| GET    | `/v1/products?filter.term=` | Search products by keyword |
| GET    | `/v1/products/{productId}`  | Get product details by ID  |

**Scope:** `product.compact`
**Rate limit:** 10,000 calls/day

**Filters:**

- `filter.term` — search keyword (required)
- `filter.locationId` — limit to products at a specific store
- `filter.brand` — filter by brand name
- `filter.limit` — max results (default 10)

### Locations API

| Method | Endpoint                             | Description                 |
| ------ | ------------------------------------ | --------------------------- |
| GET    | `/v1/locations?filter.zipCode.near=` | Find stores near a zip code |
| GET    | `/v1/locations/{locationId}`         | Get store details           |

**Scope:** `product.compact`
**Rate limit:** 1,600 calls/day

**Filters:**

- `filter.zipCode.near` — zip code to search near
- `filter.radiusInMiles` — search radius (default 10)
- `filter.chain` — filter by banner (e.g., "FRED MEYER")

### Cart API

| Method | Endpoint       | Description                  |
| ------ | -------------- | ---------------------------- |
| PUT    | `/v1/cart/add` | Add items to the user's cart |

**Scope:** `cart.basic:write`
**Rate limit:** 5,000 calls/day

**Request body:**

```json
{
  "items": [{ "upc": "0001111041700", "quantity": 1 }]
}
```

**Limitations:**

- **Write-only** — there is no endpoint to read/list cart contents
- Cannot check what's already in the cart
- Cannot remove items from the cart
- Cannot get cart total or item count
- Users must review their cart on the store website before checkout

### Identity API

| Method | Endpoint               | Description                      |
| ------ | ---------------------- | -------------------------------- |
| GET    | `/v1/identity/profile` | Get authenticated user's profile |

**Scope:** `profile.compact`
**Rate limit:** 5,000 calls/day

## What the API Cannot Do

These features are **not available** through the public API:

- Read cart contents or totals
- Remove items from cart
- Check real-time inventory or stock status (out-of-stock items are only visible on the website after adding to cart)
- Place orders or checkout
- Manage delivery/pickup scheduling
- Set substitution preferences (allow/disallow substitutions, choose backup items)
- Add special instructions for shoppers (e.g. "green bananas", "thinly sliced")
- Access order history or purchase totals
- Apply coupons or loyalty discounts
- Manage payment methods or addresses

**Important:** After adding items via the CLI, users must visit the store website to:

1. Review their cart for unavailable/out-of-stock items
2. Set substitution preferences and backup items
3. Add special instructions for the shopper
4. Choose delivery/pickup and complete checkout

## How grocer-cli Works Around Limitations

**Cart tracking:** Since the cart API is write-only, grocer-cli tracks all items added to cart locally in a `cart_additions` table. This enables:

- Deduplication across separate `cart add` and `cart add-recipe` commands
- `grocer cart list` to see what's been added recently
- Budget estimates based on items added (prices from product search)

**Budget accuracy warning:** Budget tracking is based on local data (cart additions and manual purchase logging). Since the API cannot access actual purchase totals, order history, or applied coupons/discounts, budget data is an **estimate**. Users should verify actual spending through their store account or receipts for accurate tracking.

## Scopes Used by grocer-cli

```
product.compact cart.basic:write profile.compact
```

## Rate Limits Summary

| API       | Daily Limit |
| --------- | ----------- |
| Products  | 10,000      |
| Locations | 1,600       |
| Cart      | 5,000       |
| Identity  | 5,000       |

## Kroger Family Banners

All banners share the same API — the `locationId` determines which store:

Kroger, Fred Meyer, Ralphs, Harris Teeter, Fry's Food, QFC, King Soopers, Smith's, Dillons, Baker's, City Market, Food 4 Less, Foods Co, Gerbes, Jay C, Mariano's, Metro Market, Pay Less, Pick 'n Save, Ruler Foods

## Resources

- [Kroger Developer Portal](https://developer.kroger.com)
- [API Reference](https://developer.kroger.com/reference/)
- [Python Client Library](https://github.com/CupOfOwls/kroger-api)
