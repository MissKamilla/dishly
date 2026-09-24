import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractJsonLd } from './json-ld.extractor';
import { findRecipeInJsonLd } from './json-ld.recipe-finder';
import { normalizeSteps } from './step.normalizer';

const SOURCE_URL = 'https://www.bbcgoodfood.com/recipes/fixture';

function readFixture(name: string): string {
  return readFileSync(join(__dirname, '__fixtures__', name), 'utf8');
}

function recipeFromFixture(name: string): Record<string, unknown> {
  return findRecipeInJsonLd(extractJsonLd(readFixture(name)));
}

describe('parser HTML fixtures', () => {
  it.each([
    ['valid-recipe.html', 'Fixture soup'],
    ['graph-recipe.html', 'Graph soup'],
    ['array-recipe.html', 'Array soup'],
  ])('finds Recipe in %s', (fixture, title) => {
    expect(recipeFromFixture(fixture).name).toBe(title);
  });

  it('preserves HowToSection steps and their group', () => {
    const recipe = recipeFromFixture('section-recipe.html');

    expect(normalizeSteps(recipe.recipeInstructions, SOURCE_URL)).toEqual([
      {
        text: 'Boil the potatoes.',
        group: 'For the soup',
        durationMinutes: null,
        imageUrl: null,
      },
      {
        text: 'Blend until smooth.',
        group: 'For the soup',
        durationMinutes: null,
        imageUrl: null,
      },
    ]);
  });

  it('reports a fixture without Recipe data', () => {
    expect(() => recipeFromFixture('no-recipe.html')).toThrow(
      'Recipe not found in JSON-LD',
    );
  });

  it('reports a fixture with malformed JSON-LD', () => {
    expect(() => extractJsonLd(readFixture('malformed-json-ld.html'))).toThrow(
      'All JSON-LD scripts are malformed',
    );
  });
});
