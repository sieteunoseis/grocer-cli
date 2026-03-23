import { getConfig } from "../lib/config.js";

const providers = {};

export function registerProvider(name, provider) {
  providers[name] = provider;
}

export function getProviderList() {
  return Object.keys(providers).map((key) => ({
    name: key,
    label: providers[key].label,
    description: providers[key].description,
  }));
}

export function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown grocery chain: ${name}. Run: grocer-cli init`);
  }
  return provider;
}

/**
 * Get the active provider based on config.
 * Commands call this to get the currently configured chain's API.
 */
export function getActiveProvider() {
  const config = getConfig();
  if (!config.chain) {
    throw new Error("No grocery chain configured. Run: grocer-cli init");
  }
  return getProvider(config.chain);
}
