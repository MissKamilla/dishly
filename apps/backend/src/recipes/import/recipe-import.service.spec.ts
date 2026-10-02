jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager, FindOperator, Repository } from 'typeorm';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';
import { RecipeStep } from '../entities/recipe-step.entity';
import { Recipe } from '../entities/recipe.entity';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { RecipeParserErrorCode } from '../parser/recipe-parser.error';
import { ParsedRecipe } from '../parser/types/parsed-recipe';
import { RecipeImportQueue } from '../queue/recipe-import.queue';
import { RecipeImportService } from './recipe-import.service';

describe('RecipeImportService', () => {
  let recipesRepository: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOneBy: jest.Mock;
  };
  let recipeImportQueue: {
    enqueue: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };
  let recipeImportService: RecipeImportService;

  beforeEach(() => {
    recipesRepository = {
      create: jest.fn((recipe: Partial<Recipe>) => recipe as Recipe),
      save: jest.fn((recipe: Recipe) =>
        Promise.resolve(createSavedRecipe(recipe)),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOneBy: jest.fn(),
    };
    recipeImportQueue = {
      enqueue: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    dataSource = {
      transaction: jest.fn(),
    };
    recipeImportService = new RecipeImportService(
      recipesRepository as unknown as Repository<Recipe>,
      recipeImportQueue as unknown as RecipeImportQueue,
      dataSource as unknown as DataSource,
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

  it('returns 404 for a missing or other-user recipe retry', async () => {
    recipesRepository.update.mockResolvedValue({ affected: 0 });
    recipesRepository.findOneBy.mockResolvedValue(null);

    await expect(
      recipeImportService.requestRetry(7, 42),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(recipesRepository.findOneBy).toHaveBeenCalledWith({
      id: 42,
      userId: 7,
    });
    expect(recipesRepository.update).toHaveBeenCalledWith(
      { id: 42, userId: 7, status: RecipeStatus.FAILED },
      { status: RecipeStatus.PENDING, errorMessage: null },
    );
    expect(recipeImportQueue.enqueue).not.toHaveBeenCalled();
  });

  it.each([
    RecipeStatus.PENDING,
    RecipeStatus.PROCESSING,
    RecipeStatus.COMPLETED,
  ])('returns 409 when retrying a %s recipe', async (status) => {
    recipesRepository.update.mockResolvedValue({ affected: 0 });
    recipesRepository.findOneBy.mockResolvedValue({ id: 42, status });

    await expect(
      recipeImportService.requestRetry(7, 42),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(recipesRepository.findOneBy).toHaveBeenCalledWith({
      id: 42,
      userId: 7,
    });
    expect(recipeImportQueue.enqueue).not.toHaveBeenCalled();
  });

  it('resets a failed recipe before enqueueing a retry', async () => {
    await expect(
      recipeImportService.requestRetry(7, 42),
    ).resolves.toBeUndefined();

    expect(recipesRepository.update).toHaveBeenCalledWith(
      { id: 42, userId: 7, status: RecipeStatus.FAILED },
      { status: RecipeStatus.PENDING, errorMessage: null },
    );
    expect(recipesRepository.findOneBy).not.toHaveBeenCalled();
    expect(recipeImportQueue.enqueue).toHaveBeenCalledWith(42);
    expect(recipesRepository.update.mock.invocationCallOrder[0]).toBeLessThan(
      recipeImportQueue.enqueue.mock.invocationCallOrder[0],
    );
  });

  it('restores failed status and returns 503 when retry enqueue fails', async () => {
    const queueError = new Error('Redis unavailable: cookie=fake-session');
    recipeImportQueue.enqueue.mockRejectedValue(queueError);

    await expect(recipeImportService.requestRetry(7, 42)).rejects.toMatchObject(
      {
        constructor: ServiceUnavailableException,
        message: 'Recipe import is temporarily unavailable',
        cause: queueError,
      },
    );

    expect(recipesRepository.update).toHaveBeenNthCalledWith(
      1,
      { id: 42, userId: 7, status: RecipeStatus.FAILED },
      { status: RecipeStatus.PENDING, errorMessage: null },
    );
    expect(recipesRepository.update).toHaveBeenNthCalledWith(
      2,
      { id: 42, userId: 7, status: RecipeStatus.PENDING },
      { status: RecipeStatus.FAILED, errorMessage: 'queue_unavailable' },
    );
    expect(recipesRepository.update).toHaveBeenCalledTimes(2);
    expect(recipesRepository.update.mock.invocationCallOrder[0]).toBeLessThan(
      recipeImportQueue.enqueue.mock.invocationCallOrder[0],
    );
    expect(recipeImportQueue.enqueue.mock.invocationCallOrder[0]).toBeLessThan(
      recipesRepository.update.mock.invocationCallOrder[1],
    );
  });

  it('enqueues only once for two concurrent retry requests', async () => {
    let currentStatus: RecipeStatus = RecipeStatus.FAILED;
    recipesRepository.update.mockImplementation(
      (criteria: { status: RecipeStatus }) => {
        if (currentStatus !== criteria.status) {
          return Promise.resolve({ affected: 0 });
        }

        currentStatus = RecipeStatus.PENDING;
        return Promise.resolve({ affected: 1 });
      },
    );
    recipesRepository.findOneBy.mockImplementation(() =>
      Promise.resolve({
        id: 42,
        status: currentStatus,
      }),
    );

    const results = await Promise.allSettled([
      recipeImportService.requestRetry(7, 42),
      recipeImportService.requestRetry(7, 42),
    ]);

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    if (results[1].status === 'rejected') {
      expect(results[1].reason).toBeInstanceOf(ConflictException);
    }
    expect(recipesRepository.update).toHaveBeenCalledTimes(2);
    expect(recipeImportQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(recipeImportQueue.enqueue).toHaveBeenCalledWith(42);
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

  it('loads a recipe for processing by its database id', async () => {
    const recipe = createSavedRecipe({} as Recipe);
    recipesRepository.findOneBy.mockResolvedValue(recipe);

    await expect(recipeImportService.findForProcessing(42)).resolves.toBe(
      recipe,
    );
    expect(recipesRepository.findOneBy).toHaveBeenCalledWith({ id: 42 });
  });

  it('transitions a processable recipe to processing and clears its error', async () => {
    await expect(recipeImportService.prepareForProcessing(42)).resolves.toBe(
      true,
    );

    const calls = recipesRepository.update.mock.calls as unknown[][];
    const [criteria, update] = calls[0] as [
      { id: number; status: FindOperator<RecipeStatus> },
      Partial<Recipe>,
    ];

    expect(criteria.id).toBe(42);
    expect(criteria.status.value).toEqual([
      RecipeStatus.PENDING,
      RecipeStatus.PROCESSING,
    ]);
    expect(update).toEqual({
      status: RecipeStatus.PROCESSING,
      errorMessage: null,
    });
  });

  it.each([
    RecipeParserErrorCode.RECIPE_NOT_FOUND,
    'unexpected_import_error' as const,
  ])(
    'stores safe error code %s for a processable recipe',
    async (errorCode) => {
      await recipeImportService.failImport(42, errorCode);

      const calls = recipesRepository.update.mock.calls as unknown[][];
      const [criteria, update] = calls[0] as [
        { id: number; status: FindOperator<RecipeStatus> },
        Partial<Recipe>,
      ];

      expect(criteria.id).toBe(42);
      expect(criteria.status.value).toEqual([
        RecipeStatus.PENDING,
        RecipeStatus.PROCESSING,
      ]);
      expect(update).toEqual({
        status: RecipeStatus.FAILED,
        errorMessage: errorCode,
      });
    },
  );

  it('atomically replaces children and completes the recipe', async () => {
    const parsedRecipe = createParsedRecipe();
    const transactionalRecipeRepository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 42,
        status: RecipeStatus.PROCESSING,
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const transactionalIngredientRepository = createChildRepository();
    const transactionalStepRepository = createChildRepository();
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Recipe) return transactionalRecipeRepository;
        if (entity === RecipeIngredient)
          return transactionalIngredientRepository;
        if (entity === RecipeStep) return transactionalStepRepository;
        throw new Error('Unexpected entity');
      }),
    };
    dataSource.transaction.mockImplementation(
      (callback: (transactionManager: EntityManager) => Promise<boolean>) =>
        callback(manager as unknown as EntityManager),
    );

    await expect(
      recipeImportService.completeImport(42, parsedRecipe),
    ).resolves.toBe(true);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionalIngredientRepository.delete).toHaveBeenCalledWith({
      recipeId: 42,
    });
    expect(transactionalStepRepository.delete).toHaveBeenCalledWith({
      recipeId: 42,
    });
    expect(transactionalIngredientRepository.create).toHaveBeenCalledWith([
      {
        rawText: '200g pasta',
        name: 'pasta',
        quantity: 200,
        unit: 'g',
        recipeId: 42,
        position: 1,
      },
      {
        rawText: 'salt to taste',
        name: 'salt',
        quantity: null,
        unit: null,
        recipeId: 42,
        position: 2,
      },
    ]);
    expect(transactionalStepRepository.create).toHaveBeenCalledWith([
      {
        text: 'Boil pasta',
        group: 'Pasta',
        durationMinutes: 10,
        imageUrl: null,
        recipeId: 42,
        position: 1,
      },
    ]);
    expect(transactionalRecipeRepository.update).toHaveBeenCalledWith(
      { id: 42, status: RecipeStatus.PROCESSING },
      {
        title: 'Pasta',
        description: 'Simple pasta',
        imageUrl: 'https://example.com/pasta.jpg',
        servings: 2,
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        status: RecipeStatus.COMPLETED,
        errorMessage: null,
      },
    );
    expect(
      transactionalIngredientRepository.save.mock.invocationCallOrder[0],
    ).toBeLessThan(
      transactionalRecipeRepository.update.mock.invocationCallOrder[0],
    );
    expect(
      transactionalStepRepository.save.mock.invocationCallOrder[0],
    ).toBeLessThan(
      transactionalRecipeRepository.update.mock.invocationCallOrder[0],
    );
    expect(recipesRepository.update).not.toHaveBeenCalled();
  });

  it('does not recreate a recipe deleted before persistence', async () => {
    const transactionalRecipeRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    };
    const transactionalIngredientRepository = createChildRepository();
    const transactionalStepRepository = createChildRepository();
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Recipe) return transactionalRecipeRepository;
        if (entity === RecipeIngredient)
          return transactionalIngredientRepository;
        if (entity === RecipeStep) return transactionalStepRepository;
        throw new Error('Unexpected entity');
      }),
    };
    dataSource.transaction.mockImplementation(
      (callback: (transactionManager: EntityManager) => Promise<boolean>) =>
        callback(manager as unknown as EntityManager),
    );

    await expect(
      recipeImportService.completeImport(42, createParsedRecipe()),
    ).resolves.toBe(false);

    expect(transactionalRecipeRepository.findOneBy).toHaveBeenCalledWith({
      id: 42,
      status: RecipeStatus.PROCESSING,
    });
    expect(transactionalRecipeRepository.update).not.toHaveBeenCalled();
    expect(transactionalIngredientRepository.delete).not.toHaveBeenCalled();
    expect(transactionalIngredientRepository.save).not.toHaveBeenCalled();
    expect(transactionalStepRepository.delete).not.toHaveBeenCalled();
    expect(transactionalStepRepository.save).not.toHaveBeenCalled();
  });
});

function createChildRepository(): {
  delete: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
} {
  return {
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    create: jest.fn((children: unknown[]) => children),
    save: jest.fn().mockResolvedValue([]),
  };
}

function createParsedRecipe(): ParsedRecipe {
  return {
    title: 'Pasta',
    description: 'Simple pasta',
    imageUrl: 'https://example.com/pasta.jpg',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    ingredients: [
      {
        rawText: '200g pasta',
        name: 'pasta',
        quantity: 200,
        unit: 'g',
      },
      {
        rawText: 'salt to taste',
        name: 'salt',
        quantity: null,
        unit: null,
      },
    ],
    steps: [
      {
        text: 'Boil pasta',
        group: 'Pasta',
        durationMinutes: 10,
        imageUrl: null,
      },
    ],
  };
}

function createSavedRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    id: 42,
    createdAt: new Date('2026-09-28T10:00:00.000Z'),
    updatedAt: new Date('2026-09-28T10:00:00.000Z'),
  };
}
