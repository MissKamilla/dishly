import { ParsedRecipe } from './types/parsed-recipe';

export function validateParsedRecipe(recipe: ParsedRecipe): ParsedRecipe {
  if (!recipe.title.trim()) {
    throw new Error('Parsed recipe must have a title');
  }

  if (recipe.ingredients.length === 0) {
    throw new Error('Parsed recipe must have at least one ingredient');
  }

  if (recipe.steps.length === 0) {
    throw new Error('Parsed recipe must have at least one step');
  }

  return recipe;
}
