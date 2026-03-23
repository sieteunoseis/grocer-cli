import { createRequire } from "node:module";

// Suppress ExperimentalWarning for node:sqlite
const originalEmit = process.emit;
process.emit = function (event, ...args) {
  if (event === "warning" && args[0]?.name === "ExperimentalWarning")
    return false;
  return originalEmit.call(this, event, ...args);
};

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
import { join } from "path";
import { getConfigDir } from "./config.js";

let _db = null;

export function getDb() {
  if (_db) return _db;

  const DATA_DIR = getConfigDir();
  const DB_PATH = join(DATA_DIR, "grocer.db");

  _db = new DatabaseSync(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA foreign_keys = ON");

  // --- Schema ---
  _db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipe_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain TEXT NOT NULL,
    store TEXT,
    date TEXT NOT NULL,
    subtotal REAL,
    tax REAL,
    total REAL,
    savings REAL,
    source TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    product_id TEXT,
    upc TEXT,
    quantity REAL DEFAULT 1,
    unit_price REAL,
    total_price REAL,
    savings REAL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    last_fetched TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feed_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    author TEXT,
    published TEXT,
    summary TEXT,
    ingredients TEXT,
    guid TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS budget (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    amount REAL NOT NULL,
    period TEXT NOT NULL DEFAULT 'weekly',
    start_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pantry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_item_id INTEGER,
    product_name TEXT NOT NULL,
    product_id TEXT,
    upc TEXT,
    quantity REAL DEFAULT 1,
    purchase_date TEXT NOT NULL,
    best_by TEXT NOT NULL,
    shelf_life_days INTEGER NOT NULL,
    consumed INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS cart_additions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    product_name TEXT,
    quantity INTEGER DEFAULT 1,
    price REAL,
    available INTEGER DEFAULT 1,
    added_at TEXT DEFAULT (datetime('now'))
  );
`);

  return _db;
}

export function resetDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// --- Token helpers ---
export function saveTokens(accessToken, refreshToken, expiresIn) {
  const expiresAt = Date.now() + expiresIn * 1000;
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO tokens (id, access_token, refresh_token, expires_at)
     VALUES (1, ?, ?, ?)`,
    )
    .run(accessToken, refreshToken, expiresAt);
}

export function getTokens() {
  return getDb().prepare("SELECT * FROM tokens WHERE id = 1").get();
}

export function clearTokens() {
  getDb().prepare("DELETE FROM tokens").run();
}

// --- Recipe helpers ---
export function createRecipe(name, description) {
  const result = getDb()
    .prepare("INSERT INTO recipes (name, description) VALUES (?, ?)")
    .run(name, description || null);
  return result.lastInsertRowid;
}

export function listRecipes() {
  return getDb()
    .prepare("SELECT * FROM recipes ORDER BY created_at DESC")
    .all();
}

export function getRecipe(id) {
  return getDb().prepare("SELECT * FROM recipes WHERE id = ?").get(id);
}

export function deleteRecipe(id) {
  return getDb().prepare("DELETE FROM recipes WHERE id = ?").run(id);
}

export function addRecipeItem(recipeId, productName, productId, quantity) {
  return getDb()
    .prepare(
      `INSERT INTO recipe_items (recipe_id, product_name, product_id, quantity)
     VALUES (?, ?, ?, ?)`,
    )
    .run(recipeId, productName, productId || null, quantity || 1);
}

export function getRecipeItems(recipeId) {
  return getDb()
    .prepare("SELECT * FROM recipe_items WHERE recipe_id = ?")
    .all(recipeId);
}

export function removeRecipeItem(itemId) {
  return getDb().prepare("DELETE FROM recipe_items WHERE id = ?").run(itemId);
}

export function updateRecipeItem(itemId, { productName, productId, quantity }) {
  const updates = [];
  const values = [];
  if (productName !== undefined) {
    updates.push("product_name = ?");
    values.push(productName);
  }
  if (productId !== undefined) {
    updates.push("product_id = ?");
    values.push(productId);
  }
  if (quantity !== undefined) {
    updates.push("quantity = ?");
    values.push(quantity);
  }
  if (!updates.length) return;
  values.push(itemId);
  return getDb()
    .prepare(`UPDATE recipe_items SET ${updates.join(", ")} WHERE id = ?`)
    .run(...values);
}

// --- Purchase helpers ---
export function createPurchase({
  chain,
  store,
  date,
  subtotal,
  tax,
  total,
  savings,
  source,
}) {
  const result = getDb()
    .prepare(
      `INSERT INTO purchases (chain, store, date, subtotal, tax, total, savings, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      chain,
      store || null,
      date,
      subtotal || null,
      tax || null,
      total || null,
      savings || null,
      source || "manual",
    );
  return result.lastInsertRowid;
}

export function addPurchaseItem(
  purchaseId,
  { productName, productId, upc, quantity, unitPrice, totalPrice, savings },
) {
  return getDb()
    .prepare(
      `INSERT INTO purchase_items (purchase_id, product_name, product_id, upc, quantity, unit_price, total_price, savings)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      purchaseId,
      productName,
      productId || null,
      upc || null,
      quantity || 1,
      unitPrice || null,
      totalPrice || null,
      savings || null,
    );
}

export function listPurchases(limit = 20) {
  return getDb()
    .prepare(
      `SELECT p.*, COUNT(pi.id) as item_count
     FROM purchases p
     LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
     GROUP BY p.id
     ORDER BY p.date DESC
     LIMIT ?`,
    )
    .all(limit);
}

export function getPurchase(id) {
  return getDb().prepare("SELECT * FROM purchases WHERE id = ?").get(id);
}

export function getPurchaseItems(purchaseId) {
  return getDb()
    .prepare("SELECT * FROM purchase_items WHERE purchase_id = ?")
    .all(purchaseId);
}

export function deletePurchase(id) {
  return getDb().prepare("DELETE FROM purchases WHERE id = ?").run(id);
}

export function getPurchaseStats() {
  const totals = getDb()
    .prepare(
      `SELECT COUNT(*) as trip_count,
            SUM(total) as total_spent,
            AVG(total) as avg_per_trip,
            SUM(savings) as total_savings
     FROM purchases`,
    )
    .get();

  const topItems = getDb()
    .prepare(
      `SELECT product_name,
            SUM(quantity) as total_qty,
            COUNT(*) as appearances,
            AVG(unit_price) as avg_price
     FROM purchase_items
     GROUP BY LOWER(product_name)
     ORDER BY appearances DESC
     LIMIT 10`,
    )
    .all();

  const monthly = getDb()
    .prepare(
      `SELECT strftime('%Y-%m', date) as month,
            COUNT(*) as trips,
            SUM(total) as spent,
            SUM(savings) as saved
     FROM purchases
     GROUP BY month
     ORDER BY month DESC
     LIMIT 6`,
    )
    .all();

  return { totals, topItems, monthly };
}

// --- Feed helpers ---
export function addFeed(url, title) {
  const result = getDb()
    .prepare("INSERT OR IGNORE INTO feeds (url, title) VALUES (?, ?)")
    .run(url, title || null);
  if (result.changes === 0) {
    return getDb().prepare("SELECT id FROM feeds WHERE url = ?").get(url).id;
  }
  return result.lastInsertRowid;
}

export function listFeeds() {
  return getDb()
    .prepare(
      `SELECT f.*, COUNT(fr.id) as recipe_count
     FROM feeds f
     LEFT JOIN feed_recipes fr ON fr.feed_id = f.id
     GROUP BY f.id
     ORDER BY f.created_at DESC`,
    )
    .all();
}

export function getFeed(id) {
  return getDb().prepare("SELECT * FROM feeds WHERE id = ?").get(id);
}

export function removeFeed(id) {
  return getDb().prepare("DELETE FROM feeds WHERE id = ?").run(id);
}

export function updateFeedMeta(id, { title, lastFetched }) {
  const updates = [];
  const values = [];
  if (title) {
    updates.push("title = ?");
    values.push(title);
  }
  if (lastFetched) {
    updates.push("last_fetched = ?");
    values.push(lastFetched);
  }
  if (!updates.length) return;
  values.push(id);
  getDb()
    .prepare(`UPDATE feeds SET ${updates.join(", ")} WHERE id = ?`)
    .run(...values);
}

export function addFeedRecipe(
  feedId,
  { title, url, author, published, summary, ingredients, guid },
) {
  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO feed_recipes (feed_id, title, url, author, published, summary, ingredients, guid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      feedId,
      title,
      url || null,
      author || null,
      published || null,
      summary || null,
      ingredients || null,
      guid || null,
    );
  return result.changes > 0;
}

export function listFeedRecipes(feedId, limit = 20) {
  if (feedId) {
    return getDb()
      .prepare(
        "SELECT fr.*, f.title as feed_title FROM feed_recipes fr JOIN feeds f ON f.id = fr.feed_id WHERE fr.feed_id = ? ORDER BY fr.published DESC LIMIT ?",
      )
      .all(feedId, limit);
  }
  return getDb()
    .prepare(
      "SELECT fr.*, f.title as feed_title FROM feed_recipes fr JOIN feeds f ON f.id = fr.feed_id ORDER BY fr.published DESC LIMIT ?",
    )
    .all(limit);
}

export function getFeedRecipe(id) {
  return getDb()
    .prepare(
      "SELECT fr.*, f.title as feed_title FROM feed_recipes fr JOIN feeds f ON f.id = fr.feed_id WHERE fr.id = ?",
    )
    .get(id);
}

// --- Budget helpers ---
export function setBudget(amount, period, startDate) {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO budget (id, amount, period, start_date)
     VALUES (1, ?, ?, ?)`,
    )
    .run(amount, period, startDate);
}

export function getBudget() {
  return getDb().prepare("SELECT * FROM budget WHERE id = 1").get();
}

export function getSpendingForPeriod(startDate, endDate) {
  return getDb()
    .prepare(
      `SELECT COALESCE(SUM(total), 0) as spent, COUNT(*) as trips
     FROM purchases
     WHERE date >= ? AND date <= ?`,
    )
    .get(startDate, endDate);
}

// --- Pantry helpers ---
export function addPantryItem({
  purchaseItemId,
  productName,
  productId,
  upc,
  quantity,
  purchaseDate,
  bestBy,
  shelfLifeDays,
  notes,
}) {
  const result = getDb()
    .prepare(
      `INSERT INTO pantry (purchase_item_id, product_name, product_id, upc, quantity, purchase_date, best_by, shelf_life_days, consumed, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(
      purchaseItemId || null,
      productName,
      productId || null,
      upc || null,
      quantity || 1,
      purchaseDate,
      bestBy,
      shelfLifeDays,
      notes || null,
    );
  return result.lastInsertRowid;
}

export function getPantryItems({ includeConsumed = false } = {}) {
  const where = includeConsumed ? "" : "WHERE consumed = 0";
  return getDb()
    .prepare(`SELECT * FROM pantry ${where} ORDER BY best_by ASC`)
    .all();
}

export function getExpiringItems(withinDays = 3) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return getDb()
    .prepare(
      `SELECT * FROM pantry WHERE consumed = 0 AND best_by <= ? ORDER BY best_by ASC`,
    )
    .all(cutoffStr);
}

export function markConsumed(pantryId) {
  return getDb()
    .prepare("UPDATE pantry SET consumed = 1 WHERE id = ?")
    .run(pantryId);
}

export function updateBestBy(pantryId, newBestBy) {
  return getDb()
    .prepare("UPDATE pantry SET best_by = ? WHERE id = ?")
    .run(newBestBy, pantryId);
}

export function removePantryItem(id) {
  return getDb().prepare("DELETE FROM pantry WHERE id = ?").run(id);
}

/**
 * Find unconsumed pantry items matching a product name or product_id.
 * Used for smart cart checks — "do you already have this?"
 */
export function findPantryMatch(productName, productId) {
  // Try product_id match first (most reliable)
  if (productId) {
    const match = getDb()
      .prepare(
        `SELECT * FROM pantry WHERE consumed = 0 AND product_id = ? ORDER BY best_by DESC LIMIT 1`,
      )
      .get(productId);
    if (match) return match;
  }

  // Fall back to fuzzy name match
  if (productName) {
    const name = productName.toLowerCase().trim();
    const match = getDb()
      .prepare(
        `SELECT * FROM pantry WHERE consumed = 0 AND LOWER(product_name) = ? ORDER BY best_by DESC LIMIT 1`,
      )
      .get(name);
    if (match) return match;

    // Partial match: pantry name contains search term or vice versa
    const all = getDb()
      .prepare(`SELECT * FROM pantry WHERE consumed = 0 ORDER BY best_by DESC`)
      .all();
    for (const item of all) {
      const pantryName = item.product_name.toLowerCase();
      if (pantryName.includes(name) || name.includes(pantryName)) {
        return item;
      }
    }
  }

  return null;
}

// --- Cart tracking helpers ---
export function trackCartAddition(productId, productName, quantity, price) {
  getDb()
    .prepare(
      `INSERT INTO cart_additions (product_id, product_name, quantity, price, available)
     VALUES (?, ?, ?, ?, 1)`,
    )
    .run(productId, productName || null, quantity || 1, price || null);
}

export function getRecentCartAdditions(withinHours = 24) {
  return getDb()
    .prepare(
      `SELECT * FROM cart_additions
       WHERE added_at >= datetime('now', '-' || ? || ' hours')
       ORDER BY added_at DESC`,
    )
    .all(withinHours);
}

export function isInCart(productId, withinHours = 24) {
  return (
    getDb()
      .prepare(
        `SELECT 1 FROM cart_additions
       WHERE product_id = ? AND added_at >= datetime('now', '-' || ? || ' hours')
       LIMIT 1`,
      )
      .get(productId, withinHours) != null
  );
}

export function clearCartTracking() {
  getDb().prepare("DELETE FROM cart_additions").run();
}

/**
 * Import a cart snapshot — replaces current tracking with verified data
 * from the store website (e.g. via Chrome extension scrape).
 */
export function importCartSnapshot(items) {
  getDb().prepare("DELETE FROM cart_additions").run();
  const stmt = getDb().prepare(
    `INSERT INTO cart_additions (product_id, product_name, quantity, price, available)
     VALUES (?, ?, ?, ?, ?)`,
  );
  for (const item of items) {
    stmt.run(
      item.productId,
      item.productName || null,
      item.quantity || 1,
      item.price || null,
      item.available ? 1 : 0,
    );
  }
}

export function getCartTotal() {
  const result = getDb()
    .prepare(
      `SELECT COALESCE(SUM(price), 0) as total, COUNT(*) as items
       FROM cart_additions WHERE available = 1`,
    )
    .get();
  return result;
}

export function getUnavailableCartItems() {
  return getDb()
    .prepare("SELECT * FROM cart_additions WHERE available = 0")
    .all();
}
