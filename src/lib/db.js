import Database from "better-sqlite3";
import { join } from "path";
import { getConfigDir } from "./config.js";

const DATA_DIR = getConfigDir();
const DB_PATH = join(DATA_DIR, "grocer.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// --- Schema ---
db.exec(`
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
`);

// --- Token helpers ---
export function saveTokens(accessToken, refreshToken, expiresIn) {
  const expiresAt = Date.now() + expiresIn * 1000;
  db.prepare(
    `INSERT OR REPLACE INTO tokens (id, access_token, refresh_token, expires_at)
     VALUES (1, ?, ?, ?)`
  ).run(accessToken, refreshToken, expiresAt);
}

export function getTokens() {
  return db.prepare("SELECT * FROM tokens WHERE id = 1").get();
}

export function clearTokens() {
  db.prepare("DELETE FROM tokens").run();
}

// --- Recipe helpers ---
export function createRecipe(name, description) {
  const result = db.prepare(
    "INSERT INTO recipes (name, description) VALUES (?, ?)"
  ).run(name, description || null);
  return result.lastInsertRowid;
}

export function listRecipes() {
  return db.prepare("SELECT * FROM recipes ORDER BY created_at DESC").all();
}

export function getRecipe(id) {
  return db.prepare("SELECT * FROM recipes WHERE id = ?").get(id);
}

export function deleteRecipe(id) {
  return db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
}

export function addRecipeItem(recipeId, productName, productId, quantity) {
  return db.prepare(
    `INSERT INTO recipe_items (recipe_id, product_name, product_id, quantity)
     VALUES (?, ?, ?, ?)`
  ).run(recipeId, productName, productId || null, quantity || 1);
}

export function getRecipeItems(recipeId) {
  return db
    .prepare("SELECT * FROM recipe_items WHERE recipe_id = ?")
    .all(recipeId);
}

export function removeRecipeItem(itemId) {
  return db.prepare("DELETE FROM recipe_items WHERE id = ?").run(itemId);
}

// --- Purchase helpers ---
export function createPurchase({ chain, store, date, subtotal, tax, total, savings, source }) {
  const result = db.prepare(
    `INSERT INTO purchases (chain, store, date, subtotal, tax, total, savings, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(chain, store || null, date, subtotal || null, tax || null, total || null, savings || null, source || "manual");
  return result.lastInsertRowid;
}

export function addPurchaseItem(purchaseId, { productName, productId, upc, quantity, unitPrice, totalPrice, savings }) {
  return db.prepare(
    `INSERT INTO purchase_items (purchase_id, product_name, product_id, upc, quantity, unit_price, total_price, savings)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(purchaseId, productName, productId || null, upc || null, quantity || 1, unitPrice || null, totalPrice || null, savings || null);
}

export function listPurchases(limit = 20) {
  return db.prepare(
    `SELECT p.*, COUNT(pi.id) as item_count
     FROM purchases p
     LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
     GROUP BY p.id
     ORDER BY p.date DESC
     LIMIT ?`
  ).all(limit);
}

export function getPurchase(id) {
  return db.prepare("SELECT * FROM purchases WHERE id = ?").get(id);
}

export function getPurchaseItems(purchaseId) {
  return db.prepare("SELECT * FROM purchase_items WHERE purchase_id = ?").all(purchaseId);
}

export function deletePurchase(id) {
  return db.prepare("DELETE FROM purchases WHERE id = ?").run(id);
}

export function getPurchaseStats() {
  const totals = db.prepare(
    `SELECT COUNT(*) as trip_count,
            SUM(total) as total_spent,
            AVG(total) as avg_per_trip,
            SUM(savings) as total_savings
     FROM purchases`
  ).get();

  const topItems = db.prepare(
    `SELECT product_name,
            SUM(quantity) as total_qty,
            COUNT(*) as appearances,
            AVG(unit_price) as avg_price
     FROM purchase_items
     GROUP BY LOWER(product_name)
     ORDER BY appearances DESC
     LIMIT 10`
  ).all();

  const monthly = db.prepare(
    `SELECT strftime('%Y-%m', date) as month,
            COUNT(*) as trips,
            SUM(total) as spent,
            SUM(savings) as saved
     FROM purchases
     GROUP BY month
     ORDER BY month DESC
     LIMIT 6`
  ).all();

  return { totals, topItems, monthly };
}

export default db;
