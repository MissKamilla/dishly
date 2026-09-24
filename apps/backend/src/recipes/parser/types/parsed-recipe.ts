export interface ParsedIngredient {
  rawText: string;
  name: string | null;
  quantity: number | null;
  unit: string | null;
}

export interface ParsedRecipeStep {
  text: string;
  group: string | null;
  durationMinutes: number | null;
  imageUrl: string | null;
}

export interface ParsedRecipe {
  title: string;
  description: string | null;
  imageUrl: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  ingredients: ParsedIngredient[];
  steps: ParsedRecipeStep[];
}
