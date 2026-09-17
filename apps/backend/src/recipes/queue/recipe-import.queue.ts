import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  IMPORT_RECIPE_JOB,
  ImportRecipeJobData,
  RECIPE_IMPORT_QUEUE,
} from './recipe-import.contract';

type RecipeImportJob = Job<ImportRecipeJobData, void, typeof IMPORT_RECIPE_JOB>;

@Injectable()
export class RecipeImportQueue {
  constructor(
    @InjectQueue(RECIPE_IMPORT_QUEUE)
    private readonly queue: Queue<
      ImportRecipeJobData,
      void,
      typeof IMPORT_RECIPE_JOB
    >,
  ) {}

  enqueue(recipeId: number): Promise<RecipeImportJob> {
    return this.queue.add(
      IMPORT_RECIPE_JOB,
      { recipeId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }
}
