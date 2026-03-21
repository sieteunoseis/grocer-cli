import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { mkdirSync } from "fs";

const CONFIG_DIR = join(homedir(), ".grocer-cli");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULTS = {
  chain: "",
};

export function getConfigDir() {
  mkdirSync(CONFIG_DIR, { recursive: true });
  return CONFIG_DIR;
}

export function getConfig() {
  mkdirSync(CONFIG_DIR, { recursive: true });
  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULTS };
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setConfig(updates) {
  const current = getConfig();
  const merged = { ...current, ...updates };
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2) + "\n");
  return merged;
}
