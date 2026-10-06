import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Recipe } from '../entities/recipe.entity';
import { RecipeImportService } from '../import/recipe-import.service';
import {
  IMPORT_RECIPE_JOB,
  ImportRecipeJobData,
  RECIPE_IMPORT_QUEUE,
} from './recipe-import.contract';

const RECOVERY_INTERVAL_MS = 60_000;
const STALE_PENDING_MS = 5 * 60_000;
const STALE_PROCESSING_MS = 60_000;
const ORPHANED_PROCESSING_MS = 5 * 60_000;
const RECIPE_BATCH_SIZE = 100;
const JOB_PAGE_SIZE = 100;
const IN_FLIGHT_STATES = [
  'waiting',
  'active',
  'delayed',
  'prioritized',
  'waiting-children',
] as const;

@Injectable()
export class RecipeImportRecoveryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RecipeImportRecoveryService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private pendingCursor = 0;
  private processingCursor = 0;

  constructor(
    @InjectQueue(RECIPE_IMPORT_QUEUE)
    private readonly queue: Queue<
      ImportRecipeJobData,
      void,
      typeof IMPORT_RECIPE_JOB
    >,
    private readonly recipeImportService: RecipeImportService,
  ) {}

  onModuleInit(): void {
    void this.runRecovery();
    this.timer = setInterval(
      () => void this.runRecovery(),
      RECOVERY_INTERVAL_MS,
    );
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async recoverFailedImports(): Promise<void> {
    const pendingBefore = new Date(Date.now() - STALE_PENDING_MS);
    const processingBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const orphanedBefore = new Date(Date.now() - ORPHANED_PROCESSING_MS);
    const pendingRecipes = await this.recipeImportService.findStalePending(
      pendingBefore,
      this.pendingCursor,
      RECIPE_BATCH_SIZE,
    );
    const processingRecipes =
      await this.recipeImportService.findStaleProcessing(
        processingBefore,
        this.processingCursor,
        RECIPE_BATCH_SIZE,
      );

    await this.recoverProcessing(
      processingRecipes,
      processingBefore,
      orphanedBefore,
    );
    await this.recoverPending(pendingRecipes, pendingBefore);

    this.pendingCursor = nextCursor(pendingRecipes);
    this.processingCursor = nextCursor(processingRecipes);
  }

  private async recoverProcessing(
    processingRecipes: Recipe[],
    processingBefore: Date,
    orphanedBefore: Date,
  ): Promise<void> {
    for (const recipe of processingRecipes) {
      const job = recipe.processingJobId
        ? await this.queue.getJob(recipe.processingJobId)
        : null;
      const matchesRecipe =
        job?.name === IMPORT_RECIPE_JOB && job.data?.recipeId === recipe.id;
      const state = matchesRecipe ? await job.getState() : null;
      if (IN_FLIGHT_STATES.some((inFlightState) => inFlightState === state)) {
        continue;
      }

      const failedCurrentJob =
        state === 'failed' &&
        job?.finishedOn !== undefined &&
        job.finishedOn > recipe.updatedAt.getTime();
      if (!failedCurrentJob && recipe.updatedAt > orphanedBefore) {
        continue;
      }

      const recovered = await this.recipeImportService.failStaleProcessing(
        recipe.id,
        failedCurrentJob ? processingBefore : orphanedBefore,
      );
      if (recovered) {
        this.logger.warn(
          failedCurrentJob
            ? `Recovered recipe ${recipe.id} from failed import job ${job.id ?? 'unknown'}`
            : `Recovered recipe ${recipe.id} without an active job`,
        );
      }
    }
  }

  private async recoverPending(
    pendingRecipes: Recipe[],
    pendingBefore: Date,
  ): Promise<void> {
    const pendingIds = new Set(pendingRecipes.map((recipe) => recipe.id));
    for (const state of IN_FLIGHT_STATES) {
      if (pendingIds.size === 0) {
        break;
      }
      for (let start = 0; ; start += JOB_PAGE_SIZE) {
        const jobs = await this.queue.getJobs(
          [state],
          start,
          start + JOB_PAGE_SIZE - 1,
        );
        for (const job of jobs) {
          if (job.name === IMPORT_RECIPE_JOB && job.data) {
            pendingIds.delete(job.data.recipeId);
          }
        }
        if (pendingIds.size === 0 || jobs.length < JOB_PAGE_SIZE) {
          break;
        }
      }
    }

    for (const recipeId of pendingIds) {
      const recovered = await this.recipeImportService.failStalePending(
        recipeId,
        pendingBefore,
      );
      if (recovered) {
        this.logger.warn(`Recovered recipe ${recipeId} without an import job`);
      }
    }
  }

  private async runRecovery(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      await this.recoverFailedImports();
    } catch (error) {
      this.logger.error(
        'Failed to reconcile recipe import statuses',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}

function nextCursor(recipes: { id: number }[]): number {
  return recipes.length === RECIPE_BATCH_SIZE
    ? recipes[recipes.length - 1].id
    : 0;
}
