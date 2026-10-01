import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { RecipeImportService } from '../import/recipe-import.service';
import { RecipeParserError } from '../parser/recipe-parser.error';
import { RecipeParserService } from '../parser/recipe-parser.service';
import { ParsedRecipe } from '../parser/types/parsed-recipe';
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

    const recipeId = job.data.recipeId;
    this.logger.log(
      `Processing recipe import job ${job.id ?? 'unknown'} for recipe ${recipeId}, attempt ${(job.attemptsMade ?? 0) + 1}/${job.opts?.attempts ?? 1}`,
    );

    try {
      await this.importRecipe(job, recipeId);
    } catch (error) {
      return this.handleImportFailure(job, recipeId, error);
    }
  }

  private async importRecipe(
    job: Job<unknown>,
    recipeId: number,
  ): Promise<void> {
    const recipe = await this.recipeImportService.findForProcessing(recipeId);

    if (!recipe) {
      this.logger.warn(
        `Recipe import job ${job.id ?? 'unknown'} skipped because recipe ${recipeId} no longer exists`,
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

    const parsedRecipe: ParsedRecipe = await this.recipeParserService.parse(
      recipe.sourceUrl,
    );

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

  private async handleImportFailure(
    job: Job<unknown>,
    recipeId: number,
    error: unknown,
  ): Promise<never> {
    if (error instanceof RecipeParserError && !error.retryable) {
      await this.recipeImportService.failImport(recipeId, error.code);
      throw new UnrecoverableError(error.code);
    }

    if (isFinalAttempt(job)) {
      const errorCode =
        error instanceof RecipeParserError
          ? error.code
          : 'unexpected_import_error';

      try {
        await this.recipeImportService.failImport(recipeId, errorCode);
      } catch {
        this.logger.error(
          `Recipe import job ${job.id ?? 'unknown'} for recipe ${recipeId}: status_update_failed`,
        );
      }
    }

    throw error instanceof Error
      ? error
      : new Error('Unexpected recipe import failure', { cause: error });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<unknown>): void {
    const recipeId = isImportRecipeJobData(job.data)
      ? job.data.recipeId
      : 'unknown';
    this.logger.log(
      `Recipe import job ${job.id ?? 'unknown'} for recipe ${recipeId} completed on attempt ${job.attemptsMade}/${job.opts.attempts ?? 1}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<unknown> | undefined, error: Error): void {
    const attemptsMade = job?.attemptsMade ?? 0;
    const attempts = job?.opts?.attempts ?? 1;
    const recipeId =
      job && isImportRecipeJobData(job.data) ? job.data.recipeId : 'unknown';

    this.logger.error(
      `Recipe import job ${job?.id ?? 'unknown'} for recipe ${recipeId} attempt ${attemptsMade}/${attempts} failed: ${getFailureCategory(error)}`,
    );
  }
}

function isProcessableStatus(status: RecipeStatus): boolean {
  return status === RecipeStatus.PENDING || status === RecipeStatus.PROCESSING;
}

function isFinalAttempt(job: Job<unknown>): boolean {
  return job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
}

function getFailureCategory(error: Error): string {
  if (error instanceof RecipeParserError) {
    return error.code;
  }

  return error instanceof UnrecoverableError
    ? 'permanent_parser_error'
    : 'unexpected_import_error';
}

function isImportRecipeJobData(data: unknown): data is ImportRecipeJobData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const recipeId = (data as { recipeId?: unknown }).recipeId;

  return Number.isSafeInteger(recipeId) && (recipeId as number) > 0;
}
