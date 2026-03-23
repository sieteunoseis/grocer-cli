import { Command } from "commander";
import { existsSync, statSync } from "fs";
import { join } from "path";
import { getConfig, getConfigDir } from "../lib/config.js";
import { getTokens } from "../lib/db.js";
import chalk from "chalk";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function check(label, ok, detail) {
  const icon = ok ? chalk.green("\u2713") : chalk.red("\u2717");
  const msg = detail ? `${label} — ${detail}` : label;
  console.log(`  ${icon} ${msg}`);
  return ok;
}

export function runDoctorChecks() {
  console.log(chalk.bold("\ngrocer-cli doctor\n"));
  let issues = 0;

  // 1. Node.js version
  const nodeVersion = process.versions.node;
  const [major, minor] = nodeVersion.split(".").map(Number);
  const nodeOk = major > 22 || (major === 22 && minor >= 5);
  if (
    !check(
      "Node.js version",
      nodeOk,
      `v${nodeVersion}${nodeOk ? "" : " (requires >= 22.5.0)"}`,
    )
  )
    issues++;

  // 2. Config exists and has chain
  const configDir = getConfigDir();
  const configPath = join(configDir, "config.json");
  const configExists = existsSync(configPath);
  if (
    !check(
      "Config file",
      configExists,
      configExists ? configPath : `not found — run grocer-cli init`,
    )
  ) {
    issues++;
  } else {
    const cfg = getConfig();

    // Chain configured
    const hasChain = Boolean(cfg.chain);
    if (
      !check(
        "Grocery chain",
        hasChain,
        hasChain ? cfg.chain : "not set — run grocer-cli init",
      )
    )
      issues++;

    // Credentials
    if (hasChain) {
      const chainCfg = cfg[cfg.chain] || {};
      const hasClientId = Boolean(chainCfg.clientId);
      const hasClientSecret = Boolean(chainCfg.clientSecret);
      if (
        !check(
          "API credentials",
          hasClientId && hasClientSecret,
          hasClientId && hasClientSecret
            ? "client ID and secret configured"
            : "missing — run grocer-cli init",
        )
      )
        issues++;
    }

    // Preferred store
    const hasLocation = Boolean(cfg.locationId);
    if (
      !check(
        "Preferred store",
        hasLocation,
        hasLocation
          ? `location ${cfg.locationId}`
          : "not set — run grocer-cli locations <zip> --set",
      )
    )
      issues++;

    // Instacart key (optional, just informational)
    const hasInstacart = Boolean(cfg.instacart?.apiKey);
    const icIcon = hasInstacart ? chalk.green("\u2713") : chalk.dim("-");
    const icDetail = hasInstacart
      ? "configured"
      : chalk.dim("not set (optional)");
    console.log(`  ${icIcon} Instacart API key — ${icDetail}`);
  }

  // 3. Auth status
  const tokens = getTokens();
  if (!tokens) {
    if (!check("Authentication", false, "not logged in — run grocer-cli login"))
      issues++;
  } else {
    const expired = Date.now() >= tokens.expires_at;
    if (expired) {
      check(
        "Authentication",
        true,
        "token expired but will auto-refresh on next command",
      );
    } else {
      const mins = Math.round((tokens.expires_at - Date.now()) / 60000);
      check("Authentication", true, `token valid for ~${mins} min`);
    }
  }

  // 4. Database size
  const dbPath = join(configDir, "grocer.db");
  const dbExists = existsSync(dbPath);
  if (!check("Database", dbExists, dbExists ? dbPath : "not found")) {
    issues++;
  } else {
    const dbSize = statSync(dbPath).size;
    const walPath = dbPath + "-wal";
    const walSize = existsSync(walPath) ? statSync(walPath).size : 0;
    const totalSize = dbSize + walSize;
    const sizeOk = totalSize < 50 * 1024 * 1024; // warn above 50MB
    if (
      !check(
        "Database size",
        sizeOk,
        `${formatBytes(dbSize)}${walSize ? ` + ${formatBytes(walSize)} WAL` : ""}${sizeOk ? "" : " — consider cleaning old data"}`,
      )
    )
      issues++;
  }

  // Summary
  console.log();
  if (issues === 0) {
    console.log(chalk.green("Everything looks good!"));
  } else {
    console.log(
      chalk.yellow(`${issues} issue${issues === 1 ? "" : "s"} found.`),
    );
  }
  console.log();

  return issues;
}

const doctorCmd = new Command("doctor")
  .description("Check CLI health: config, auth, database, and environment")
  .action(() => {
    runDoctorChecks();
  });

export default doctorCmd;
