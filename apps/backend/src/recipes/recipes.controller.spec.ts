jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
}));

import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { IS_PUBLIC_ROUTE_KEY } from '../auth/auth.constants';
import { RecipeStatus } from './enums/recipe-status.enum';
import { RecipeImportService } from './import/recipe-import.service';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { RecipeListItemResponse } from './types/recipe-response.types';

describe('RecipesController', () => {
  let recipesService: {
    findAllForUser: jest.Mock;
    findOneForUser: jest.Mock;
    deleteForUser: jest.Mock;
  };
  let recipeImportService: {
    requestImport: jest.Mock;
    requestRetry: jest.Mock;
  };
  let recipesController: RecipesController;

  beforeEach(() => {
    recipesService = {
      findAllForUser: jest.fn(),
      findOneForUser: jest.fn(),
      deleteForUser: jest.fn(),
    };
    recipeImportService = {
      requestImport: jest.fn(),
      requestRetry: jest.fn(),
    };
    recipesController = new RecipesController(
      recipesService as unknown as RecipesService,
      recipeImportService as unknown as RecipeImportService,
    );
  });

  const routes: [string, string, RequestMethod][] = [
    ['findAll', '/', RequestMethod.GET],
    ['findOne', ':id', RequestMethod.GET],
    ['delete', ':id', RequestMethod.DELETE],
    ['importRecipe', 'import', RequestMethod.POST],
    ['retryImport', ':id/retry', RequestMethod.POST],
  ];

  it.each(routes)('registers %s at %s with method %s', (name, path, method) => {
    const handler = Object.getOwnPropertyDescriptor(
      RecipesController.prototype,
      name,
    )?.value as object;

    expect(Reflect.getMetadata(PATH_METADATA, RecipesController)).toBe(
      'recipes',
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
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

  describe('importRecipe', () => {
    it('requests an import for the current user and returns 202 metadata', async () => {
      const response = {
        id: 42,
        title: null,
        sourceUrl: 'https://www.bbcgoodfood.com/recipes/example',
        imageUrl: null,
        servings: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        status: RecipeStatus.PENDING,
        createdAt: new Date('2026-09-28T10:00:00.000Z'),
        updatedAt: new Date('2026-09-28T10:00:00.000Z'),
      };
      recipeImportService.requestImport.mockResolvedValue(response);

      await expect(
        recipesController.importRecipe(
          { id: 7 },
          { url: 'https://www.bbcgoodfood.com/recipes/example' },
        ),
      ).resolves.toBe(response);

      expect(recipeImportService.requestImport).toHaveBeenCalledWith(
        7,
        'https://www.bbcgoodfood.com/recipes/example',
      );
      const importRecipeHandler = Object.getOwnPropertyDescriptor(
        RecipesController.prototype,
        'importRecipe',
      )?.value as object;

      expect(Reflect.getMetadata(HTTP_CODE_METADATA, importRecipeHandler)).toBe(
        HttpStatus.ACCEPTED,
      );
    });
  });

  describe('retryImport', () => {
    it('uses the current user and recipe id on a protected retry route', async () => {
      recipeImportService.requestRetry.mockResolvedValue(undefined);

      await expect(recipesController.retryImport({ id: 7 }, 42)).resolves.toBe(
        undefined,
      );
      expect(recipeImportService.requestRetry).toHaveBeenCalledWith(7, 42);

      const retryHandler = Object.getOwnPropertyDescriptor(
        RecipesController.prototype,
        'retryImport',
      )?.value as object;

      expect(Reflect.getMetadata(PATH_METADATA, retryHandler)).toBe(
        ':id/retry',
      );
      expect(Reflect.getMetadata(METHOD_METADATA, retryHandler)).toBe(
        RequestMethod.POST,
      );
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, retryHandler)).toBe(
        HttpStatus.ACCEPTED,
      );
      expect(Reflect.getMetadata(IS_PUBLIC_ROUTE_KEY, retryHandler)).toBe(
        undefined,
      );
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
