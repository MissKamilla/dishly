jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  OnWorkerEvent: () => () => undefined,
  Processor: () => () => undefined,
  WorkerHost: class {},
}));

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { RecipeImportService } from '../import/recipe-import.service';
import {
  RecipeParserError,
  RecipeParserErrorCode,
} from '../parser/recipe-parser.error';
import { ParsedRecipe } from '../parser/types/parsed-recipe';
import { IMPORT_RECIPE_JOB } from './recipe-import.contract';
import { RecipeImportProcessor } from './recipe-import.processor';

describe('RecipeImportProcessor', () => {
  let processor: RecipeImportProcessor;
  let recipeImportService: {
    findForProcessing: jest.Mock;
    prepareForProcessing: jest.Mock;
    releaseForRetry: jest.Mock;
    failImport: jest.Mock;
    completeImport: jest.Mock;
  };
  let recipeParserService: {
    parse: jest.Mock;
  };
  let parsedRecipe: ParsedRecipe;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    parsedRecipe = createParsedRecipe();
    recipeImportService = {
      findForProcessing: jest.fn().mockResolvedValue({
        id: 42,
        status: RecipeStatus.PENDING,
        sourceUrl: 'https://www.bbcgoodfood.com/recipes/example',
      }),
      prepareForProcessing: jest.fn().mockResolvedValue(true),
      releaseForRetry: jest.fn().mockResolvedValue(undefined),
      failImport: jest.fn().mockResolvedValue(undefined),
      completeImport: jest.fn().mockResolvedValue(true),
    };
    recipeParserService = {
      parse: jest.fn().mockResolvedValue(parsedRecipe),
    };
    processor = new RecipeImportProcessor(
      recipeImportService as unknown as RecipeImportService,
      recipeParserService,
    );
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes a valid import job and reads its recipe id', async () => {
    const job = createAttemptJob(0);

    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(recipeImportService.findForProcessing).toHaveBeenCalledWith(42);
    expect(recipeImportService.prepareForProcessing).toHaveBeenCalledWith(
      42,
      '1',
      expect.any(String),
    );
    expect(recipeParserService.parse).toHaveBeenCalledWith(
      'https://www.bbcgoodfood.com/recipes/example',
    );
    expect(recipeImportService.completeImport).toHaveBeenCalledWith(
      42,
      expect.any(String),
      parsedRecipe,
    );
    expect(
      recipeImportService.findForProcessing.mock.invocationCallOrder[0],
    ).toBeLessThan(
      recipeImportService.prepareForProcessing.mock.invocationCallOrder[0],
    );
    expect(
      recipeImportService.prepareForProcessing.mock.invocationCallOrder[0],
    ).toBeLessThan(recipeParserService.parse.mock.invocationCallOrder[0]);
    expect(recipeParserService.parse.mock.invocationCallOrder[0]).toBeLessThan(
      recipeImportService.completeImport.mock.invocationCallOrder[0],
    );
    expect(recipeImportService.failImport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      'Processing recipe import job 1 for recipe 42, attempt 1/3',
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('completes without recreating a recipe deleted after parsing', async () => {
    recipeImportService.completeImport.mockResolvedValue(false);

    await expect(
      processor.process(createAttemptJob(0)),
    ).resolves.toBeUndefined();

    expect(recipeParserService.parse).toHaveBeenCalledTimes(1);
    expect(recipeImportService.completeImport).toHaveBeenCalledWith(
      42,
      expect.any(String),
      parsedRecipe,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('recipe 42 is no longer processing'),
    );
    expect(recipeImportService.failImport).not.toHaveBeenCalled();
  });

  it('skips another job while the recipe is already processing', async () => {
    recipeImportService.findForProcessing.mockResolvedValue({
      id: 42,
      status: RecipeStatus.PROCESSING,
      sourceUrl: 'https://www.bbcgoodfood.com/recipes/example',
    });
    recipeImportService.prepareForProcessing.mockResolvedValue(false);
    const job = createJob(IMPORT_RECIPE_JOB, { recipeId: 42 });

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('could not transition to processing'),
    );
    expect(recipeImportService.prepareForProcessing).toHaveBeenCalledWith(
      42,
      '1',
      expect.any(String),
    );
    expect(recipeParserService.parse).not.toHaveBeenCalled();
    expect(recipeImportService.completeImport).not.toHaveBeenCalled();
  });

  it('resumes a processing recipe when BullMQ restarts the same job', async () => {
    recipeImportService.findForProcessing.mockResolvedValue({
      id: 42,
      status: RecipeStatus.PROCESSING,
      sourceUrl: 'https://www.bbcgoodfood.com/recipes/example',
    });

    await expect(
      processor.process(createAttemptJob(0)),
    ).resolves.toBeUndefined();

    expect(recipeImportService.prepareForProcessing).toHaveBeenCalledWith(
      42,
      '1',
      expect.any(String),
    );
    expect(recipeParserService.parse).toHaveBeenCalledTimes(1);
    const calls = recipeImportService.prepareForProcessing.mock
      .calls as unknown as Array<[number, string, string]>;
    const token = calls[0][2];
    expect(recipeImportService.completeImport).toHaveBeenCalledWith(
      42,
      token,
      parsedRecipe,
    );
  });

  it('does not parse when the recipe cannot transition to processing', async () => {
    recipeImportService.prepareForProcessing.mockResolvedValue(false);
    const job = createJob(IMPORT_RECIPE_JOB, { recipeId: 42 });

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('recipe 42 could not transition to processing'),
    );
    expect(recipeParserService.parse).not.toHaveBeenCalled();
    expect(recipeImportService.completeImport).not.toHaveBeenCalled();
  });

  it('marks a permanent parser error failed and stops BullMQ retries', async () => {
    const parserError = new RecipeParserError(
      RecipeParserErrorCode.RECIPE_NOT_FOUND,
      '<html>Private page</html> cookie=fake-session',
      null,
      false,
    );
    recipeParserService.parse.mockRejectedValue(parserError);
    const job = createAttemptJob(0);

    const processing = processor.process(job);
    await expect(processing).rejects.toBeInstanceOf(UnrecoverableError);
    await expect(processing).rejects.toHaveProperty(
      'message',
      RecipeParserErrorCode.RECIPE_NOT_FOUND,
    );

    expect(recipeImportService.prepareForProcessing).toHaveBeenCalledWith(
      42,
      '1',
      expect.any(String),
    );
    expect(recipeImportService.failImport).toHaveBeenCalledWith(
      42,
      expect.any(String),
      RecipeParserErrorCode.RECIPE_NOT_FOUND,
    );
    expect(recipeImportService.failImport).toHaveBeenCalledTimes(1);
    expect(recipeImportService.completeImport).not.toHaveBeenCalled();
  });

  it.each([0, 1])(
    'returns the recipe to pending after retryable failure %i of 3',
    async (attemptsMade) => {
      const parserError = new RecipeParserError(
        RecipeParserErrorCode.FETCH_FAILED,
        'Good Food request timed out',
        null,
        true,
      );
      recipeParserService.parse.mockRejectedValue(parserError);
      const job = {
        ...createJob(IMPORT_RECIPE_JOB, { recipeId: 42 }),
        attemptsMade,
        attemptsStarted: attemptsMade + 1,
        opts: { attempts: 3 },
      } as Job<unknown>;

      await expect(processor.process(job)).rejects.toBe(parserError);

      expect(recipeImportService.prepareForProcessing).toHaveBeenCalledWith(
        42,
        '1',
        expect.any(String),
      );
      expect(recipeImportService.releaseForRetry).toHaveBeenCalledWith(
        42,
        expect.any(String),
      );
      expect(recipeImportService.failImport).not.toHaveBeenCalled();
      expect(recipeImportService.completeImport).not.toHaveBeenCalled();
    },
  );

  it('marks the recipe failed after the final retryable parser failure', async () => {
    const parserError = new RecipeParserError(
      RecipeParserErrorCode.FETCH_FAILED,
      'Good Food request timed out: JWT fake-token',
      null,
      true,
    );
    recipeParserService.parse.mockRejectedValue(parserError);
    const job = {
      ...createJob(IMPORT_RECIPE_JOB, { recipeId: 42 }),
      attemptsMade: 2,
      attemptsStarted: 3,
      opts: { attempts: 3 },
    } as Job<unknown>;

    await expect(processor.process(job)).rejects.toBe(parserError);

    expect(recipeImportService.failImport).toHaveBeenCalledWith(
      42,
      expect.any(String),
      RecipeParserErrorCode.FETCH_FAILED,
    );
    expect(recipeImportService.failImport).toHaveBeenCalledTimes(1);
    expect(recipeImportService.releaseForRetry).not.toHaveBeenCalled();
    expect(recipeImportService.completeImport).not.toHaveBeenCalled();
  });

  it('retries an unexpected error without marking the recipe failed early', async () => {
    const error = new Error('Unexpected parser bug');
    recipeParserService.parse.mockRejectedValue(error);

    await expect(processor.process(createAttemptJob(1))).rejects.toBe(error);

    expect(recipeImportService.failImport).not.toHaveBeenCalled();
    expect(recipeImportService.releaseForRetry).toHaveBeenCalledWith(
      42,
      expect.any(String),
    );
  });

  it('marks an unexpected parser error failed after the last attempt', async () => {
    const error = new Error('Unexpected parser bug: password=fake-secret');
    recipeParserService.parse.mockRejectedValue(error);

    await expect(processor.process(createAttemptJob(2))).rejects.toBe(error);

    expect(recipeImportService.failImport).toHaveBeenCalledWith(
      42,
      expect.any(String),
      'unexpected_import_error',
    );
    expect(recipeImportService.failImport).toHaveBeenCalledTimes(1);
  });

  it('converts a non-Error rejection into an Error for BullMQ', async () => {
    recipeParserService.parse.mockRejectedValue('unexpected value');

    await expect(processor.process(createAttemptJob(1))).rejects.toMatchObject({
      message: 'Unexpected recipe import failure',
      cause: 'unexpected value',
    });

    expect(recipeImportService.failImport).not.toHaveBeenCalled();
    expect(recipeImportService.releaseForRetry).toHaveBeenCalledWith(
      42,
      expect.any(String),
    );
  });

  it('marks a failed database save after the last attempt', async () => {
    const error = new Error('Database write failed');
    recipeImportService.completeImport.mockRejectedValue(error);

    await expect(processor.process(createAttemptJob(2))).rejects.toBe(error);

    expect(recipeImportService.failImport).toHaveBeenCalledWith(
      42,
      expect.any(String),
      'unexpected_import_error',
    );
  });

  it('does not change status when loading the recipe fails', async () => {
    const originalError = new Error('Database read failed');
    recipeImportService.findForProcessing.mockRejectedValue(originalError);

    await expect(processor.process(createAttemptJob(2))).rejects.toBe(
      originalError,
    );

    expect(recipeImportService.failImport).not.toHaveBeenCalled();
    expect(recipeImportService.releaseForRetry).not.toHaveBeenCalled();
  });

  it('lets BullMQ retry if a permanent error cannot be saved', async () => {
    const parserError = new RecipeParserError(
      RecipeParserErrorCode.RECIPE_NOT_FOUND,
      'External recipe data missing',
      null,
    );
    const statusError = new Error('Database update failed');
    recipeParserService.parse.mockRejectedValue(parserError);
    recipeImportService.failImport.mockRejectedValue(statusError);

    await expect(processor.process(createAttemptJob(0))).rejects.toBe(
      statusError,
    );
  });

  it.each([RecipeStatus.COMPLETED, RecipeStatus.FAILED])(
    'logs a warning and skips a stale job for a %s recipe',
    async (status) => {
      recipeImportService.findForProcessing.mockResolvedValue({
        id: 42,
        status,
      });
      const job = createJob(IMPORT_RECIPE_JOB, { recipeId: 42 });

      await expect(processor.process(job)).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`recipe 42 has status ${status}`),
      );
      expect(recipeImportService.prepareForProcessing).not.toHaveBeenCalled();
      expect(recipeParserService.parse).not.toHaveBeenCalled();
      expect(recipeImportService.completeImport).not.toHaveBeenCalled();
      expect(recipeImportService.failImport).not.toHaveBeenCalled();
    },
  );

  it('logs a warning and completes when the recipe no longer exists', async () => {
    recipeImportService.findForProcessing.mockResolvedValue(null);
    const job = createJob(IMPORT_RECIPE_JOB, { recipeId: 42 });

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'job 1 skipped because recipe 42 no longer exists',
      ),
    );
    expect(recipeImportService.prepareForProcessing).not.toHaveBeenCalled();
    expect(recipeParserService.parse).not.toHaveBeenCalled();
    expect(recipeImportService.completeImport).not.toHaveBeenCalled();
    expect(recipeImportService.failImport).not.toHaveBeenCalled();
  });

  it('throws for an unknown job instead of completing it', async () => {
    const job = createJob('unknown-job', { recipeId: 42 });

    await expect(processor.process(job)).rejects.toThrow(
      'Unsupported recipe import job: unknown-job',
    );
    expect(recipeImportService.findForProcessing).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    null,
    {},
    { recipeId: 0 },
    { recipeId: -1 },
    { recipeId: 1.5 },
    { recipeId: '42' },
  ])('propagates an error for invalid payload %#', async (data) => {
    const job = createJob(IMPORT_RECIPE_JOB, data);

    await expect(processor.process(job)).rejects.toThrow(
      'Invalid recipe import job payload',
    );
    expect(recipeImportService.findForProcessing).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs job completion with recipe and attempt ids', () => {
    processor.onCompleted(createAttemptJob(1));

    expect(logSpy).toHaveBeenCalledWith(
      'Recipe import job 1 for recipe 42 completed on attempt 1/3',
    );
  });

  it.each([
    [1, 3],
    [3, 3],
  ])('logs failed attempt %i of %i', (attemptsMade, attempts) => {
    const error = new Error('password=fake-secret <html>Private page</html>');
    const job = {
      ...createJob(IMPORT_RECIPE_JOB, { recipeId: 42 }),
      attemptsMade,
      opts: { attempts },
    } as Job<unknown>;

    processor.onFailed(job, error);

    expect(errorSpy).toHaveBeenCalledWith(
      `Recipe import job 1 for recipe 42 attempt ${attemptsMade}/${attempts} failed: unexpected_import_error`,
    );
  });

  it('logs a parser failure category without its raw message', () => {
    const error = new RecipeParserError(
      RecipeParserErrorCode.FETCH_FAILED,
      'cookie=fake-session',
      null,
      true,
    );

    processor.onFailed(createAttemptJob(1), error);

    expect(errorSpy).toHaveBeenCalledWith(
      'Recipe import job 1 for recipe 42 attempt 1/3 failed: fetch_failed',
    );
  });

  it('logs permanent parser failures without exposing their message', () => {
    processor.onFailed(
      createAttemptJob(1),
      new UnrecoverableError('JWT fake-token'),
    );

    expect(errorSpy).toHaveBeenCalledWith(
      'Recipe import job 1 for recipe 42 attempt 1/3 failed: permanent_parser_error',
    );
  });
});

function createJob(name: string, data: unknown): Job<unknown> {
  return {
    id: '1',
    name,
    data,
  } as Job<unknown>;
}

function createAttemptJob(attemptsMade: number): Job<unknown> {
  return {
    ...createJob(IMPORT_RECIPE_JOB, { recipeId: 42 }),
    attemptsMade,
    attemptsStarted: attemptsMade + 1,
    opts: { attempts: 3 },
  } as Job<unknown>;
}

function createParsedRecipe(): ParsedRecipe {
  return {
    title: 'Pasta',
    description: null,
    imageUrl: null,
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
    ],
    steps: [
      {
        text: 'Boil pasta',
        group: null,
        durationMinutes: 10,
        imageUrl: null,
      },
    ],
  };
}
