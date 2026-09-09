# Рабочие заметки Codex по Dishly

Последнее обновление: 2026-09-09.

## Текущий контекст

- Проект: Dishly.
- Текущий этап: Этап 3 - Backend Authentication.
- Текущая ветка: `feature/auth`.
- Последние коммиты:
  - `69fdfee Merge pull request #1 from MissKamilla/feature/project-bootstrap`
  - `f017d83 feat: complete project bootstrap`
  - `d7012f4 feat: scaffold React frontend`
  - `2d8995d chore: configure TypeORM and Redis infrastructure`
  - `a7ee82b chore: add PostgreSQL docker compose service`
- Главный принцип этапа: реализовать backend authentication через JWT + HttpOnly cookie без refresh/session/OAuth.
- Нельзя переходить к Recipes API, queue, parser или frontend authentication.

## На чем остановились

Продолжать нужно с:

```text
Этап 3 Step 3 завершен - продолжать с Step 4 UsersService
```

Причина: auth environment variables описаны, `.env.example` содержит восстановимый dev config, приложение теперь валидирует JWT env на старте.

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
  - `apps/backend/src/database/migrations/1788879733493-CreateInitialSchema.ts`;
  - npm scripts `migration:generate`, `migration:run`, `migration:revert`, `migration:show`.
- User persistence model уже создан:
  - `apps/backend/src/users/entities/user.entity.ts`;
  - `apps/backend/src/users/users.module.ts`;
  - `UsersModule` подключен в `AppModule`.
- Recipe persistence model уже создан:
  - `apps/backend/src/recipes/enums/recipe-status.enum.ts`;
  - `apps/backend/src/recipes/entities/recipe.entity.ts`;
  - `apps/backend/src/recipes/entities/recipe-ingredient.entity.ts`;
  - `apps/backend/src/recipes/entities/recipe-step.entity.ts`;
  - `apps/backend/src/recipes/recipes.module.ts`;
  - `RecipesModule` подключен в `AppModule`.
- Auth-related dependencies уже присутствуют:
  - `@nestjs/jwt@12.0.1`;
  - `argon2@0.45.1`;
  - `cookie-parser@1.4.7`;
  - `class-validator@0.15.1`;
  - `class-transformer@0.5.1`;
  - `@types/cookie-parser@1.4.10`.
- `apps/backend/src/main.ts` уже содержит global `ValidationPipe` с `whitelist`, `transform`, `forbidNonWhitelisted`.
- CORS уже включен с origin из `FRONTEND_URL`; для cookie-auth на одном из следующих шагов нужно добавить `credentials: true`.
- `UsersModule` пока содержит только `TypeOrmModule.forFeature([User])`; `UsersService` еще не создан.
- `AuthModule`, `AuthController`, `AuthService`, DTO, guard, decorators и auth types еще не созданы.
- Step 3 Environment configuration завершен:
  - `apps/backend/.env.example` содержит `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`;
  - `JWT_SECRET` в `.env.example` содержит dev-only значение `dishly_local_development_jwt_secret_replace_before_real_deploy`;
  - локальный `apps/backend/.env` уже содержит dev JWT config и игнорируется Git;
  - добавлен `apps/backend/src/config/validate-environment.ts`;
  - `ConfigModule.forRoot` подключает `validateEnvironment`;
  - при пустом `JWT_SECRET` приложение падает на старте;
  - `JWT_EXPIRES_IN_SECONDS` должен быть положительным целым числом.

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
- [x] Step 3 - User Entity.
- [x] Step 4 - RecipeStatus и Recipe Entity.
- [x] Step 5 - RecipeIngredient Entity.
- [x] Step 6 - RecipeStep Entity.
- [x] Step 7 - обратные relations.
- [x] Step 8 - регистрация Entity.
- [x] Step 9 - Initial migration.
- [x] Step 11 - проверить migration lifecycle.
- [x] Step 12 - объяснить SQL-модель.

## Чеклист Этапа 3

- [x] Step 1 - Audit перед Auth.
- [x] Step 2 - Dependencies.
- [x] Step 3 - Environment configuration.
- [ ] Step 4 - UsersService.
- [ ] Step 5+ - Auth module/service/controller/guard/decorators/tests/manual verification по `CODEX_TASK.md`.

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
- Этап 2 Step 3 завершен:
  - создан `User` entity с таблицей `users`;
  - поля: `id`, `email`, `password_hash`, `name`, `language`, `created_at`, `updated_at`;
  - `passwordHash` хранится в колонке `password_hash` и исключен из обычных SELECT через `select: false`;
  - `email` имеет unique constraint `UQ_users_email`;
  - `language` имеет default `en`;
  - timestamps используют PostgreSQL `TIMESTAMP WITH TIME ZONE`;
  - создан `UsersModule` с `TypeOrmModule.forFeature([User])`;
  - `UsersModule` подключен в `AppModule`;
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно;
  - `migration:generate -- src/database/migrations/CheckUserEntity --dr` прошел успешно и показал ожидаемый SQL без создания файла.
- Этап 2 Step 4 завершен:
  - создан enum `RecipeStatus` со значениями `pending`, `processing`, `completed`, `failed`;
  - создан `Recipe` entity с таблицей `recipes`;
  - поля: `id`, `title`, `description`, `source_url`, `image_url`, `servings`, `prep_time_minutes`, `cook_time_minutes`, `status`, `error_message`, `user_id`, `created_at`, `updated_at`;
  - `status` использует PostgreSQL enum `recipe_status` и default `pending`;
  - `userId` хранится в колонке `user_id`;
  - `user` relation настроен через `ManyToOne` и `JoinColumn({ name: 'user_id' })`;
  - FK `recipes.user_id -> users.id` настроен с `ON DELETE CASCADE`;
  - добавлен индекс `IDX_recipes_user_id`;
  - создан `RecipesModule` с `TypeOrmModule.forFeature([Recipe])`;
  - `RecipesModule` подключен в `AppModule`;
  - не создавались service/controller/DTO/repository;
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно;
  - `migration:generate -- src/database/migrations/CheckRecipeEntity --dr` прошел успешно и показал ожидаемый SQL без создания файла.
- Этап 2 Step 5 завершен:
  - создан `RecipeIngredient` entity с таблицей `recipe_ingredients`;
  - поля: `id`, `raw_text`, `name`, `quantity`, `unit`, `position`, `recipe_id`;
  - `rawText` хранится в колонке `raw_text` как обязательный `text`;
  - `name` nullable `varchar(255)`;
  - `quantity` nullable `double precision`, чтобы поддерживать дробные значения как JS `number`;
  - `unit` nullable `varchar(32)`;
  - `position` обязательный `integer`;
  - `recipeId` хранится в колонке `recipe_id`;
  - `recipe` relation настроен через `ManyToOne` и `JoinColumn({ name: 'recipe_id' })`;
  - FK `recipe_ingredients.recipe_id -> recipes.id` настроен с `ON DELETE CASCADE`;
  - добавлен unique constraint `UQ_recipe_ingredients_recipe_id_position` на `(recipe_id, position)`;
  - отдельный индекс на `recipe_id` не добавлялся, чтобы не дублировать composite unique index;
  - не создавались service/controller/DTO/repository;
  - `RecipesModule` пока не обновлялся для `RecipeIngredient`; регистрация всех recipe entities будет на Step 8;
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно;
  - `migration:generate -- src/database/migrations/CheckRecipeIngredientEntity --dr` прошел успешно и показал ожидаемый SQL без создания файла.
- Этап 2 Step 6 завершен:
  - создан `RecipeStep` entity с таблицей `recipe_steps`;
  - поля: `id`, `text`, `group_name`, `duration_minutes`, `image_url`, `position`, `recipe_id`;
  - `text` обязательный `text`;
  - `group` хранится в колонке `group_name` как nullable `varchar(255)`;
  - `durationMinutes` хранится в колонке `duration_minutes` как nullable `integer`;
  - `imageUrl` хранится в колонке `image_url` как nullable `text`;
  - `position` обязательный `integer`;
  - `recipeId` хранится в колонке `recipe_id`;
  - `recipe` relation настроен через `ManyToOne` и `JoinColumn({ name: 'recipe_id' })`;
  - FK `recipe_steps.recipe_id -> recipes.id` настроен с `ON DELETE CASCADE`;
  - добавлен unique constraint `UQ_recipe_steps_recipe_id_position` на `(recipe_id, position)`;
  - не создавались service/controller/DTO/repository;
  - `RecipesModule` пока не обновлялся для `RecipeIngredient`/`RecipeStep`; регистрация всех recipe entities будет на Step 8;
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно;
  - `migration:generate -- src/database/migrations/CheckRecipeStepEntity --dr` прошел успешно и показал ожидаемый SQL без создания файла.
- Этап 2 Step 7 завершен:
  - в `User` добавлен обратный relation `recipes: Recipe[]`;
  - в `Recipe` добавлены обратные relations `ingredients: RecipeIngredient[]` и `steps: RecipeStep[]`;
  - `cascade: true` не добавлялся;
  - eager loading не добавлялся;
  - owning-side FK остаются на `Recipe.user`, `RecipeIngredient.recipe`, `RecipeStep.recipe`;
  - `OneToMany` не создает новые database columns, а только описывает обратную навигацию для TypeORM;
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно;
  - `migration:generate -- src/database/migrations/CheckReverseRelations --dr` прошел успешно и не показал неожиданных колонок.
- Этап 2 Step 8 завершен:
  - `UsersModule` уже регистрирует `User` через `TypeOrmModule.forFeature([User])`;
  - `RecipesModule` обновлен и регистрирует `Recipe`, `RecipeIngredient`, `RecipeStep`;
  - `AppModule` уже подключает `UsersModule` и `RecipesModule`;
  - service/controller/DTO/repository не создавались;
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно;
  - `migration:generate -- src/database/migrations/CheckEntityRegistration --dr` прошел успешно и SQL остался ожидаемым.
- Этап 2 Step 9 завершен:
  - проверено, что Docker container `dishly-postgres-1` healthy;
  - проверено, что dev database содержит только служебную таблицу `migrations`, бизнес-таблиц не было;
  - `migration:show` показал отсутствие примененных migrations до генерации;
  - создана initial migration `1788879733493-CreateInitialSchema.ts`;
  - migration вручную проверена: создает `users`, `recipe_status`, `recipes`, `recipe_ingredients`, `recipe_steps`;
  - migration создает `UQ_users_email`, `IDX_recipes_user_id`, `UQ_recipe_ingredients_recipe_id_position`, `UQ_recipe_steps_recipe_id_position`;
  - migration создает FK `recipes.user_id -> users.id ON DELETE CASCADE`;
  - migration создает FK `recipe_ingredients.recipe_id -> recipes.id ON DELETE CASCADE`;
  - migration создает FK `recipe_steps.recipe_id -> recipes.id ON DELETE CASCADE`;
  - порядок создания `recipe_steps` до `recipes` безопасен, потому что FK добавляется отдельным `ALTER TABLE` после создания обеих таблиц;
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно и отформатировал migration;
  - `migration:show` после генерации показывает `[ ] CreateInitialSchema1788879733493`.
- Этап 2 Step 11 завершен:
  - пользователь вручную запустил `npm run migration:run`;
  - через PostgreSQL проверено, что созданы таблицы `users`, `recipes`, `recipe_ingredients`, `recipe_steps`, `migrations`;
  - через таблицу `migrations` проверено, что записана migration `CreateInitialSchema1788879733493`;
  - через `\d users`, `\d recipes`, `\d recipe_ingredients`, `\d recipe_steps` проверены реальные колонки, nullable/defaults, PK, FK и unique constraints;
  - через `pg_enum` проверены значения enum `recipe_status`: `pending`, `processing`, `completed`, `failed`;
  - через `pg_constraint` проверено, что FK используют `ON DELETE CASCADE`;
  - `npm run migration:revert` прошел успешно;
  - после revert проверено, что осталась только таблица `migrations`, а запись о migration удалена;
  - `npm run migration:run` повторно применил migration;
  - финальный `migration:show` показывает `[X] CreateInitialSchema1788879733493`;
  - через `pg_indexes` проверены `IDX_recipes_user_id`, `UQ_users_email`, `UQ_recipe_ingredients_recipe_id_position`, `UQ_recipe_steps_recipe_id_position`;
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно.
- Этап 2 Step 12 завершен:
  - разработчику объяснено соответствие TypeORM decorators и PostgreSQL concepts;
  - `ManyToOne` / `JoinColumn` соответствуют FK column на owning-side;
  - `OneToMany` соответствует обратной TypeScript-навигации и не создает колонку в PostgreSQL;
  - `Unique` соответствует unique constraint / unique index;
  - `Index` соответствует обычному database index;
  - `onDelete: 'CASCADE'` соответствует FK behavior `ON DELETE CASCADE`;
  - объяснено, почему database cascade deletion отличается от ORM `cascade: true`.
- Финальные проверки Этапа 2 завершены:
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно;
  - `npm run migration:show` показывает `[X] CreateInitialSchema1788879733493`;
  - `docker ps` показывает `dishly-postgres-1` и `dishly-redis-1` healthy;
  - через PostgreSQL проверены таблицы `migrations`, `users`, `recipes`, `recipe_ingredients`, `recipe_steps`;
  - через PostgreSQL проверены FK/unique constraints и enum `recipe_status`;
  - frontend не изменялся;
  - auth/parser/queue/business logic не реализовывались.

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
- По договоренности с разработчиком: для учебного проекта `.env.example` должен содержать полный восстановимый local/dev config, кроме личных паролей и настоящих секретов сторонних сервисов.
- Следить за одинаковым стилем и порядком во всех файлах.
- Commit `4afcc03 chore: configure TypeORM migrations` уже содержит migration infrastructure Step 2; следующий commit должен покрыть entities + initial migration.

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
