jest.mock('@nestjs/bullmq', () => ({
  OnWorkerEvent: () => () => undefined,
  Processor: () => () => undefined,
  WorkerHost: class {},
}));

import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IMPORT_RECIPE_JOB } from './recipe-import.contract';
import { RecipeImportProcessor } from './recipe-import.processor';

describe('RecipeImportProcessor', () => {
  let processor: RecipeImportProcessor;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    processor = new RecipeImportProcessor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes a valid import job and reads its recipe id', async () => {
    const job = createJob(IMPORT_RECIPE_JOB, { recipeId: 42 });

    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('recipe 42'));
  });

  it('throws for an unknown job instead of completing it', () => {
    const job = createJob('unknown-job', { recipeId: 42 });

    expect(() => processor.process(job)).toThrow(
      'Unsupported recipe import job: unknown-job',
    );
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
  ])('propagates an error for invalid payload %#', (data) => {
    const job = createJob(IMPORT_RECIPE_JOB, data);

    expect(() => processor.process(job)).toThrow(
      'Invalid recipe import job payload',
    );
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
