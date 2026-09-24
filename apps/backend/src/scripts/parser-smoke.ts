import { Logger } from '@nestjs/common';
import { RecipeParserError } from '../recipes/parser/recipe-parser.error';
import { RecipeParserService } from '../recipes/parser/recipe-parser.service';

const logger = new Logger('RecipeParserSmoke');

async function runParserSmoke(): Promise<void> {
  const url = process.argv[2];
  if (!url) {
    throw new Error('Usage: npm run parser:smoke -- <Good Food recipe URL>');
  }

  const recipe = await new RecipeParserService().parse(url);

  logger.log(`Title: ${recipe.title}`);
  logger.log(`Servings: ${recipe.servings ?? 'unknown'}`);
  logger.log(`Ingredients: ${recipe.ingredients.length}`);
  logger.log(`Steps: ${recipe.steps.length}`);
}

void runParserSmoke().catch((error: unknown) => {
  if (error instanceof RecipeParserError) {
    logger.error(
      `${error.code}: ${error.message} (retryable: ${error.retryable})`,
    );
  } else {
    logger.error(error instanceof Error ? error.message : String(error));
  }

  process.exitCode = 1;
});
