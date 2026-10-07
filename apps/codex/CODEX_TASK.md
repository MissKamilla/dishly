# Dishly — Этап 7: Full Recipe Import Pipeline

Продолжаем разработку **Dishly**.

Сейчас выполняем только:

**Этап 7 — полный backend pipeline импорта рецепта.**

На предыдущих этапах необходимые части уже были реализованы отдельно.

Теперь их нужно правильно соединить:

```text
HTTP API
   ↓
PostgreSQL
   ↓
BullMQ
   ↓
Redis
   ↓
RecipeImportProcessor
   ↓
RecipeParserService
   ↓
PostgreSQL transaction
```

И получить полный пользовательский сценарий:

```text
POST /recipes/import
        ↓
Recipe = PENDING
        ↓
queue.add({ recipeId })
        ↓
Worker
        ↓
PROCESSING
        ↓
RecipeParserService
        ↓
ParsedRecipe
        ↓
Recipe + Ingredients + Steps
        ↓
COMPLETED
```

При окончательной ошибке:

```text
PROCESSING
    ↓
FAILED
```

---

# 1. Перед началом

Обязательно:

1. Прочитай корневой `AGENTS.md`.
2. Прочитай `apps/codex/AGENT_PROGRESS.md`.
3. Изучи текущий `apps/codex/CODEX_TASK.md`.
4. Выполни `git status`.
5. Изучи фактический код, а не только этот prompt.

Особенно изучи:

```text
apps/backend/src/recipes/

recipes.controller.ts
recipes.service.ts
recipes.mapper.ts
recipes.module.ts

entities/
  recipe.entity.ts
  recipe-ingredient.entity.ts
  recipe-step.entity.ts

queue/
  recipe-import.contract.ts
  recipe-import.queue.ts
  recipe-import.processor.ts

parser/
  recipe-parser.service.ts
  recipe-parser.error.ts
  types/parsed-recipe.ts
```

Также:

```text
apps/backend/src/auth/
apps/backend/src/database/
apps/backend/package.json
```

Не начинай изменения до завершения аудита.

---

# 2. Текущее состояние

Уже завершены:

```text
Этап 1 — Project Bootstrap
Этап 2 — Database Schema
Этап 3 — Backend Authentication
Этап 4 — Recipes API
Этап 5 — BullMQ + Redis
Этап 6 — Good Food Parser
```

---

# 3. Что уже есть и НЕ нужно реализовывать заново

## Recipes API

Существуют:

```http
GET    /recipes
GET    /recipes/:id
DELETE /recipes/:id
```

Ownership уже реализован.

Не переписывай существующий Recipes API без необходимости.

---

## Recipe statuses

Уже существуют:

```ts
enum RecipeStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}
```

Не менять enum.

---

## Queue

Очередь:

```text
recipe-import
```

Job:

```text
import-recipe
```

Payload:

```ts
interface ImportRecipeJobData {
  recipeId: number;
}
```

Producer уже реализован через:

```ts
RecipeImportQueue;
```

и:

```ts
queue.add();
```

Job options уже содержат:

```text
attempts: 3

exponential backoff
delay: 1000 ms
```

Не менять job payload.

Не помещать URL или ParsedRecipe в Redis.

PostgreSQL остаётся source of truth.

---

## Parser

Уже существует:

```ts
RecipeParserService.parse(url);
```

который возвращает:

```ts
ParsedRecipe;
```

Parser уже:

- валидирует Good Food URL;
- защищает fetch от SSRF;
- получает HTML;
- извлекает JSON-LD;
- находит Schema.org Recipe;
- нормализует поля;
- нормализует ingredients;
- нормализует steps;
- поддерживает groups;
- проверяет результат.

Не дублировать parser logic внутри worker.

---

# 4. RecipeParserError

Уже существует:

```ts
RecipeParserError;
```

с кодами:

```text
unsupported_url
fetch_failed
recipe_not_found
invalid_recipe_data
```

Также существует:

```ts
error.retryable;
```

Это специально было подготовлено для текущего этапа.

Используй это свойство для решения:

```text
делать BullMQ retry
или
завершить job окончательно
```

Не вычисляй retryability второй раз в processor.

---

# 5. Главная цель этапа

После завершения должны работать:

```http
POST /recipes/import
POST /recipes/:id/retry
```

и полный background flow.

---

# 6. Архитектура ответственности

Не превращать `RecipesController` или `RecipeImportProcessor` в огромные классы.

Предпочтительное разделение:

```text
RecipesController
        ↓
RecipeImportService
        ↓
PostgreSQL + RecipeImportQueue
```

и:

```text
RecipeImportProcessor
        ↓
RecipeImportService
        +
RecipeParserService
```

Существующий:

```text
RecipesService
```

сейчас отвечает за:

```text
list
details
delete
```

Импорт — отдельный workflow.

Поэтому создание отдельного:

```text
RecipeImportService
```

на этом этапе оправдано.

Не создавать дополнительный Repository layer, factories или command bus.

---

# 7. Предпочтительная структура

Например:

```text
src/recipes/
│
├── dto/
│   ├── import-recipe.dto.ts
│   └── list-recipes-query.dto.ts
│
├── import/
│   ├── recipe-import.service.ts
│   └── recipe-import.errors.ts
│
├── parser/
├── queue/
├── entities/
│
├── recipes.controller.ts
├── recipes.service.ts
├── recipes.mapper.ts
└── recipes.module.ts
```

Не обязательно создавать `recipe-import.errors.ts`, если нескольких констант/функций достаточно.

Главный критерий:

```text
понятная ответственность
```

а не количество файлов.

---

# 8. Как со мной работать

Не реализовывай весь этап одним огромным diff.

Работаем крупными логическими блоками.

Перед каждым блоком:

## Что делаем

## Почему

## Какие файлы меняются

## Как проверяем

После реализации:

- запускай focused tests;
- запускай TypeScript/build/lint когда уместно;
- обновляй `apps/codex/AGENT_PROGRESS.md`.

Не создавай Git commit без моего разрешения.

Если нужна новая dependency — сначала объясни зачем.

Ожидается, что для этого этапа новых dependencies не потребуется.

---

# Step 1 — аудит integration points

Сначала ничего не меняй.

Проверь:

### RecipesService

- текущие методы;
- mapper;
- ownership;
- repository dependencies.

### RecipeImportQueue

- `enqueue`;
- attempts;
- backoff;
- retention.

### RecipeImportProcessor

- job validation;
- logger;
- completed/failed events;
- текущие tests.

### RecipeParserService

- public API;
- `RecipeParserError`;
- `retryable`.

### Entity

Проверь поля:

```text
Recipe
RecipeIngredient
RecipeStep
```

### TypeORM

Проверь доступный `DataSource` и способ выполнения transaction в текущем NestJS setup.

После аудита покажи:

1. какие существующие компоненты будут переиспользованы;
2. какие новые файлы нужны;
3. какие текущие файлы нужно изменить;
4. нужна ли migration;
5. есть ли blocker.

Ожидаемый ответ:

```text
migration не требуется
```

Если это не так — остановись и объясни почему.

---

# Step 2 — ImportRecipeDto

Создай DTO для:

```http
POST /recipes/import
```

Body:

```json
{
  "url": "https://www.bbcgoodfood.com/recipes/..."
}
```

DTO должен принимать только:

```ts
url: string;
```

Добавь разумную validation:

```text
string
не пустая
разумная максимальная длина
```

Не принимай:

```text
userId
status
title
ingredients
steps
```

`userId` получаем исключительно через authenticated user.

---

# Step 3 — ранняя URL validation

Не создавай Recipe для URL, который Dishly заведомо не поддерживает.

До INSERT:

```text
ImportRecipeDto
       ↓
validateGoodFoodUrl()
       ↓
canonical URL
```

Используй уже существующий validator parser-а.

Не создавай второй allowlist.

Не копируй validation logic.

---

## Поведение

Например:

```text
https://www.bbcgoodfood.com/recipes/example
→ допустимо
```

```text
https://example.com/recipe
→ 400 Bad Request
```

```text
http://localhost
→ 400 Bad Request
```

Unsupported URL должен быть отклонён:

**до создания Recipe и до queue.add().**

---

# Step 4 — canonical sourceUrl

После успешной validation сохраняй нормализованный:

```ts
URL.href;
```

а не произвольную строку, которую прислал пользователь.

То есть:

```text
input URL
↓
URL parser / validator
↓
canonical sourceUrl
↓
PostgreSQL
```

Не модифицируй URL дополнительными эвристиками.

---

# Step 5 — RecipeImportService

Создай:

```text
RecipeImportService
```

Он должен содержать бизнес-логику import workflow.

Не помещай её в Controller.

Предполагаемые обязанности:

```text
requestImport()
prepareForProcessing()
completeImport()
failImport()
retryImport()
```

Точные имена можно скорректировать после аудита.

---

# Step 6 — создание PENDING Recipe

При:

```http
POST /recipes/import
```

после проверки URL создать:

```ts
Recipe {
  sourceUrl,
  userId,
  status: PENDING
}
```

Остальные parsed поля:

```text
title
description
imageUrl
servings
prepTimeMinutes
cookTimeMinutes
```

остаются:

```text
null
```

Не создавать Ingredient/Step на этом этапе.

---

# Step 7 — enqueue

После сохранения Recipe:

```text
Recipe
↓
RecipeImportQueue.enqueue(recipe.id)
```

Job data остаётся:

```ts
{
  recipeId;
}
```

Не передавать:

```text
URL
userId
ParsedRecipe
```

в очередь.

---

# Step 8 — проблема PostgreSQL + Redis atomicity

PostgreSQL transaction не может атомарно включить Redis.

То есть возможна ситуация:

```text
INSERT Recipe
→ success

queue.add()
→ fail
```

На этом этапе НЕ реализовывать transactional outbox.

Это слишком сложно для текущего MVP.

Использовать простой контролируемый подход.

Если `queue.add()` не удался:

```text
Recipe → FAILED
```

и сохранить безопасную внутреннюю причину ошибки.

HTTP request должен завершиться подходящей ошибкой, например:

```text
503 Service Unavailable
```

Не оставлять Recipe бесконечно в:

```text
PENDING
```

если enqueue уже точно не удался.

Зафиксируй в коде/документации, что transactional outbox является возможным future improvement.

---

# Step 9 — POST /recipes/import

Добавить endpoint:

```http
POST /recipes/import
```

Endpoint protected существующим global auth guard.

Controller получает:

```text
@CurrentUser()
+
ImportRecipeDto
```

и вызывает:

```text
RecipeImportService
```

---

## Successful response

Использовать:

```http
202 Accepted
```

Потому что Recipe ещё не обработан.

Вернуть существующее публичное представление Recipe.

Пример:

```json
{
  "id": 42,
  "title": null,
  "sourceUrl": "...",
  "imageUrl": null,
  "servings": null,
  "prepTimeMinutes": null,
  "cookTimeMinutes": null,
  "status": "pending",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Не возвращать:

```text
job object
BullMQ id
Redis data
userId
```

---

# Step 10 — Processor получает Recipe

Текущий `RecipeImportProcessor` должен начать реальную обработку.

Job:

```ts
{
  recipeId: 42;
}
```

Processor получает Recipe из PostgreSQL по:

```text
recipeId
```

Не использовать URL из Redis.

---

# Step 11 — поведение при отсутствующем Recipe

Recipe может быть удалён пользователем, пока job ожидал выполнения.

Если:

```text
recipeId
```

больше не существует:

```text
log warning
→ завершить job без parser
```

Не делать бессмысленные retries.

Не восстанавливать удалённый Recipe.

Это валидный пользовательский сценарий.

---

# Step 12 — защита от duplicate/stale jobs

Processor должен учитывать текущий Recipe.status.

Обрабатываем:

```text
PENDING
PROCESSING
```

Для:

```text
COMPLETED
```

не парсить повторно.

Залогировать и завершить job как no-op.

Для:

```text
FAILED
```

обычный старый job не должен самопроизвольно запускать импорт снова.

Manual retry сначала явно переведёт Recipe обратно в:

```text
PENDING
```

---

# Step 13 — PROCESSING

Перед вызовом parser:

```text
Recipe.status = PROCESSING
Recipe.errorMessage = null
```

Сохранить изменение в PostgreSQL.

После этого:

```ts
RecipeParserService.parse(recipe.sourceUrl);
```

---

# Step 14 — Parser не должен знать про БД

НЕ изменять:

```ts
RecipeParserService;
```

так, чтобы он:

- принимал Recipe Entity;
- работал с Repository;
- менял status;
- сохранял ingredients.

Он продолжает выполнять только:

```text
URL
↓
ParsedRecipe
```

Persistence находится за пределами parser.

---

# Step 15 — успешное сохранение ParsedRecipe

После:

```ts
const parsedRecipe = await parser.parse(...)
```

нужно сохранить:

```text
Recipe
RecipeIngredient[]
RecipeStep[]
```

---

# Step 16 — обязательная PostgreSQL transaction

Сохранение результата должно быть атомарным.

Нельзя допустить:

```text
Recipe обновился

но только половина ingredients сохранилась
```

или:

```text
Ingredients сохранились
но status остался PROCESSING
```

Используй одну TypeORM transaction.

Концептуально:

```text
BEGIN

update Recipe fields

delete/replace old RecipeIngredient rows

delete/replace old RecipeStep rows

insert Ingredients

insert Steps

status = COMPLETED
errorMessage = null

COMMIT
```

Если операция падает:

```text
ROLLBACK
```

---

# Step 17 — TypeORM transaction rule

Внутри transaction используй только:

```text
transactional EntityManager
```

и repositories, полученные из него.

Не использовать обычные injected repositories внутри transaction callback.

Например концептуально:

```ts
dataSource.transaction(async (manager) => {
  const recipeRepository = manager.getRepository(Recipe);
  const ingredientRepository = manager.getRepository(RecipeIngredient);
  const stepRepository = manager.getRepository(RecipeStep);

  ...
});
```

Не смешивать transactional и global repository.

---

# Step 18 — mapping ParsedRecipe → Entity

Recipe:

```text
ParsedRecipe.title
→ Recipe.title

description
→ description

imageUrl
→ imageUrl

servings
→ servings

prepTimeMinutes
→ prepTimeMinutes

cookTimeMinutes
→ cookTimeMinutes
```

---

## Ingredients

Для каждого:

```ts
parsedRecipe.ingredients[index];
```

создать:

```ts
RecipeIngredient {
  rawText,
  name,
  quantity,
  unit,

  recipeId,
  position: index + 1
}
```

Порядок:

```text
1, 2, 3...
```

Не использовать array index `0` как database position.

---

## Steps

Для:

```ts
parsedRecipe.steps[index];
```

создать:

```ts
RecipeStep {
  text,
  group,
  durationMinutes,
  imageUrl,

  recipeId,
  position: index + 1
}
```

---

# Step 19 — existing children

Даже если сейчас первый импорт обычно не имеет children, persistence logic должна быть безопасна при повторной обработке.

Перед вставкой нового результата внутри transaction можно удалить существующие:

```text
RecipeIngredient
RecipeStep
```

конкретного Recipe.

После этого вставить актуальный ParsedRecipe.

Не использовать ORM cascade-save.

Не удалять children за пределами transaction.

---

# Step 20 — COMPLETED

Только после успешного сохранения всех данных:

```text
Recipe.status = COMPLETED
Recipe.errorMessage = null
```

После commit Recipe считается готовым.

Не ставить:

```text
COMPLETED
```

до сохранения ingredients/steps.

---

# Step 21 — parser permanent errors

Уже существует:

```ts
RecipeParserError.retryable === false;
```

Например:

```text
unsupported_url
recipe_not_found
invalid_recipe_data
```

При permanent error:

```text
Recipe → FAILED
```

после чего job не должен выполнять оставшиеся BullMQ attempts.

Используй механизм BullMQ для unrecoverable error.

Не меняй глобальное:

```text
attempts: 3
```

только ради permanent parser errors.

---

# Step 22 — retryable parser errors

Для:

```ts
RecipeParserError.retryable === true;
```

например:

```text
timeout
DNS/network temporary failure
HTTP 429
HTTP 5xx
```

BullMQ должен использовать уже существующий:

```text
attempts = 3
exponential backoff
```

Если ещё есть попытки:

```text
Recipe остаётся PROCESSING
```

и exception должен быть проброшен в BullMQ.

Не переводить Recipe в FAILED после первой временной ошибки.

---

# Step 23 — final automatic attempt

Когда последняя автоматическая попытка тоже не удалась:

```text
Recipe.status = FAILED
```

Перед реализацией внимательно проверь семантику текущей установленной версии BullMQ для:

```text
attempts
attemptsMade
attemptsStarted
```

Не угадывай off-by-one.

Создай небольшой helper типа:

```text
isFinalAttempt(job)
```

только если он действительно улучшает читаемость.

Обязательно покрой его поведением в tests.

---

# Step 24 — unexpected errors

Не только parser может упасть.

Возможны:

```text
database errors
programming errors
unexpected errors
```

Не проглатывать их.

BullMQ должен получить настоящий `Error`.

Для неожиданной ошибки допустимо использовать обычный retry механизм.

При окончательной неудаче Recipe должен стать:

```text
FAILED
```

если PostgreSQL доступен и состояние можно обновить.

Не маскируй исходную ошибку ради изменения status.

---

# Step 25 — errorMessage

Сейчас Entity содержит:

```text
errorMessage
```

Не сохраняй туда:

- HTML страницы;
- JWT;
- cookies;
- stack trace;
- secrets.

Можно сохранять небольшой безопасный internal summary.

Например:

```text
recipe_not_found
fetch_failed
invalid_recipe_data
queue_unavailable
unexpected_import_error
```

или другую стабильную короткую форму.

Предпочтительно не хранить сырой внешний error message, если он может содержать неожиданные данные.

---

# Step 26 — API errorMessage пока не раскрывать

Текущий public API намеренно не возвращает:

```text
Recipe.errorMessage
```

На этом этапе сохрани это поведение.

Frontend позже сможет показать:

```text
Import failed
```

на основании:

```text
status === FAILED
```

Если в будущем понадобятся локализованные подробные причины ошибки, лучше спроектировать отдельный stable error code.

Не отдавать сейчас raw `errorMessage` только потому, что поле существует.

---

# Step 27 — logging

Processor должен логировать:

```text
job id
recipe id
attempt
successful completion
failure category
```

Но не логировать:

```text
полный HTML
JWT
cookie
password
```

Для permanent parser errors можно логировать техническую причину, а в БД сохранять безопасное значение.

Использовать NestJS Logger.

---

# Step 28 — Manual Retry API

Добавить:

```http
POST /recipes/:id/retry
```

Endpoint protected.

Использовать:

```text
@CurrentUser()
+
recipe id
```

---

## Правила

Retry разрешён только если:

```text
Recipe принадлежит current user
AND
Recipe.status === FAILED
```

Если Recipe отсутствует или чужой:

```text
404
```

Если Recipe существует, но status:

```text
PENDING
PROCESSING
COMPLETED
```

вернуть:

```text
409 Conflict
```

Не делать retry completed Recipe.

---

# Step 29 — manual retry transition

При разрешённом retry:

```text
FAILED
  ↓
PENDING
```

Также:

```text
errorMessage = null
```

После этого:

```text
RecipeImportQueue.enqueue(recipe.id)
```

Response:

```http
202 Accepted
```

---

# Step 30 — concurrent retry protection

Не допускай простой race:

```text
Request A retry
Request B retry
```

→ две одинаковые jobs.

Предпочтительно изменение:

```text
FAILED → PENDING
```

сделать условно на уровне database query.

Например условие должно учитывать:

```text
id
userId
status = FAILED
```

Если affected rows = 0:

проверить, это:

```text
404
```

или:

```text
409
```

Не создавай distributed lock ради этой задачи.

---

# Step 31 — enqueue failure при manual retry

Если:

```text
FAILED
↓
PENDING
↓
queue.add() failed
```

Recipe нельзя оставлять PENDING.

Верни:

```text
FAILED
```

с безопасной причиной.

HTTP:

```text
503 Service Unavailable
```

---

# Step 32 — Controller

Итоговые routes после этапа:

```http
GET    /recipes
GET    /recipes/:id
DELETE /recipes/:id

POST   /recipes/import
POST   /recipes/:id/retry
```

Controller не содержит:

```text
Repository
transaction
parser logic
queue.add directly
```

Controller:

```text
HTTP
↓
Service
```

---

# Step 33 — existing RecipesService

Не переписывай существующие:

```text
findAllForUser
findOneForUser
deleteForUser
```

без необходимости.

Import workflow лучше не смешивать с list/details/delete, если отдельный `RecipeImportService` делает границу ответственности понятнее.

Не переносить существующий рабочий код только ради новой структуры.

---

# Step 34 — deletion during processing

Пользователь может выполнить:

```http
DELETE /recipes/:id
```

пока job выполняется.

Это допустимо.

Processor не должен восстанавливать Recipe.

Если Recipe исчез:

```text
до начала processing
```

→ no-op.

Если Recipe исчез:

```text
после parser, до persistence
```

persistence layer должен обнаружить отсутствие Recipe и не создавать orphan children.

Не усложняй это distributed locking.

Главное:

```text
удалённый Recipe не должен появиться снова
```

---

# Step 35 — tests: ImportRecipeDto / Controller

Проверить:

```text
valid URL → service called
unsupported URL → 400
missing url → 400
extra fields → rejected existing ValidationPipe
```

Для endpoint проверить:

```text
202 Accepted
```

и authentication.

Не тестировать parser заново через controller tests.

---

# Step 36 — tests: requestImport

Проверить:

```text
valid URL
→ PENDING Recipe created
→ queue.enqueue(recipe.id)
```

Проверить:

```text
canonical URL сохраняется
```

Проверить:

```text
invalid/unsupported URL
→ Recipe НЕ создаётся
→ queue НЕ вызывается
```

---

# Step 37 — tests: enqueue failure

Проверить:

```text
Recipe created
↓
queue.enqueue throws
↓
Recipe → FAILED
↓
503
```

Не оставлять PENDING.

---

# Step 38 — tests: successful processor flow

Mock parser:

```ts
ParsedRecipe;
```

Проверить:

```text
load Recipe
↓
PROCESSING
↓
parser.parse(sourceUrl)
↓
transaction
↓
Recipe fields saved
↓
Ingredients saved
↓
Steps saved
↓
COMPLETED
```

Проверить positions:

```text
1..N
```

---

# Step 39 — tests: transaction mapping

Обязательно проверить:

```text
rawText
name
quantity
unit
position
```

для Ingredients.

И:

```text
text
group
durationMinutes
imageUrl
position
```

для Steps.

Не тестировать TypeORM internals.

Тестировать наш mapping и orchestration.

---

# Step 40 — tests: permanent parser failure

Mock:

```ts
RecipeParserError {
  retryable: false
}
```

Проверить:

```text
Recipe → FAILED
```

и job становится unrecoverable без автоматических повторов.

Не проверять это только текстом exception.

Проверь реально выбранный BullMQ error type/behavior на уровне processor unit test.

---

# Step 41 — tests: retryable parser failure

Первая попытка:

```text
retryable error
```

если attempts ещё есть:

```text
Recipe остаётся PROCESSING
```

и exception пробрасывается.

Не выставляется FAILED.

---

# Step 42 — tests: final failed attempt

На последней попытке:

```text
retryable error
```

→

```text
Recipe → FAILED
```

и exception остаётся failed job error.

Обязательно проверить boundary между:

```text
ещё будет retry
```

и:

```text
это последняя попытка
```

---

# Step 43 — tests: duplicate/stale jobs

Проверить:

```text
Recipe COMPLETED
→ parser не вызывается
```

```text
Recipe FAILED
→ старый job не запускает новый import
```

```text
Recipe отсутствует
→ no-op
```

---

# Step 44 — tests: manual retry

Проверить:

```text
FAILED own Recipe
→ PENDING
→ enqueue
→ 202
```

```text
foreign Recipe
→ 404
```

```text
missing Recipe
→ 404
```

```text
COMPLETED/PENDING/PROCESSING
→ 409
```

и queue failure возвращает Recipe в:

```text
FAILED
```

---

# Step 45 — сохранение результата должно быть атомарным

Добавь тест, подтверждающий, что persistence method использует одну transaction boundary.

Не пытайся unit-тестом доказать ACID PostgreSQL.

Нужно проверить нашу архитектуру:

```text
все записи выполняются через transactional manager
```

Если для реальной уверенности нужен один integration/manual DB test — выполни его отдельно.

---

# Step 46 — manual end-to-end verification

После unit tests запусти настоящую инфраструктуру:

```bash
docker compose up -d
```

Проверить:

```bash
docker compose ps
```

PostgreSQL и Redis должны быть healthy.

---

# Step 47 — запустить backend

Запустить:

```bash
npm run start:dev
```

из:

```text
apps/backend
```

---

# Step 48 — authentication

Используй существующий auth API.

Создай или залогинь test user и сохрани cookie.

Не обходи authentication ради проверки import endpoint.

---

# Step 49 — реальный import

Выполнить:

```http
POST /recipes/import
```

с:

```text
https://www.bbcgoodfood.com/recipes/marry-me-chicken
```

Ожидаемый первый response:

```text
202
status = pending
```

После этого worker должен обработать job.

---

# Step 50 — проверить полный state flow

Логи/БД должны подтверждать:

```text
PENDING
↓
PROCESSING
↓
COMPLETED
```

Не добавляй искусственные задержки в production code только чтобы успеть визуально увидеть PROCESSING.

---

# Step 51 — проверить результат через API

После завершения:

```http
GET /recipes/:id
```

должен содержать реальные данные Good Food.

Ожидаемые ориентиры для текущего тестового рецепта:

```text
title = 'Marry me' chicken

servings = 4

prepTimeMinutes = 20

cookTimeMinutes = 45

ingredients = 12

steps = 4
```

Эти значения должны приходить из parser-а.

Не хардкодить их в import pipeline.

---

# Step 52 — проверить PostgreSQL

Прямо в БД проверить:

```text
recipes
recipe_ingredients
recipe_steps
```

Убедиться:

```text
Recipe status = completed

ingredients recipe_id корректный

steps recipe_id корректный

positions начинаются с 1

нет orphan rows
```

---

# Step 53 — проверить invalid URL

Например unsupported domain.

```http
POST /recipes/import
```

→

```text
400
```

Проверить PostgreSQL:

```text
Recipe row не создан
```

Проверить Redis:

```text
job не создан
```

---

# Step 54 — проверить permanent parser failure

Используй безопасный тестовый сценарий.

Не ломай production parser искусственным condition вроде:

```ts
if (recipeId === 999) throw ...
```

Можно использовать unit/integration mocks.

Для live/manual проверки можно использовать поддерживаемый Good Food URL без Recipe data, только если такой URL корректно проходит текущий validator и запрос безопасен.

Не делай обходы сайта.

---

# Step 55 — проверить Retry

Создай контролируемый FAILED Recipe либо используй результат реального failed import.

Выполни:

```http
POST /recipes/:id/retry
```

Проверить:

```text
FAILED
↓
PENDING
↓
BullMQ
↓
processing
```

и дальнейший результат.

---

# Step 56 — queue regression

Существующий:

```bash
npm run queue:smoke
```

не должен сломаться.

Если инфраструктура доступна — повторно проверить.

Не переписывай smoke script без необходимости.

---

# Step 57 — parser regression

Существующий:

```bash
npm run parser:smoke -- <URL>
```

должен продолжать работать.

Parser остаётся независимым от PostgreSQL/Redis.

Это важная архитектурная проверка.

---

# Step 58 — migration regression

Schema на этом этапе менять не требуется.

Проверить:

```bash
npm run migration:show
```

Не создавать новую migration.

Не редактировать:

```text
CreateInitialSchema
```

---

# Step 59 — frontend

Frontend НЕ менять.

Не создавать:

```text
Add Recipe modal
processing cards
polling
recipes hooks
```

Это следующие этапы.

---

# Step 60 — AI

AI не добавлять.

Не менять parser strategy.

Не добавлять:

```text
OpenAI
Gemini
LLM fallback
```

---

# Step 61 — не добавлять Outbox

Не вводить:

```text
Transactional Outbox
Kafka
RabbitMQ
event sourcing
distributed transactions
```

ради решения PostgreSQL + Redis consistency.

Для MVP достаточно:

```text
create Recipe
↓
enqueue
↓
если enqueue fail → FAILED
```

В финальном review можно зафиксировать outbox как production improvement.

---

# Step 62 — final checks

Выполнить:

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

Также:

```bash
git status
git diff
git diff --check
```

Не утверждай, что проверка выполнена, если она реально не запускалась.

---

# Step 63 — regression

Убедиться, что продолжают работать:

```text
Authentication
GET /recipes
GET /recipes/:id
DELETE /recipes/:id

Queue tests
Parser tests
```

Не исправляй unrelated код, если regressions нет.

---

# Definition of Done

Этап 7 считается завершённым только если:

```text
[ ] ImportRecipeDto создан

[ ] POST /recipes/import существует

[ ] endpoint protected authentication

[ ] userId берётся только из current user

[ ] unsupported URL отклоняется до INSERT

[ ] unsupported URL не создаёт job

[ ] sourceUrl хранится нормализованным

[ ] Recipe создаётся PENDING

[ ] queue получает только recipeId

[ ] enqueue failure не оставляет PENDING навсегда

[ ] enqueue failure → FAILED

[ ] enqueue failure → подходящий HTTP error

[ ] processor загружает Recipe из PostgreSQL

[ ] processor использует Recipe.sourceUrl

[ ] processor не получает URL из Redis

[ ] PENDING → PROCESSING

[ ] RecipeParserService вызывается worker-ом

[ ] ParsedRecipe сохраняется

[ ] Recipe поля обновляются

[ ] ingredients сохраняются

[ ] steps сохраняются

[ ] ingredient positions начинаются с 1

[ ] step positions начинаются с 1

[ ] save выполняется внутри transaction

[ ] внутри transaction используется transactional manager

[ ] успешный import → COMPLETED

[ ] success очищает errorMessage

[ ] permanent parser error → FAILED

[ ] permanent parser error не делает лишние retries

[ ] retryable parser error использует BullMQ retry

[ ] intermediate retry не ставит FAILED

[ ] final failed attempt → FAILED

[ ] unexpected failures не проглатываются

[ ] удалённый Recipe не восстанавливается worker-ом

[ ] COMPLETED stale job не парсится заново

[ ] FAILED stale job не парсится заново

[ ] POST /recipes/:id/retry существует

[ ] retry доступен только владельцу

[ ] retry разрешён только для FAILED

[ ] invalid retry status → 409

[ ] retry → PENDING

[ ] retry очищает errorMessage

[ ] retry enqueue failure → FAILED

[ ] raw technical errors не отдаются frontend

[ ] errorMessage не раскрыт через public response

[ ] API unit tests проходят

[ ] import service tests проходят

[ ] processor tests проходят

[ ] parser tests продолжают проходить

[ ] queue tests продолжают проходить

[ ] Auth tests продолжают проходить

[ ] build проходит

[ ] lint проходит

[ ] полный test suite проходит

[ ] migration schema не изменена

[ ] новая migration не создана

[ ] frontend не изменён

[ ] AI не добавлен

[ ] live import Good Food проверен либо блокирующая причина явно зафиксирована
```

---

# Финальный review

После завершения НЕ переходи автоматически к frontend.

Дай отчёт.

## Что изменено

Перечисли новые и изменённые файлы.

## Import architecture

Покажи:

```text
POST /recipes/import
        ↓
PENDING
        ↓
BullMQ
        ↓
PROCESSING
        ↓
Parser
        ↓
Transaction
        ↓
COMPLETED
```

## Failure architecture

Покажи отдельно:

```text
retryable
```

и:

```text
permanent
```

ошибки.

## Transaction

Объясни, какие операции входят в одну PostgreSQL transaction.

## API

Перечисли итоговые routes:

```text
GET    /recipes
GET    /recipes/:id
DELETE /recipes/:id
POST   /recipes/import
POST   /recipes/:id/retry
```

## Manual verification

Укажи реальный результат Good Food import:

```text
recipe id
final status
title
servings
ingredients count
steps count
```

## Tests

Какие команды реально запускались и результат.

## Database

Подтверди отсутствие schema changes.

## MUST FIX

Что блокирует следующий этап.

## SHOULD IMPROVE

Неблокирующие улучшения.

## OPTIONAL

Например:

```text
transactional outbox
advanced observability
```

но не реализовывать их сейчас.

## VERDICT

Напиши однозначно:

```text
Этап 7 готов к переходу на Этап 8
```

или:

```text
Этап 7 пока не готов
```

с причиной.

Обнови:

```text
apps/codex/AGENT_PROGRESS.md
```

так, чтобы следующая Codex session могла продолжить проект без истории этого чата.

Не создавай Git commit без моего отдельного разрешения.

---

# Следующий этап

После моего отдельного разрешения:

**Этап 8 — Frontend Architecture / Foundation.**

Там мы начнём подключать frontend к уже полностью работающему backend.

Но сейчас frontend НЕ трогать.

---

# Начало работы

Начни только со:

**Step 1 — аудит integration points.**

Пока ничего не меняй.

После аудита покажи:

1. что можно переиспользовать без изменений;
2. какие новые файлы предлагаешь;
3. какие существующие файлы нужно изменить;
4. как будет разделена ответственность между `RecipesService`, `RecipeImportService` и `RecipeImportProcessor`;
5. как будет выполняться PostgreSQL transaction;
6. как будет определяться последняя BullMQ attempt;
7. как permanent errors будут останавливать retries;
8. нужна ли migration;
9. какие риски видишь.

После этого остановись и дождись моего ответа.
