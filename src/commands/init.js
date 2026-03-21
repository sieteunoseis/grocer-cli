import { Command } from "commander";
import { select, input, password } from "@inquirer/prompts";
import { getConfig, setConfig } from "../lib/config.js";
import { getProviderList, getProvider } from "../providers/registry.js";
import chalk from "chalk";

const initCmd = new Command("init")
  .description("Set up grocer-cli — choose your grocery chain and configure credentials")
  .action(async () => {
    try {
      console.log(
        chalk.bold("\n🛒 Welcome to grocer-cli!\n") +
          "Let's get you set up.\n"
      );

      const providers = getProviderList();

      // Step 1: Choose grocery chain
      const chain = await select({
        message: "Which grocery chain do you use?",
        choices: providers.map((p) => ({
          name: `${p.label} — ${p.description}`,
          value: p.name,
        })),
      });

      const provider = getProvider(chain);
      console.log(chalk.green(`\n✓ Selected ${provider.label}\n`));

      // Step 2: Collect provider-specific credentials
      const chainConfig = {};
      for (const field of provider.configFields) {
        const promptFn = field.secret ? password : input;
        const value = await promptFn({
          message: field.message,
          ...(field.help ? { transformer: undefined } : {}),
        });
        chainConfig[field.key] = value;

        if (field.help && !chainConfig[field.key]) {
          console.log(chalk.dim(`  Hint: ${field.help}`));
        }
      }

      // Step 3: Save config
      setConfig({
        chain,
        [chain]: chainConfig,
      });

      console.log(chalk.green("\n✓ Configuration saved!\n"));
      console.log("Next steps:");
      console.log(`  ${chalk.cyan("grocer login")}       Log in via OAuth`);
      console.log(
        `  ${chalk.cyan("grocer locations")}   Find and set your preferred store`
      );
      console.log(
        `  ${chalk.cyan("grocer search")}     Search for products\n`
      );
    } catch (err) {
      if (err.name === "ExitPromptError") {
        console.log(chalk.dim("\nSetup cancelled."));
        return;
      }
      console.error(chalk.red(`Init failed: ${err.message}`));
      process.exit(1);
    }
  });

export default initCmd;
