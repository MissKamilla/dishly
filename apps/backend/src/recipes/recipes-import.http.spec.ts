jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
}));

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Server } from 'http';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Recipe } from './entities/recipe.entity';
import { RecipeImportService } from './import/recipe-import.service';
import { RecipeImportQueue } from './queue/recipe-import.queue';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

describe('POST /recipes/import', () => {
  let app: INestApplication;
  let server: Server;
  let repository: { create: jest.Mock; save: jest.Mock };
  let queue: { enqueue: jest.Mock };
  let requestImportSpy: jest.SpyInstance;

  beforeAll(async () => {
    repository = {
      create: jest.fn((recipe: Partial<Recipe>) => recipe as Recipe),
      save: jest.fn((recipe: Recipe) =>
        Promise.resolve({
          ...recipe,
          id: 42,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
      ),
    };
    queue = { enqueue: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const importService = new RecipeImportService(
      repository as unknown as Repository<Recipe>,
      queue as unknown as RecipeImportQueue,
      {} as DataSource,
    );
    requestImportSpy = jest.spyOn(importService, 'requestImport');

    const module = await Test.createTestingModule({
      controllers: [RecipesController],
      providers: [
        { provide: RecipesService, useValue: {} },
        { provide: RecipeImportService, useValue: importService },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn().mockResolvedValue({ sub: 7 }) },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a supported URL and calls the import service', async () => {
    const url = 'https://www.bbcgoodfood.com/recipes/example';

    await request(server)
      .post('/recipes/import')
      .set('Cookie', `${AUTH_COOKIE_NAME}=test-token`)
      .send({ url })
      .expect(202)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: 42, status: 'pending' });
      });

    expect(requestImportSpy).toHaveBeenCalledWith(7, url);
    expect(queue.enqueue).toHaveBeenCalledWith(42);
  });

  it('rejects an unsupported URL with 400', async () => {
    await request(server)
      .post('/recipes/import')
      .set('Cookie', `${AUTH_COOKIE_NAME}=test-token`)
      .send({ url: 'https://example.com/recipe' })
      .expect(400);

    expect(repository.create).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it.each([
    ['missing URL', {}],
    [
      'extra field',
      { url: 'https://www.bbcgoodfood.com/recipes/example', extra: true },
    ],
  ])('rejects %s with 400 before calling the service', async (_name, body) => {
    await request(server)
      .post('/recipes/import')
      .set('Cookie', `${AUTH_COOKIE_NAME}=test-token`)
      .send(body)
      .expect(400);

    expect(requestImportSpy).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    await request(server)
      .post('/recipes/import')
      .send({ url: 'https://www.bbcgoodfood.com/recipes/example' })
      .expect(401);

    expect(requestImportSpy).not.toHaveBeenCalled();
  });
});
