import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const DEFAULTS = {
  chain: "",
};

function resolveDir() {
  return process.env.GROCER_DATA_DIR || join(homedir(), ".grocer-cli");
}

export function getConfigDir() {
  const dir = resolveDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getConfig() {
  const dir = resolveDir();
  const configPath = join(dir, "config.json");
  mkdirSync(dir, { recursive: true });
  if (!existsSync(configPath)) {
    return { ...DEFAULTS };
  }
  try {
    const raw = readFileSync(configPath, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setConfig(updates) {
  const dir = resolveDir();
  const configPath = join(dir, "config.json");
  const current = getConfig();
  const merged = { ...current, ...updates };
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(merged, null, 2) + "\n");
  return merged;
}
