# Рабочие заметки Codex по Dishly

Последнее обновление: 2026-09-14.

## Текущий контекст

- Проект: Dishly.
- Текущий этап: Этап 3 - Backend Authentication завершен.
- Текущая ветка: `feature/auth`.
- Последние коммиты:
  - `69fdfee Merge pull request #1 from MissKamilla/feature/project-bootstrap`
  - `f017d83 feat: complete project bootstrap`
  - `d7012f4 feat: scaffold React frontend`
  - `2d8995d chore: configure TypeORM and Redis infrastructure`
  - `a7ee82b chore: add PostgreSQL docker compose service`
- Главный принцип этапа: реализовать backend authentication через JWT + HttpOnly cookie без refresh/session/OAuth.
- Следующий этап по плану: Этап 4 - Recipes Backend API без Parser и Queue.
- Не переходить к следующему этапу без явной команды разработчика.

## На чем остановились

Продолжать нужно с:

```text
Этап 3 Step 34 завершен - Backend Authentication готов к переходу на Этап 4
```

Причина: финальный review завершен, блокирующих проблем нет, все проверки этапа пройдены.

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
- `UsersModule` содержит `TypeOrmModule.forFeature([User])`, provides/exports `UsersService`.
- `AuthModule`, `AuthController`, `AuthService`, DTO, guard, decorators и auth types созданы.
- Step 3 Environment configuration завершен:
  - `apps/backend/.env.example` содержит `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`;
  - `JWT_SECRET` в `.env.example` содержит dev-only значение `dishly_local_development_jwt_secret_replace_before_real_deploy`;
  - локальный `apps/backend/.env` уже содержит dev JWT config и игнорируется Git;
  - добавлен `apps/backend/src/config/validate-environment.ts`;
  - `ConfigModule.forRoot` подключает `validateEnvironment`;
  - при пустом `JWT_SECRET` приложение падает на старте;
  - `JWT_EXPIRES_IN_SECONDS` должен быть положительным целым числом.
- Step 4 UsersService завершен:
  - добавлен `apps/backend/src/users/users.service.ts`;
  - `UsersService` использует стандартный TypeORM `Repository<User>` через `@InjectRepository(User)`;
  - методы: `findById`, `findByEmail`, `findByEmailWithPassword`, `create`;
  - `findByEmailWithPassword` явно добавляет `user.passwordHash` через query builder, потому что `passwordHash` имеет `select: false`;
  - `create` после сохранения перечитывает пользователя обычным query и возвращает public `User` без `passwordHash`;
  - `UsersModule` теперь provides/exports `UsersService`.
- Step 5 Email normalization завершен:
  - `UsersService.findByEmail`, `findByEmailWithPassword` и `create` нормализуют email через `trim().toLowerCase()`;
  - password не нормализуется и не меняется.
- Step 6 RegisterDto завершен:
  - добавлен `apps/backend/src/auth/dto/register.dto.ts`;
  - DTO принимает только `email`, `password`, `name`;
  - `language` при регистрации не принимается, используется database default `en`;
  - email валидируется как email с max length 320;
  - password валидируется как string длиной 8-128;
  - name валидируется как непустой string с max length 120.
- Step 7 LoginDto завершен:
  - добавлен `apps/backend/src/auth/dto/login.dto.ts`;
  - DTO принимает только `email` и `password`;
  - email валидируется как email с max length 320;
  - password валидируется как string длиной 8-128;
  - `name`, `language`, `id`, `role` не принимаются.
- Step 8 Password hashing завершен:
  - добавлен `apps/backend/src/auth/password.service.ts`;
  - `PasswordService.hashPassword` использует `argon2.hash` с `type: argon2id`;
  - `PasswordService.verifyPassword` использует `argon2.verify`;
  - plain password не логируется, не сохраняется и не нормализуется.
- Step 9 Duplicate email подготовлен:
  - добавлен `apps/backend/src/database/postgres-error.ts`;
  - helper `isPostgresUniqueViolation` распознает PostgreSQL unique violation code `23505`;
  - после senior review helper усилен optional проверкой имени constraint;
  - `User` entity экспортирует `USER_EMAIL_UNIQUE_CONSTRAINT = 'UQ_users_email'`;
  - добавлен `apps/backend/src/users/errors/duplicate-user-email.error.ts`;
  - `UsersService.create` ловит unique violation именно по `UQ_users_email` при `repository.save()` и бросает `DuplicateUserEmailError`;
  - raw PostgreSQL unique violation не должен уходить выше в auth flow;
  - HTTP `409 Conflict` подключен в `AuthService.register`.
- Step 10 AuthService Register завершен:
  - добавлен `apps/backend/src/auth/auth.service.ts`;
  - добавлены auth types в одном файле `apps/backend/src/auth/types/auth.types.ts`: `JwtPayload`, `PublicUser`, `AuthResult`;
  - `register` принимает `RegisterDto`;
  - duplicate email pre-check выполняется через `UsersService.findByEmail`;
  - password хешируется через `PasswordService.hashPassword`;
  - user создается через `UsersService.create`;
  - race-condition duplicate из database unique violation превращается в `ConflictException`;
  - JWT payload содержит только `{ sub: user.id }`;
  - service возвращает `PublicUser` + internal `accessToken` для будущей установки cookie controller-ом;
  - `AuthService` не пишет HTTP cookie.
- Step 11 Public User завершен:
  - `PublicUser` содержит только `id`, `email`, `name`, `language`;
  - `AuthService.toPublicUser` явно мапит `User` entity в public representation;
  - `passwordHash`, JWT и database timestamps не входят в public user;
  - отдельный mapper-файл не создавался, чтобы не дробить маленькую auth-логику.
- Step 12 AuthService Login завершен:
  - `AuthService.login` принимает `LoginDto`;
  - пользователь ищется через `UsersService.findByEmailWithPassword`;
  - password проверяется через `PasswordService.verifyPassword`;
  - successful login возвращает `PublicUser` + internal `accessToken`;
  - unknown email и wrong password возвращают одинаковый `UnauthorizedException('Invalid email or password')`;
  - JWT payload содержит только `{ sub: user.id }`.
- Step 13 JWT configuration завершен:
  - добавлен `apps/backend/src/auth/auth.module.ts`;
  - `AuthModule` импортирует `UsersModule`;
  - `JwtModule.registerAsync` использует `ConfigService`;
  - JWT secret берется из `JWT_SECRET`;
  - JWT expiration берется из `JWT_EXPIRES_IN_SECONDS`;
  - `AuthService` и `PasswordService` зарегистрированы как providers в `AuthModule`;
  - `AuthModule` подключен в `AppModule`;
  - refresh tokens не добавлялись.
- Step 14 Authentication cookie завершен:
  - добавлен `apps/backend/src/auth/auth.constants.ts`;
  - cookie name: `dishly_access_token`;
  - добавлен `apps/backend/src/auth/auth.config.ts`;
  - `createAuthCookieOptions` выставляет `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure: NODE_ENV === 'production'`;
  - cookie `maxAge` считается из `JWT_EXPIRES_IN_SECONDS * 1000`;
  - `createClearAuthCookieOptions` использует совместимые `path`, `sameSite`, `secure`;
  - `createJwtModuleOptions` перенесен в `auth.config.ts`, чтобы JWT и cookie использовали общий источник expiration.
- Step 15 AuthController частично завершен:
  - добавлен `apps/backend/src/auth/auth.controller.ts`;
  - `AuthController` зарегистрирован в `AuthModule`;
  - `POST /auth/register` вызывает `AuthService.register`, ставит `dishly_access_token` cookie и возвращает `PublicUser`;
  - `POST /auth/login` вызывает `AuthService.login`, ставит `dishly_access_token` cookie и возвращает `PublicUser`;
  - `POST /auth/logout` idempotent, возвращает `204 No Content` и очищает cookie совместимыми options;
  - JWT не возвращается в response body;
  - `GET /auth/current` намеренно не добавлен на этом шаге, потому что для корректной реализации нужны `cookie-parser`, `JwtAuthGuard` и `@CurrentUser`.
- Step 16 cookie-parser завершен:
  - `cookie-parser` подключен в `apps/backend/src/main.ts`;
  - будущий `JwtAuthGuard` должен читать JWT из `request.cookies.dishly_access_token`;
  - token не должен искаться в query string, request body или localStorage.
- Step 17 CORS завершен:
  - `apps/backend/src/main.ts` сохраняет `origin: FRONTEND_URL`;
  - добавлен `credentials: true`;
  - `origin: '*'` не используется;
  - frontend на этом этапе не менялся.
- Step 18 JwtAuthGuard завершен:
  - добавлен `apps/backend/src/auth/decorators/public.decorator.ts`;
  - `@Public()` выставляет metadata key `isPublicRoute`;
  - добавлен `apps/backend/src/auth/guards/jwt-auth.guard.ts`;
  - guard проверяет public route через `Reflector.getAllAndOverride`;
  - JWT читается только из `request.cookies.dishly_access_token`;
  - missing/invalid/expired token возвращают общий `UnauthorizedException('Authentication required')`;
  - payload валидируется runtime-safe как object с positive integer `sub`;
  - в request кладется минимальный authenticated user `{ id: payload.sub }`;
  - `JwtAuthGuard` зарегистрирован provider-ом в `AuthModule`, но еще не подключен global guard-ом.
- Step 19 Auth по умолчанию завершен:
  - `JwtAuthGuard` подключен как global guard через `APP_GUARD` в `AuthModule`;
  - backend стал secure-by-default: routes protected по умолчанию;
  - следующий Step 20 должен пометить `/health`, `/auth/register`, `/auth/login`, `/auth/logout` как public, иначе они будут закрыты guard-ом.
- Step 20 Public endpoints завершен:
  - `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` помечены `@Public()`;
  - `GET /health` помечен `@Public()`;
  - `GET /auth/current` пока не добавлен и должен остаться protected.
- Step 21 CurrentUser decorator завершен:
  - добавлен `apps/backend/src/auth/decorators/current-user.decorator.ts`;
  - decorator достает `request.user`, который заполняет `JwtAuthGuard`;
  - business logic в decorator не добавлялась.
- Step 15 follow-up GET /auth/current завершен:
  - `AuthController.getCurrentUser` добавлен как `GET /auth/current` без `@Public()`, поэтому endpoint protected global guard-ом;
  - controller получает `{ id }` через `@CurrentUser()`;
  - `AuthService.getCurrentUser` загружает пользователя из PostgreSQL через `UsersService.findById`;
  - если пользователь из JWT больше не существует в БД, возвращается `UnauthorizedException('Authentication required')`;
  - response использует `PublicUser`, JWT данные напрямую не возвращаются.
- Step 22 Module structure завершен:
  - `AuthModule` импортирует `UsersModule`;
  - `AuthModule` настраивает `JwtModule` через `ConfigService`;
  - `AuthModule` exposes `AuthController`;
  - `AuthModule` provides `AuthService`, `PasswordService`, global `JwtAuthGuard` через `APP_GUARD`;
  - `UsersModule` импортирует `TypeOrmModule.forFeature([User])`;
  - `UsersModule` provides/exports `UsersService`;
  - circular dependencies не обнаружены;
  - прямой импорт `UsersModule` в `AppModule` оставлен как не блокирующий и не создающий cycle.
- Step 23 Controller boundaries завершен:
  - `AuthController` не импортирует `Repository`, `InjectRepository`, `argon2`, `JwtService` и не содержит SQL/TypeORM calls;
  - controller отвечает за HTTP input/output, cookie set/clear и вызовы `AuthService`;
  - password hashing, password verification, JWT creation, duplicate email handling и user loading остаются в services;
  - `GET /auth/current` использует `@CurrentUser()` и делегирует PostgreSQL lookup в `AuthService.getCurrentUser`.
- Step 24 Security checks завершен:
  - plaintext password не сохраняется, не возвращается и не логируется;
  - registration передает plain password только в `PasswordService.hashPassword`, затем в `UsersService.create` уходит только `passwordHash`;
  - `passwordHash` имеет `select: false`, обычные user queries его не выбирают;
  - login-specific query явно выбирает `passwordHash` только в `UsersService.findByEmailWithPassword`;
  - API responses используют `PublicUser`, где нет `passwordHash`, `createdAt`, `updatedAt`;
  - JWT payload содержит только `{ sub: user.id }`;
  - JWT не возвращается в response body, а используется только для `dishly_access_token` cookie;
  - cookie options: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure: NODE_ENV === 'production'`;
  - unknown email и wrong password возвращают одинаковый `UnauthorizedException('Invalid email or password')`;
  - real production secret не добавлялся; `.env.example` содержит только dev-only local JWT secret по договоренности учебного проекта.
- Step 25 CSRF scope завершен:
  - отдельная CSRF library/token mechanism сейчас не добавлялись;
  - текущий MVP исходит из same-site frontend/backend setup;
  - auth cookie использует `SameSite=Lax`;
  - если production deployment позже потребует `SameSite=None` или frontend/backend окажутся truly cross-site, CSRF protection нужно пересмотреть отдельным security task;
  - frontend на этом шаге не менялся.
- Step 26 Tests завершен:
  - добавлен `apps/backend/src/auth/auth.service.spec.ts`;
  - registration tests проверяют создание user с password hash, duplicate pre-check и database duplicate race conversion в conflict;
  - login tests проверяют successful login и одинаковый unauthorized response для unknown email/wrong password;
  - добавлен `apps/backend/src/auth/guards/jwt-auth.guard.spec.ts`;
  - guard tests проверяют public route, valid cookie token, missing token, invalid token, expired token, invalid payload;
  - Jest specs мокают ESM Nest packages (`@nestjs/jwt`) там, где это нужно из-за текущего CommonJS Jest setup;
  - `npm test`, `npm run lint`, `npm run build` из `apps/backend` прошли успешно.
- Step 27 Manual end-to-end verification завершен:
  - через реальный HTTP API проверен `GET /health` без authentication: `200`;
  - через `POST /auth/register` создан тестовый user, response содержит только public user;
  - registration с email в mixed case и пробелами проверил DTO-level normalization: email сохранен/возвращен в lowercase без пробелов;
  - проверено, что `Set-Cookie` для `dishly_access_token` приходит на register/login;
  - `GET /auth/current` с cookie после register возвращает `200`;
  - `POST /auth/logout` возвращает `204`;
  - `GET /auth/current` после logout возвращает `401`;
  - `POST /auth/login` с normalized/mixed-case email возвращает `200`;
  - `GET /auth/current` после login возвращает `200`;
  - duplicate registration с тем же email в другом регистре возвращает `409`;
  - invalid DTO с extra field `isAdmin` возвращает `400` из-за `forbidNonWhitelisted`;
  - wrong password возвращает `401`;
  - найден и исправлен баг: `@IsEmail()` отклонял email с пробелами до service-level normalization, поэтому DTO email теперь нормализуется через `@Transform`;
  - добавлен helper `apps/backend/src/auth/dto/normalize-email.ts`, используемый `RegisterDto` и `LoginDto`;
  - JWT/token values в progress не записывались.
- Step 28 PostgreSQL verification завершен:
  - через `docker exec` и `psql` проверен тестовый user из Step 27;
  - email в таблице `users` хранится нормализованным: lowercase без пробелов;
  - duplicate registration не создал вторую запись с тем же email в другом регистре;
  - `password_hash` заполнен;
  - `password_hash` начинается с Argon2id marker `$argon2id`;
  - `password_hash` не равен plain password;
  - полный hash и JWT/token values в progress не записывались.
- Step 29 README / environment docs завершен:
  - root `README.md` обновлен коротким списком backend env variables для auth/runtime;
  - добавлено краткое описание JWT + HttpOnly cookie strategy;
  - добавлен короткий список auth endpoints: register, login, logout, current;
  - Swagger и большая API-документация не добавлялись;
  - backend Nest starter `apps/backend/README.md` не трогался, чтобы не расширять scope.
- Step 30 Database schema завершен:
  - `User`, `Recipe`, `RecipeIngredient`, `RecipeStep` entity files не менялись на auth шаге;
  - database migrations не менялись и новая migration не создавалась;
  - auth использует уже существующую колонку `users.password_hash`;
  - `migration:generate -- src/database/migrations/CheckAuthSchema --dr` показал `No changes in database schema were found`;
  - exit code `1` у dry-run в этом случае ожидаем, потому что TypeORM не создает migration без schema changes.
- Step 31 Финальные проверки завершен:
  - `npm run build` из `apps/backend` прошел успешно;
  - `npm run lint` из `apps/backend` прошел успешно;
  - `npm test` из `apps/backend` прошел успешно: 2 suites, 11 tests;
  - `npm run migration:show` из `apps/backend` прошел успешно и показывает `[X] CreateInitialSchema1788879733493`;
  - `docker compose ps` показывает `dishly-postgres-1` и `dishly-redis-1` healthy;
  - проверены `git status`, unstaged `git diff --stat` и staged `git diff --cached --stat`;
  - часть auth files уже находится в stage, а README/progress имеют unstaged изменения.
- Step 32 Scope control завершен:
  - frontend files не менялись;
  - Recipe CRUD, `RecipeService`, `RecipesController` не реализовывались;
  - BullMQ, Redis integration, queue jobs и worker не реализовывались;
  - Good Food parser, HTML fetch и JSON-LD не реализовывались;
  - frontend auth pages/protected routes не реализовывались;
  - i18next, profile editing, shopping list и AI не добавлялись;
  - найденный `LoginPage` в `apps/frontend/src/App.tsx` относится к старому bootstrap-коду и не менялся в auth scope.
- Step 33 Definition of Done завершен:
  - подтверждено наличие `UsersService`, `RegisterDto`, `LoginDto`;
  - DTO validation, email normalization и duplicate email handling проверены тестами/manual flow;
  - password hashing использует Argon2id, plain password не хранится;
  - `passwordHash` не возвращается обычными user queries и не попадает в public responses;
  - `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/current` работают;
  - register/login автоматически авторизуют пользователя через HttpOnly cookie;
  - JWT создается с минимальным payload `{ sub }`, secret/expiration берутся из env;
  - JWT не возвращается в response body;
  - cookie options, cookie clear on logout, cookie-parser, CORS credentials, global guard, `@Public()`, `/health`, `@CurrentUser()` проверены;
  - missing/invalid/expired JWT, wrong password и unknown email возвращают `401`;
  - focused auth tests, manual flow, DB password_hash verification, build, lint, tests и migration checks пройдены;
  - frontend, Recipes API, Queue и Parser не реализовывались.
- Step 34 Финальный review завершен:
  - MUST FIX: блокирующих проблем не найдено;
  - SHOULD IMPROVE: перед коммитом обратить внимание, что часть файлов уже staged, а README/progress unstaged;
  - OPTIONAL: refresh tokens, sessions, CSRF token library, OAuth, email verification и frontend auth оставлены на будущие этапы;
  - VERDICT: Этап 3 готов к переходу на Этап 4;
  - следующий этап: Этап 4 - Recipes Backend API без Parser и Queue, но автоматически к нему не переходить.

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
- [x] Step 4 - UsersService.
- [x] Step 5 - Email normalization.
- [x] Step 6 - RegisterDto.
- [x] Step 7 - LoginDto.
- [x] Step 8 - Password hashing.
- [x] Step 9 - Duplicate email lower-level handling.
- [x] Step 10 - AuthService Register.
- [x] Step 11 - Public User.
- [x] Step 12 - AuthService Login.
- [x] Step 13 - JWT configuration.
- [x] Step 14 - Authentication cookie.
- [x] Step 15 - AuthController public endpoints: register/login/logout.
- [x] Step 16 - cookie-parser.
- [x] Step 17 - CORS.
- [x] Step 18 - JwtAuthGuard.
- [x] Step 19 - Auth по умолчанию.
- [x] Step 20 - Public endpoints.
- [x] Step 21 - @CurrentUser decorator.
- [x] Step 15 follow-up - GET /auth/current после guard/current-user.
- [x] Step 22 - Module structure.
- [x] Step 23 - Controller boundaries.
- [x] Step 24 - Security checks.
- [x] Step 25 - CSRF scope.
- [x] Step 26 - Tests.
- [x] Step 27 - Manual end-to-end verification.
- [x] Step 28 - Проверить PostgreSQL.
- [x] Step 29 - README / environment docs.
- [x] Step 30 - Database schema.
- [x] Step 31 - Финальные проверки.
- [x] Step 32 - Scope control.
- [x] Step 33 - Definition of Done.
- [x] Step 34 - Финальный review.

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
- Быть внимательным к дублированию: если одна и та же бизнес-операция нужна в нескольких местах, сначала искать или выделять один общий helper в подходящем domain/module boundary, а не копировать логику.
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
