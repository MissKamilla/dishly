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
import { Job } from 'bullmq';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { RecipeImportService } from '../import/recipe-import.service';
import { ParsedRecipe } from '../parser/types/parsed-recipe';
import { IMPORT_RECIPE_JOB } from './recipe-import.contract';
import { RecipeImportProcessor } from './recipe-import.processor';

describe('RecipeImportProcessor', () => {
  let processor: RecipeImportProcessor;
  let recipeImportService: {
    findForProcessing: jest.Mock;
    prepareForProcessing: jest.Mock;
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
    const job = createJob(IMPORT_RECIPE_JOB, { recipeId: 42 });

    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(recipeImportService.findForProcessing).toHaveBeenCalledWith(42);
    expect(recipeImportService.prepareForProcessing).toHaveBeenCalledWith(42);
    expect(recipeParserService.parse).toHaveBeenCalledWith(
      'https://www.bbcgoodfood.com/recipes/example',
    );
    expect(recipeImportService.completeImport).toHaveBeenCalledWith(
      42,
      parsedRecipe,
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('recipe 42'));
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('continues processing a recipe that is already processing', async () => {
    recipeImportService.findForProcessing.mockResolvedValue({
      id: 42,
      status: RecipeStatus.PROCESSING,
      sourceUrl: 'https://www.bbcgoodfood.com/recipes/example',
    });
    const job = createJob(IMPORT_RECIPE_JOB, { recipeId: 42 });

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(warnSpy).not.toHaveBeenCalled();
    expect(recipeImportService.prepareForProcessing).toHaveBeenCalledWith(42);
    expect(recipeParserService.parse).toHaveBeenCalledWith(
      'https://www.bbcgoodfood.com/recipes/example',
    );
    expect(recipeImportService.completeImport).toHaveBeenCalledWith(
      42,
      expect.any(Object),
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

  it.each([
    [1, 3],
    [3, 3],
  ])('logs failed attempt %i of %i', (attemptsMade, attempts) => {
    const error = new Error('Processing failed');
    const job = {
      ...createJob(IMPORT_RECIPE_JOB, { recipeId: 42 }),
      attemptsMade,
      opts: { attempts },
    } as Job<unknown>;

    processor.onFailed(job, error);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`attempt ${attemptsMade}/${attempts} failed`),
      error.stack,
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
