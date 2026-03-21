import { Command } from "commander";
import { searchLocations } from "../lib/kroger.js";
import { setConfig } from "../lib/config.js";
import chalk from "chalk";

const locationsCmd = new Command("locations")
  .description("Find Kroger store locations near a zip code")
  .argument("<zip>", "Zip code to search near")
  .option("-r, --radius <miles>", "Search radius in miles", "10")
  .option("-s, --set", "Set the first result as your preferred store")
  .action(async (zip, opts) => {
    try {
      const locations = await searchLocations(zip, parseInt(opts.radius, 10));

      if (!locations.length) {
        console.log(chalk.yellow("No stores found nearby."));
        return;
      }

      console.log(chalk.bold(`\nFound ${locations.length} stores:\n`));
      for (const loc of locations) {
        const addr = loc.address || {};
        console.log(
          `  ${chalk.cyan(loc.locationId)}  ${loc.name || "Kroger"} — ${addr.addressLine1 || ""}, ${addr.city || ""} ${addr.state || ""} ${addr.zipCode || ""}`
        );
      }

      if (opts.set && locations[0]) {
        setConfig({ locationId: locations[0].locationId });
        console.log(
          chalk.green(
            `\nPreferred store set to ${locations[0].locationId} (${locations[0].name || "Kroger"})`
          )
        );
      }
      console.log();
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

export default locationsCmd;
