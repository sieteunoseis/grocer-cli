import { Command } from "commander";
import { login, logout } from "../lib/auth.js";
import { getTokens } from "../lib/db.js";
import chalk from "chalk";

const loginCmd = new Command("login")
  .description("Authenticate with Kroger via OAuth2")
  .action(async () => {
    try {
      await login();
      console.log(chalk.green("\nSuccessfully logged in to Kroger!"));
    } catch (err) {
      console.error(chalk.red(`Login failed: ${err.message}`));
      process.exit(1);
    }
  });

const logoutCmd = new Command("logout")
  .description("Clear stored Kroger credentials")
  .action(() => {
    logout();
    console.log(chalk.green("Logged out. Stored tokens cleared."));
  });

const statusCmd = new Command("status")
  .description("Check authentication status")
  .action(() => {
    const tokens = getTokens();
    if (!tokens) {
      console.log(chalk.yellow("Not logged in. Run: kroger login"));
      return;
    }
    const expired = Date.now() >= tokens.expires_at;
    if (expired) {
      console.log(
        chalk.yellow("Token expired. It will be refreshed on next API call.")
      );
    } else {
      const mins = Math.round((tokens.expires_at - Date.now()) / 60000);
      console.log(chalk.green(`Authenticated. Token valid for ~${mins} min.`));
    }
  });

export { loginCmd, logoutCmd, statusCmd };
