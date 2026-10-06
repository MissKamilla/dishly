import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { RecipeImportService } from '../import/recipe-import.service';
import { RecipeParserError } from '../parser/recipe-parser.error';
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

    if (!job.id) {
      throw new Error('Recipe import job is missing its id');
    }

    const recipeId = job.data.recipeId;
    const token = randomUUID();
    this.logger.log(
      `Processing recipe import job ${job.id} for recipe ${recipeId}, attempt ${(job.attemptsMade ?? 0) + 1}/${job.opts?.attempts ?? 1}`,
    );

    await this.importRecipe(job, recipeId, job.id, token);
  }

  private async importRecipe(
    job: Job<unknown>,
    recipeId: number,
    jobId: string,
    token: string,
  ): Promise<void> {
    const recipe = await this.recipeImportService.findForProcessing(recipeId);

    if (!recipe) {
      this.logger.warn(
        `Recipe import job ${jobId} skipped because recipe ${recipeId} no longer exists`,
      );
      return;
    }

    if (!isProcessableStatus(recipe.status)) {
      this.logger.warn(
        `Recipe import job ${jobId} skipped because recipe ${recipe.id} has status ${recipe.status}`,
      );
      return;
    }

    const prepared = await this.recipeImportService.prepareForProcessing(
      recipe.id,
      jobId,
      token,
    );

    if (!prepared) {
      this.logger.warn(
        `Recipe import job ${jobId} skipped because recipe ${recipe.id} could not transition to processing`,
      );
      return;
    }

    try {
      const parsedRecipe = await this.recipeParserService.parse(
        recipe.sourceUrl,
      );

      const completed = await this.recipeImportService.completeImport(
        recipe.id,
        token,
        parsedRecipe,
      );

      if (!completed) {
        this.logger.warn(
          `Recipe import job ${jobId} skipped because recipe ${recipe.id} is no longer processing`,
        );
      }
    } catch (error) {
      return this.handleImportFailure(job, recipeId, token, error);
    }
  }

  private async handleImportFailure(
    job: Job<unknown>,
    recipeId: number,
    token: string,
    error: unknown,
  ): Promise<never> {
    const permanentParserError =
      error instanceof RecipeParserError && !error.retryable;
    const importError =
      error instanceof Error
        ? error
        : new Error('Unexpected recipe import failure', { cause: error });

    if (!permanentParserError && !isFinalAttempt(job)) {
      await this.recipeImportService.releaseForRetry(recipeId, token);
      throw importError;
    }

    const errorCode =
      error instanceof RecipeParserError
        ? error.code
        : 'unexpected_import_error';
    try {
      await this.recipeImportService.failImport(recipeId, token, errorCode);
    } catch (statusError) {
      if (permanentParserError) {
        throw statusError;
      }
      this.logger.error(
        `Recipe import job ${job.id ?? 'unknown'} for recipe ${recipeId}: status_update_failed`,
      );
    }

    if (permanentParserError) {
      throw new UnrecoverableError(errorCode);
    }
    throw importError;
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
