jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { RecipeStatus } from './enums/recipe-status.enum';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { RecipeListItemResponse } from './types/recipe-response.types';

describe('RecipesController', () => {
  let recipesService: {
    findAllForUser: jest.Mock;
    findOneForUser: jest.Mock;
    deleteForUser: jest.Mock;
  };
  let recipesController: RecipesController;

  beforeEach(() => {
    recipesService = {
      findAllForUser: jest.fn(),
      findOneForUser: jest.fn(),
      deleteForUser: jest.fn(),
    };
    recipesController = new RecipesController(
      recipesService as unknown as RecipesService,
    );
  });

  describe('findAll', () => {
    it('loads recipes for the current user with query statuses', async () => {
      const response: RecipeListItemResponse[] = [];
      recipesService.findAllForUser.mockResolvedValue(response);

      await expect(
        recipesController.findAll(
          { id: 7 },
          { status: [RecipeStatus.PENDING, RecipeStatus.PROCESSING] },
        ),
      ).resolves.toBe(response);

      expect(recipesService.findAllForUser).toHaveBeenCalledWith(7, [
        RecipeStatus.PENDING,
        RecipeStatus.PROCESSING,
      ]);
    });
  });

  describe('findOne', () => {
    it('loads recipe details for the current user', async () => {
      const response = {
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
        ingredients: [],
        steps: [],
      };
      recipesService.findOneForUser.mockResolvedValue(response);

      await expect(recipesController.findOne({ id: 7 }, 1)).resolves.toBe(
        response,
      );

      expect(recipesService.findOneForUser).toHaveBeenCalledWith(7, 1);
    });
  });

  describe('delete', () => {
    it('deletes a recipe for the current user', async () => {
      recipesService.deleteForUser.mockResolvedValue(undefined);

      await expect(recipesController.delete({ id: 7 }, 1)).resolves.toBe(
        undefined,
      );

      expect(recipesService.deleteForUser).toHaveBeenCalledWith(7, 1);
    });
  });
});
