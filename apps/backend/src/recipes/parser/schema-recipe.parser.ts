export interface SchemaRecipeFields {
  title: unknown;
  description: unknown;
  imageUrl: unknown;
  servings: unknown;
  prepTimeMinutes: unknown;
  cookTimeMinutes: unknown;
  ingredients: unknown;
  steps: unknown;
}

export function mapSchemaRecipeFields(
  recipe: Record<string, unknown>,
): SchemaRecipeFields {
  return {
    title: recipe.name,
    description: recipe.description,
    imageUrl: recipe.image,
    servings: recipe.recipeYield,
    prepTimeMinutes: recipe.prepTime,
    cookTimeMinutes: recipe.cookTime,
    ingredients: recipe.recipeIngredient,
    steps: recipe.recipeInstructions,
  };
}
