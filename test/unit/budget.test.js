import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  getCurrentPeriod,
  getRecentPeriodSpending,
} from "../../src/lib/budget.js";
import { setBudget, createPurchase, resetDb } from "../../src/lib/db.js";

let tmpDir;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "grocer-test-"));
  process.env.GROCER_DATA_DIR = tmpDir;
});

after(() => {
  resetDb();
  delete process.env.GROCER_DATA_DIR;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("getCurrentPeriod", () => {
  it("calculates weekly period boundaries", () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const startStr = sevenDaysAgo.toISOString().split("T")[0];

    const result = getCurrentPeriod({ period: "weekly", start_date: startStr });
    assert.ok(result.periodStart);
    assert.ok(result.periodEnd);
    assert.ok(result.periodLabel.includes("→"));
  });

  it("calculates biweekly period boundaries", () => {
    const today = new Date();
    const startStr = today.toISOString().split("T")[0];

    const result = getCurrentPeriod({
      period: "biweekly",
      start_date: startStr,
    });
    const start = new Date(result.periodStart);
    const end = new Date(result.periodEnd);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    assert.equal(days, 13);
  });
});

describe("getRecentPeriodSpending", () => {
  it("returns spending data for recent periods", () => {
    const today = new Date();
    const startStr = today.toISOString().split("T")[0];

    setBudget(150, "weekly", startStr);
    createPurchase({ chain: "kroger", date: startStr, total: 50 });

    const data = getRecentPeriodSpending(
      { period: "weekly", start_date: startStr },
      4,
    );
    assert.ok(data.length >= 1);
    assert.ok(data[data.length - 1].spent >= 50);
    assert.ok("label" in data[0]);
  });
});
