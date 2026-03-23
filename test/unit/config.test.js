import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { getConfig, setConfig, getConfigDir } from "../../src/lib/config.js";

let tmpDir;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "grocer-test-"));
  process.env.GROCER_DATA_DIR = tmpDir;
});

after(() => {
  delete process.env.GROCER_DATA_DIR;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("getConfigDir", () => {
  it("returns GROCER_DATA_DIR when set", () => {
    const dir = getConfigDir();
    assert.equal(dir, tmpDir);
  });
});

describe("getConfig", () => {
  it("returns defaults when no config file exists", () => {
    const cfg = getConfig();
    assert.equal(cfg.chain, "");
  });
});

describe("setConfig", () => {
  it("writes and merges config", () => {
    setConfig({ chain: "kroger" });
    const cfg = getConfig();
    assert.equal(cfg.chain, "kroger");
  });

  it("merges with existing values", () => {
    setConfig({ chain: "kroger" });
    setConfig({ locationId: "12345" });
    const cfg = getConfig();
    assert.equal(cfg.chain, "kroger");
    assert.equal(cfg.locationId, "12345");
  });
});

describe("corrupt config", () => {
  it("returns defaults for invalid JSON", () => {
    writeFileSync(join(tmpDir, "config.json"), "not json{{{");
    const cfg = getConfig();
    assert.equal(cfg.chain, "");
  });
});
