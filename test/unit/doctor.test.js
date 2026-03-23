import { describe, it, before, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runDoctorChecks } from "../../src/commands/doctor.js";
import { setConfig } from "../../src/lib/config.js";
import { saveTokens, clearTokens, resetDb } from "../../src/lib/db.js";

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

function captureDoctor() {
  const logs = [];
  const mockLog = mock.method(console, "log", (...args) =>
    logs.push(args.join(" ")),
  );
  const issues = runDoctorChecks();
  mockLog.mock.restore();
  return { output: logs.join("\n"), issues };
}

describe("doctor", () => {
  beforeEach(() => {
    setConfig({
      chain: "kroger",
      kroger: { clientId: "test-id", clientSecret: "test-secret" },
      locationId: "12345",
    });
    saveTokens("test-access", "test-refresh", 3600);
  });

  it("reports all checks passing with valid setup", () => {
    const { output, issues } = captureDoctor();
    assert.equal(issues, 0);
    assert.ok(output.includes("Everything looks good"));
  });

  it("reports issue when chain is missing", () => {
    setConfig({ chain: "" });
    const { issues } = captureDoctor();
    assert.ok(issues > 0);
  });

  it("reports issue when not logged in", () => {
    clearTokens();
    const { issues } = captureDoctor();
    assert.ok(issues > 0);
  });
});
