# Рабочие заметки Codex по Dishly

Последнее обновление: 2026-09-02.

## Текущий контекст

- Проект: Dishly.
- Текущий этап: Этап 1 - Project Bootstrap.
- Текущая ветка: `feature/project-bootstrap`.
- Последние коммиты:
  - `0fcdf57 chore: initialize project workspace`
  - `1984e26 feat: scaffold NestJS backend`
  - `8746b12 chore: add Codex workflow notes`
  - `0a9ab1f chore: remove NestJS demo code`
- Главный принцип этапа: создать пустую fullstack-основу без бизнес-логики.
- Нельзя переходить к auth, recipes, parser, queue jobs, entities и другим доменным задачам.

## На чем остановились

Продолжать нужно с:

```text
Этап 1 завершен
```

Причина: Step 17 завершен, финальные проверки bootstrap-этапа прошли успешно.

При этом Step 4 и Step 5 уже были сделаны раньше:

- `ConfigModule` подключен в `apps/backend/src/app.module.ts`;
- `PORT` читается через `ConfigService` в `apps/backend/src/main.ts`;
- глобальный `ValidationPipe` настроен в `apps/backend/src/main.ts`.

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

## Уже сделано

- Прочитан `AGENTS.md`.
- Прочитан `apps/codex/CODEX_TASK.md`.
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
