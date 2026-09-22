import { mapSchemaRecipeFields } from './schema-recipe.parser';

describe('mapSchemaRecipeFields', () => {
  it('maps only the eight Recipe fields needed by Dishly', () => {
    const source = {
      '@type': 'Recipe',
      name: 'Chicken Pasta',
      description: 'A quick dinner',
      image: { '@type': 'ImageObject', url: 'https://example.com/pasta.jpg' },
      recipeYield: '4 servings',
      prepTime: 'PT15M',
      cookTime: 'PT30M',
      recipeIngredient: ['200g pasta'],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'Boil pasta' }],
      nutrition: { calories: '500 kcal' },
      author: { name: 'Chef' },
    };

    expect(mapSchemaRecipeFields(source)).toEqual({
      title: 'Chicken Pasta',
      description: 'A quick dinner',
      imageUrl: source.image,
      servings: '4 servings',
      prepTimeMinutes: 'PT15M',
      cookTimeMinutes: 'PT30M',
      ingredients: ['200g pasta'],
      steps: source.recipeInstructions,
    });
  });

  it('does not invent values for absent fields', () => {
    expect(mapSchemaRecipeFields({ '@type': 'Recipe' })).toEqual({
      title: undefined,
      description: undefined,
      imageUrl: undefined,
      servings: undefined,
      prepTimeMinutes: undefined,
      cookTimeMinutes: undefined,
      ingredients: undefined,
      steps: undefined,
    });
  });
});
