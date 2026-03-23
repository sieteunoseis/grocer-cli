#!/usr/bin/env node

import { Command } from "commander";
import { registerProvider } from "./providers/registry.js";
import krogerProvider from "./providers/kroger/index.js";
import initCmd from "./commands/init.js";
import configCmd from "./commands/config.js";
import { loginCmd, logoutCmd, statusCmd } from "./commands/auth.js";
import { searchCmd, productCmd } from "./commands/products.js";
import locationsCmd from "./commands/locations.js";
import cartCmd from "./commands/cart.js";
import recipesCmd from "./commands/recipes.js";
import purchasesCmd from "./commands/purchases.js";
import feedsCmd from "./commands/feeds.js";
import budgetCmd from "./commands/budget.js";
import exportCmd from "./commands/export.js";
import pantryCmd from "./commands/pantry.js";

// Register providers
registerProvider("kroger", krogerProvider);

const program = new Command();

program
  .name("grocer-cli")
  .description("CLI tool for interacting with grocery store APIs")
  .version("2.2.0");

// Init / Setup
program.addCommand(initCmd);

// Auth
program.addCommand(loginCmd);
program.addCommand(logoutCmd);
program.addCommand(statusCmd);

// Configuration
program.addCommand(configCmd);

// Products
program.addCommand(searchCmd);
program.addCommand(productCmd);

// Locations
program.addCommand(locationsCmd);

// Cart
program.addCommand(cartCmd);

// Recipes
program.addCommand(recipesCmd);

// Purchases
program.addCommand(purchasesCmd);

// Feeds
program.addCommand(feedsCmd);

// Budget
program.addCommand(budgetCmd);

// Export to Instacart
program.addCommand(exportCmd);

// Pantry / Best-By Tracking
program.addCommand(pantryCmd);

program.parse();
