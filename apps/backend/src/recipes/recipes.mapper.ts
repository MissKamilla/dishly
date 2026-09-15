import { Recipe } from './entities/recipe.entity';
import {
  RecipeDetailsResponse,
  RecipeIngredientResponse,
  RecipeListItemResponse,
  RecipeStepResponse,
} from './types/recipe-response.types';

export function toRecipeListItemResponse(
  recipe: Recipe,
): RecipeListItemResponse {
  return {
    id: recipe.id,
    title: recipe.title,
    sourceUrl: recipe.sourceUrl,
    imageUrl: recipe.imageUrl,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    status: recipe.status,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

export function toRecipeDetailsResponse(recipe: Recipe): RecipeDetailsResponse {
  return {
    ...toRecipeListItemResponse(recipe),
    description: recipe.description,
    ingredients: recipe.ingredients.map(toRecipeIngredientResponse),
    steps: recipe.steps.map(toRecipeStepResponse),
  };
}

function toRecipeIngredientResponse(
  ingredient: Recipe['ingredients'][number],
): RecipeIngredientResponse {
  return {
    id: ingredient.id,
    rawText: ingredient.rawText,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    position: ingredient.position,
  };
}

function toRecipeStepResponse(
  step: Recipe['steps'][number],
): RecipeStepResponse {
  return {
    id: step.id,
    text: step.text,
    group: step.group,
    durationMinutes: step.durationMinutes,
    imageUrl: step.imageUrl,
    position: step.position,
  };
}
