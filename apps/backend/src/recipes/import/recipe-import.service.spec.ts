jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
}));

import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Recipe } from '../entities/recipe.entity';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { RecipeImportQueue } from '../queue/recipe-import.queue';
import { RecipeImportService } from './recipe-import.service';

describe('RecipeImportService', () => {
  let recipesRepository: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let recipeImportQueue: {
    enqueue: jest.Mock;
  };
  let recipeImportService: RecipeImportService;

  beforeEach(() => {
    recipesRepository = {
      create: jest.fn((recipe: Partial<Recipe>) => recipe as Recipe),
      save: jest.fn((recipe: Recipe) =>
        Promise.resolve(createSavedRecipe(recipe)),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    recipeImportQueue = {
      enqueue: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    recipeImportService = new RecipeImportService(
      recipesRepository as unknown as Repository<Recipe>,
      recipeImportQueue as unknown as RecipeImportQueue,
    );
  });

  it('creates a pending recipe with a canonical source URL', async () => {
    await expect(
      recipeImportService.requestImport(
        7,
        'https://www.bbcgoodfood.com:443/recipes/../recipes/example',
      ),
    ).resolves.toEqual({
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
    });

    expect(recipesRepository.create).toHaveBeenCalledWith({
      title: null,
      description: null,
      sourceUrl: 'https://www.bbcgoodfood.com/recipes/example',
      imageUrl: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      status: RecipeStatus.PENDING,
      errorMessage: null,
      userId: 7,
    });
    expect(recipesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceUrl: 'https://www.bbcgoodfood.com/recipes/example',
        status: RecipeStatus.PENDING,
        userId: 7,
      }),
    );
    expect(recipeImportQueue.enqueue).toHaveBeenCalledWith(42);
    expect(recipesRepository.update).not.toHaveBeenCalled();
    expect(recipesRepository.save.mock.invocationCallOrder[0]).toBeLessThan(
      recipeImportQueue.enqueue.mock.invocationCallOrder[0],
    );
  });

  it('marks the recipe as failed and returns 503 when enqueue fails', async () => {
    const queueError = new Error('Redis unavailable');
    recipeImportQueue.enqueue.mockRejectedValue(queueError);

    await expect(
      recipeImportService.requestImport(
        7,
        'https://www.bbcgoodfood.com/recipes/example',
      ),
    ).rejects.toMatchObject({
      constructor: ServiceUnavailableException,
      message: 'Recipe import is temporarily unavailable',
      cause: queueError,
    });

    expect(recipesRepository.update).toHaveBeenCalledWith(
      { id: 42, status: RecipeStatus.PENDING },
      {
        status: RecipeStatus.FAILED,
        errorMessage: 'queue_unavailable',
      },
    );
  });

  it.each([
    'https://example.com/recipes/example',
    'http://localhost/recipes/example',
  ])('rejects unsupported URL %s before creating a recipe', async (url) => {
    await expect(
      recipeImportService.requestImport(7, url),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(recipesRepository.create).not.toHaveBeenCalled();
    expect(recipesRepository.save).not.toHaveBeenCalled();
    expect(recipesRepository.update).not.toHaveBeenCalled();
    expect(recipeImportQueue.enqueue).not.toHaveBeenCalled();
  });
});

function createSavedRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    id: 42,
    createdAt: new Date('2026-09-28T10:00:00.000Z'),
    updatedAt: new Date('2026-09-28T10:00:00.000Z'),
  };
}
