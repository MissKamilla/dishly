jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
}));

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { RecipeImportService } from '../import/recipe-import.service';
import {
  IMPORT_RECIPE_JOB,
  ImportRecipeJobData,
} from './recipe-import.contract';
import { RecipeImportRecoveryService } from './recipe-import-recovery.service';

const NOW = new Date('2026-10-06T12:00:00.000Z').getTime();
const PROCESSING_STARTED_AT = NOW - 120_000;

describe('RecipeImportRecoveryService', () => {
  let recovery: RecipeImportRecoveryService;
  let queue: { getJob: jest.Mock; getJobs: jest.Mock };
  let imports: {
    findStalePending: jest.Mock;
    failStalePending: jest.Mock;
    findStaleProcessing: jest.Mock;
    failStaleProcessing: jest.Mock;
  };
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    queue = {
      getJob: jest.fn().mockResolvedValue(null),
      getJobs: jest.fn().mockResolvedValue([]),
    };
    imports = {
      findStalePending: jest.fn().mockResolvedValue([]),
      failStalePending: jest.fn().mockResolvedValue(true),
      findStaleProcessing: jest.fn().mockResolvedValue([
        {
          id: 42,
          updatedAt: new Date(PROCESSING_STARTED_AT),
          processingJobId: 'job-42',
        },
      ]),
      failStaleProcessing: jest.fn().mockResolvedValue(true),
    };
    recovery = new RecipeImportRecoveryService(
      queue as unknown as Queue<
        ImportRecipeJobData,
        void,
        typeof IMPORT_RECIPE_JOB
      >,
      imports as unknown as RecipeImportService,
    );
  });

  afterEach(() => {
    recovery.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('does not query Redis when no recipe is stale', async () => {
    imports.findStaleProcessing.mockResolvedValue([]);

    await recovery.recoverFailedImports();

    expect(imports.findStaleProcessing).toHaveBeenCalledWith(
      new Date(NOW - 60_000),
      0,
      100,
    );
    expect(imports.findStalePending).toHaveBeenCalledWith(
      new Date(NOW - 5 * 60_000),
      0,
      100,
    );
    expect(queue.getJob).not.toHaveBeenCalled();
    expect(queue.getJobs).not.toHaveBeenCalled();
  });

  it('fails an old pending recipe with no import job', async () => {
    imports.findStaleProcessing.mockResolvedValue([]);
    imports.findStalePending.mockResolvedValue([{ id: 43 }]);

    await recovery.recoverFailedImports();

    expect(queue.getJob).not.toHaveBeenCalled();
    expect(imports.failStalePending).toHaveBeenCalledWith(
      43,
      new Date(NOW - 5 * 60_000),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Recovered recipe 43 without an import job',
    );
  });

  it('keeps a pending recipe when its job is waiting or active', async () => {
    imports.findStaleProcessing.mockResolvedValue([]);
    imports.findStalePending.mockResolvedValue([{ id: 43 }]);
    queue.getJobs.mockResolvedValue([failedJob(43, NOW - 1_000)]);

    await recovery.recoverFailedImports();

    expect(imports.failStalePending).not.toHaveBeenCalled();
  });

  it('does not claim pending recovery when its status changed', async () => {
    imports.findStaleProcessing.mockResolvedValue([]);
    imports.findStalePending.mockResolvedValue([{ id: 43 }]);
    imports.failStalePending.mockResolvedValue(false);

    await recovery.recoverFailedImports();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('recovers a stale recipe after its current job finally failed', async () => {
    queue.getJob.mockResolvedValue(failedJob(42, NOW - 1_000));

    await recovery.recoverFailedImports();

    expect(imports.failStaleProcessing).toHaveBeenCalledWith(
      42,
      new Date(NOW - 60_000),
    );
    expect(queue.getJob).toHaveBeenCalledWith('job-42');
    expect(queue.getJobs).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Recovered recipe 42 from failed import job job-42',
    );
  });

  it('ignores an old failed job after the recipe started processing again', async () => {
    queue.getJob.mockResolvedValue(
      failedJob(42, PROCESSING_STARTED_AT - 1_000),
    );

    await recovery.recoverFailedImports();

    expect(imports.failStaleProcessing).not.toHaveBeenCalled();
  });

  it('does not fail a recipe while another import job is still active', async () => {
    queue.getJob.mockResolvedValue(jobWithState(42, 'active', NOW - 500));

    await recovery.recoverFailedImports();

    expect(imports.failStaleProcessing).not.toHaveBeenCalled();
  });

  it.each([
    failedJob(99, NOW - 1_000),
    { ...failedJob(42, NOW - 1_000), name: 'unknown' },
    { ...failedJob(42, NOW - 1_000), data: null },
    { ...failedJob(42, NOW - 1_000), finishedOn: undefined },
  ])(
    'ignores a job that cannot prove the current import failed',
    async (job) => {
      queue.getJob.mockResolvedValue(job);

      await recovery.recoverFailedImports();

      expect(imports.failStaleProcessing).not.toHaveBeenCalled();
    },
  );

  it('does not claim recovery when the recipe changed before the update', async () => {
    queue.getJob.mockResolvedValue(failedJob(42, NOW - 1_000));
    imports.failStaleProcessing.mockResolvedValue(false);

    await recovery.recoverFailedImports();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('fails an old processing recipe when its job was completed elsewhere', async () => {
    imports.findStaleProcessing.mockResolvedValue([
      { id: 42, updatedAt: new Date(NOW - 6 * 60_000) },
    ]);

    await recovery.recoverFailedImports();

    expect(imports.failStaleProcessing).toHaveBeenCalledWith(
      42,
      new Date(NOW - 5 * 60_000),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Recovered recipe 42 without an active job',
    );
  });

  it('keeps old processing when a job is still active', async () => {
    imports.findStaleProcessing.mockResolvedValue([
      {
        id: 42,
        updatedAt: new Date(NOW - 6 * 60_000),
        processingJobId: 'job-42',
      },
    ]);
    queue.getJob.mockResolvedValue(jobWithState(42, 'active', NOW - 1_000));

    await recovery.recoverFailedImports();

    expect(imports.failStaleProcessing).not.toHaveBeenCalled();
  });

  it('continues with the next recipe batch and wraps the cursor', async () => {
    imports.findStaleProcessing.mockResolvedValue([]);
    imports.findStalePending
      .mockResolvedValueOnce(
        Array.from({ length: 100 }, (_, index) => ({ id: index + 1 })),
      )
      .mockResolvedValueOnce([{ id: 101 }])
      .mockResolvedValueOnce([{ id: 1 }]);

    await recovery.recoverFailedImports();
    await recovery.recoverFailedImports();
    await recovery.recoverFailedImports();

    expect(imports.findStalePending.mock.calls).toEqual([
      [new Date(NOW - 5 * 60_000), 0, 100],
      [new Date(NOW - 5 * 60_000), 100, 100],
      [new Date(NOW - 5 * 60_000), 0, 100],
    ]);
    expect(imports.failStalePending).toHaveBeenCalledWith(
      101,
      new Date(NOW - 5 * 60_000),
    );
  });

  it('retries the same recipe batch when Redis fails', async () => {
    imports.findStaleProcessing.mockResolvedValue([]);
    imports.findStalePending.mockResolvedValue(
      Array.from({ length: 100 }, (_, index) => ({ id: index + 1 })),
    );
    queue.getJobs.mockRejectedValueOnce(new Error('Redis unavailable'));

    await expect(recovery.recoverFailedImports()).rejects.toThrow(
      'Redis unavailable',
    );
    await recovery.recoverFailedImports();

    expect(imports.findStalePending.mock.calls).toEqual([
      [new Date(NOW - 5 * 60_000), 0, 100],
      [new Date(NOW - 5 * 60_000), 0, 100],
    ]);
  });

  it('checks later waiting job pages before failing a recipe', async () => {
    imports.findStalePending.mockResolvedValue([{ id: 43 }]);
    queue.getJobs.mockImplementation((states: string[], start: number) => {
      if (states[0] === 'waiting' && start === 0) {
        return Promise.resolve(
          Array.from({ length: 100 }, (_, index) =>
            failedJob(index + 100, NOW - 1_000),
          ),
        );
      }
      if (states[0] === 'waiting' && start === 100) {
        return Promise.resolve([
          failedJob(42, NOW - 1_000),
          failedJob(43, NOW - 1_000),
        ]);
      }
      return Promise.resolve([]);
    });

    await recovery.recoverFailedImports();

    expect(queue.getJobs).toHaveBeenCalledWith(['waiting'], 100, 199);
    expect(imports.failStalePending).not.toHaveBeenCalled();
    expect(imports.failStaleProcessing).not.toHaveBeenCalled();
  });
});

function failedJob(
  recipeId: number,
  finishedOn: number,
): Job<ImportRecipeJobData> {
  return jobWithState(recipeId, 'failed', finishedOn);
}

function jobWithState(
  recipeId: number,
  state: string,
  finishedOn: number,
): Job<ImportRecipeJobData> {
  return {
    id: `job-${recipeId}`,
    name: IMPORT_RECIPE_JOB,
    data: { recipeId },
    finishedOn,
    getState: jest.fn().mockResolvedValue(state),
  } as Job<ImportRecipeJobData>;
}
