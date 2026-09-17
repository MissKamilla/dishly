import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  IMPORT_RECIPE_JOB,
  ImportRecipeJobData,
  RECIPE_IMPORT_QUEUE,
} from './recipe-import.contract';

@Processor(RECIPE_IMPORT_QUEUE)
export class RecipeImportProcessor extends WorkerHost {
  private readonly logger = new Logger(RecipeImportProcessor.name);

  process(job: Job<unknown>): Promise<void> {
    if (job.name !== IMPORT_RECIPE_JOB) {
      throw new Error(`Unsupported recipe import job: ${job.name}`);
    }

    if (!isImportRecipeJobData(job.data)) {
      throw new Error('Invalid recipe import job payload');
    }

    this.logger.log(
      `Processing recipe import job ${job.id ?? 'unknown'} for recipe ${job.data.recipeId}`,
    );

    return Promise.resolve();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<unknown>): void {
    this.logger.log(`Recipe import job ${job.id ?? 'unknown'} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<unknown> | undefined, error: Error): void {
    this.logger.error(
      `Recipe import job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }
}

function isImportRecipeJobData(data: unknown): data is ImportRecipeJobData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const recipeId = (data as { recipeId?: unknown }).recipeId;

  return Number.isSafeInteger(recipeId) && (recipeId as number) > 0;
}
