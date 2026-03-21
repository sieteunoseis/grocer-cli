import Database from "better-sqlite3";
import { join } from "path";
import { homedir } from "os";
import { mkdirSync } from "fs";

const DATA_DIR = join(homedir(), ".kroger-cli");
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = join(DATA_DIR, "kroger.db");

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

export default db;
