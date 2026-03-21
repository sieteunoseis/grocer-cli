#!/usr/bin/env node

import { Command } from "commander";
import configCmd from "./commands/config.js";
import { loginCmd, logoutCmd, statusCmd } from "./commands/auth.js";
import { searchCmd, productCmd } from "./commands/products.js";
import locationsCmd from "./commands/locations.js";
import cartCmd from "./commands/cart.js";
import recipesCmd from "./commands/recipes.js";

const program = new Command();

program
  .name("kroger")
  .description("CLI tool for interacting with the Kroger API")
  .version("1.0.0");

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

program.parse();
