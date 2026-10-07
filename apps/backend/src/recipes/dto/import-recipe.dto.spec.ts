import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ImportRecipeDto } from './import-recipe.dto';

describe('ImportRecipeDto', () => {
  it('accepts a non-empty URL string within the length limit', async () => {
    const dto = plainToInstance(ImportRecipeDto, {
      url: 'https://www.bbcgoodfood.com/recipes/marry-me-chicken',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    ['missing', {}],
    ['empty', { url: '' }],
    ['non-string', { url: 42 }],
    ['too long', { url: `https://www.bbcgoodfood.com/${'a'.repeat(2049)}` }],
  ])('rejects a %s url', async (_caseName, input) => {
    const dto = plainToInstance(ImportRecipeDto, input);

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
