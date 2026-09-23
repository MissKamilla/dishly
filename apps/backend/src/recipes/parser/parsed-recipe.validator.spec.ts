import { validateParsedRecipe } from './parsed-recipe.validator';
import { ParsedRecipe } from './types/parsed-recipe';

const validRecipe: ParsedRecipe = {
  title: 'Soup',
  description: null,
  imageUrl: null,
  servings: null,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  ingredients: [
    { rawText: '2 onions', name: 'onions', quantity: 2, unit: null },
  ],
  steps: [
    {
      text: 'Chop onions.',
      group: null,
      durationMinutes: null,
      imageUrl: null,
    },
  ],
};

describe('validateParsedRecipe', () => {
  it('returns a valid recipe without changing nullable fields', () => {
    expect(validateParsedRecipe(validRecipe)).toBe(validRecipe);
  });

  it.each(['', '  '])('rejects an empty title %j', (title) => {
    expect(() => validateParsedRecipe({ ...validRecipe, title })).toThrow(
      'Parsed recipe must have a title',
    );
  });

  it('rejects an empty ingredient list', () => {
    expect(() =>
      validateParsedRecipe({ ...validRecipe, ingredients: [] }),
    ).toThrow('Parsed recipe must have at least one ingredient');
  });

  it('rejects an empty step list', () => {
    expect(() => validateParsedRecipe({ ...validRecipe, steps: [] })).toThrow(
      'Parsed recipe must have at least one step',
    );
  });

  it('rejects a recipe missing all required content', () => {
    expect(() =>
      validateParsedRecipe({
        ...validRecipe,
        title: '',
        ingredients: [],
        steps: [],
      }),
    ).toThrow('Parsed recipe must have a title');
  });
});
