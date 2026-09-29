import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { RecipeImportService } from '../import/recipe-import.service';
import { RecipeParserService } from '../parser/recipe-parser.service';
import {
  IMPORT_RECIPE_JOB,
  ImportRecipeJobData,
  RECIPE_IMPORT_QUEUE,
} from './recipe-import.contract';

@Processor(RECIPE_IMPORT_QUEUE)
export class RecipeImportProcessor extends WorkerHost {
  private readonly logger = new Logger(RecipeImportProcessor.name);

  constructor(
    private readonly recipeImportService: RecipeImportService,
    private readonly recipeParserService: RecipeParserService,
  ) {
    super();
  }

  async process(job: Job<unknown>): Promise<void> {
    if (job.name !== IMPORT_RECIPE_JOB) {
      throw new Error(`Unsupported recipe import job: ${job.name}`);
    }

    if (!isImportRecipeJobData(job.data)) {
      throw new Error('Invalid recipe import job payload');
    }

    this.logger.log(
      `Processing recipe import job ${job.id ?? 'unknown'} for recipe ${job.data.recipeId}`,
    );

    const recipe = await this.recipeImportService.findForProcessing(
      job.data.recipeId,
    );

    if (!recipe) {
      this.logger.warn(
        `Recipe import job ${job.id ?? 'unknown'} skipped because recipe ${job.data.recipeId} no longer exists`,
      );
      return;
    }

    if (!isProcessableStatus(recipe.status)) {
      this.logger.warn(
        `Recipe import job ${job.id ?? 'unknown'} skipped because recipe ${recipe.id} has status ${recipe.status}`,
      );
      return;
    }

    const prepared = await this.recipeImportService.prepareForProcessing(
      recipe.id,
    );

    if (!prepared) {
      this.logger.warn(
        `Recipe import job ${job.id ?? 'unknown'} skipped because recipe ${recipe.id} could not transition to processing`,
      );
      return;
    }

    const parsedRecipe = await this.recipeParserService.parse(recipe.sourceUrl);
    const completed = await this.recipeImportService.completeImport(
      recipe.id,
      parsedRecipe,
    );

    if (!completed) {
      this.logger.warn(
        `Recipe import job ${job.id ?? 'unknown'} skipped because recipe ${recipe.id} is no longer processing`,
      );
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<unknown>): void {
    this.logger.log(`Recipe import job ${job.id ?? 'unknown'} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<unknown> | undefined, error: Error): void {
    const attemptsMade = job?.attemptsMade ?? 0;
    const attempts = job?.opts.attempts ?? 1;

    this.logger.error(
      `Recipe import job ${job?.id ?? 'unknown'} attempt ${attemptsMade}/${attempts} failed: ${error.message}`,
      error.stack,
    );
  }
}

function isProcessableStatus(status: RecipeStatus): boolean {
  return status === RecipeStatus.PENDING || status === RecipeStatus.PROCESSING;
}

function isImportRecipeJobData(data: unknown): data is ImportRecipeJobData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const recipeId = (data as { recipeId?: unknown }).recipeId;

  return Number.isSafeInteger(recipeId) && (recipeId as number) > 0;
}
