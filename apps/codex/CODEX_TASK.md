# Dishly — Этап 3: Backend Authentication

Мы продолжаем разработку fullstack-проекта **Dishly**.

Сейчас выполняем только:

**Этап 3 — Backend Authentication**

Перед началом обязательно:

1. прочитай корневой `AGENTS.md`;
2. прочитай `apps/codex/AGENT_PROGRESS.md`;
3. изучи текущий backend-код;
4. изучи текущие `User` Entity и `UsersModule`;
5. изучи текущий `AppModule`, `main.ts`, `.env.example`;
6. выполни `git status`;
7. не предполагай структуру проекта — сначала проверь фактический код.

Не переходи к Recipes API, Queue, Parser или Frontend.

---

# 1. Текущее состояние проекта

Этап 1 — Project Bootstrap завершён.

Этап 2 — Database Schema and TypeORM Entities завершён.

Сейчас backend уже содержит:

```text
NestJS
TypeScript
ConfigModule
ValidationPipe
TypeORM
PostgreSQL
migrations
```

PostgreSQL schema уже создана через migration.

Основные Entity:

```text
User
Recipe
RecipeIngredient
RecipeStep
```

---

# 2. Текущий User Entity

Таблица:

```text
users
```

Содержит:

```text
id
email
password_hash
name
language
created_at
updated_at
```

`passwordHash` уже имеет:

```ts
select: false;
```

Это нужно сохранить.

Пароль в plaintext никогда не должен попадать в БД.

---

# 3. Цель этапа

После завершения backend должен поддерживать:

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/current
```

Полный flow:

```text
Register
↓
validate DTO
↓
normalize email
↓
hash password
↓
save User
↓
generate JWT
↓
set HttpOnly cookie
↓
return public User
```

Login:

```text
email + password
↓
find User including passwordHash
↓
verify password
↓
generate JWT
↓
set HttpOnly cookie
↓
return public User
```

Protected request:

```text
HTTP request
↓
HttpOnly JWT cookie
↓
JwtAuthGuard
↓
verify JWT
↓
extract userId
↓
protected endpoint
```

Logout:

```text
POST /auth/logout
↓
clear authentication cookie
```

---

# 4. Принятая стратегия Authentication

Используем:

```text
JWT
+
HttpOnly cookie
```

JWT НЕ должен возвращаться frontend как значение, которое нужно сохранять вручную.

Не использовать:

```text
localStorage
sessionStorage
```

для access token.

Browser должен получать cookie через HTTP response.

---

# 5. Почему cookie

Cookie должна иметь:

```text
httpOnly: true
sameSite: 'lax'
path: '/'
```

В development:

```text
secure: false
```

В production:

```text
secure: true
```

JavaScript frontend не должен иметь возможность читать access token.

---

# 6. Ограничения текущей auth-системы

На этом этапе используем только один access JWT.

НЕ реализовывать сейчас:

```text
refresh tokens
refresh token rotation
token blacklist
session table
OAuth
Google Login
GitHub Login
email verification
forgot password
reset password
2FA
roles
permissions
Passport
```

Logout в текущей stateless JWT-схеме очищает browser cookie.

Он не делает server-side revocation уже выпущенного JWT.

Это осознанное ограничение MVP.

---

# 7. JWT payload

JWT должен содержать минимальные данные.

Например:

```ts
interface JwtPayload {
  sub: number;
}
```

где:

```text
sub = User.id
```

Не помещать в JWT:

```text
passwordHash
Recipe data
profile object
лишние пользовательские данные
```

PostgreSQL остаётся source of truth для пользовательских данных.

---

# 8. Планируемая структура

Предпочтительно:

```text
src/
├── auth/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   │
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   │
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   │
│   ├── types/
│   │   ├── authenticated-user.type.ts
│   │   └── jwt-payload.type.ts
│   │
│   ├── auth.constants.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
│
└── users/
    ├── entities/
    │   └── user.entity.ts
    ├── users.module.ts
    └── users.service.ts
```

Не создавать дополнительные abstraction layers без необходимости.

Если текущий проект требует чуть другую структуру — сначала объясни причину.

---

# 9. Как со мной работать

Не реализовывай весь этап одним огромным изменением.

Работаем логическими блоками.

Перед каждым блоком напиши:

## Что делаем

## Почему

## Какие файлы будут изменены

## Что нужно установить или запустить

Если нужна новая dependency:

1. сначала покажи мне команду;
2. объясни, зачем пакет нужен;
3. я сама выполню установку;
4. после моего подтверждения продолжай.

Не устанавливай пакеты молча.

После каждого крупного блока:

- запускай или проси меня запустить проверки;
- анализируй результат;
- обновляй `apps/codex/AGENT_PROGRESS.md`.

Не создавай commit без моего отдельного запроса.

---

# Step 1 — Audit перед Auth

Сначала ничего не меняй.

Изучи:

```text
apps/backend/package.json
apps/backend/src/app.module.ts
apps/backend/src/main.ts
apps/backend/src/users/users.module.ts
apps/backend/src/users/entities/user.entity.ts
apps/backend/.env.example
```

Проверь:

- какие auth-related packages уже установлены;
- есть ли `class-validator`;
- есть ли `class-transformer`;
- как настроен ValidationPipe;
- как настроен ConfigModule;
- как сейчас работает CORS;
- как зарегистрирован `User`;
- какие особенности текущей версии TypeORM нужно учитывать.

После аудита покажи:

```text
что уже есть
что нужно добавить
какие dependencies нужны
```

И остановись.

---

# Step 2 — Dependencies

Ожидаемо понадобятся:

```text
@nestjs/jwt
argon2
cookie-parser
class-validator
class-transformer
```

Dev dependency:

```text
@types/cookie-parser
```

Но перед установкой обязательно проверь фактический `package.json`.

---

## Почему Argon2

Для нового проекта использовать современное password hashing решение.

Использовать:

```text
Argon2id
```

Не писать собственную криптографию.

Не использовать:

```text
SHA256(password)
MD5
encrypt(password)
```

Argon2 должен сам хранить необходимые salt/parameters внутри результата hash.

---

# Step 3 — Environment configuration

Добавить в:

```text
apps/backend/.env.example
```

необходимые переменные.

Например:

```text
JWT_SECRET=
JWT_EXPIRES_IN_SECONDS=86400
NODE_ENV=development
```

Реальный `.env` также должен быть обновлён локально, но НЕ попадать в Git.

`JWT_SECRET`:

- не хардкодить;
- не хранить в source code;
- не использовать короткий `secret`;
- `.env.example` должен содержать placeholder, а не настоящий secret.

Приложение должно падать при старте, если обязательный `JWT_SECRET` отсутствует.

Не добавлять десятки auth environment variables без необходимости.

---

# Step 4 — UsersService

Сейчас `UsersModule` содержит только Entity registration.

Добавить:

```text
users.service.ts
```

`UsersService` должен быть persistence boundary для User.

Использовать стандартный TypeORM:

```ts
Repository<User>;
```

через dependency injection.

Не создавать custom repository wrapper без необходимости.

---

## UsersService должен поддерживать

Минимум:

```text
findById()
findByEmail()
findByEmailWithPassword()
create()
```

Точные имена можно немного изменить, если есть хороший reason.

---

## Важный момент passwordHash

Поскольку:

```ts
passwordHash;
```

имеет:

```ts
select: false;
```

обычный query НЕ должен возвращать hash.

Только специальный login-query должен явно запросить его.

То есть:

```text
обычные user queries
→ passwordHash отсутствует

login query
→ passwordHash явно включён
```

---

# Step 5 — Email normalization

Перед сохранением и поиском email должен быть нормализован.

Минимум:

```text
trim
lowercase
```

Например:

```text
  TEST@Example.COM
```

↓

```text
test@example.com
```

Не изменять пароль через `trim()` или `lowercase`.

Пароль пользователя должен хешироваться ровно в том виде, в котором он был введён.

---

# Step 6 — RegisterDto

Создать:

```text
RegisterDto
```

Поля:

```ts
email;
password;
name;
```

`language` пока НЕ нужно принимать при регистрации.

Database default:

```text
en
```

достаточен.

---

## Validation

Для email:

```text
валидный email
max length 320
```

Для name:

```text
string
не пустой
разумная max length <= 120
```

Для password:

```text
string
minimum length 8
maximum length 128
```

Не вводить бессмысленные требования:

```text
обязательно 1 uppercase
обязательно 1 number
обязательно 1 special character
```

если это не является product requirement.

Global ValidationPipe уже настроен:

```text
whitelist
transform
forbidNonWhitelisted
```

Использовать существующую конфигурацию.

---

# Step 7 — LoginDto

Создать:

```text
LoginDto
```

Поля:

```ts
email;
password;
```

Валидировать типы и разумные ограничения.

Не принимать:

```text
name
language
id
role
```

---

# Step 8 — Password hashing

При регистрации:

```text
plain password
↓
Argon2id
↓
passwordHash
↓
PostgreSQL
```

В БД должно сохраняться только:

```text
password_hash
```

Plain password:

- не логировать;
- не сохранять;
- не возвращать;
- не помещать в JWT.

---

# Step 9 — Duplicate email

Регистрация второго пользователя с тем же normalized email должна возвращать:

```text
409 Conflict
```

Например:

```text
test@example.com
TEST@example.com
```

должны считаться одним email благодаря normalization.

Можно предварительно проверить существование пользователя для понятного response.

Но нужно учитывать race condition:

```text
request A
request B
```

поэтому database UNIQUE constraint остаётся последней гарантией.

Если PostgreSQL возвращает unique violation:

```text
23505
```

она должна быть корректно преобразована в понятный `409 Conflict`.

Не отдавать пользователю raw PostgreSQL error.

---

# Step 10 — AuthService: Register

Создать:

```text
AuthService
```

Register flow:

```text
RegisterDto
↓
normalize email
↓
проверить duplicate
↓
hash password
↓
UsersService.create()
↓
создать JWT
↓
вернуть controller:
    public user
    token для установки cookie
```

AuthService не должен самостоятельно писать HTTP cookie.

Cookie — HTTP concern, поэтому устанавливать её должен controller.

---

# Step 11 — Public User

Никогда не возвращать User Entity автоматически наружу.

Создать понятный public representation пользователя.

Ответ должен содержать примерно:

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Kamilla",
  "language": "en"
}
```

Не возвращать:

```text
passwordHash
JWT
internal DB metadata без необходимости
```

Можно создать отдельный response type/DTO.

Не создавать огромную mapping infrastructure.

Одна простая явная функция mapping допустима.

---

# Step 12 — AuthService: Login

Login flow:

```text
email
password
↓
normalize email
↓
findByEmailWithPassword()
↓
argon2.verify()
↓
generate JWT
↓
return public user + internal token
```

Если email не существует:

```text
401 Unauthorized
```

Если password неправильный:

```text
401 Unauthorized
```

Сообщение должно быть одинаковым.

Например:

```text
Invalid email or password
```

Не выдавать:

```text
Email does not exist
```

или:

```text
Password is incorrect
```

чтобы login endpoint не помогал определять существование аккаунтов.

---

# Step 13 — JWT configuration

Подключить:

```text
JwtModule
```

через ConfigService.

JWT должен:

```text
использовать JWT_SECRET
иметь expiration
```

Expiration брать из env.

Например:

```text
JWT_EXPIRES_IN_SECONDS=86400
```

JWT payload:

```ts
{
  sub: user.id;
}
```

Не добавлять refresh token.

---

# Step 14 — Authentication cookie

Создать понятное имя cookie.

Например:

```text
dishly_access_token
```

Не использовать слишком общее:

```text
token
```

Cookie options:

```ts
httpOnly: true;
sameSite: "lax";
path: "/";
secure: NODE_ENV === "production";
```

Expiration cookie должна соответствовать expiration JWT.

Не дублировать значение `86400` в нескольких местах.

---

# Step 15 — AuthController

Создать:

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/current
```

---

## POST /auth/register

Получает:

```json
{
  "email": "...",
  "password": "...",
  "name": "..."
}
```

Успех:

```text
201 Created
```

Устанавливает HttpOnly auth cookie.

Возвращает public user.

Регистрация автоматически авторизует пользователя.

---

## POST /auth/login

Успех:

```text
200 OK
```

Устанавливает HttpOnly auth cookie.

Возвращает public user.

---

## POST /auth/logout

Должен быть idempotent.

Если cookie существует:

```text
clear cookie
```

Если cookie уже нет:

всё равно вернуть успешный response.

Предпочтительно:

```text
204 No Content
```

Logout endpoint можно оставить public, чтобы клиент всегда мог очистить локальную auth cookie.

При очистке cookie использовать совместимые:

```text
path
sameSite
secure
```

options.

---

## GET /auth/current

Protected endpoint.

JWT:

```text
sub
↓
userId
↓
UsersService.findById()
↓
public user
```

Не возвращать данные только из JWT.

User Entity/PostgreSQL остаётся source of truth.

Если User больше не существует:

возвращать корректный authentication error.

---

# Step 16 — cookie-parser

Подключить `cookie-parser` в:

```text
main.ts
```

JwtAuthGuard должен читать JWT из auth cookie.

Не искать token в:

```text
query string
request body
localStorage
```

---

# Step 17 — CORS

Поскольку frontend позже должен отправлять cookie:

текущий CORS нужно обновить.

Сохранить конкретный:

```text
origin: FRONTEND_URL
```

и добавить:

```ts
credentials: true;
```

Не использовать:

```ts
origin: "*";
```

вместе с credentials.

Frontend менять на этом этапе НЕ нужно.

Позже frontend будет использовать:

```text
credentials: 'include'
```

при API requests.

---

# Step 18 — JwtAuthGuard

Создать custom NestJS guard.

Не подключать Passport только ради одной JWT strategy.

Guard должен:

```text
1. определить, public ли route
2. получить JWT из cookie
3. проверить signature
4. проверить expiration
5. проверить payload
6. положить authenticated user info в request
```

Минимальная информация:

```ts
{
  id: payload.sub;
}
```

Если cookie отсутствует:

```text
401 Unauthorized
```

Если JWT invalid:

```text
401 Unauthorized
```

Если JWT expired:

```text
401 Unauthorized
```

Не отдавать пользователю внутренние JWT errors.

---

# Step 19 — Auth по умолчанию

Поскольку большая часть будущего Dishly будет приватной:

```text
Recipes
Profile
Imports
```

предпочтительно сделать authentication guard глобальным.

Использовать secure-by-default подход:

```text
все endpoints protected
↓
явно отмечаем public endpoints
```

Например custom decorator:

```ts
@Public()
```

---

# Step 20 — Public endpoints

На текущем этапе public должны быть:

```text
GET  /health

POST /auth/register
POST /auth/login
POST /auth/logout
```

Protected:

```text
GET /auth/current
```

После подключения global guard обязательно убедиться, что существующий:

```text
GET /health
```

не сломался.

---

# Step 21 — @CurrentUser decorator

Не обращаться в каждом controller к:

```ts
request.user;
```

вручную.

Создать небольшой:

```ts
@CurrentUser()
```

decorator.

Например controller должен выглядеть концептуально:

```ts
getMe(@CurrentUser() user: AuthenticatedUser)
```

а не содержать разбор Express request.

Не помещать business logic в decorator.

---

# Step 22 — Module structure

Ожидаемо:

```text
AuthModule
```

должен:

```text
import UsersModule
configure JwtModule
provide AuthService
provide AuthGuard
expose AuthController
```

`UsersModule` должен:

```text
TypeOrmModule.forFeature([User])
provide UsersService
export UsersService
```

Не создавать circular dependencies.

---

# Step 23 — Что НЕ должно быть в Controller

Плохо:

```text
AuthController
↓
Repository
↓
SQL
```

или:

```text
AuthController
↓
argon2.hash()
```

Controller отвечает за:

```text
HTTP input
↓
AuthService
↓
HTTP response / cookie
```

Business logic находится в service.

---

# Step 24 — Security checks

Обязательно проверить:

### Password

```text
не хранится plaintext
не возвращается
не логируется
```

### passwordHash

```text
не возвращается через API
обычные User queries его не выбирают
```

### JWT

```text
не возвращается в response body
не логируется
не хранится в source code
```

### Cookie

```text
HttpOnly
SameSite=Lax
Path=/
Secure в production
```

### Login error

Одинаковый response для:

```text
unknown email
wrong password
```

---

# Step 25 — CSRF scope

Сейчас НЕ добавлять отдельную CSRF library или token mechanism.

Для текущего MVP предполагаем:

```text
frontend и backend остаются same-site
```

и используем:

```text
SameSite=Lax
```

Но зафиксировать архитектурное правило:

если production deployment позже потребует:

```text
SameSite=None
```

или frontend/backend окажутся truly cross-site,

нужно отдельно пересмотреть CSRF protection.

Не усложнять это сейчас.

---

# Step 26 — Tests

Добавить focused tests для важной auth logic.

Не писать десятки тестов ради coverage.

Минимально проверить:

### Registration

```text
создаёт User
password hash != plain password
duplicate email → conflict
```

### Login

```text
correct credentials → success
wrong password → unauthorized
unknown email → unauthorized
```

### JWT Guard

```text
valid token → pass
missing token → 401
invalid token → 401
expired token → 401
public endpoint → pass
```

Если unit test конкретного infrastructure behavior получается искусственным и бессмысленным — объясни и не создавай его только ради количества.

---

# Step 27 — Manual end-to-end verification

После implementation проверить настоящий API.

Использовать curl с cookie jar.

Проверить последовательность:

```text
1. register
2. cookie получена
3. GET /auth/current работает
4. logout
5. GET /auth/current возвращает 401
6. login
7. GET /auth/current снова работает
```

---

## Дополнительно проверить

### Invalid DTO

Например extra field:

```json
{
  "email": "...",
  "password": "...",
  "name": "...",
  "isAdmin": true
}
```

должен быть отклонён существующим:

```text
forbidNonWhitelisted
```

---

### Duplicate email

```text
test@example.com
TEST@example.com
```

не должны создать два аккаунта.

---

### Wrong password

```text
401
```

---

### Health

Без authentication:

```text
GET /health
→ 200
```

---

# Step 28 — Проверить PostgreSQL

После тестовой регистрации проверить непосредственно БД.

Убедиться:

```text
email нормализован
password_hash существует
password_hash != plain password
```

Hash должен быть Argon2, а не простой hash вроде SHA-256.

Не выводить реальный пароль в AGENT_PROGRESS или логи.

---

# Step 29 — README / environment docs

Обновить документацию только настолько, насколько нужно для нового auth setup.

Добавить обязательные env:

```text
JWT_SECRET
JWT_EXPIRES_IN_SECONDS
NODE_ENV
```

Коротко описать auth endpoints.

Не превращать README в огромную API документацию.

Swagger пока НЕ добавлять.

---

# Step 30 — Database schema

Этап Authentication НЕ должен требовать изменения текущей database schema.

Не менять без необходимости:

```text
User Entity
Recipe Entity
migrations
```

`users.password_hash` уже существует.

Не создавать новую migration, если schema реально не изменилась.

Если обнаружится реальная необходимость изменить schema:

1. остановись;
2. объясни причину;
3. не редактируй initial migration после того, как она уже была применена;
4. schema change должен идти новой migration.

---

# Step 31 — Финальные проверки

Перед завершением обязательно:

```bash
npm run build
npm run lint
npm test
npm run migration:show
```

Также:

```bash
docker compose ps
```

PostgreSQL должен оставаться healthy.

Проверить:

```bash
git status
git diff
```

---

# Step 32 — Scope control

На Этапе 3 НЕ реализовывать:

```text
Recipe CRUD
RecipeService
RecipesController

BullMQ
Redis integration
queue jobs
worker

Good Food parser
HTML fetch
JSON-LD

frontend login page
frontend register page
protected React routes

i18next
profile editing
shopping list
AI
```

Frontend Authentication будет отдельным более поздним этапом.

Сейчас проверяем backend через curl/tests.

---

# Step 33 — Definition of Done

Этап 3 готов только если:

```text
[ ] UsersService реализован

[ ] RegisterDto существует
[ ] LoginDto существует

[ ] DTO validation работает

[ ] email нормализуется

[ ] пароль хешируется Argon2id

[ ] plain password никогда не хранится

[ ] passwordHash не возвращается обычными User queries

[ ] duplicate email → 409

[ ] POST /auth/register работает

[ ] POST /auth/login работает

[ ] POST /auth/logout работает

[ ] GET /auth/current работает

[ ] JWT создаётся

[ ] JWT payload содержит только необходимое

[ ] JWT secret находится в env

[ ] JWT имеет expiration

[ ] JWT хранится в HttpOnly cookie

[ ] JWT не возвращается frontend в response body

[ ] cookie SameSite=Lax

[ ] cookie Secure=true для production

[ ] cookie очищается при logout

[ ] cookie-parser подключён

[ ] CORS credentials включены

[ ] JwtAuthGuard работает

[ ] global auth protection работает

[ ] @Public() работает

[ ] /health остаётся public

[ ] @CurrentUser() работает

[ ] invalid JWT → 401

[ ] expired JWT → 401

[ ] missing JWT → 401

[ ] wrong password → 401

[ ] unknown email → тот же 401

[ ] registration автоматически авторизует пользователя

[ ] login автоматически авторизует пользователя

[ ] focused auth tests проходят

[ ] manual register → me → logout → login flow проверен

[ ] database password_hash проверен

[ ] существующая migration не изменена

[ ] новая migration без причины не создавалась

[ ] backend build проходит

[ ] backend lint проходит

[ ] tests проходят

[ ] frontend не изменялся

[ ] Recipes API не реализовывался

[ ] Queue не реализовывалась

[ ] Parser не реализовывался
```

---

# Step 34 — Финальный review

После завершения НЕ переходи автоматически к следующему этапу.

Дай отчёт:

## Что изменено

Файлы и основные решения.

## Authentication flow

Коротко:

```text
register/login
→ JWT
→ HttpOnly cookie
→ guard
→ protected API
```

## Security

Что проверено.

## Tests

Какие tests запущены и результат.

## Manual verification

Результат:

```text
register
me
logout
login
```

## MUST FIX

Блокирующие проблемы.

## SHOULD IMPROVE

Не блокирующие улучшения.

## OPTIONAL

Что сознательно оставлено на будущее.

## VERDICT

Однозначно:

```text
Этап 3 готов к переходу на Этап 4
```

или:

```text
Этап 3 пока не готов
```

с причиной.

Обнови:

```text
apps/codex/AGENT_PROGRESS.md
```

так, чтобы следующая Codex session понимала текущее состояние проекта без необходимости восстанавливать историю.

---

# Следующий этап

После успешной проверки следующим будет:

**Этап 4 — Recipes Backend API без Parser и Queue**

Но сейчас к нему не переходить.

---

# Начало работы

Начни только с:

**Step 1 — Audit перед Auth.**

Пока ничего не изменяй.

Покажи мне:

1. текущее состояние auth-related dependencies;
2. что уже готово в `User`;
3. какие packages действительно нужно установить;
4. предлагаемую структуру `auth/`;
5. есть ли какие-либо проблемы в текущей архитектуре, которые блокируют Authentication.

После этого остановись.
