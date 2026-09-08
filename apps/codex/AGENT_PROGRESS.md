# Рабочие заметки Codex по Dishly

Последнее обновление: 2026-09-08.

## Текущий контекст

- Проект: Dishly.
- Текущий этап: Этап 2 - Database Schema and TypeORM Entities.
- Текущая ветка: `feature/database-schema`.
- Последние коммиты:
  - `69fdfee Merge pull request #1 from MissKamilla/feature/project-bootstrap`
  - `f017d83 feat: complete project bootstrap`
  - `d7012f4 feat: scaffold React frontend`
  - `2d8995d chore: configure TypeORM and Redis infrastructure`
  - `a7ee82b chore: add PostgreSQL docker compose service`
- Главный принцип этапа: реализовать persistence-модель и migrations без бизнес-логики.
- Нельзя переходить к auth, recipes CRUD, parser, queue jobs, frontend и i18n.

## На чем остановились

Продолжать нужно с:

```text
Этап 2 Step 3 - User Entity
```

Причина: Step 2 - TypeORM migrations infrastructure завершен.

Ключевые выводы аудита:

- Runtime подключение PostgreSQL сейчас в `apps/backend/src/app.module.ts` через `TypeOrmModule.forRootAsync`.
- Переменные подключения берутся из `ConfigService`: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- Сохранено `autoLoadEntities: true` и `synchronize: false`.
- `apps/backend/tsconfig.json` использует `module: "nodenext"` и `moduleResolution: "nodenext"`.
- Фактически установлено: `@nestjs/typeorm@12.0.1`, `typeorm@1.1.1`, `pg@8.23.0`.
- TypeORM CLI доступен через `node_modules/.bin/typeorm` и поддерживает `migration:generate`, `migration:run`, `migration:revert`, `migration:show`.
- Для CLI нужен отдельный `DataSource`, потому что Nest runtime config с `ConfigService` и `autoLoadEntities` CLI напрямую не использует.
- Чтобы избежать расхождения runtime и migration config, на Step 2 лучше вынести общую функцию построения PostgreSQL options и использовать ее в `AppModule` и `database/data-source.ts`.
- Сторонний naming strategy package не нужен; таблицы и важные колонки можно задавать явно в Entity.
- Migration setup уже создан:
  - `apps/backend/src/database/typeorm.config.ts`;
  - `apps/backend/src/database/data-source.ts`;
  - `apps/backend/src/database/migrations/.gitkeep`;
  - npm scripts `migration:generate`, `migration:run`, `migration:revert`, `migration:show`.

## Чеклист Этапа 1

- [x] Step 1 - Git repository и базовая структура проекта.
- [x] Step 2 - создать backend в `apps/backend`.
- [x] Step 3 - очистить NestJS demo-код.
- [x] Step 4 - подключить `ConfigModule` и базовый `PORT`.
- [x] Step 5 - настроить global `ValidationPipe`.
- [x] Step 6 - Docker Compose для PostgreSQL.
- [x] Step 7 - TypeORM подключение к PostgreSQL.
- [x] Step 8 - Redis в Docker Compose.
- [x] Step 9 - создать frontend через Vite React TypeScript.
- [x] Step 10 - подключить React Router.
- [x] Step 11 - подключить TanStack Query.
- [x] Step 12 - frontend env `VITE_API_URL`.
- [x] Step 13 - простой backend `GET /health`.
- [x] Step 14 - CORS через env `FRONTEND_URL`.
- [x] Step 15 - проверить связь frontend/backend через `/health`.
- [x] Step 16 - базовый root `README.md`.
- [x] Step 17 - финальная проверка этапа.

## Чеклист Этапа 2

- [x] Step 1 - аудит текущей database-конфигурации.
- [x] Step 2 - настроить TypeORM migrations.
- [ ] Step 3 - User Entity.
- [ ] Step 4 - RecipeStatus и Recipe Entity.
- [ ] Step 5 - RecipeIngredient Entity.
- [ ] Step 6 - RecipeStep Entity.
- [ ] Step 7 - обратные relations.
- [ ] Step 8 - регистрация Entity.
- [ ] Step 9 - Initial migration.
- [ ] Step 11 - проверить migration lifecycle.
- [ ] Step 12 - объяснить SQL-модель.

## Уже сделано

- Прочитан `AGENTS.md`.
- Прочитан `apps/codex/CODEX_TASK.md`.
- Прочитан `apps/codex/AGENT_PROGRESS.md`.
- Создана рабочая ветка `feature/project-bootstrap`.
- Создана базовая структура проекта.
- Создан NestJS backend в `apps/backend`.
- Очищен стандартный NestJS demo-код:
  - удален `apps/backend/src/app.controller.ts`;
  - удален `apps/backend/src/app.service.ts`;
  - удален `apps/backend/src/app.controller.spec.ts`;
  - удален demo e2e-test `apps/backend/test/app.e2e-spec.ts`;
  - `apps/backend/src/app.module.ts` оставлен минимальным root module с `ConfigModule`.
- Улучшен `.gitignore`:
  - игнорируются `.env`, `.env.*`, `node_modules/`, `dist/`, `build/`, `coverage/`;
  - `!.env.example` оставлен доступным для Git;
  - `apps/codex/CODEX_TASK.md` и `apps/codex/AGENT_PROGRESS.md` игнорируются.
- Подключен `ConfigModule.forRoot({ isGlobal: true })`.
- Создан `apps/backend/.env.example` с `PORT=3000`.
- Создан root `.env.example` для Docker Compose PostgreSQL:
  - `POSTGRES_DB=dishly`;
  - `POSTGRES_USER=dishly`;
  - `POSTGRES_PASSWORD=dishly_password`;
  - `POSTGRES_PORT=5433`.
- Создан `docker-compose.yml` с PostgreSQL:
  - image `postgres:16-alpine`;
  - env variables через `${POSTGRES_*}`;
  - host port по умолчанию `5433`;
  - persistent volume `postgres_data`;
  - healthcheck через `pg_isready`.
- В `main.ts` сохранена ConfigService-based настройка порта:

```ts
const configService = app.get(ConfigService);
const port = configService.get<number>("PORT", 3000);
```

- Настроен global `ValidationPipe`:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
);
```

- Проверка `npm run build` из `apps/backend` ранее проходила успешно.
- После Step 3 проверка `npm run build` из `apps/backend` прошла успешно.
- После Step 6 проверка `docker compose config` прошла успешно.
- После Step 6 `docker compose up -d` запустил PostgreSQL.
- После Step 6 `docker compose ps` показал `dishly-postgres-1` в статусе `Up ... (healthy)`.
- После Step 7 пользователь подключил TypeORM к PostgreSQL:
  - установлены `@nestjs/typeorm`, `typeorm`, `pg`;
  - `TypeOrmModule.forRootAsync` подключен в `apps/backend/src/app.module.ts`;
  - конфигурация берется из `ConfigService`;
  - `autoLoadEntities: true`;
  - `synchronize: false`.
- После Step 8 добавлен Redis в `docker-compose.yml`:
  - image `redis:7-alpine`;
  - healthcheck через `redis-cli ping`;
  - внешний порт `6380`, внутренний порт контейнера `6379`.
- После Step 8 root `.env.example` и `.env` содержат `REDIS_PORT=6380`.
- После Step 8 `docker compose config` прошел успешно.
- После Step 8 `docker compose up -d --force-recreate redis` пересоздал Redis.
- После Step 8 `docker compose ps` показал `dishly-postgres-1` и `dishly-redis-1` в статусе `healthy`.
- После Step 8 `docker compose exec redis redis-cli ping` вернул `PONG`.
- После Step 9 пользователь создал frontend в `apps/frontend` через Vite React TypeScript.
- После Step 9 стандартный demo UI заменен на минимальный `Dishly frontend` в `apps/frontend/src/App.tsx`.
- После Step 9 `apps/frontend/src/index.css` оставлен минимальным базовым CSS.
- После Step 9 проверка `npm run build` из `apps/frontend` прошла успешно.
- После Step 10 пользователь установил `react-router-dom`.
- После Step 10 `BrowserRouter` подключен в `apps/frontend/src/main.tsx`.
- После Step 10 в `apps/frontend/src/App.tsx` добавлены временные маршруты `/`, `/login`, `/recipes`.
- После Step 11 пользователь установил `@tanstack/react-query`.
- После Step 11 `QueryClient` и `QueryClientProvider` подключены в `apps/frontend/src/main.tsx`.
- После Step 11 пользователь создал коммит `d7012f4 feat: scaffold React frontend`.
- После Step 12 созданы `apps/frontend/.env.example` и локальный `apps/frontend/.env` с `VITE_API_URL=http://localhost:3000`.
- После Step 12 `apps/frontend/.env` не отображается в `git status`, потому что игнорируется `.gitignore`.
- После Step 13 добавлен `apps/backend/src/health.controller.ts` с `GET /health`, который возвращает `{ status: 'ok' }`.
- После Step 13 `HealthController` зарегистрирован в `apps/backend/src/app.module.ts`.
- После Step 14 в `apps/backend/.env.example` и локальный `apps/backend/.env` добавлен `FRONTEND_URL=http://localhost:5173`.
- После Step 14 в `apps/backend/src/main.ts` включен CORS с origin из `ConfigService.getOrThrow<string>('FRONTEND_URL')`.
- После Step 15 в `apps/frontend/src/App.tsx` добавлен временный TanStack Query запрос на `${VITE_API_URL}/health`.
- После Step 15 frontend показывает backend status на главной странице.
- После Step 15 `npm run build` из `apps/frontend` прошел успешно.
- После Step 15 `npm run build` из `apps/backend` прошел успешно.
- После Step 15 backend `GET /health` проверен через `curl` и вернул `{"status":"ok"}`.
- После Step 15 CORS header для `Origin: http://localhost:5173` проверен через `curl`.
- После Step 16 создан root `README.md` с описанием проекта, stack, prerequisites, env setup, Docker commands, backend/frontend start и build commands.
- После Step 17 финальные проверки прошли успешно:
  - `npm run build` из `apps/backend`;
  - `npm run lint` из `apps/backend`;
  - `npm run build` из `apps/frontend`;
  - `npm run lint` из `apps/frontend`;
  - `docker compose ps`.
- После Step 17 в `apps/backend/src/main.ts` вызов `bootstrap()` заменен на `void bootstrap();`, чтобы убрать предупреждение `@typescript-eslint/no-floating-promises`.
- Этап 2 Step 1 завершен:
  - изучены `apps/backend/src/app.module.ts`, `apps/backend/.env.example`, `apps/backend/package.json`, `apps/backend/tsconfig.json`, `docker-compose.yml`;
  - проверено фактическое дерево зависимостей через `npm list typeorm @nestjs/typeorm pg`;
  - проверены версии пакетов через локальные `package.json` в `node_modules`;
  - проверен TypeORM CLI через `./node_modules/.bin/typeorm --help`;
  - проверка `npm run build` из `apps/backend` прошла успешно.
- Этап 2 Step 2 завершен:
  - создана/используется ветка `feature/database-schema`;
  - `dotenv` добавлен как явная backend dependency для загрузки `.env` в TypeORM CLI;
  - добавлены npm scripts для `migration:generate`, `migration:run`, `migration:revert`, `migration:show`;
  - создан общий helper `createDatabaseOptions` / `createRuntimeDatabaseOptions`;
  - создан отдельный TypeORM `DataSource` для CLI;
  - `AppModule` переведен на общий runtime database config;
  - создана папка `src/database/migrations`;
  - `npm run build` из `apps/backend` прошел успешно;
  - пользователь проверил `migration:generate -- --dr`, `npm run lint`, `docker compose ps`, `git status`, `git diff` - все работает.

## Текущие локальные ignored файлы

Ожидаемо игнорируются:

- `apps/backend/.env`
- `apps/backend/dist/`
- `apps/backend/node_modules/`
- `apps/codex/`
- `node_modules/`

## Нюансы и решения

- Для простого monorepo пока не используем Nx, Turborepo или похожие инструменты.
- Не добавлять Redux Toolkit: server state позже должен идти через TanStack Query.
- Не добавлять BullMQ на Этапе 1, Redis пока только инфраструктурный сервис.
- Для Docker Compose PostgreSQL используем host port `5433` по умолчанию, потому что `5432` на машине может быть занят локальным PostgreSQL. Внутри контейнера PostgreSQL остается на `5432`.
- Для Docker Compose Redis используем host port `6380` по умолчанию, потому что `6379` на машине уже занят контейнером `verify_redis`. Внутри контейнера Redis остается на `6379`.
- На Этапе 2 Step 2 нужен отдельный `DataSource` для TypeORM CLI.
- Runtime TypeORM config и CLI DataSource используют общий helper без Nest-зависимостей.
- Текущий `typeorm@1.1.1` выглядит новым ESM-aware пакетом с `DataSource` и CLI wrappers `typeorm-ts-node-commonjs` / `typeorm-ts-node-esm`; для текущего проекта выбран и проверен `typeorm-ts-node-commonjs`.
- По договоренности с разработчиком: если нужно что-то установить или запустить, сначала дать команду и объяснить зачем; разработчик выполнит команду самостоятельно.

## Правило ведения этого файла дальше

Перед переходом к каждому новому шагу:

1. Прочитать `apps/codex/CODEX_TASK.md`.
2. Прочитать этот `AGENT_PROGRESS.md`.
3. Обновить раздел "На чем остановились".
4. В чеклисте поставить текущий шаг как незавершенный или выполняемый по тексту.

В процессе выполнения:

1. Отмечать важные подпункты и решения.
2. Не записывать длинные рассуждения, только факты, которые помогут продолжить работу позже.
3. Если появилась временная договоренность с разработчиком, записать ее в "Нюансы и решения".

После завершения шага:

1. Поставить шагу `[x]`.
2. Кратко записать, что изменено.
3. Записать, какие проверки запускались и прошли ли они.
4. Обновить "На чем остановились" на следующий шаг.
