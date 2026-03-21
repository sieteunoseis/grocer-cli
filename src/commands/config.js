import { Command } from "commander";
import { getConfig, setConfig } from "../lib/config.js";
import chalk from "chalk";

const configCmd = new Command("config")
  .description("View or update Kroger API configuration")
  .option("--client-id <id>", "Set Kroger API client ID")
  .option("--client-secret <secret>", "Set Kroger API client secret")
  .option("--location-id <id>", "Set preferred store location ID")
  .option("--show", "Display current configuration")
  .action((opts) => {
    if (opts.show || (!opts.clientId && !opts.clientSecret && !opts.locationId)) {
      const cfg = getConfig();
      console.log(chalk.bold("\nKroger CLI Configuration:\n"));
      console.log(`  Client ID:     ${cfg.clientId || chalk.dim("(not set)")}`);
      console.log(
        `  Client Secret: ${cfg.clientSecret ? "****" + cfg.clientSecret.slice(-4) : chalk.dim("(not set)")}`
      );
      console.log(
        `  Location ID:   ${cfg.locationId || chalk.dim("(not set)")}`
      );
      console.log();
      return;
    }

    const updates = {};
    if (opts.clientId) updates.clientId = opts.clientId;
    if (opts.clientSecret) updates.clientSecret = opts.clientSecret;
    if (opts.locationId) updates.locationId = opts.locationId;

    setConfig(updates);
    console.log(chalk.green("Configuration updated."));
  });

export default configCmd;
