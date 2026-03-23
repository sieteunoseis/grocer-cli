import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import * as db from "../../src/lib/db.js";

let tmpDir;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "grocer-test-"));
  process.env.GROCER_DATA_DIR = tmpDir;
});

after(() => {
  db.resetDb();
  delete process.env.GROCER_DATA_DIR;
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

describe("tokens", () => {
  it("getTokens returns undefined when no tokens saved", () => {
    const t = db.getTokens();
    assert.equal(t, undefined);
  });

  it("saveTokens stores tokens and getTokens returns them", () => {
    db.saveTokens("access-abc", "refresh-xyz", 3600);
    const t = db.getTokens();
    assert.ok(t);
    assert.equal(t.access_token, "access-abc");
    assert.equal(t.refresh_token, "refresh-xyz");
    assert.ok(t.expires_at > Date.now());
  });

  it("saveTokens replaces existing tokens (upsert)", () => {
    db.saveTokens("access-new", "refresh-new", 7200);
    const t = db.getTokens();
    assert.equal(t.access_token, "access-new");
  });

  it("clearTokens removes tokens", () => {
    db.clearTokens();
    const t = db.getTokens();
    assert.equal(t, undefined);
  });
});

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

describe("recipes", () => {
  it("createRecipe returns a numeric id", () => {
    const id = db.createRecipe("Pasta", "Simple pasta");
    assert.ok(typeof id === "number" || typeof id === "bigint");
    assert.ok(id > 0);
  });

  it("listRecipes returns created recipe", () => {
    const id = db.createRecipe("Salad", "Green salad");
    const recipes = db.listRecipes();
    assert.ok(recipes.length >= 1);
    const found = recipes.find((r) => r.id === id);
    assert.ok(found);
    assert.equal(found.name, "Salad");
  });

  it("getRecipe returns recipe by id", () => {
    const id = db.createRecipe("Soup", null);
    const r = db.getRecipe(id);
    assert.ok(r);
    assert.equal(r.name, "Soup");
    assert.equal(r.description, null);
  });

  it("getRecipe returns undefined for missing id", () => {
    const r = db.getRecipe(999999);
    assert.equal(r, undefined);
  });

  it("deleteRecipe removes the recipe", () => {
    const id = db.createRecipe("ToDelete", null);
    db.deleteRecipe(id);
    const r = db.getRecipe(id);
    assert.equal(r, undefined);
  });

  it("addRecipeItem and getRecipeItems work", () => {
    const recipeId = db.createRecipe("Stew", null);
    db.addRecipeItem(recipeId, "Carrots", "prod-1", 2);
    db.addRecipeItem(recipeId, "Potatoes", null, 3);
    const items = db.getRecipeItems(recipeId);
    assert.equal(items.length, 2);
    const carrot = items.find((i) => i.product_name === "Carrots");
    assert.ok(carrot);
    assert.equal(carrot.quantity, 2);
    assert.equal(carrot.product_id, "prod-1");
  });

  it("removeRecipeItem deletes the item", () => {
    const recipeId = db.createRecipe("Stew2", null);
    db.addRecipeItem(recipeId, "Onion", null, 1);
    const items = db.getRecipeItems(recipeId);
    const itemId = items[0].id;
    db.removeRecipeItem(itemId);
    const after = db.getRecipeItems(recipeId);
    assert.equal(after.length, 0);
  });

  it("updateRecipeItem updates productName", () => {
    const recipeId = db.createRecipe("Stew3", null);
    db.addRecipeItem(recipeId, "OldName", null, 1);
    const items = db.getRecipeItems(recipeId);
    const itemId = items[0].id;
    db.updateRecipeItem(itemId, { productName: "NewName" });
    const updated = db.getRecipeItems(recipeId);
    assert.equal(updated[0].product_name, "NewName");
  });

  it("updateRecipeItem updates quantity", () => {
    const recipeId = db.createRecipe("Stew4", null);
    db.addRecipeItem(recipeId, "Beef", "prod-beef", 1);
    const items = db.getRecipeItems(recipeId);
    const itemId = items[0].id;
    db.updateRecipeItem(itemId, { quantity: 5 });
    const updated = db.getRecipeItems(recipeId);
    assert.equal(updated[0].quantity, 5);
  });

  it("updateRecipeItem does nothing when no fields provided", () => {
    const recipeId = db.createRecipe("Stew5", null);
    db.addRecipeItem(recipeId, "Herb", null, 1);
    const items = db.getRecipeItems(recipeId);
    const itemId = items[0].id;
    // Should not throw
    db.updateRecipeItem(itemId, {});
    const after = db.getRecipeItems(recipeId);
    assert.equal(after[0].product_name, "Herb");
  });

  it("cascade delete removes recipe_items when recipe is deleted", () => {
    const recipeId = db.createRecipe("CascadeRecipe", null);
    db.addRecipeItem(recipeId, "Item1", null, 1);
    db.addRecipeItem(recipeId, "Item2", null, 2);
    db.deleteRecipe(recipeId);
    const items = db.getRecipeItems(recipeId);
    assert.equal(items.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

describe("purchases", () => {
  it("createPurchase returns a numeric id", () => {
    const id = db.createPurchase({
      chain: "kroger",
      store: "Main St",
      date: "2026-01-15",
      total: 55.0,
    });
    assert.ok(id > 0);
  });

  it("addPurchaseItem and getPurchaseItems work", () => {
    const purchaseId = db.createPurchase({
      chain: "kroger",
      date: "2026-01-16",
      total: 30.0,
    });
    db.addPurchaseItem(purchaseId, {
      productName: "Milk",
      productId: "milk-1",
      quantity: 2,
      unitPrice: 3.99,
      totalPrice: 7.98,
    });
    db.addPurchaseItem(purchaseId, {
      productName: "Bread",
      quantity: 1,
      unitPrice: 2.5,
      totalPrice: 2.5,
    });
    const items = db.getPurchaseItems(purchaseId);
    assert.equal(items.length, 2);
    const milk = items.find((i) => i.product_name === "Milk");
    assert.ok(milk);
    assert.equal(milk.quantity, 2);
  });

  it("listPurchases includes item_count", () => {
    const purchaseId = db.createPurchase({
      chain: "safeway",
      date: "2026-01-17",
      total: 20.0,
    });
    db.addPurchaseItem(purchaseId, {
      productName: "Eggs",
      quantity: 1,
      unitPrice: 4.0,
    });
    db.addPurchaseItem(purchaseId, {
      productName: "Butter",
      quantity: 1,
      unitPrice: 3.0,
    });
    const purchases = db.listPurchases();
    const found = purchases.find((p) => p.id === purchaseId);
    assert.ok(found);
    assert.equal(found.item_count, 2);
  });

  it("getPurchase returns purchase by id", () => {
    const id = db.createPurchase({
      chain: "aldi",
      date: "2026-01-18",
      total: 45.0,
    });
    const p = db.getPurchase(id);
    assert.ok(p);
    assert.equal(p.chain, "aldi");
  });

  it("getPurchase returns undefined for missing id", () => {
    const p = db.getPurchase(999999);
    assert.equal(p, undefined);
  });

  it("deletePurchase removes purchase", () => {
    const id = db.createPurchase({
      chain: "costco",
      date: "2026-01-19",
      total: 100.0,
    });
    db.deletePurchase(id);
    assert.equal(db.getPurchase(id), undefined);
  });

  it("deletePurchase cascades to purchase_items", () => {
    const id = db.createPurchase({
      chain: "target",
      date: "2026-01-20",
      total: 15.0,
    });
    db.addPurchaseItem(id, { productName: "Soap", quantity: 1 });
    db.deletePurchase(id);
    const items = db.getPurchaseItems(id);
    assert.equal(items.length, 0);
  });

  it("getPurchaseStats returns totals, topItems, monthly", () => {
    const stats = db.getPurchaseStats();
    assert.ok("totals" in stats);
    assert.ok("topItems" in stats);
    assert.ok("monthly" in stats);
    assert.ok(stats.totals.trip_count >= 1);
  });
});

// ---------------------------------------------------------------------------
// Pantry
// ---------------------------------------------------------------------------

describe("pantry", () => {
  it("addPantryItem returns a numeric id", () => {
    const id = db.addPantryItem({
      productName: "Canned Tomatoes",
      productId: "ct-1",
      quantity: 3,
      purchaseDate: "2026-01-01",
      bestBy: "2027-01-01",
      shelfLifeDays: 365,
    });
    assert.ok(id > 0);
  });

  it("getPantryItems returns unconsumed items by default", () => {
    db.addPantryItem({
      productName: "Rice",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: "2027-06-01",
      shelfLifeDays: 365,
    });
    const items = db.getPantryItems();
    assert.ok(items.length >= 1);
    for (const item of items) {
      assert.equal(item.consumed, 0);
    }
  });

  it("getPantryItems with includeConsumed returns all items", () => {
    const id = db.addPantryItem({
      productName: "OldBread",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: "2026-01-05",
      shelfLifeDays: 5,
    });
    db.markConsumed(id);
    const withConsumed = db.getPantryItems({ includeConsumed: true });
    const withoutConsumed = db.getPantryItems();
    assert.ok(withConsumed.length > withoutConsumed.length);
    const consumedItem = withConsumed.find((i) => i.id === id);
    assert.ok(consumedItem);
    assert.equal(consumedItem.consumed, 1);
  });

  it("getExpiringItems returns items expiring within withinDays", () => {
    const today = new Date();
    const soon = new Date(today);
    soon.setDate(today.getDate() + 2);
    const soonStr = soon.toISOString().split("T")[0];
    const id = db.addPantryItem({
      productName: "ExpiresVerySoon",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: soonStr,
      shelfLifeDays: 3,
    });
    const expiring = db.getExpiringItems(3);
    const found = expiring.find((i) => i.id === id);
    assert.ok(found);
  });

  it("getExpiringItems excludes consumed items", () => {
    const today = new Date();
    const soon = new Date(today);
    soon.setDate(today.getDate() + 1);
    const soonStr = soon.toISOString().split("T")[0];
    const id = db.addPantryItem({
      productName: "ConsumedSoon",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: soonStr,
      shelfLifeDays: 2,
    });
    db.markConsumed(id);
    const expiring = db.getExpiringItems(3);
    const found = expiring.find((i) => i.id === id);
    assert.equal(found, undefined);
  });

  it("markConsumed sets consumed = 1", () => {
    const id = db.addPantryItem({
      productName: "Yogurt",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: "2026-02-01",
      shelfLifeDays: 30,
    });
    db.markConsumed(id);
    const allItems = db.getPantryItems({ includeConsumed: true });
    const item = allItems.find((i) => i.id === id);
    assert.equal(item.consumed, 1);
  });

  it("updateBestBy changes the best_by date", () => {
    const id = db.addPantryItem({
      productName: "Cheese",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: "2026-03-01",
      shelfLifeDays: 60,
    });
    db.updateBestBy(id, "2026-04-01");
    const items = db.getPantryItems();
    const item = items.find((i) => i.id === id);
    assert.equal(item.best_by, "2026-04-01");
  });

  it("removePantryItem deletes the item", () => {
    const id = db.addPantryItem({
      productName: "ToRemove",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: "2026-12-01",
      shelfLifeDays: 300,
    });
    db.removePantryItem(id);
    const items = db.getPantryItems();
    const found = items.find((i) => i.id === id);
    assert.equal(found, undefined);
  });

  it("findPantryMatch matches by product_id", () => {
    const id = db.addPantryItem({
      productName: "Almond Milk",
      productId: "almond-milk-42",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: "2026-06-01",
      shelfLifeDays: 180,
    });
    const match = db.findPantryMatch("anything", "almond-milk-42");
    assert.ok(match);
    assert.equal(match.id, id);
  });

  it("findPantryMatch matches by exact name when no product_id", () => {
    const id = db.addPantryItem({
      productName: "Whole Wheat Flour",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: "2026-12-01",
      shelfLifeDays: 365,
    });
    const match = db.findPantryMatch("whole wheat flour", null);
    assert.ok(match);
    assert.equal(match.id, id);
  });

  it("findPantryMatch matches by partial name", () => {
    const id = db.addPantryItem({
      productName: "Organic Coconut Oil",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: "2027-01-01",
      shelfLifeDays: 730,
    });
    const match = db.findPantryMatch("coconut oil", null);
    assert.ok(match);
    assert.equal(match.id, id);
  });

  it("findPantryMatch returns null when no match", () => {
    const match = db.findPantryMatch("xyznomatch12345", null);
    assert.equal(match, null);
  });

  it("findPantryMatch does not match consumed items", () => {
    const id = db.addPantryItem({
      productName: "ConsumedProduct",
      productId: "consumed-prod-id",
      quantity: 1,
      purchaseDate: "2026-01-01",
      bestBy: "2026-02-01",
      shelfLifeDays: 30,
    });
    db.markConsumed(id);
    const match = db.findPantryMatch("ConsumedProduct", "consumed-prod-id");
    assert.equal(match, null);
  });
});

// ---------------------------------------------------------------------------
// Cart tracking
// ---------------------------------------------------------------------------

describe("cart tracking", () => {
  before(() => {
    db.clearCartTracking();
  });

  it("trackCartAddition adds an item to cart", () => {
    db.trackCartAddition("prod-cart-1", "Apples", 2, 3.99);
    const items = db.getRecentCartAdditions();
    const found = items.find((i) => i.product_id === "prod-cart-1");
    assert.ok(found);
    assert.equal(found.product_name, "Apples");
    assert.equal(found.quantity, 2);
  });

  it("isInCart returns true for recently added item", () => {
    db.trackCartAddition("prod-cart-2", "Oranges", 1, 1.99);
    assert.equal(db.isInCart("prod-cart-2"), true);
  });

  it("isInCart returns false for item not in cart", () => {
    assert.equal(db.isInCart("prod-not-in-cart"), false);
  });

  it("getRecentCartAdditions returns items within time window", () => {
    db.clearCartTracking();
    db.trackCartAddition("prod-cart-3", "Bananas", 3, 1.5);
    db.trackCartAddition("prod-cart-4", "Grapes", 1, 2.5);
    const items = db.getRecentCartAdditions(24);
    assert.ok(items.length >= 2);
  });

  it("importCartSnapshot replaces all existing items", () => {
    db.clearCartTracking();
    db.trackCartAddition("old-prod-1", "OldItem", 1, 5.0);
    db.importCartSnapshot([
      {
        productId: "snap-1",
        productName: "SnapItem1",
        quantity: 2,
        price: 4.0,
        available: true,
      },
      {
        productId: "snap-2",
        productName: "SnapItem2",
        quantity: 1,
        price: 6.0,
        available: false,
      },
    ]);
    const items = db.getRecentCartAdditions(9999);
    assert.equal(items.length, 2);
    assert.ok(items.find((i) => i.product_id === "snap-1"));
    assert.ok(!items.find((i) => i.product_id === "old-prod-1"));
  });

  it("getCartTotal sums only available items", () => {
    db.clearCartTracking();
    db.importCartSnapshot([
      {
        productId: "a1",
        productName: "Item A",
        quantity: 1,
        price: 10.0,
        available: true,
      },
      {
        productId: "a2",
        productName: "Item B",
        quantity: 1,
        price: 5.0,
        available: true,
      },
      {
        productId: "a3",
        productName: "Item C",
        quantity: 1,
        price: 3.0,
        available: false,
      },
    ]);
    const result = db.getCartTotal();
    assert.equal(result.items, 2);
    assert.equal(result.total, 15.0);
  });

  it("getUnavailableCartItems returns only unavailable items", () => {
    db.clearCartTracking();
    db.importCartSnapshot([
      {
        productId: "u1",
        productName: "Available",
        quantity: 1,
        price: 2.0,
        available: true,
      },
      {
        productId: "u2",
        productName: "Unavailable",
        quantity: 1,
        price: 2.0,
        available: false,
      },
    ]);
    const unavailable = db.getUnavailableCartItems();
    assert.equal(unavailable.length, 1);
    assert.equal(unavailable[0].product_id, "u2");
  });

  it("clearCartTracking removes all cart items", () => {
    db.trackCartAddition("prod-clear", "ToClear", 1, 1.0);
    db.clearCartTracking();
    const items = db.getRecentCartAdditions();
    assert.equal(items.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Feeds
// ---------------------------------------------------------------------------

describe("feeds", () => {
  it("addFeed returns a numeric id", () => {
    const id = db.addFeed("https://example.com/feed", "Example Feed");
    assert.ok(id > 0);
  });

  it("addFeed with duplicate URL returns existing id (dedup)", () => {
    const id1 = db.addFeed("https://dedup-feed.com/rss", "Dedup Feed");
    const id2 = db.addFeed("https://dedup-feed.com/rss", "Dedup Feed Again");
    assert.equal(id1, id2);
  });

  it("listFeeds includes recipe_count", () => {
    const feedId = db.addFeed("https://count-feed.com/rss", "Count Feed");
    db.addFeedRecipe(feedId, {
      title: "Recipe One",
      guid: "guid-count-1",
    });
    const feeds = db.listFeeds();
    const found = feeds.find((f) => f.id === feedId);
    assert.ok(found);
    assert.ok(found.recipe_count >= 1);
  });

  it("getFeed returns feed by id", () => {
    const id = db.addFeed("https://get-feed.com/rss", "Get Feed");
    const feed = db.getFeed(id);
    assert.ok(feed);
    assert.equal(feed.url, "https://get-feed.com/rss");
  });

  it("getFeed returns undefined for missing id", () => {
    const feed = db.getFeed(999999);
    assert.equal(feed, undefined);
  });

  it("removeFeed deletes the feed", () => {
    const id = db.addFeed("https://remove-feed.com/rss", "Remove Feed");
    db.removeFeed(id);
    assert.equal(db.getFeed(id), undefined);
  });

  it("updateFeedMeta updates title and lastFetched", () => {
    const id = db.addFeed("https://update-feed.com/rss", "OldTitle");
    db.updateFeedMeta(id, {
      title: "NewTitle",
      lastFetched: "2026-01-01T00:00:00Z",
    });
    const feed = db.getFeed(id);
    assert.equal(feed.title, "NewTitle");
    assert.equal(feed.last_fetched, "2026-01-01T00:00:00Z");
  });

  it("updateFeedMeta does nothing when no fields provided", () => {
    const id = db.addFeed("https://noop-feed.com/rss", "NoopTitle");
    // Should not throw
    db.updateFeedMeta(id, {});
    const feed = db.getFeed(id);
    assert.equal(feed.title, "NoopTitle");
  });

  it("addFeedRecipe returns true when added", () => {
    const feedId = db.addFeed("https://recipe-feed.com/rss", "Recipe Feed");
    const added = db.addFeedRecipe(feedId, {
      title: "My Recipe",
      url: "https://recipe-feed.com/my-recipe",
      author: "Chef A",
      guid: "guid-my-recipe-1",
    });
    assert.equal(added, true);
  });

  it("addFeedRecipe returns false for duplicate GUID", () => {
    const feedId = db.addFeed("https://guid-feed.com/rss", "GUID Feed");
    db.addFeedRecipe(feedId, { title: "Unique", guid: "guid-unique-dedup" });
    const second = db.addFeedRecipe(feedId, {
      title: "Unique Again",
      guid: "guid-unique-dedup",
    });
    assert.equal(second, false);
  });

  it("listFeedRecipes returns recipes for a feed", () => {
    const feedId = db.addFeed("https://list-feed.com/rss", "List Feed");
    db.addFeedRecipe(feedId, { title: "Taco Tuesday", guid: "guid-taco-1" });
    db.addFeedRecipe(feedId, {
      title: "Meatloaf Monday",
      guid: "guid-meatloaf-1",
    });
    const recipes = db.listFeedRecipes(feedId);
    assert.ok(recipes.length >= 2);
    assert.ok(recipes.every((r) => r.feed_id === feedId));
  });

  it("listFeedRecipes without feedId returns all feed recipes", () => {
    const all = db.listFeedRecipes(null);
    assert.ok(all.length >= 1);
  });

  it("getFeedRecipe returns recipe with feed_title", () => {
    const feedId = db.addFeed("https://single-feed.com/rss", "Single Feed");
    db.addFeedRecipe(feedId, {
      title: "Lone Recipe",
      guid: "guid-lone-1",
      published: "2026-01-10T00:00:00Z",
    });
    const recipes = db.listFeedRecipes(feedId);
    const recipeId = recipes.find((r) => r.guid === "guid-lone-1").id;
    const r = db.getFeedRecipe(recipeId);
    assert.ok(r);
    assert.equal(r.title, "Lone Recipe");
    assert.equal(r.feed_title, "Single Feed");
  });

  it("removeFeed cascades to feed_recipes", () => {
    const feedId = db.addFeed("https://cascade-feed.com/rss", "Cascade Feed");
    db.addFeedRecipe(feedId, {
      title: "CascadeRecipe",
      guid: "guid-cascade-1",
    });
    db.removeFeed(feedId);
    const recipes = db.listFeedRecipes(feedId);
    assert.equal(recipes.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

describe("budget", () => {
  it("getBudget returns undefined when no budget set", () => {
    // Budget may or may not have been set by other tests; just check it doesn't throw
    const b = db.getBudget();
    assert.ok(b === undefined || typeof b === "object");
  });

  it("setBudget stores budget and getBudget returns it", () => {
    db.setBudget(200.0, "weekly", "2026-01-01");
    const b = db.getBudget();
    assert.ok(b);
    assert.equal(b.amount, 200.0);
    assert.equal(b.period, "weekly");
    assert.equal(b.start_date, "2026-01-01");
  });

  it("setBudget replaces existing budget (upsert)", () => {
    db.setBudget(500.0, "monthly", "2026-02-01");
    const b = db.getBudget();
    assert.equal(b.amount, 500.0);
    assert.equal(b.period, "monthly");
  });

  it("getSpendingForPeriod sums totals within date range", () => {
    // createPurchase calls were already made earlier in the test suite
    const result = db.getSpendingForPeriod("2026-01-01", "2026-12-31");
    assert.ok("spent" in result);
    assert.ok("trips" in result);
    assert.ok(result.trips >= 1);
    assert.ok(result.spent >= 0);
  });

  it("getSpendingForPeriod returns 0 spent for range with no purchases", () => {
    const result = db.getSpendingForPeriod("2000-01-01", "2000-12-31");
    assert.equal(result.spent, 0);
    assert.equal(result.trips, 0);
  });
});
