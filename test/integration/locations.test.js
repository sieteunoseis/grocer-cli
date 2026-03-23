import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getConfig } from "../../src/lib/config.js";
import { getTokens } from "../../src/lib/db.js";
import { searchLocations } from "../../src/providers/kroger/api.js";

const config = getConfig();
const hasCredentials = config.kroger?.clientId && config.kroger?.clientSecret;
const tokens = getTokens();
const hasTokens = Boolean(tokens?.refresh_token);
const skip =
  !hasCredentials || !hasTokens ? "Kroger credentials not configured" : false;

describe("locations integration", { skip }, () => {
  it("returns stores for a valid zip code", async () => {
    const results = await searchLocations("98101");
    assert.ok(Array.isArray(results));
    assert.ok(results.length > 0);
  });

  it("results include store details", async () => {
    const results = await searchLocations("98101");
    const store = results[0];
    assert.ok(store.locationId);
  });
});
