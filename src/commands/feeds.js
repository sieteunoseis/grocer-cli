import { Command } from "commander";
import Parser from "rss-parser";
import {
  addFeed,
  listFeeds,
  removeFeed,
  updateFeedMeta,
  addFeedRecipe,
  listFeedRecipes,
  getFeedRecipe,
} from "../lib/db.js";
import chalk from "chalk";

const parser = new Parser({
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
    ],
  },
});

const feedsCmd = new Command("feeds").description(
  "Subscribe to recipe RSS feeds from your favorite food blogs"
);

// --- add ---
feedsCmd
  .command("add")
  .description("Subscribe to a recipe RSS feed")
  .argument("<url>", "RSS feed URL")
  .action(async (url) => {
    try {
      console.log(chalk.dim("Fetching feed..."));
      const feed = await parser.parseURL(url);
      const feedId = addFeed(url, feed.title);
      updateFeedMeta(feedId, {
        title: feed.title,
        lastFetched: new Date().toISOString(),
      });

      let newCount = 0;
      for (const item of feed.items || []) {
        const ingredients = extractIngredients(
          item.contentEncoded || item.content || item.summary || ""
        );
        const added = addFeedRecipe(feedId, {
          title: item.title,
          url: item.link,
          author: item.creator || item.author,
          published: item.isoDate || item.pubDate,
          summary: truncate(item.contentSnippet || item.summary, 500),
          ingredients: ingredients.length ? JSON.stringify(ingredients) : null,
          guid: item.guid || item.link,
        });
        if (added) newCount++;
      }

      console.log(chalk.green(`\nSubscribed to "${feed.title}"`));
      console.log(`  ${newCount} recipes imported`);
      console.log(
        chalk.dim(`  Feed ID: ${feedId}`)
      );
      console.log();
    } catch (err) {
      console.error(chalk.red(`Failed to add feed: ${err.message}`));
      process.exit(1);
    }
  });

// --- list ---
feedsCmd
  .command("list")
  .description("List subscribed feeds")
  .action(() => {
    const feeds = listFeeds();
    if (!feeds.length) {
      console.log(chalk.yellow("No feeds subscribed yet."));
      console.log(chalk.dim("Add one: grocer feeds add <rss-url>"));
      return;
    }

    console.log(chalk.bold("\nYour Recipe Feeds:\n"));
    for (const f of feeds) {
      const fetched = f.last_fetched
        ? chalk.dim(` (last fetched ${f.last_fetched.split("T")[0]})`)
        : "";
      console.log(
        `  ${chalk.cyan(String(f.id).padStart(3))}  ${f.title || f.url}  ${chalk.dim(`${f.recipe_count} recipes`)}${fetched}`
      );
    }
    console.log();
  });

// --- fetch ---
feedsCmd
  .command("fetch")
  .description("Fetch new recipes from all subscribed feeds")
  .action(async () => {
    const feeds = listFeeds();
    if (!feeds.length) {
      console.log(chalk.yellow("No feeds to fetch. Add one first."));
      return;
    }

    let totalNew = 0;
    for (const f of feeds) {
      try {
        process.stdout.write(chalk.dim(`Fetching ${f.title || f.url}...`));
        const feed = await parser.parseURL(f.url);
        updateFeedMeta(f.id, {
          title: feed.title,
          lastFetched: new Date().toISOString(),
        });

        let newCount = 0;
        for (const item of feed.items || []) {
          const ingredients = extractIngredients(
            item.contentEncoded || item.content || item.summary || ""
          );
          const added = addFeedRecipe(f.id, {
            title: item.title,
            url: item.link,
            author: item.creator || item.author,
            published: item.isoDate || item.pubDate,
            summary: truncate(item.contentSnippet || item.summary, 500),
            ingredients: ingredients.length ? JSON.stringify(ingredients) : null,
            guid: item.guid || item.link,
          });
          if (added) newCount++;
        }

        totalNew += newCount;
        console.log(
          newCount > 0
            ? chalk.green(` ${newCount} new`)
            : chalk.dim(" up to date")
        );
      } catch (err) {
        console.log(chalk.red(` error: ${err.message}`));
      }
    }

    console.log(
      totalNew > 0
        ? chalk.green(`\n${totalNew} new recipes fetched.`)
        : chalk.dim("\nAll feeds up to date.")
    );
    console.log();
  });

// --- recipes ---
feedsCmd
  .command("recipes")
  .description("List recipes from feeds")
  .option("-f, --feed <id>", "Filter by feed ID")
  .option("-n, --limit <n>", "Number of recipes to show", "20")
  .action((opts) => {
    const feedId = opts.feed ? parseInt(opts.feed, 10) : null;
    const recipes = listFeedRecipes(feedId, parseInt(opts.limit, 10));

    if (!recipes.length) {
      console.log(chalk.yellow("No recipes found."));
      return;
    }

    console.log(chalk.bold("\nFeed Recipes:\n"));
    for (const r of recipes) {
      const date = r.published ? r.published.split("T")[0] : "";
      const ingredients = r.ingredients ? JSON.parse(r.ingredients) : [];
      const ingredientHint = ingredients.length
        ? chalk.dim(` (${ingredients.length} ingredients)`)
        : "";
      console.log(
        `  ${chalk.cyan(String(r.id).padStart(3))}  ${r.title}${ingredientHint}`
      );
      console.log(
        `       ${chalk.dim(r.feed_title || "")}  ${chalk.dim(date)}`
      );
    }
    console.log();
  });

// --- show ---
feedsCmd
  .command("show")
  .description("Show a feed recipe with ingredients")
  .argument("<id>", "Feed recipe ID")
  .action((id) => {
    const recipe = getFeedRecipe(parseInt(id, 10));
    if (!recipe) {
      console.log(chalk.yellow("Recipe not found."));
      return;
    }

    console.log(chalk.bold(`\n${recipe.title}`));
    if (recipe.author) console.log(chalk.dim(`by ${recipe.author}`));
    if (recipe.feed_title) console.log(chalk.dim(`from ${recipe.feed_title}`));
    if (recipe.published)
      console.log(chalk.dim(recipe.published.split("T")[0]));
    if (recipe.url) console.log(chalk.dim(recipe.url));
    console.log();

    if (recipe.summary) {
      console.log(recipe.summary);
      console.log();
    }

    const ingredients = recipe.ingredients
      ? JSON.parse(recipe.ingredients)
      : [];
    if (ingredients.length) {
      console.log(chalk.bold("Ingredients:"));
      for (const ing of ingredients) {
        console.log(`  - ${ing}`);
      }
      console.log();
      console.log(
        chalk.dim(
          "Tip: Search for these at your store with: grocer search <ingredient>"
        )
      );
    } else {
      console.log(
        chalk.dim("No ingredients extracted. Visit the recipe URL for details.")
      );
    }
    console.log();
  });

// --- remove ---
feedsCmd
  .command("remove")
  .description("Unsubscribe from a feed")
  .argument("<id>", "Feed ID")
  .action((id) => {
    const result = removeFeed(parseInt(id, 10));
    if (result.changes === 0) {
      console.log(chalk.yellow("Feed not found."));
    } else {
      console.log(chalk.green("Feed removed."));
    }
  });

/**
 * Try to extract ingredients from recipe HTML/text content.
 * Looks for common patterns in recipe blogs (JSON-LD, list items, etc.)
 */
function extractIngredients(content) {
  const ingredients = [];

  // Strategy 1: JSON-LD structured data (used by most recipe blogs)
  const jsonLdMatch = content.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      try {
        const jsonStr = block.replace(/<\/?script[^>]*>/gi, "");
        const data = JSON.parse(jsonStr);
        const recipe = findRecipeInJsonLd(data);
        if (recipe?.recipeIngredient) {
          return recipe.recipeIngredient.map((i) => i.trim());
        }
      } catch {
        // Continue to next strategy
      }
    }
  }

  // Strategy 2: Look for ingredient lists in HTML
  // Common class names: ingredients, ingredient-list, recipe-ingredients
  const ingredientSection = content.match(
    /(?:class="[^"]*ingredient[^"]*"[^>]*>)([\s\S]*?)(?:<\/(?:ul|ol|div|section)>)/i
  );
  if (ingredientSection) {
    const listItems = ingredientSection[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (listItems) {
      for (const li of listItems) {
        const text = li
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim();
        if (text && text.length > 2 && text.length < 200) {
          ingredients.push(text);
        }
      }
      if (ingredients.length) return ingredients;
    }
  }

  // Strategy 3: Plain text patterns (for text/plain content)
  const lines = content.split("\n").map((l) => l.trim());
  let inIngredients = false;
  for (const line of lines) {
    if (/^ingredients?:?\s*$/i.test(line)) {
      inIngredients = true;
      continue;
    }
    if (inIngredients) {
      if (/^(instructions?|directions?|steps?|method|preparation):?\s*$/i.test(line)) {
        break;
      }
      // Lines starting with - or * or a measurement
      if (/^[-*•]/.test(line) || /^\d+[\s\/]/.test(line)) {
        const cleaned = line.replace(/^[-*•]\s*/, "").trim();
        if (cleaned.length > 2) ingredients.push(cleaned);
      } else if (line.length > 2 && line.length < 200 && inIngredients) {
        ingredients.push(line);
      }
    }
  }

  return ingredients;
}

function findRecipeInJsonLd(data) {
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
  }
  if (data && typeof data === "object") {
    if (data["@type"] === "Recipe") return data;
    if (data["@graph"]) return findRecipeInJsonLd(data["@graph"]);
  }
  return null;
}

function truncate(str, maxLen) {
  if (!str) return null;
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
}

export default feedsCmd;
