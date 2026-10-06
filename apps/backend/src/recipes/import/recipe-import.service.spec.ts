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
  const token = '8f753a75-d158-430b-8fac-310402539abe';
  let recipesRepository: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    find: jest.Mock;
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
      find: jest.fn().mockResolvedValue([]),
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
      processingJobId: null,
      processingToken: null,
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
    expect(recipeImportQueue.enqueue).toHaveBeenCalledTimes(1);
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

    expect(recipesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: RecipeStatus.PENDING,
        userId: 7,
      }),
    );
    expect(recipesRepository.save).toHaveBeenCalledTimes(1);
    expect(recipeImportQueue.enqueue).toHaveBeenCalledWith(42);
    expect(recipesRepository.update).toHaveBeenCalledWith(
      { id: 42, userId: 7, status: RecipeStatus.PENDING },
      {
        status: RecipeStatus.FAILED,
        errorMessage: 'queue_unavailable',
      },
    );
    expect(recipesRepository.update).toHaveBeenCalledTimes(1);
    expect(recipesRepository.save.mock.invocationCallOrder[0]).toBeLessThan(
      recipeImportQueue.enqueue.mock.invocationCallOrder[0],
    );
    expect(recipeImportQueue.enqueue.mock.invocationCallOrder[0]).toBeLessThan(
      recipesRepository.update.mock.invocationCallOrder[0],
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
      {
        status: RecipeStatus.PENDING,
        errorMessage: null,
        processingJobId: null,
        processingToken: null,
      },
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
      {
        status: RecipeStatus.PENDING,
        errorMessage: null,
        processingJobId: null,
        processingToken: null,
      },
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
      {
        status: RecipeStatus.PENDING,
        errorMessage: null,
        processingJobId: null,
        processingToken: null,
      },
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
    'not-a-url',
    'https://example.com/recipes/example',
    'http://localhost/recipes/example',
  ])(
    'rejects invalid or unsupported URL %s before creating a recipe',
    async (url) => {
      await expect(
        recipeImportService.requestImport(7, url),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(recipesRepository.create).not.toHaveBeenCalled();
      expect(recipesRepository.save).not.toHaveBeenCalled();
      expect(recipesRepository.update).not.toHaveBeenCalled();
      expect(recipeImportQueue.enqueue).not.toHaveBeenCalled();
    },
  );

  it('loads a recipe for processing by its database id', async () => {
    const recipe = createSavedRecipe({} as Recipe);
    recipesRepository.findOneBy.mockResolvedValue(recipe);

    await expect(recipeImportService.findForProcessing(42)).resolves.toBe(
      recipe,
    );
    expect(recipesRepository.findOneBy).toHaveBeenCalledWith({ id: 42 });
  });

  it('claims only a pending recipe for processing and clears its error', async () => {
    await expect(
      recipeImportService.prepareForProcessing(42, 'job-42', token),
    ).resolves.toBe(true);

    const calls = recipesRepository.update.mock.calls as unknown[][];
    const [criteria, update] = calls[0] as [
      { id: number; status: RecipeStatus },
      Partial<Recipe>,
    ];

    expect(criteria.id).toBe(42);
    expect(criteria.status).toBe(RecipeStatus.PENDING);
    expect(update).toEqual({
      status: RecipeStatus.PROCESSING,
      errorMessage: null,
      processingJobId: 'job-42',
      processingToken: token,
    });

    recipesRepository.update.mockResolvedValue({ affected: 0 });
    await expect(
      recipeImportService.prepareForProcessing(42, 'job-42', token),
    ).resolves.toBe(false);
  });

  it('returns a failed attempt to pending before BullMQ retries it', async () => {
    await recipeImportService.releaseForRetry(42, token);

    expect(recipesRepository.update).toHaveBeenCalledWith(
      { id: 42, status: RecipeStatus.PROCESSING, processingToken: token },
      {
        status: RecipeStatus.PENDING,
        processingJobId: null,
        processingToken: null,
      },
    );
  });

  it('reclaims a processing recipe only for the same BullMQ job', async () => {
    recipesRepository.update
      .mockResolvedValueOnce({ affected: 0 })
      .mockResolvedValueOnce({ affected: 1 });

    await expect(
      recipeImportService.prepareForProcessing(42, 'job-42', token),
    ).resolves.toBe(true);

    expect(recipesRepository.update).toHaveBeenNthCalledWith(
      2,
      {
        id: 42,
        status: RecipeStatus.PROCESSING,
        processingJobId: 'job-42',
      },
      {
        status: RecipeStatus.PROCESSING,
        errorMessage: null,
        processingJobId: 'job-42',
        processingToken: token,
      },
    );
  });

  it('fences status changes from an earlier execution', async () => {
    recipesRepository.update.mockResolvedValue({ affected: 0 });

    await recipeImportService.releaseForRetry(42, token);
    await recipeImportService.failImport(
      42,
      token,
      RecipeParserErrorCode.FETCH_FAILED,
    );

    for (const [criteria] of recipesRepository.update.mock.calls as [
      { processingToken: string },
    ][]) {
      expect(criteria.processingToken).toBe(token);
    }
  });

  it.each([
    RecipeParserErrorCode.RECIPE_NOT_FOUND,
    'unexpected_import_error' as const,
  ])(
    'stores safe error code %s for a processable recipe',
    async (errorCode) => {
      await recipeImportService.failImport(42, token, errorCode);

      const calls = recipesRepository.update.mock.calls as unknown[][];
      const [criteria, update] = calls[0] as [
        { id: number; status: RecipeStatus; processingToken: string },
        Partial<Recipe>,
      ];

      expect(criteria.id).toBe(42);
      expect(criteria.status).toBe(RecipeStatus.PROCESSING);
      expect(criteria.processingToken).toBe(token);
      expect(update).toEqual({
        status: RecipeStatus.FAILED,
        errorMessage: errorCode,
        processingJobId: null,
        processingToken: null,
      });
    },
  );

  it('finds only processing recipes older than the recovery cutoff', async () => {
    const cutoff = new Date('2026-10-06T12:00:00.000Z');

    await recipeImportService.findStaleProcessing(cutoff, 40, 100);

    const calls = recipesRepository.find.mock.calls as unknown[][];
    const options = calls[0]?.[0] as {
      select: Record<string, boolean>;
      where: {
        id: FindOperator<number>;
        status: RecipeStatus;
        updatedAt: FindOperator<Date>;
      };
      order: { id: string };
      take: number;
    };
    expect(options.select).toEqual({
      id: true,
      updatedAt: true,
      processingJobId: true,
    });
    expect(options.where.status).toBe(RecipeStatus.PROCESSING);
    expect(options.where.updatedAt.value).toEqual(cutoff);
    expect(options.where.id.value).toBe(40);
    expect(options.order).toEqual({ id: 'ASC' });
    expect(options.take).toBe(100);
  });

  it('finds only pending recipes older than the recovery cutoff', async () => {
    const cutoff = new Date('2026-10-06T12:00:00.000Z');

    await recipeImportService.findStalePending(cutoff, 40, 100);

    const calls = recipesRepository.find.mock.calls as unknown[][];
    const options = calls[0]?.[0] as {
      select: Record<string, boolean>;
      where: {
        id: FindOperator<number>;
        status: RecipeStatus;
        updatedAt: FindOperator<Date>;
      };
      order: { id: string };
      take: number;
    };
    expect(options.select).toEqual({ id: true });
    expect(options.where.status).toBe(RecipeStatus.PENDING);
    expect(options.where.updatedAt.value).toEqual(cutoff);
    expect(options.where.id.value).toBe(40);
    expect(options.order).toEqual({ id: 'ASC' });
    expect(options.take).toBe(100);
  });

  it('changes only a still-stale pending recipe to failed', async () => {
    const cutoff = new Date('2026-10-06T12:00:00.000Z');

    await expect(
      recipeImportService.failStalePending(42, cutoff),
    ).resolves.toBe(true);

    const calls = recipesRepository.update.mock.calls as unknown[][];
    const [criteria, update] = calls[0] as [
      {
        id: number;
        status: RecipeStatus;
        updatedAt: FindOperator<Date>;
      },
      Partial<Recipe>,
    ];
    expect(criteria.id).toBe(42);
    expect(criteria.status).toBe(RecipeStatus.PENDING);
    expect(criteria.updatedAt.value).toEqual(cutoff);
    expect(update).toEqual({
      status: RecipeStatus.FAILED,
      errorMessage: 'queue_unavailable',
      processingJobId: null,
      processingToken: null,
    });

    recipesRepository.update.mockResolvedValue({ affected: 0 });
    await expect(
      recipeImportService.failStalePending(42, cutoff),
    ).resolves.toBe(false);
  });

  it('changes only a still-stale processing recipe to failed', async () => {
    const cutoff = new Date('2026-10-06T12:00:00.000Z');

    await expect(
      recipeImportService.failStaleProcessing(42, cutoff),
    ).resolves.toBe(true);

    const calls = recipesRepository.update.mock.calls as unknown[][];
    const [criteria, update] = calls[0] as [
      {
        id: number;
        status: RecipeStatus;
        updatedAt: FindOperator<Date>;
      },
      Partial<Recipe>,
    ];
    expect(criteria.id).toBe(42);
    expect(criteria.status).toBe(RecipeStatus.PROCESSING);
    expect(criteria.updatedAt.value).toEqual(cutoff);
    expect(update).toEqual({
      status: RecipeStatus.FAILED,
      errorMessage: 'unexpected_import_error',
      processingJobId: null,
      processingToken: null,
    });

    recipesRepository.update.mockResolvedValue({ affected: 0 });
    await expect(
      recipeImportService.failStaleProcessing(42, cutoff),
    ).resolves.toBe(false);
  });

  it('atomically replaces children and completes the recipe', async () => {
    const parsedRecipe = createParsedRecipe();
    parsedRecipe.steps.push({
      text: 'Serve',
      group: null,
      durationMinutes: null,
      imageUrl: 'https://example.com/serve.jpg',
    });
    const expectedIngredients = [
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
    ];
    const expectedSteps = [
      {
        text: 'Boil pasta',
        group: 'Pasta',
        durationMinutes: 10,
        imageUrl: null,
        recipeId: 42,
        position: 1,
      },
      {
        text: 'Serve',
        group: null,
        durationMinutes: null,
        imageUrl: 'https://example.com/serve.jpg',
        recipeId: 42,
        position: 2,
      },
    ];
    const transactionalRecipeRepository = {
      findOne: jest.fn().mockResolvedValue({
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
      recipeImportService.completeImport(42, token, parsedRecipe),
    ).resolves.toBe(true);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionalIngredientRepository.delete).toHaveBeenCalledWith({
      recipeId: 42,
    });
    expect(transactionalStepRepository.delete).toHaveBeenCalledWith({
      recipeId: 42,
    });
    expect(transactionalIngredientRepository.create).toHaveBeenCalledWith(
      expectedIngredients,
    );
    expect(transactionalIngredientRepository.save).toHaveBeenCalledWith(
      expectedIngredients,
    );
    expect(transactionalStepRepository.create).toHaveBeenCalledWith(
      expectedSteps,
    );
    expect(transactionalStepRepository.save).toHaveBeenCalledWith(
      expectedSteps,
    );
    expect(transactionalRecipeRepository.update).toHaveBeenCalledWith(
      { id: 42, status: RecipeStatus.PROCESSING, processingToken: token },
      {
        title: 'Pasta',
        description: 'Simple pasta',
        imageUrl: 'https://example.com/pasta.jpg',
        servings: 2,
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        status: RecipeStatus.COMPLETED,
        errorMessage: null,
        processingJobId: null,
        processingToken: null,
      },
    );
    expect(transactionalIngredientRepository.save).toHaveBeenCalledTimes(1);
    expect(transactionalStepRepository.save).toHaveBeenCalledTimes(1);
    expect(
      transactionalIngredientRepository.save.mock.invocationCallOrder[0],
    ).toBeLessThan(
      transactionalStepRepository.save.mock.invocationCallOrder[0],
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

  it('uses one transactional manager when saving a child fails', async () => {
    const saveError = new Error('Step save failed');
    const transactionalRecipeRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 42,
        status: RecipeStatus.PROCESSING,
      }),
      update: jest.fn(),
    };
    const transactionalIngredientRepository = createChildRepository();
    const transactionalStepRepository = createChildRepository();
    transactionalStepRepository.save.mockRejectedValue(saveError);
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
      recipeImportService.completeImport(42, token, createParsedRecipe()),
    ).rejects.toBe(saveError);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.getRepository.mock.calls).toEqual([
      [Recipe],
      [RecipeIngredient],
      [RecipeStep],
    ]);
    expect(transactionalIngredientRepository.delete).toHaveBeenCalledTimes(1);
    expect(transactionalStepRepository.delete).toHaveBeenCalledTimes(1);
    expect(transactionalIngredientRepository.save).toHaveBeenCalledTimes(1);
    expect(transactionalStepRepository.save).toHaveBeenCalledTimes(1);
    expect(transactionalRecipeRepository.update).not.toHaveBeenCalled();
    expect(recipesRepository.save).not.toHaveBeenCalled();
    expect(recipesRepository.update).not.toHaveBeenCalled();
  });

  it('does not recreate a recipe deleted before persistence', async () => {
    const transactionalRecipeRepository = {
      findOne: jest.fn().mockResolvedValue(null),
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
      recipeImportService.completeImport(42, token, createParsedRecipe()),
    ).resolves.toBe(false);

    expect(transactionalRecipeRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 42,
        status: RecipeStatus.PROCESSING,
        processingToken: token,
      },
      lock: { mode: 'pessimistic_write' },
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
