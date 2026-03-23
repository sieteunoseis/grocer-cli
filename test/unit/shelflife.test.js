import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getShelfLifeDays,
  estimateBestBy,
  getAllShelfLifeEntries,
} from "../../src/lib/shelflife.js";

describe("getShelfLifeDays", () => {
  it("returns exact match for known item", () => {
    assert.equal(getShelfLifeDays("milk"), 7);
    assert.equal(getShelfLifeDays("chicken breast"), 2);
    assert.equal(getShelfLifeDays("cumin"), 730);
  });

  it("matches case-insensitively", () => {
    assert.equal(getShelfLifeDays("Milk"), 7);
    assert.equal(getShelfLifeDays("CHICKEN BREAST"), 2);
  });

  it("fuzzy matches when product name contains a key", () => {
    assert.equal(getShelfLifeDays("organic whole milk"), 7);
    assert.equal(getShelfLifeDays("Simple Truth chicken breast"), 2);
  });

  it("reverse matches short names against longer keys", () => {
    assert.equal(getShelfLifeDays("egg"), 21);
  });

  it("returns default 7 days for unknown items", () => {
    assert.equal(getShelfLifeDays("flurpblort"), 7);
    assert.equal(getShelfLifeDays("mystery item xyz"), 7);
  });
});

describe("estimateBestBy", () => {
  it("calculates best-by date from purchase date + shelf life", () => {
    const result = estimateBestBy("milk", "2026-03-01");
    assert.equal(result.bestBy, "2026-03-08");
    assert.equal(result.shelfLifeDays, 7);
  });

  it("handles long shelf life items", () => {
    const result = estimateBestBy("cumin", "2026-01-01");
    assert.equal(result.bestBy, "2028-01-01");
    assert.equal(result.shelfLifeDays, 730);
  });
});

describe("getAllShelfLifeEntries", () => {
  it("returns a sorted array of all entries", () => {
    const entries = getAllShelfLifeEntries();
    assert.ok(entries.length > 100);
    assert.ok(entries[0].name < entries[entries.length - 1].name);
    assert.ok(
      entries.every(
        (e) => typeof e.name === "string" && typeof e.days === "number",
      ),
    );
  });
});
