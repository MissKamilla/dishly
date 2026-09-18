import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RecipeImportQueue } from '../recipes/queue/recipe-import.queue';

const logger = new Logger('RecipeImportQueueSmoke');

async function runQueueSmoke(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const recipeImportQueue = app.get(RecipeImportQueue);
    const job = await recipeImportQueue.enqueue(42);

    logger.log(`Enqueued recipe import job ${job.id ?? 'unknown'}`);
    await waitForCompletion(job);
    logger.log(`Recipe import job ${job.id ?? 'unknown'} completed`);
  } finally {
    await app.close();
  }
}

async function waitForCompletion(
  job: Awaited<ReturnType<RecipeImportQueue['enqueue']>>,
): Promise<void> {
  const timeoutAt = Date.now() + 10_000;

  while (Date.now() < timeoutAt) {
    const state = await job.getState();

    if (state === 'completed') {
      return;
    }

    if (state === 'failed') {
      throw new Error(
        `Recipe import job ${job.id ?? 'unknown'} failed: ${job.failedReason}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Timed out waiting for recipe import job ${job.id ?? 'unknown'}`,
  );
}

void runQueueSmoke().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack : String(error);

  logger.error(message);
  process.exitCode = 1;
});
