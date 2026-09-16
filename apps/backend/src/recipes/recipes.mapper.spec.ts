import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipeStep } from './entities/recipe-step.entity';
import { Recipe } from './entities/recipe.entity';
import { RecipeStatus } from './enums/recipe-status.enum';
import {
  toRecipeDetailsResponse,
  toRecipeListItemResponse,
} from './recipes.mapper';

describe('recipes mapper', () => {
  it('maps a recipe to a list item response without persistence-only fields', () => {
    expect(toRecipeListItemResponse(createRecipe())).toEqual({
      id: 1,
      title: 'Pasta',
      sourceUrl: 'https://www.bbcgoodfood.com/recipes/pasta',
      imageUrl: null,
      servings: 2,
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      status: RecipeStatus.PENDING,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    });
  });

  it('maps recipe details without relation backrefs', () => {
    expect(
      toRecipeDetailsResponse(
        createRecipe({
          ingredients: [createIngredient()],
          steps: [createStep()],
        }),
      ),
    ).toEqual({
      id: 1,
      title: 'Pasta',
      description: 'Simple pasta',
      sourceUrl: 'https://www.bbcgoodfood.com/recipes/pasta',
      imageUrl: null,
      servings: 2,
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      status: RecipeStatus.PENDING,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      ingredients: [
        {
          id: 10,
          rawText: '200g pasta',
          name: 'pasta',
          quantity: 200,
          unit: 'g',
          position: 1,
        },
      ],
      steps: [
        {
          id: 20,
          text: 'Boil pasta',
          group: null,
          durationMinutes: 10,
          imageUrl: null,
          position: 1,
        },
      ],
    });
  });
});

function createRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 1,
    title: 'Pasta',
    description: 'Simple pasta',
    sourceUrl: 'https://www.bbcgoodfood.com/recipes/pasta',
    imageUrl: null,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    status: RecipeStatus.PENDING,
    errorMessage: 'Internal parser detail',
    userId: 7,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    user: undefined as unknown as Recipe['user'],
    ingredients: [],
    steps: [],
    ...overrides,
  };
}

function createIngredient(
  overrides: Partial<RecipeIngredient> = {},
): RecipeIngredient {
  return {
    id: 10,
    rawText: '200g pasta',
    name: 'pasta',
    quantity: 200,
    unit: 'g',
    position: 1,
    recipeId: 1,
    recipe: undefined as unknown as Recipe,
    ...overrides,
  };
}

function createStep(overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 20,
    text: 'Boil pasta',
    group: null,
    durationMinutes: 10,
    imageUrl: null,
    position: 1,
    recipeId: 1,
    recipe: undefined as unknown as Recipe,
    ...overrides,
  };
}
