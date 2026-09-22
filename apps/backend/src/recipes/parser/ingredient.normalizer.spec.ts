import { normalizeIngredients } from './ingredient.normalizer';

describe('normalizeIngredients', () => {
  it('parses simple measured ingredients in source order', () => {
    expect(
      normalizeIngredients([
        '30g plain flour',
        '150ml double cream',
        '2 tbsp olive oil',
      ]),
    ).toEqual([
      {
        rawText: '30g plain flour',
        name: 'plain flour',
        quantity: 30,
        unit: 'g',
      },
      {
        rawText: '150ml double cream',
        name: 'double cream',
        quantity: 150,
        unit: 'ml',
      },
      {
        rawText: '2 tbsp olive oil',
        name: 'olive oil',
        quantity: 2,
        unit: 'tbsp',
      },
    ]);
  });

  it('preserves the exact original text while normalizing simple fields', () => {
    expect(normalizeIngredients(['  1,5 tsp   chilli flakes  '])).toEqual([
      {
        rawText: '  1,5 tsp   chilli flakes  ',
        name: 'chilli flakes',
        quantity: 1.5,
        unit: 'tsp',
      },
    ]);
  });

  it.each([
    ['2 teaspoons sugar', 2, 'tsp', 'sugar'],
    ['1 teaspoon salt', 1, 'tsp', 'salt'],
    ['200 grams flour', 200, 'g', 'flour'],
    ['1 gram yeast', 1, 'g', 'yeast'],
    ['2 kilograms potatoes', 2, 'kg', 'potatoes'],
    ['1 kilogram rice', 1, 'kg', 'rice'],
    ['1/2 teaspoon salt', 0.5, 'tsp', 'salt'],
    ['½ kilograms potatoes', 0.5, 'kg', 'potatoes'],
  ])('normalizes a spelled-out unit in %s', (rawText, quantity, unit, name) => {
    expect(normalizeIngredients([rawText])).toEqual([
      { rawText, name, quantity, unit },
    ]);
  });

  it('preserves ambiguous ingredients without inventing structure', () => {
    expect(
      normalizeIngredients([
        '4 chicken breasts',
        '½ - 1 tsp chilli flakes',
        '200-250g chicken',
        'a handful of parsley',
        'salt to taste',
      ]),
    ).toEqual([
      {
        rawText: '4 chicken breasts',
        name: 'chicken breasts',
        quantity: 4,
        unit: null,
      },
      {
        rawText: '½ - 1 tsp chilli flakes',
        name: null,
        quantity: null,
        unit: null,
      },
      { rawText: '200-250g chicken', name: null, quantity: null, unit: null },
      {
        rawText: 'a handful of parsley',
        name: null,
        quantity: null,
        unit: null,
      },
      { rawText: 'salt to taste', name: null, quantity: null, unit: null },
    ]);
  });

  it.each([
    ['2 eggs', 'eggs', 2],
    ['1 onion', 'onion', 1],
    ['3 large potatoes', 'large potatoes', 3],
  ])('parses a count-only ingredient %s', (rawText, name, quantity) => {
    expect(normalizeIngredients([rawText])).toEqual([
      { rawText, name, quantity, unit: null },
    ]);
  });

  it('does not return an empty or measurement-only name', () => {
    expect(
      normalizeIngredients(['2 tbsp   ', '2   ', '2 cups flour', '2 grams   ']),
    ).toEqual([
      { rawText: '2 tbsp   ', name: null, quantity: null, unit: null },
      { rawText: '2   ', name: null, quantity: null, unit: null },
      { rawText: '2 cups flour', name: null, quantity: null, unit: null },
      { rawText: '2 grams   ', name: null, quantity: null, unit: null },
    ]);
  });

  it.each([
    '9007199254740993g flour',
    '999999999999999999999/1 tsp salt',
    '9007199254740993 eggs',
  ])('keeps unsafe quantities unstructured: %s', (rawText) => {
    expect(normalizeIngredients([rawText])).toEqual([
      { rawText, name: null, quantity: null, unit: null },
    ]);
  });

  it.each([
    ['½ tsp chilli flakes', 0.5, 'tsp', 'chilli flakes'],
    ['1½ tbsp olive oil', 1.5, 'tbsp', 'olive oil'],
    ['1 ¼ kg potatoes', 1.25, 'kg', 'potatoes'],
    ['1/2 tsp salt', 0.5, 'tsp', 'salt'],
    ['1 1/2 tbsp oil', 1.5, 'tbsp', 'oil'],
  ])(
    'parses an unambiguous fraction in %s',
    (rawText, quantity, unit, name) => {
      expect(normalizeIngredients([rawText])).toEqual([
        { rawText, name, quantity, unit },
      ]);
    },
  );

  it('keeps an invalid fraction without inventing a quantity', () => {
    expect(normalizeIngredients(['1/0 tsp salt'])).toEqual([
      { rawText: '1/0 tsp salt', name: null, quantity: null, unit: null },
    ]);
  });

  it.each([
    [['2 eggs', null], 2],
    [['2 eggs', '  '], 2],
    [[4], 1],
  ])('rejects invalid ingredient in %j', (value, position) => {
    expect(() => normalizeIngredients(value)).toThrow(
      `Recipe ingredient at position ${position} must be a non-empty string`,
    );
  });

  it('accepts a single ingredient string and returns an empty list for missing data', () => {
    expect(normalizeIngredients('30g plain flour')).toHaveLength(1);
    expect(normalizeIngredients(undefined)).toEqual([]);
  });
});
