import { getConfig } from "./config.js";

const BASE_URL = "https://connect.instacart.com/idp/v1";

/**
 * Create an Instacart shopping list link from an array of items.
 * Each item: { name, quantity?, unit?, upc? }
 * Returns the Instacart shopping page URL.
 */
export async function createShoppingListLink(items, options = {}) {
  const config = getConfig();
  const apiKey = config.instacart?.apiKey;
  if (!apiKey) {
    throw new Error(
      "Instacart API key not configured. Run: grocer config --instacart-key <key>\n" +
        "Get a key at https://www.instacart.com/company/business/developers"
    );
  }

  const lineItems = items.map((item) => {
    const lineItem = { name: item.name };
    if (item.quantity) lineItem.quantity = item.quantity;
    if (item.unit) lineItem.unit = item.unit;
    if (item.upc) lineItem.upcs = [item.upc];
    return lineItem;
  });

  const body = {
    title: options.title || "Grocery List",
    line_items: lineItems,
    link_type: "shopping_list",
  };

  const res = await fetch(`${BASE_URL}/products/products_link`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instacart API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.products_link_url || data.url || data;
}

/**
 * Create an Instacart recipe page link.
 * Returns the Instacart recipe page URL.
 */
export async function createRecipeLink(recipe, options = {}) {
  const config = getConfig();
  const apiKey = config.instacart?.apiKey;
  if (!apiKey) {
    throw new Error(
      "Instacart API key not configured. Run: grocer config --instacart-key <key>"
    );
  }

  const lineItems = recipe.ingredients.map((ing) => {
    if (typeof ing === "string") return { name: ing };
    return { name: ing.name, quantity: ing.quantity, unit: ing.unit };
  });

  const body = {
    title: recipe.title || "Recipe",
    line_items: lineItems,
    link_type: "recipe",
    ...(recipe.imageUrl && { image_url: recipe.imageUrl }),
    ...(recipe.instructions && { instructions: recipe.instructions }),
  };

  const res = await fetch(`${BASE_URL}/products/recipe`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instacart API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.products_link_url || data.url || data;
}
