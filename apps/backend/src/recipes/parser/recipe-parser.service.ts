import { Injectable } from '@nestjs/common';
import { fetchHtml } from './html-fetcher';
import { normalizeIngredients } from './ingredient.normalizer';
import { extractJsonLd } from './json-ld.extractor';
import { findRecipeInJsonLd } from './json-ld.recipe-finder';
import { validateParsedRecipe } from './parsed-recipe.validator';
import {
  isRetryableFetchError,
  RecipeParserErrorCode,
  wrapParserError,
} from './recipe-parser.error';
import {
  normalizeDescription,
  normalizeDurationMinutes,
  normalizeImageUrl,
  normalizeServings,
  normalizeTitle,
} from './recipe.normalizer';
import {
  mapSchemaRecipeFields,
  SchemaRecipeFields,
} from './schema-recipe.parser';
import { normalizeSteps } from './step.normalizer';
import { ParsedRecipe } from './types/parsed-recipe';
import { validateGoodFoodUrl } from './url-validator';

@Injectable()
export class RecipeParserService {
  async parse(input: string): Promise<ParsedRecipe> {
    const url = validateSourceUrl(input);
    const html = await fetchRecipeHtml(url);
    const recipe = extractRecipe(html);
    const fields = mapSchemaRecipeFields(recipe);
    return normalizeAndValidateRecipe(fields, url.href);
  }
}

function validateSourceUrl(input: string): URL {
  try {
    return validateGoodFoodUrl(input);
  } catch (error) {
    throw wrapParserError(RecipeParserErrorCode.UNSUPPORTED_URL, error);
  }
}

async function fetchRecipeHtml(url: URL): Promise<string> {
  try {
    return await fetchHtml(url.href);
  } catch (error) {
    throw wrapParserError(
      RecipeParserErrorCode.FETCH_FAILED,
      error,
      isRetryableFetchError(error),
    );
  }
}

function extractRecipe(html: string): Record<string, unknown> {
  let documents: unknown[];

  try {
    documents = extractJsonLd(html);
  } catch (error) {
    throw wrapParserError(RecipeParserErrorCode.INVALID_RECIPE_DATA, error);
  }

  try {
    return findRecipeInJsonLd(documents);
  } catch (error) {
    const code =
      error instanceof Error && error.message.startsWith('Multiple Recipe')
        ? RecipeParserErrorCode.INVALID_RECIPE_DATA
        : RecipeParserErrorCode.RECIPE_NOT_FOUND;
    throw wrapParserError(code, error);
  }
}

function normalizeAndValidateRecipe(
  fields: SchemaRecipeFields,
  sourceUrl: string,
): ParsedRecipe {
  try {
    return validateParsedRecipe({
      title: normalizeTitle(fields.title),
      description: normalizeDescription(fields.description),
      imageUrl: normalizeImageUrl(fields.imageUrl, sourceUrl),
      servings: normalizeServings(fields.servings),
      prepTimeMinutes: normalizeDurationMinutes(fields.prepTimeMinutes),
      cookTimeMinutes: normalizeDurationMinutes(fields.cookTimeMinutes),
      ingredients: normalizeIngredients(fields.ingredients),
      steps: normalizeSteps(fields.steps, sourceUrl),
    });
  } catch (error) {
    throw wrapParserError(RecipeParserErrorCode.INVALID_RECIPE_DATA, error);
  }
}
