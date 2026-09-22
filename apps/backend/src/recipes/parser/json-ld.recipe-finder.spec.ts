import { findRecipeInJsonLd } from './json-ld.recipe-finder';

describe('findRecipeInJsonLd', () => {
  it('finds a direct Recipe object', () => {
    const recipe = { '@type': 'Recipe', name: 'Chicken Pasta' };

    expect(findRecipeInJsonLd([recipe])).toBe(recipe);
  });

  it('finds Recipe after another object in an array', () => {
    const recipe = { '@type': 'Recipe', name: 'Pasta' };

    expect(findRecipeInJsonLd([[{ '@type': 'BreadcrumbList' }, recipe]])).toBe(
      recipe,
    );
  });

  it('finds Recipe inside @graph', () => {
    const recipe = { '@type': 'Recipe', name: 'Soup' };

    expect(
      findRecipeInJsonLd([{ '@graph': [{ '@type': 'WebPage' }, recipe] }]),
    ).toBe(recipe);
  });

  it('recognizes Recipe in an array of @type values', () => {
    const recipe = { '@type': ['CreativeWork', 'Recipe'], name: 'Pie' };

    expect(findRecipeInJsonLd([recipe])).toBe(recipe);
  });

  it('finds Recipe in a common nested mainEntity/item structure', () => {
    const recipe = { '@type': 'Recipe', name: 'Cake' };

    expect(
      findRecipeInJsonLd([
        { '@type': 'WebPage', mainEntity: { item: recipe } },
      ]),
    ).toBe(recipe);
  });

  it('rejects JSON-LD without Recipe', () => {
    expect(() => findRecipeInJsonLd([{ '@type': 'BreadcrumbList' }])).toThrow(
      'Recipe not found in JSON-LD',
    );
  });

  it('distinguishes missing JSON-LD from JSON-LD without Recipe', () => {
    expect(() => findRecipeInJsonLd([])).toThrow('No JSON-LD data found');
  });

  it('rejects ambiguous pages with multiple Recipe objects', () => {
    expect(() =>
      findRecipeInJsonLd([
        { '@type': 'Recipe', name: 'First' },
        { '@graph': [{ '@type': 'Recipe', name: 'Second' }] },
      ]),
    ).toThrow('Multiple Recipe objects found in JSON-LD');
  });
});
