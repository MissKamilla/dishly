jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
}));

import { Job, Queue } from 'bullmq';
import {
  IMPORT_RECIPE_JOB,
  ImportRecipeJobData,
} from './recipe-import.contract';
import { RecipeImportQueue } from './recipe-import.queue';

describe('RecipeImportQueue', () => {
  it('enqueues an import job with retry configuration', async () => {
    const job = { id: '1' } as Job<
      ImportRecipeJobData,
      void,
      typeof IMPORT_RECIPE_JOB
    >;
    const queue = {
      add: jest.fn().mockResolvedValue(job),
    };
    const recipeImportQueue = new RecipeImportQueue(
      queue as unknown as Queue<
        ImportRecipeJobData,
        void,
        typeof IMPORT_RECIPE_JOB
      >,
    );

    await expect(recipeImportQueue.enqueue(42)).resolves.toBe(job);
    expect(queue.add).toHaveBeenCalledWith(
      IMPORT_RECIPE_JOB,
      { recipeId: 42 },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  });

  it('propagates an error when the queue cannot add a job', async () => {
    const connectionError = new Error('Redis unavailable');
    const queue = {
      add: jest.fn().mockRejectedValue(connectionError),
    };
    const recipeImportQueue = new RecipeImportQueue(
      queue as unknown as Queue<
        ImportRecipeJobData,
        void,
        typeof IMPORT_RECIPE_JOB
      >,
    );

    await expect(recipeImportQueue.enqueue(42)).rejects.toBe(connectionError);
  });
});
