# Dishly — Этап 4: Recipes Backend API

Продолжаем разработку fullstack-проекта **Dishly**.

Сейчас выполняем только:

**Этап 4 — Recipes Backend API без Parser и Queue**

Перед началом обязательно:

1. прочитай корневой `AGENTS.md`;
2. прочитай `apps/codex/AGENT_PROGRESS.md`;
3. изучи текущий `RecipesModule` и все Recipe Entity;
4. изучи текущую authentication architecture;
5. изучи `@CurrentUser()`, `JwtAuthGuard` и auth types;
6. выполни `git status`;
7. не предполагай состояние проекта по этому prompt — сначала проверь реальный код.

Не переходи к BullMQ, Parser или Frontend.

---

# 1. Текущее состояние проекта

Уже завершены:

```text
Этап 1 — Project Bootstrap
Этап 2 — Database Schema and Entities
Этап 3 — Backend Authentication
```

Backend уже содержит:

```text
NestJS
TypeScript
PostgreSQL
TypeORM
migrations

JWT authentication
HttpOnly cookie
global JwtAuthGuard
@Public()
@CurrentUser()

UsersService
AuthService
```

Authentication работает secure-by-default:

```text
все endpoints protected
↓
public endpoints явно помечаются @Public()
```

Поэтому будущий:

```text
/recipes
```

уже автоматически должен требовать authentication.

НЕ добавляй `@Public()` на recipe endpoints.

---

# 2. Текущая Recipe database model

Уже существуют:

```text
Recipe
RecipeIngredient
RecipeStep
RecipeStatus
```

Связи:

```text
User
 └── 1:N Recipe
       ├── 1:N RecipeIngredient
       └── 1:N RecipeStep
```

---

# Recipe

Существующие поля:

```text
id

title
description

sourceUrl
imageUrl

servings

prepTimeMinutes
cookTimeMinutes

status
errorMessage

userId

createdAt
updatedAt
```

---

# RecipeIngredient

```text
id

rawText
name
quantity
unit

position

recipeId
```

---

# RecipeStep

```text
id

text
group
durationMinutes
imageUrl

position

recipeId
```

---

# RecipeStatus

Уже существует:

```ts
PENDING;
PROCESSING;
COMPLETED;
FAILED;
```

Не менять enum без реальной причины.

---

# 3. Цель этапа

Нужно создать backend API для работы с уже существующими рецептами пользователя.

После завершения должны работать:

```text
GET    /recipes
GET    /recipes/:id
DELETE /recipes/:id
```

Дополнительно `GET /recipes` должен поддерживать фильтрацию по status.

Например:

```text
GET /recipes
```

вернёт все Recipes текущего пользователя.

А:

```text
GET /recipes?status=pending&status=processing
```

вернёт только Recipes с указанными статусами.

Это позже понадобится frontend вкладке:

```text
Processing
```

для:

```text
PENDING
PROCESSING
```

---

# 4. Очень важное правило ownership

Recipe принадлежит User.

Пользователь должен иметь доступ ТОЛЬКО к своим Recipe.

Нельзя делать:

```ts
repository.findOneBy({
  id: recipeId,
});
```

а потом отдельно где-то надеяться проверить owner.

Основные запросы должны учитывать:

```text
recipe.id
+
recipe.userId
```

То есть:

```text
current authenticated user
↓
user.id
↓
Recipe query
```

`userId` никогда не принимаем от frontend.

Плохо:

```json
{
  "userId": 15
}
```

или:

```text
GET /recipes?userId=15
```

Правильно:

```text
HttpOnly JWT
↓
JwtAuthGuard
↓
@CurrentUser()
↓
user.id
```

---

# 5. Поведение при попытке получить чужой Recipe

Представим:

```text
Recipe #10 принадлежит User A
```

User B делает:

```text
GET /recipes/10
```

Ответ:

```text
404 Not Found
```

а НЕ:

```text
403 Forbidden
```

То же самое для удаления.

Причина:

API не должен подтверждать другому пользователю существование чужого Recipe.

Поэтому одинаковый response:

```text
Recipe не существует
```

и:

```text
Recipe существует, но принадлежит другому User
```

→

```text
404 Recipe not found
```

---

# 6. Что НЕ делаем сейчас

На этом этапе НЕ реализовывать:

```text
POST /recipes
POST /recipes/import
PUT /recipes/:id
PATCH /recipes/:id
POST /recipes/:id/retry
```

Почему нет обычного:

```text
POST /recipes
```

Dishly создаёт Recipe через import flow.

Будущий flow:

```text
POST /recipes/import
↓
Recipe PENDING
↓
BullMQ
↓
Parser
```

Он будет реализован позже.

Не создавай временный endpoint ручного создания Recipe только ради тестирования.

---

# 7. Планируемая структура

Ориентировочно:

```text
src/recipes/
├── dto/
│   └── list-recipes-query.dto.ts
│
├── entities/
│   ├── recipe.entity.ts
│   ├── recipe-ingredient.entity.ts
│   └── recipe-step.entity.ts
│
├── enums/
│   └── recipe-status.enum.ts
│
├── types/
│   └── recipe-response.types.ts
│
├── recipes.controller.ts
├── recipes.service.ts
└── recipes.module.ts
```

Не создавать отдельный custom Repository layer только ради архитектурной красоты.

На текущем этапе достаточно:

```text
RecipesService
↓
TypeORM Repository<Recipe>
```

через:

```ts
@InjectRepository(Recipe)
```

Если фактический код показывает причину изменить структуру — сначала объясни.

---

# 8. Как со мной работать

Не реализовывай весь этап одним большим изменением.

Иди блоками.

Перед каждым крупным блоком напиши:

## Что делаем

## Почему

## Какие файлы будут изменены

## Что должно получиться

После реализации блока:

- запусти подходящие tests;
- запусти build/lint;
- сообщи результат;
- обнови `apps/codex/AGENT_PROGRESS.md`.

Не создавай commit без моего отдельного запроса.

---

# Step 1 — Audit Recipes

Сначала ничего не меняй.

Изучи:

```text
src/recipes/recipes.module.ts

src/recipes/entities/recipe.entity.ts
src/recipes/entities/recipe-ingredient.entity.ts
src/recipes/entities/recipe-step.entity.ts

src/recipes/enums/recipe-status.enum.ts

src/auth/decorators/current-user.decorator.ts
src/auth/types/auth.types.ts
src/auth/guards/jwt-auth.guard.ts
```

Проверь:

- какие repositories уже зарегистрированы;
- какие relations существуют;
- какие indexes/constraints существуют;
- что именно содержит `AuthenticatedUser`;
- как controller должен получить current user;
- нужна ли schema migration для этого этапа.

Ожидаемый ответ:

```text
новая migration не нужна
```

потому что database schema менять не планируем.

Если обнаружишь обратное — остановись и объясни причину.

После аудита остановись и покажи вывод.

---

# Step 2 — определить API contracts

Перед написанием queries зафиксировать response структуры.

НЕ возвращать TypeORM Entity напрямую из controller только потому, что это проще.

Нужно явно определить, что API отдаёт frontend.

---

# Recipe list item

Для:

```text
GET /recipes
```

достаточно примерно:

```ts
{
  id: number;

  title: string | null;
  sourceUrl: string;
  imageUrl: string | null;

  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;

  status: RecipeStatus;

  createdAt: Date;
  updatedAt: Date;
}
```

Не возвращать в list:

```text
ingredients
steps
user
userId
```

List endpoint не должен загружать полную структуру каждого Recipe.

---

# Recipe details

Для:

```text
GET /recipes/:id
```

нужно вернуть:

```ts
{
  id;

  title;
  description;

  sourceUrl;
  imageUrl;

  servings;
  prepTimeMinutes;
  cookTimeMinutes;

  status;

  createdAt;
  updatedAt;

  ingredients;
  steps;
}
```

---

# Ingredient response

```ts
{
  id: number;
  rawText: string;

  name: string | null;
  quantity: number | null;
  unit: string | null;

  position: number;
}
```

Не возвращать:

```text
recipeId
recipe
```

---

# Step response

```ts
{
  id: number;

  text: string;
  group: string | null;

  durationMinutes: number | null;
  imageUrl: string | null;

  position: number;
}
```

Не возвращать:

```text
recipeId
recipe
```

---

# errorMessage

Существующее:

```text
Recipe.errorMessage
```

пока НЕ отдавать напрямую через public API.

Причина:

в будущем оно может содержать техническую информацию parser-а.

User-facing import errors нужно будет спроектировать отдельно на этапе import pipeline.

---

# Step 3 — ListRecipesQueryDto

Создать query DTO для:

```text
GET /recipes
```

Нужно поддержать:

```text
GET /recipes
```

и:

```text
GET /recipes?status=pending
```

и:

```text
GET /recipes?status=pending&status=processing
```

DTO должен приводить single value и array к одному виду:

```ts
status?: RecipeStatus[];
```

Validation:

```text
каждый status должен принадлежать RecipeStatus
```

Невалидный:

```text
GET /recipes?status=random
```

должен вернуть:

```text
400 Bad Request
```

Используй уже существующий global ValidationPipe.

Не писать validation вручную в controller.

---

# Step 4 — RecipesService

Создать:

```text
recipes.service.ts
```

Использовать:

```ts
Repository<Recipe>;
```

через Nest dependency injection.

На текущем этапе отдельный `RecipesRepository` class не нужен.

---

# Минимальные методы

Ориентировочно:

```text
findAllForUser()
findOneForUser()
deleteForUser()
```

Названия можно немного изменить, если предложишь более понятные.

---

# Step 5 — GET /recipes service logic

Метод принимает:

```text
userId
statuses?
```

Основное условие:

```text
WHERE user_id = currentUser.id
```

Если status filter передан:

```text
AND status IN (...)
```

Для TypeORM можно использовать подходящий оператор вроде:

```text
In(...)
```

если он действительно упрощает query.

---

# Сортировка

Recipes возвращать:

```text
createdAt DESC
```

То есть новые Recipes первыми.

---

# Важно

List query НЕ должен загружать:

```text
ingredients
steps
user
```

Никаких:

```text
relations: [...]
```

для обычного list.

Это лишние данные и лишняя работа БД.

---

# Step 6 — GET /recipes controller

Создать:

```text
RecipesController
```

Route:

```text
GET /recipes
```

Controller получает:

```ts
@CurrentUser()
```

и:

```ts
@Query()
```

Затем вызывает service.

Не принимать `userId` из query/body.

Controller не содержит TypeORM query.

Пример ответственности:

```text
HTTP input
↓
CurrentUser
↓
RecipesService
↓
response
```

---

# Step 7 — GET /recipes/:id

Создать:

```text
GET /recipes/:id
```

ID должен быть positive integer.

Использовать стандартные возможности Nest, например appropriate pipe.

Не писать:

```ts
Number(id);
```

вручную без validation.

---

# Service query

Recipe должен искаться одновременно по:

```text
id
userId
```

То есть концептуально:

```sql
WHERE recipes.id = :id
AND recipes.user_id = :userId
```

---

# Relations

Для details endpoint загрузить:

```text
ingredients
steps
```

Не загружать `user`, потому что frontend он здесь не нужен.

---

# Порядок ingredients

Обязательно:

```text
position ASC
```

---

# Порядок steps

Обязательно:

```text
position ASC
```

Нельзя полагаться:

```text
на id
на insertion order
на случайный PostgreSQL order
```

---

# Если Recipe не найден

В том числе если он принадлежит другому User:

```text
404 Not Found
```

Например:

```json
{
  "message": "Recipe not found"
}
```

Не делать разные сообщения для:

```text
нет Recipe
```

и:

```text
чужой Recipe
```

---

# Step 8 — DELETE /recipes/:id

Добавить:

```text
DELETE /recipes/:id
```

Endpoint protected автоматически global auth guard.

Controller получает:

```text
currentUser.id
recipe id
```

---

# Ownership

DELETE должен учитывать одновременно:

```text
id
userId
```

Если:

```text
0 rows affected
```

вернуть:

```text
404 Recipe not found
```

---

# Successful response

Использовать:

```text
204 No Content
```

Не возвращать deleted Entity без необходимости.

---

# Database cascade

Не удалять вручную:

```text
RecipeIngredient
RecipeStep
```

У нас уже существуют:

```text
ON DELETE CASCADE
```

Database должна сама удалить child records.

То есть:

```text
DELETE Recipe
↓
PostgreSQL FK cascade
↓
ingredients deleted
steps deleted
```

Не писать три отдельных DELETE query.

---

# Step 9 — явное mapping Entity → API response

Не возвращать Entity автоматически.

Сделать простой явный mapping.

Например внутри service или небольшого отдельного helper.

Не создавать:

```text
AutoMapper
generic mapper framework
BaseResponseMapper<T>
```

для четырёх объектов.

Нужен обычный понятный TypeScript.

---

# Почему mapping важен

Entity содержит persistence детали:

```text
userId
relations
errorMessage
```

API contract — другая ответственность.

Это позволит позже менять database model, не ломая frontend автоматически.

---

# Step 10 — никаких N+1 queries

Для:

```text
GET /recipes
```

должен быть один нормальный query.

Не делать:

```text
SELECT Recipes

for each Recipe:
  SELECT Ingredients
  SELECT Steps
```

List вообще не требует ingredients/steps.

---

Для:

```text
GET /recipes/:id
```

можно загрузить relations одним подходящим TypeORM query.

Главное — не создавать ручной N+1 flow.

---

# Step 11 — Tests

Добавить focused tests.

Не писать тесты ради количества.

Обязательно проверить ключевую бизнес-логику.

---

## List recipes

Проверить:

```text
возвращаются только Recipes текущего User
```

и:

```text
status filter применяется
```

и:

```text
сортировка createdAt DESC
```

---

## Get recipe

Проверить:

```text
свой Recipe → success
```

```text
несуществующий Recipe → 404
```

```text
Recipe другого User → 404
```

---

## Relations

Проверить, что details возвращает:

```text
ingredients position ASC
steps position ASC
```

---

## Delete

Проверить:

```text
свой Recipe → delete success
```

```text
чужой Recipe → 404
```

```text
несуществующий Recipe → 404
```

---

# Какой вид тестов выбрать

Сначала оцени текущую test architecture.

Не создавай огромную database integration infrastructure только ради этого этапа.

Если unit tests `RecipesService` с repository mock достаточно хорошо проверяют service query logic — используй их.

Но ownership также обязательно проверить реальным HTTP/API flow вручную.

---

# Step 12 — Manual API verification

После реализации провести manual verification через настоящий backend + PostgreSQL.

Так как публичного:

```text
POST /recipes
```

ещё нет, тестовые Recipes временно создать напрямую в PostgreSQL.

Не создавать специальный dev endpoint.

---

# Сценарий проверки

Создать:

```text
User A
User B
```

через существующий auth API.

Создать в PostgreSQL:

```text
Recipe A1 → User A
Recipe A2 → User A
Recipe B1 → User B
```

Также создать Ingredients/Steps для одного Recipe.

---

# Проверить User A

```text
GET /recipes
```

должен вернуть:

```text
A1
A2
```

и НЕ:

```text
B1
```

---

Проверить:

```text
GET /recipes/{A1}
```

→ `200`.

---

Проверить:

```text
GET /recipes/{B1}
```

под cookie User A:

```text
404
```

---

Проверить:

```text
DELETE /recipes/{B1}
```

под User A:

```text
404
```

и B1 должен остаться в БД.

---

# Проверить status filter

Например:

```text
A1 = pending
A2 = completed
```

Запрос:

```text
GET /recipes?status=pending
```

должен вернуть только A1.

Запрос:

```text
GET /recipes?status=pending&status=processing
```

должен корректно принять несколько statuses.

---

# Проверить invalid filter

```text
GET /recipes?status=hello
```

→

```text
400
```

---

# Step 13 — проверить cascade delete

Для Recipe создать:

```text
2 ingredients
2 steps
```

Удалить Recipe через:

```text
DELETE /recipes/:id
```

После этого напрямую проверить PostgreSQL:

```text
recipes row отсутствует
recipe_ingredients rows отсутствуют
recipe_steps rows отсутствуют
```

Это должно произойти через существующий:

```text
ON DELETE CASCADE
```

а не service logic.

---

# Step 14 — auth regression check

Recipes implementation не должна сломать Auth.

После изменений проверить:

```text
GET /health
→ 200 без cookie
```

```text
GET /recipes
→ 401 без cookie
```

```text
GET /recipes
→ 200 с valid cookie
```

Также существующий:

```text
GET /auth/current
```

должен продолжать работать.

Не переименовывать его на этом этапе.

---

# Step 15 — schema regression

На этом этапе database schema менять не планируется.

Проверить:

```bash
npm run migration:show
```

Initial migration должна оставаться applied.

Не редактировать:

```text
CreateInitialSchema
```

Если Entity не менялись, новая migration не нужна.

---

# Step 16 — README

Не нужно описывать весь Recipes API подробно.

Если README уже имеет API section — можно добавить очень кратко:

```text
GET /recipes
GET /recipes/:id
DELETE /recipes/:id
```

Если такой секции нет и добавление будет лишним — не менять README только ради галочки.

---

# Step 17 — что НЕ входит в этот этап

Категорически не реализовывать:

```text
POST /recipes/import
```

или:

```text
POST /recipes
```

Также не делать:

```text
BullMQ
Redis queue integration
Worker
Processor

HTML fetch
Good Food parser
JSON-LD
Schema.org parsing

Retry
POST /recipes/:id/retry

Recipe edit
PATCH /recipes/:id

Frontend recipes page
Frontend cards
Add Recipe modal

WebSockets
SSE
polling

AI
shopping list
```

---

# Step 18 — архитектурные правила

## Controller

Не содержит:

```text
TypeORM queries
Repository access
ownership business logic
```

Controller:

```text
HTTP
↓
Service
```

---

## Service

Отвечает за:

```text
recipe queries
ownership
not-found behavior
mapping
```

---

## Repository

На текущем этапе используем стандартный:

```ts
Repository<Recipe>;
```

через TypeORM.

Не создавать отдельный repository class без реальной необходимости.

---

## DTO != Entity

Query validation:

```text
DTO
```

Database model:

```text
Entity
```

API response:

```text
explicit response type
```

Не смешивать эти роли.

---

# Step 19 — Pagination

Pagination сейчас НЕ добавлять.

Для текущего MVP сначала нужен рабочий Recipes API.

Зафиксировать как будущее улучшение:

```text
pagination понадобится, если количество Recipes станет большим
```

Не вводить сейчас:

```text
page
cursor
limit
totalCount
```

без product requirement.

---

# Step 20 — Search / sorting

Не добавлять:

```text
search
categories
tags
custom sorting
```

Единственная сортировка сейчас:

```text
createdAt DESC
```

Единственная фильтрация:

```text
status
```

---

# Step 21 — Error handling

Не отдавать raw TypeORM/PostgreSQL errors.

Expected business errors должны быть:

```text
400 invalid query
401 authentication required
404 recipe not found
```

Unexpected database errors пусть обрабатываются стандартным Nest exception flow и логированием.

Не превращать любой database error в `404`.

---

# Step 22 — Финальные проверки

Обязательно выполнить в backend:

```bash
npm run build
npm run lint
npm test
npm run migration:show
```

Из root:

```bash
docker compose ps
```

Проверить:

```bash
git status
git diff
```

Frontend build запускать не обязательно, если frontend действительно не изменялся.

---

# Step 23 — Definition of Done

Этап готов только если:

```text
[ ] RecipesService создан

[ ] RecipesController создан

[ ] RecipesModule регистрирует service/controller

[ ] GET /recipes работает

[ ] GET /recipes требует authentication

[ ] GET /recipes возвращает только Recipes текущего User

[ ] GET /recipes не загружает ingredients/steps

[ ] Recipes сортируются createdAt DESC

[ ] status query validation работает

[ ] один status работает

[ ] несколько statuses работают

[ ] invalid status → 400

[ ] GET /recipes/:id работает

[ ] recipe id валидируется как positive integer

[ ] GET details возвращает ingredients

[ ] GET details возвращает steps

[ ] ingredients отсортированы position ASC

[ ] steps отсортированы position ASC

[ ] чужой Recipe → 404

[ ] несуществующий Recipe → 404

[ ] DELETE /recipes/:id работает

[ ] delete success → 204

[ ] нельзя удалить чужой Recipe

[ ] delete чужого Recipe → 404

[ ] DB ON DELETE CASCADE удаляет ingredients

[ ] DB ON DELETE CASCADE удаляет steps

[ ] userId никогда не принимается от frontend

[ ] Entities не возвращаются напрямую как API contract

[ ] userId не утечёт в response

[ ] raw errorMessage не утечёт в response

[ ] N+1 queries не созданы

[ ] новые migrations без причины не создавались

[ ] initial migration не редактировалась

[ ] Auth продолжает работать

[ ] /health остаётся public

[ ] focused tests проходят

[ ] manual ownership flow проверен с двумя Users

[ ] backend build проходит

[ ] backend lint проходит

[ ] backend tests проходят

[ ] frontend не изменялся

[ ] BullMQ не подключался

[ ] Parser не реализовывался
```

---

# Step 24 — финальный review

После завершения НЕ переходи автоматически к следующему этапу.

Дай отчёт:

## Что изменено

Перечисли файлы.

## API

Покажи итоговые endpoints:

```text
GET    /recipes
GET    /recipes/:id
DELETE /recipes/:id
```

## Ownership

Опиши результат проверки User A / User B.

## Queries

Укажи:

- что list не загружает relations;
- как details загружает relations;
- как обеспечивается ordering.

## Database

Подтверди cascade delete.

## Tests

Какие tests выполнены.

## MUST FIX

Блокирующие проблемы.

## SHOULD IMPROVE

Неблокирующие улучшения.

## OPTIONAL

То, что сознательно оставлено на будущее.

## VERDICT

Однозначно:

```text
Этап 4 готов к переходу на Этап 5
```

или:

```text
Этап 4 пока не готов
```

с причиной.

Обнови:

```text
apps/codex/AGENT_PROGRESS.md
```

так, чтобы следующая Codex session могла продолжить работу без истории предыдущего чата.

---

# Следующий этап

После успешного review будет:

**Этап 5 — BullMQ + Redis Recipe Queue**

На нём будет создана очередь:

```text
recipe-import
```

с job:

```text
import-recipe
```

и payload:

```ts
{
  recipeId: number;
}
```

Но сейчас ничего из этого не реализовывать.

---

# Начало работы

Начни только с:

**Step 1 — Audit Recipes.**

Пока не меняй код.

После аудита покажи мне:

1. текущее состояние `RecipesModule`;
2. текущие Recipe relations;
3. как будет обеспечиваться ownership;
4. нужен ли schema change;
5. предлагаемый список новых файлов;
6. видишь ли ты архитектурные проблемы, которые блокируют этап.

После этого остановись.
