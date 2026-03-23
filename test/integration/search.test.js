import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getConfig } from "../../src/lib/config.js";
import { getTokens } from "../../src/lib/db.js";
import { searchProducts } from "../../src/providers/kroger/api.js";

const config = getConfig();
const hasCredentials = config.kroger?.clientId && config.kroger?.clientSecret;
const tokens = getTokens();
const hasTokens = Boolean(tokens?.refresh_token);
const skip =
  !hasCredentials || !hasTokens ? "Kroger credentials not configured" : false;

describe("search integration", { skip }, () => {
  it("returns results for a common search term", async () => {
    const results = await searchProducts("milk", { limit: 5 });
    assert.ok(Array.isArray(results));
    assert.ok(results.length > 0);
    assert.ok(results[0].productId);
  });

  it("respects limit parameter", async () => {
    const results = await searchProducts("bread", { limit: 3 });
    assert.ok(results.length <= 3);
  });

  it("filters by brand", async () => {
    const results = await searchProducts("milk", {
      brand: "Simple Truth",
      limit: 5,
    });
    assert.ok(Array.isArray(results));
  });
});
