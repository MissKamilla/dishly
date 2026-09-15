import { RecipeStatus } from '../enums/recipe-status.enum';

export type RecipeListItemResponse = {
  id: number;
  title: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  status: RecipeStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type RecipeIngredientResponse = {
  id: number;
  rawText: string;
  name: string | null;
  quantity: number | null;
  unit: string | null;
  position: number;
};

export type RecipeStepResponse = {
  id: number;
  text: string;
  group: string | null;
  durationMinutes: number | null;
  imageUrl: string | null;
  position: number;
};

export type RecipeDetailsResponse = RecipeListItemResponse & {
  description: string | null;
  ingredients: RecipeIngredientResponse[];
  steps: RecipeStepResponse[];
};
