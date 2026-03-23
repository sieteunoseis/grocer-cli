import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getTokens } from "../../src/lib/db.js";
import { getAccessToken } from "../../src/providers/kroger/auth.js";
import { getConfig } from "../../src/lib/config.js";

const config = getConfig();
const hasCredentials = config.kroger?.clientId && config.kroger?.clientSecret;
const tokens = getTokens();
const hasTokens = Boolean(tokens?.refresh_token);
const skip =
  !hasCredentials || !hasTokens
    ? "Kroger credentials not configured — run grocer-cli login"
    : false;

describe("auth integration", { skip }, () => {
  it("refreshes token and returns valid access token", async () => {
    const token = await getAccessToken();
    assert.ok(token);
    assert.ok(typeof token === "string");
    assert.ok(token.length > 10);
  });

  it("saved refreshed token to db", () => {
    const updated = getTokens();
    assert.ok(updated.expires_at > Date.now());
  });
});
