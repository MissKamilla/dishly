jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { NotFoundException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipeStep } from './entities/recipe-step.entity';
import { Recipe } from './entities/recipe.entity';
import { RecipeStatus } from './enums/recipe-status.enum';
import { RecipesService } from './recipes.service';

describe('RecipesService', () => {
  let recipesRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };
  let recipesService: RecipesService;

  beforeEach(() => {
    recipesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    recipesService = new RecipesService(
      recipesRepository as unknown as Repository<Recipe>,
    );
  });

  describe('findAllForUser', () => {
    it('loads only recipes for the current user sorted by newest first', async () => {
      recipesRepository.find.mockResolvedValue([createRecipe()]);

      await expect(recipesService.findAllForUser(7)).resolves.toEqual([
        {
          id: 1,
          title: 'Pasta',
          sourceUrl: 'https://www.bbcgoodfood.com/recipes/pasta',
          imageUrl: null,
          servings: 2,
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
          status: RecipeStatus.PENDING,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          updatedAt: new Date('2026-01-03T00:00:00.000Z'),
        },
      ]);

      expect(recipesRepository.find).toHaveBeenCalledWith({
        where: { userId: 7 },
        order: { createdAt: 'DESC' },
      });
      expect(recipesRepository.find).toHaveBeenCalledTimes(1);
      expect(recipesRepository.findOne).not.toHaveBeenCalled();
      expect(getFirstFindCallOptions()).not.toHaveProperty('relations');
    });

    it('applies a status filter when statuses are provided', async () => {
      recipesRepository.find.mockResolvedValue([]);

      await recipesService.findAllForUser(7, [
        RecipeStatus.PENDING,
        RecipeStatus.PROCESSING,
      ]);

      expect(recipesRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 7,
          status: In([RecipeStatus.PENDING, RecipeStatus.PROCESSING]),
        },
        order: { createdAt: 'DESC' },
      });
    });

    it('does not add a status filter for an empty statuses array', async () => {
      recipesRepository.find.mockResolvedValue([]);

      await recipesService.findAllForUser(7, []);

      expect(recipesRepository.find).toHaveBeenCalledWith({
        where: { userId: 7 },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOneForUser', () => {
    it('loads a recipe for the current user with ordered ingredients and steps', async () => {
      recipesRepository.findOne.mockResolvedValue(
        createRecipe({
          ingredients: [
            createIngredient({ id: 10, position: 1 }),
            createIngredient({ id: 11, position: 2 }),
          ],
          steps: [
            createStep({ id: 20, position: 1 }),
            createStep({ id: 21, position: 2 }),
          ],
        }),
      );

      await expect(recipesService.findOneForUser(7, 1)).resolves.toEqual({
        id: 1,
        title: 'Pasta',
        description: 'Simple pasta',
        sourceUrl: 'https://www.bbcgoodfood.com/recipes/pasta',
        imageUrl: null,
        servings: 2,
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        status: RecipeStatus.PENDING,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
        ingredients: [
          {
            id: 10,
            rawText: '200g pasta',
            name: 'pasta',
            quantity: 200,
            unit: 'g',
            position: 1,
          },
          {
            id: 11,
            rawText: '200g pasta',
            name: 'pasta',
            quantity: 200,
            unit: 'g',
            position: 2,
          },
        ],
        steps: [
          {
            id: 20,
            text: 'Boil pasta',
            group: null,
            durationMinutes: 10,
            imageUrl: null,
            position: 1,
          },
          {
            id: 21,
            text: 'Boil pasta',
            group: null,
            durationMinutes: 10,
            imageUrl: null,
            position: 2,
          },
        ],
      });

      expect(recipesRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: 7,
        },
        relations: {
          ingredients: true,
          steps: true,
        },
        order: {
          ingredients: {
            position: 'ASC',
          },
          steps: {
            position: 'ASC',
          },
        },
      });
      expect(recipesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(recipesRepository.find).not.toHaveBeenCalled();
    });

    it('throws not found when the recipe does not exist for the current user', async () => {
      recipesRepository.findOne.mockResolvedValue(null);

      await expect(recipesService.findOneForUser(7, 999)).rejects.toMatchObject(
        {
          constructor: NotFoundException,
          message: 'Recipe not found',
        },
      );
    });

    it('throws not found when the recipe belongs to another user', async () => {
      recipesRepository.findOne.mockResolvedValue(null);

      await expect(recipesService.findOneForUser(7, 1)).rejects.toMatchObject({
        constructor: NotFoundException,
        message: 'Recipe not found',
      });

      expect(recipesRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 1,
            userId: 7,
          },
        }),
      );
    });
  });

  describe('deleteForUser', () => {
    it('deletes a recipe for the current user', async () => {
      recipesRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(recipesService.deleteForUser(7, 1)).resolves.toBeUndefined();

      expect(recipesRepository.delete).toHaveBeenCalledWith({
        id: 1,
        userId: 7,
      });
    });

    it('throws not found when no recipe was deleted for the current user', async () => {
      recipesRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(recipesService.deleteForUser(7, 999)).rejects.toMatchObject({
        constructor: NotFoundException,
        message: 'Recipe not found',
      });
    });

    it('throws not found when deleting a recipe that belongs to another user', async () => {
      recipesRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(recipesService.deleteForUser(7, 1)).rejects.toMatchObject({
        constructor: NotFoundException,
        message: 'Recipe not found',
      });

      expect(recipesRepository.delete).toHaveBeenCalledWith({
        id: 1,
        userId: 7,
      });
    });
  });

  function getFirstFindCallOptions(): unknown {
    const calls = recipesRepository.find.mock.calls as unknown[][];

    return calls[0]?.[0];
  }
});

function createRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 1,
    title: 'Pasta',
    description: 'Simple pasta',
    sourceUrl: 'https://www.bbcgoodfood.com/recipes/pasta',
    imageUrl: null,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    status: RecipeStatus.PENDING,
    errorMessage: 'Internal parser detail',
    userId: 7,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    user: undefined as unknown as Recipe['user'],
    ingredients: [],
    steps: [],
    ...overrides,
  };
}

function createIngredient(
  overrides: Partial<RecipeIngredient> = {},
): RecipeIngredient {
  return {
    id: 10,
    rawText: '200g pasta',
    name: 'pasta',
    quantity: 200,
    unit: 'g',
    position: 1,
    recipeId: 1,
    recipe: undefined as unknown as Recipe,
    ...overrides,
  };
}

function createStep(overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 20,
    text: 'Boil pasta',
    group: null,
    durationMinutes: 10,
    imageUrl: null,
    position: 1,
    recipeId: 1,
    recipe: undefined as unknown as Recipe,
    ...overrides,
  };
}
