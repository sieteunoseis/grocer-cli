import { Command } from "commander";
import { getConfig, setConfig } from "../lib/config.js";
import chalk from "chalk";

const configCmd = new Command("config")
  .description("View or update configuration")
  .option("--show", "Display current configuration")
  .action((opts) => {
    const cfg = getConfig();
    const chain = cfg.chain || "(not set)";
    const chainConfig = cfg[cfg.chain] || {};

    console.log(chalk.bold("\nGrocer CLI Configuration:\n"));
    console.log(`  Chain:         ${chain}`);

    if (cfg.chain && chainConfig) {
      for (const [key, value] of Object.entries(chainConfig)) {
        const display =
          key.toLowerCase().includes("secret") && value
            ? "****" + value.slice(-4)
            : value || chalk.dim("(not set)");
        console.log(`  ${key.padEnd(13)}  ${display}`);
      }
    }
    console.log();
  });

export default configCmd;
