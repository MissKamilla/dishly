import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { ListRecipesQueryDto } from './list-recipes-query.dto';

describe('ListRecipesQueryDto', () => {
  it('allows missing status filter', async () => {
    const dto = plainToInstance(ListRecipesQueryDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.status).toBeUndefined();
  });

  it('transforms a single status into an array', async () => {
    const dto = plainToInstance(ListRecipesQueryDto, {
      status: RecipeStatus.PENDING,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.status).toEqual([RecipeStatus.PENDING]);
  });

  it('keeps repeated statuses as an array', async () => {
    const dto = plainToInstance(ListRecipesQueryDto, {
      status: [RecipeStatus.PENDING, RecipeStatus.PROCESSING],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.status).toEqual([RecipeStatus.PENDING, RecipeStatus.PROCESSING]);
  });

  it('rejects unknown statuses', async () => {
    const dto = plainToInstance(ListRecipesQueryDto, {
      status: 'random',
    });

    await expect(validate(dto)).resolves.toHaveLength(1);
  });
});
