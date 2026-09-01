# Рабочие заметки Codex по Dishly

Файл нужен как локальная память по проекту. Он не должен попадать в Git.

Последнее обновление: 2026-08-31.

## Текущий контекст

- Проект: Dishly.
- Текущий этап: Этап 1 - Project Bootstrap.
- Текущая ветка: `feature/project-bootstrap`.
- Последние коммиты:
  - `0fcdf57 chore: initialize project workspace`
  - `1984e26 feat: scaffold NestJS backend`
- Главный принцип этапа: создать пустую fullstack-основу без бизнес-логики.
- Нельзя переходить к auth, recipes, parser, queue jobs, entities и другим доменным задачам.

## На чем остановились

Продолжать нужно с:

```text
Step 7 - TypeORM подключение к PostgreSQL
```

Причина: Step 6 завершен, PostgreSQL запускается через Docker Compose и проходит healthcheck.

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
- [ ] Step 7 - TypeORM подключение к PostgreSQL.
- [ ] Step 8 - Redis в Docker Compose.
- [ ] Step 9 - создать frontend через Vite React TypeScript.
- [ ] Step 10 - подключить React Router.
- [ ] Step 11 - подключить TanStack Query.
- [ ] Step 12 - frontend env `VITE_API_URL`.
- [ ] Step 13 - простой backend `GET /health`.
- [ ] Step 14 - CORS через env `FRONTEND_URL`.
- [ ] Step 15 - проверить связь frontend/backend через `/health`.
- [ ] Step 16 - базовый root `README.md`.
- [ ] Step 17 - финальная проверка этапа.

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
