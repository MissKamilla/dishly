import { fetchHtml } from './html-fetcher';
import {
  RecipeParserError,
  RecipeParserErrorCode,
} from './recipe-parser.error';
import { RecipeParserService } from './recipe-parser.service';

jest.mock('./html-fetcher', () => ({ fetchHtml: jest.fn() }));

const SOURCE_URL = 'https://www.bbcgoodfood.com/recipes/soup';
const mockedFetchHtml = jest.mocked(fetchHtml);

function htmlWithRecipe(recipe: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify(recipe)}</script>`;
}

describe('RecipeParserService', () => {
  const parser = new RecipeParserService();

  beforeEach(() => mockedFetchHtml.mockReset());

  it('returns a normalized and validated ParsedRecipe', async () => {
    mockedFetchHtml.mockResolvedValue(
      htmlWithRecipe({
        '@type': 'Recipe',
        name: ' Onion soup ',
        description: '<p>Simple &amp; warming.</p>',
        image: '/images/soup.jpg',
        recipeYield: '4 servings',
        prepTime: 'PT14M30S',
        cookTime: 'PT1H',
        recipeIngredient: ['2 onions'],
        recipeInstructions: [{ '@type': 'HowToStep', text: 'Chop onions.' }],
      }),
    );

    await expect(parser.parse(SOURCE_URL)).resolves.toEqual({
      title: 'Onion soup',
      description: 'Simple & warming.',
      imageUrl: 'https://www.bbcgoodfood.com/images/soup.jpg',
      servings: 4,
      prepTimeMinutes: 15,
      cookTimeMinutes: 60,
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
    });
    expect(mockedFetchHtml).toHaveBeenCalledWith(SOURCE_URL);
  });

  it('returns null for every absent optional field', async () => {
    mockedFetchHtml.mockResolvedValue(
      htmlWithRecipe({
        '@type': 'Recipe',
        name: 'Minimal soup',
        recipeIngredient: ['1 onion'],
        recipeInstructions: ['Cook.'],
      }),
    );

    await expect(parser.parse(SOURCE_URL)).resolves.toEqual({
      title: 'Minimal soup',
      description: null,
      imageUrl: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: [
        { rawText: '1 onion', name: 'onion', quantity: 1, unit: null },
      ],
      steps: [
        {
          text: 'Cook.',
          group: null,
          durationMinutes: null,
          imageUrl: null,
        },
      ],
    });
  });

  it('rejects an unsupported URL before fetching', async () => {
    await expect(
      parser.parse('https://example.com/recipe'),
    ).rejects.toMatchObject({
      code: RecipeParserErrorCode.UNSUPPORTED_URL,
      message: 'Unsupported Good Food URL',
      retryable: false,
    });
    expect(mockedFetchHtml).not.toHaveBeenCalled();
  });

  it('rejects a recipe missing essential data', async () => {
    mockedFetchHtml.mockResolvedValue(
      htmlWithRecipe({
        '@type': 'Recipe',
        name: 'Soup',
        recipeIngredient: ['2 onions'],
      }),
    );

    await expect(parser.parse(SOURCE_URL)).rejects.toMatchObject({
      code: RecipeParserErrorCode.INVALID_RECIPE_DATA,
      message: 'Parsed recipe must have at least one step',
      retryable: false,
    });
  });

  it('propagates HTML fetch errors', async () => {
    mockedFetchHtml.mockRejectedValue(
      new Error('Failed to fetch Good Food HTML'),
    );
    await expect(parser.parse(SOURCE_URL)).rejects.toMatchObject({
      code: RecipeParserErrorCode.FETCH_FAILED,
      message: 'Failed to fetch Good Food HTML',
      retryable: true,
    });
  });

  it.each([
    [403, false],
    [429, true],
    [503, true],
  ])(
    'classifies an HTTP %i fetch failure as retryable=%s',
    async (status, retryable) => {
      mockedFetchHtml.mockRejectedValue(
        new Error(`Good Food returned HTTP ${status}`),
      );

      await expect(parser.parse(SOURCE_URL)).rejects.toMatchObject({
        code: RecipeParserErrorCode.FETCH_FAILED,
        message: `Good Food returned HTTP ${status}`,
        retryable,
      });
    },
  );

  it('marks a timeout as retryable', async () => {
    mockedFetchHtml.mockRejectedValue(
      new Error('Good Food HTML request timed out'),
    );

    await expect(parser.parse(SOURCE_URL)).rejects.toMatchObject({
      code: RecipeParserErrorCode.FETCH_FAILED,
      retryable: true,
    });
  });

  it('reports missing Recipe data separately from invalid recipe fields', async () => {
    mockedFetchHtml.mockResolvedValue(
      '<script type="application/ld+json">{"@type":"WebPage"}</script>',
    );

    await expect(parser.parse(SOURCE_URL)).rejects.toMatchObject({
      code: RecipeParserErrorCode.RECIPE_NOT_FOUND,
      message: 'Recipe not found in JSON-LD',
      retryable: false,
    });
  });

  it('uses one public parser error type', async () => {
    mockedFetchHtml.mockResolvedValue('<html></html>');

    await expect(parser.parse(SOURCE_URL)).rejects.toBeInstanceOf(
      RecipeParserError,
    );
  });
});
