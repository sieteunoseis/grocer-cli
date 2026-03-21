/**
 * Approximate shelf life (in days) for common grocery categories.
 * Used to estimate "best by" dates when items are purchased.
 *
 * Sources: USDA FoodKeeper, FDA food storage guidelines.
 * These are refrigerated/pantry defaults — conservative estimates.
 */
const SHELF_LIFE = {
  // Dairy
  milk: 7,
  "whole milk": 7,
  "2% milk": 7,
  "skim milk": 7,
  "oat milk": 10,
  "almond milk": 10,
  "soy milk": 10,
  cream: 14,
  "heavy cream": 14,
  "half and half": 14,
  "sour cream": 21,
  "cream cheese": 21,
  butter: 30,
  yogurt: 14,
  "greek yogurt": 14,
  "cottage cheese": 10,
  eggs: 21,

  // Cheese
  cheese: 28,
  "cheddar cheese": 28,
  "mozzarella cheese": 21,
  "parmesan cheese": 60,
  "shredded cheese": 21,
  "sliced cheese": 21,
  "string cheese": 21,

  // Meat & Poultry (raw, refrigerated)
  chicken: 2,
  "chicken breast": 2,
  "chicken thigh": 2,
  "ground chicken": 2,
  "ground turkey": 2,
  turkey: 2,
  beef: 3,
  "ground beef": 2,
  steak: 3,
  "pork chop": 3,
  pork: 3,
  "bacon": 7,
  "sausage": 5,
  "hot dog": 14,
  "deli meat": 5,
  "lunch meat": 5,

  // Seafood
  fish: 2,
  salmon: 2,
  shrimp: 2,
  tuna: 2,
  tilapia: 2,
  cod: 2,
  "canned tuna": 730,

  // Produce - Fruits
  apple: 21,
  banana: 5,
  orange: 14,
  lemon: 21,
  lime: 14,
  grape: 7,
  strawberry: 5,
  blueberry: 7,
  raspberry: 3,
  avocado: 5,
  peach: 5,
  pear: 5,
  watermelon: 7,
  mango: 5,
  pineapple: 5,

  // Produce - Vegetables
  lettuce: 7,
  spinach: 5,
  kale: 7,
  broccoli: 5,
  cauliflower: 7,
  carrot: 21,
  celery: 14,
  cucumber: 7,
  tomato: 7,
  pepper: 7,
  "bell pepper": 7,
  onion: 30,
  potato: 21,
  "sweet potato": 21,
  garlic: 30,
  ginger: 21,
  corn: 3,
  mushroom: 7,
  zucchini: 5,
  "green bean": 5,
  asparagus: 3,
  cabbage: 14,

  // Bread & Bakery
  bread: 7,
  tortilla: 14,
  bagel: 5,
  muffin: 5,
  "english muffin": 14,
  "pita bread": 7,
  bun: 5,
  roll: 5,
  croissant: 3,

  // Canned & Shelf Stable
  "canned beans": 730,
  "canned soup": 730,
  "canned vegetable": 730,
  "canned fruit": 730,
  "peanut butter": 180,
  "almond butter": 180,
  jam: 180,
  jelly: 180,
  honey: 730,
  "maple syrup": 365,
  ketchup: 180,
  mustard: 365,
  mayonnaise: 60,
  "soy sauce": 365,
  "hot sauce": 365,
  vinegar: 730,
  "olive oil": 365,
  "vegetable oil": 365,

  // Grains & Pasta
  rice: 365,
  pasta: 365,
  "cereal": 180,
  oatmeal: 365,
  flour: 180,
  sugar: 730,

  // Frozen
  "frozen pizza": 120,
  "frozen vegetable": 240,
  "frozen fruit": 240,
  "ice cream": 60,
  "frozen meal": 120,

  // Beverages
  juice: 10,
  "orange juice": 10,
  "apple juice": 14,
  soda: 180,
  water: 365,
  coffee: 180,
  tea: 365,

  // Snacks
  chips: 60,
  crackers: 90,
  cookies: 30,
  nuts: 90,
  granola: 90,
  "protein bar": 180,
};

/**
 * Default shelf life when no match is found (days).
 */
const DEFAULT_SHELF_LIFE = 7;

/**
 * Look up estimated shelf life in days for a product name.
 * Does fuzzy matching — checks if any key appears in the product name.
 */
export function getShelfLifeDays(productName) {
  const name = productName.toLowerCase().trim();

  // Exact match first
  if (SHELF_LIFE[name] !== undefined) return SHELF_LIFE[name];

  // Check if product name contains any key
  for (const [key, days] of Object.entries(SHELF_LIFE)) {
    if (name.includes(key)) return days;
  }

  // Check if any key contains the product name (short names like "egg")
  for (const [key, days] of Object.entries(SHELF_LIFE)) {
    if (key.includes(name) && name.length >= 3) return days;
  }

  return DEFAULT_SHELF_LIFE;
}

/**
 * Calculate a best-by date string from a purchase date and product name.
 */
export function estimateBestBy(productName, purchaseDate) {
  const days = getShelfLifeDays(productName);
  const date = new Date(purchaseDate);
  date.setDate(date.getDate() + days);
  return {
    bestBy: date.toISOString().split("T")[0],
    shelfLifeDays: days,
  };
}

/**
 * All known shelf life entries (for reference/display).
 */
export function getAllShelfLifeEntries() {
  return Object.entries(SHELF_LIFE)
    .map(([name, days]) => ({ name, days }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
