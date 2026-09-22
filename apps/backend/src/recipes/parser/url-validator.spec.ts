import { validateGoodFoodUrl } from './url-validator';

describe('validateGoodFoodUrl', () => {
  it.each([
    'https://www.bbcgoodfood.com/recipes/marry-me-chicken',
    'https://bbcgoodfood.com/recipes/marry-me-chicken',
    'https://www.bbcgoodfood.com:443/recipes/example',
  ])('accepts supported URL %s', (input) => {
    expect(validateGoodFoodUrl(input).hostname).toMatch(
      /^(www\.)?bbcgoodfood\.com$/,
    );
  });

  it.each([
    'not a URL',
    '/recipes/marry-me-chicken',
    'http://www.bbcgoodfood.com/recipes/example',
    'file:///recipes/example',
    'ftp://www.bbcgoodfood.com/recipes/example',
    'http://localhost:3000/recipes/example',
    'https://127.0.0.1/recipes/example',
    'https://example.com/recipes/example',
    'https://bbcgoodfood.com.evil.example/recipes/example',
    'https://www.bbcgoodfood.com%2e.evil.example/recipes/example',
    'https://other.bbcgoodfood.com/recipes/example',
    'https://bbcgoodfood.com./recipes/example',
    'https://www.bbcgoodfood.com:8443/recipes/example',
    'https://www.bbcgoodfood.com@127.0.0.1/recipes/example',
    'https://127.0.0.1@www.bbcgoodfood.com/recipes/example',
    'https://user@www.bbcgoodfood.com/recipes/example',
    'https://user:password@www.bbcgoodfood.com/recipes/example',
  ])('rejects unsupported URL %s', (input) => {
    expect(() => validateGoodFoodUrl(input)).toThrow();
  });
});
