import express from "express";
import open from "open";
import { saveTokens, getTokens, clearTokens } from "../../lib/db.js";
import { getConfig } from "../../lib/config.js";

const KROGER_AUTH_URL = "https://api.kroger.com/v1/connect/oauth2/authorize";
const KROGER_TOKEN_URL = "https://api.kroger.com/v1/connect/oauth2/token";
const SCOPES = "product.compact cart.basic:write profile.compact";

/**
 * Start a local server, open the browser for Kroger OAuth, and wait for the callback.
 */
export async function login() {
  const config = getConfig();
  const { clientId, clientSecret } = config.kroger || {};
  if (!clientId || !clientSecret) {
    throw new Error(
      "Kroger API credentials not configured. Run: grocer init"
    );
  }

  return new Promise((resolve, reject) => {
    const app = express();

    const server = app.listen(0, () => {
      const port = server.address().port;
      const redirectUri = `http://localhost:${port}/callback`;
      const authUrl = `${KROGER_AUTH_URL}?scope=${encodeURIComponent(SCOPES)}&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
      console.log(`OAuth callback server listening on port ${port}`);
      console.log("Opening browser for Kroger login...");
      console.log(`If the browser does not open, visit:\n${authUrl}\n`);
      open(authUrl).catch(() => {});
    });

    app.get("/callback", async (req, res) => {
      const { code } = req.query;
      if (!code) {
        res.send("Error: no authorization code received.");
        server.close();
        return reject(new Error("No authorization code received"));
      }

      try {
        const port = server.address().port;
        const redirectUri = `http://localhost:${port}/callback`;
        const tokens = await exchangeCode(code, clientId, clientSecret, redirectUri);
        saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
        res.send(
          "<h2>Success!</h2><p>You can close this tab and return to the terminal.</p>"
        );
        server.close();
        resolve(tokens);
      } catch (err) {
        res.send(`<h2>Error</h2><p>${err.message}</p>`);
        server.close();
        reject(err);
      }
    });
  });
}

async function exchangeCode(code, clientId, clientSecret, redirectUri) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(KROGER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Return a valid access token, refreshing if expired.
 */
export async function getAccessToken() {
  const tokens = getTokens();
  if (!tokens) {
    throw new Error("Not logged in. Run: grocer login");
  }

  if (Date.now() < tokens.expires_at - 60_000) {
    return tokens.access_token;
  }

  // Token expired — refresh
  const config = getConfig();
  const { clientId, clientSecret } = config.kroger || {};
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(KROGER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error("Session expired. Run: grocer login");
  }

  const data = await res.json();
  saveTokens(data.access_token, data.refresh_token, data.expires_in);
  return data.access_token;
}

export function logout() {
  clearTokens();
}
