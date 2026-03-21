import { getAccessToken } from "./auth.js";
import { getConfig } from "./config.js";

const BASE_URL = "https://api.kroger.com/v1";

async function apiRequest(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kroger API error (${res.status}): ${body}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// --- Products ---
export async function searchProducts(term, filters = {}) {
  const params = new URLSearchParams({ "filter.term": term });
  const { locationId } = getConfig();
  if (locationId) params.set("filter.locationId", locationId);
  if (filters.brand) params.set("filter.brand", filters.brand);
  if (filters.limit) params.set("filter.limit", filters.limit);

  const data = await apiRequest(`/products?${params}`);
  return data.data || [];
}

export async function getProduct(productId) {
  const params = new URLSearchParams();
  const { locationId } = getConfig();
  if (locationId) params.set("filter.locationId", locationId);

  const data = await apiRequest(`/products/${productId}?${params}`);
  return data.data || null;
}

// --- Locations ---
export async function searchLocations(zipCode, radiusMiles = 10) {
  const params = new URLSearchParams({
    "filter.zipCode.near": zipCode,
    "filter.radiusInMiles": String(radiusMiles),
  });
  const data = await apiRequest(`/locations?${params}`);
  return data.data || [];
}

// --- Cart ---
export async function addToCart(items) {
  // items: [{ upc, quantity }]
  await apiRequest("/cart/add", {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

// --- Profile ---
export async function getProfile() {
  const data = await apiRequest("/identity/profile");
  return data.data || null;
}
