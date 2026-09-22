const NESTED_RECIPE_KEYS = ['@graph', 'mainEntity', 'item'] as const;

export function findRecipeInJsonLd(
  documents: unknown[],
): Record<string, unknown> {
  if (documents.length === 0) {
    throw new Error('No JSON-LD data found');
  }

  const recipes: Record<string, unknown>[] = [];

  for (const document of documents) {
    collectRecipes(document, recipes);
  }

  if (recipes.length === 0) {
    throw new Error('Recipe not found in JSON-LD');
  }

  if (recipes.length > 1) {
    throw new Error('Multiple Recipe objects found in JSON-LD');
  }

  return recipes[0];
}

function collectRecipes(
  value: unknown,
  recipes: Record<string, unknown>[],
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecipes(item, recipes);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const type = value['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    recipes.push(value);
    return;
  }

  for (const key of NESTED_RECIPE_KEYS) {
    collectRecipes(value[key], recipes);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
