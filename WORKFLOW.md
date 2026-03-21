# Grocer CLI — Test Workflows

Scenarios to walk through when testing the CLI end-to-end. Each workflow builds on the previous one — run them in order for full coverage.

---

## 1. Initial Setup

**Goal:** Configure API credentials and authenticate.

```bash
# Install
npm install -g .

# Interactive setup — enter Client ID and Client Secret
grocer init

# Authenticate via browser
grocer login

# Verify auth
grocer status

# Find and set your store
grocer locations 98101
grocer locations 98101 --set
```

**Expected:** `grocer status` shows authenticated with token expiration. Location is saved.

---

## 2. Product Search

**Goal:** Search products and verify store-specific results.

```bash
# Basic search
grocer search "sour cream"

# With filters
grocer search "paprika" --limit 3
grocer search "chicken breast" --brand "Simple Truth" --limit 5

# View a specific product
grocer product <productId-from-search>
```

**Expected:** Results include product IDs, descriptions, and prices. Location-specific pricing appears if a store is set.

---

## 3. Create Recipes

**Goal:** Build two recipes that share an ingredient (sour cream).

```bash
# Week 1 recipe
grocer recipe create "Beef Tacos" --description "Taco Tuesday week 1"
grocer search "ground beef"
grocer recipe add-item 1 "Ground Beef" --product-id <upc> --quantity 1
grocer search "taco seasoning"
grocer recipe add-item 1 "Taco Seasoning" --product-id <upc> --quantity 1
grocer search "sour cream"
grocer recipe add-item 1 "Sour Cream" --product-id <upc> --quantity 1
grocer search "shredded cheese"
grocer recipe add-item 1 "Shredded Cheese" --product-id <upc> --quantity 1
grocer search "tortilla"
grocer recipe add-item 1 "Tortillas" --product-id <upc> --quantity 1

# Week 3 recipe (shares sour cream and shredded cheese)
grocer recipe create "Chicken Enchiladas" --description "Uses sour cream from tacos"
grocer search "chicken breast"
grocer recipe add-item 2 "Chicken Breast" --product-id <upc> --quantity 2
grocer search "enchilada sauce"
grocer recipe add-item 2 "Enchilada Sauce" --product-id <upc> --quantity 1
grocer recipe add-item 2 "Sour Cream" --product-id <upc> --quantity 1
grocer recipe add-item 2 "Shredded Cheese" --product-id <upc> --quantity 1
grocer recipe add-item 2 "Tortillas" --product-id <upc> --quantity 1

# Verify
grocer recipe show 1
grocer recipe show 2
```

**Expected:** Both recipes created with product IDs linked. Sour cream, shredded cheese, and tortillas appear in both.

---

## 4. Add Recipe to Cart (Week 1)

**Goal:** Add the first recipe to cart. Nothing is in the pantry yet, so everything gets added.

```bash
grocer cart add-recipe 1
```

**Expected:** All 5 items added to cart. No pantry check warnings (pantry is empty).

---

## 5. Record the Purchase & Track in Pantry

**Goal:** After shopping, import the receipt and track items in pantry with shelf life estimates.

```bash
# Option A: Import receipt email
grocer purchases import week1-receipt.eml

# Option B: Manual entry
grocer purchases add "Ground Beef" --price 6.99
grocer purchases add "Taco Seasoning" --price 1.29
grocer purchases add "Sour Cream" --price 2.49
grocer purchases add "Shredded Cheese" --price 3.49
grocer purchases add "Tortillas" --price 3.29

# Auto-track all items into pantry with estimated best-by dates
grocer pantry track 1
```

**Expected output from `pantry track`:**
```
Tracking 5 items from purchase #1 (2026-03-21):

  Ground Beef                    best by 2026-03-23  (~2d)
  Taco Seasoning                 best by 2027-03-21  (~365d)
  Sour Cream                     best by 2026-04-11  (~21d)
  Shredded Cheese                best by 2026-04-11  (~21d)
  Tortillas                      best by 2026-04-04  (~14d)
```

**Key detail:** Taco seasoning gets ~365 days. Sour cream gets ~21 days. These estimates drive the smart cart check later.

---

## 6. Pantry Status Check

**Goal:** Verify pantry tracking is working.

```bash
grocer pantry status
grocer pantry list
grocer pantry shelf-life "sour cream"
grocer pantry shelf-life "paprika"
grocer pantry shelf-life "cumin"
```

**Expected:** Status shows items grouped by freshness. Shelf life lookups return:
- Sour cream: ~21 days
- Paprika: ~730 days (2 years)
- Cumin: ~730 days (2 years)

---

## 7. Smart Cart Check — The Key Scenario (Week 3)

**Goal:** Two weeks later, add the enchilada recipe. The CLI should detect sour cream, cheese, and tortillas are still in the pantry and still good.

```bash
# It's now ~14 days later. Add recipe 2 to cart:
grocer cart add-recipe 2
```

**Expected output:**
```
Pantry check — you already have:

  Sour Cream                     bought 2026-03-21  best by 2026-04-11  (7d left)
  Shredded Cheese                bought 2026-03-21  best by 2026-04-11  (7d left)
  Tortillas                      bought 2026-03-21  best by 2026-04-04  (0d left)

  Skipping 3 item(s), adding 2 to cart.

Re-buy the 3 skipped item(s) too? (y/N) n

Added 2 items from "Chicken Enchiladas" to cart.
```

**What happened:**
- Sour cream (21d shelf life) → still has 7 days left → **skipped**
- Shredded cheese (21d shelf life) → still has 7 days left → **skipped**
- Tortillas (14d shelf life) → right at the edge (0d left) → **skipped** (but barely)
- Chicken breast → not in pantry → **added**
- Enchilada sauce → not in pantry → **added**

The user saved money by not re-buying 3 items they already had.

---

## 8. Smart Cart — Spice Scenario

**Goal:** Test that long-shelf-life items like spices are never re-purchased unnecessarily.

```bash
# Create a recipe that uses spices you already bought months ago
grocer recipe create "Curry Chicken"
grocer recipe add-item 3 "Chicken Breast" --product-id <upc> --quantity 2
grocer recipe add-item 3 "Curry Powder" --product-id <upc> --quantity 1
grocer recipe add-item 3 "Cumin" --product-id <upc> --quantity 1
grocer recipe add-item 3 "Turmeric" --product-id <upc> --quantity 1

# Simulate having bought spices 6 months ago
grocer pantry add "Curry Powder" --date 2025-09-21
grocer pantry add "Cumin" --date 2025-09-21
grocer pantry add "Turmeric" --date 2025-09-21

# Now add recipe to cart
grocer cart add-recipe 3
```

**Expected:**
```
Pantry check — you already have:

  Curry Powder                   bought 2025-09-21  best by 2027-09-21  (549d left)
  Cumin                          bought 2025-09-21  best by 2027-09-21  (549d left)
  Turmeric                       bought 2025-09-21  best by 2027-09-21  (549d left)

  Skipping 3 item(s), adding 1 to cart.

Added 1 items from "Curry Chicken" to cart.
```

**Key point:** Spices with 730-day shelf life almost never need re-purchasing. The smart check prevents buying duplicates of cumin, paprika, oregano, etc. that are already in the pantry.

---

## 9. Force Add (Skip Pantry Check)

**Goal:** Verify the `--no-check` flag bypasses pantry checking.

```bash
# CLI
grocer cart add-recipe 2 --no-check

# Skill script
node skills/recipe-to-cart/scripts/recipe-to-cart.js 2 --no-check
```

**Expected:** All items added to cart without pantry warnings.

---

## 10. Expired Item Gets Re-purchased

**Goal:** Verify that expired items are NOT skipped — they get added to cart.

```bash
# Mark sour cream as consumed (simulating it went bad)
grocer pantry toss 3

# Or just wait until it expires naturally, then try the recipe again
grocer cart add-recipe 2
```

**Expected:** Sour cream is no longer in pantry (or is past best-by), so it gets added to cart this time.

---

## 11. Budget Tracking

**Goal:** Verify purchases affect budget tracking.

```bash
grocer budget set 150 --period weekly
grocer budget status
```

**Expected:** Shows spending from purchases, remaining budget, and progress bar.

---

## 12. Instacart Export (Optional)

**Goal:** Test exporting recipes and lists to Instacart.

```bash
grocer config --instacart-key <your-key>
grocer export recipe 1
grocer export list "milk" "eggs" "bread"
```

**Expected:** Generates clickable Instacart URLs.

---

## 13. Receipt Import & Auto-Track

**Goal:** Full loop — import receipt email, auto-track to pantry.

```bash
grocer purchases import receipt.eml
grocer purchases show 2
grocer pantry track 2
grocer pantry status
```

**Expected:** Receipt parsed, items added to purchases, then tracked in pantry with estimated best-by dates.

---

## 14. Skill Script (Agent Workflow)

**Goal:** Test the recipe-to-cart skill as an agent would call it.

```bash
# With pantry check (default)
node skills/recipe-to-cart/scripts/recipe-to-cart.js 1

# Without pantry check
node skills/recipe-to-cart/scripts/recipe-to-cart.js 1 --no-check
```

**Expected:** Tab-separated output for agent parsing. Skipped items show `SKIP` prefix.

---

## Edge Cases to Test

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty pantry + add-recipe | All items added, no pantry warnings |
| All items in pantry + still good | "You already have everything!" prompt |
| Item in pantry but expired | Item gets added to cart (not skipped) |
| Item marked as consumed | Item gets added to cart (not skipped) |
| Same item, different product_id | Falls back to name matching |
| Unknown product (no shelf life entry) | Uses 7-day default shelf life |
| Spice bought 1 year ago | Still shows as good (730d shelf life) |
| `--no-check` flag | All items added, no pantry lookup at all |
| Recipe with no product IDs linked | Error: "Search and link products first" |
| Not logged in | Error: "Run grocer login" |
