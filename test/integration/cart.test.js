import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getConfig } from "../../src/lib/config.js";
import { getTokens } from "../../src/lib/db.js";
import { addToCart, searchProducts } from "../../src/providers/kroger/api.js";

const config = getConfig();
const hasCredentials = config.kroger?.clientId && config.kroger?.clientSecret;
const tokens = getTokens();
const hasTokens = Boolean(tokens?.refresh_token);
const skip =
  !hasCredentials || !hasTokens ? "Kroger credentials not configured" : false;

describe("cart integration", { skip }, () => {
  // WARNING: This test adds a real item to the user's cart
  it("adds an item to cart", async () => {
    const results = await searchProducts("banana", { limit: 1 });
    assert.ok(results.length > 0, "Need at least one search result");

    const upc = results[0].upc || results[0].productId;
    await assert.doesNotReject(async () => {
      await addToCart([{ upc, quantity: 1 }]);
    });
  });
});
