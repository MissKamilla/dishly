# Dishly — Этап 5: BullMQ + Redis Recipe Queue

Мы продолжаем разработку fullstack-проекта **Dishly**.

Текущий этап:

**Этап 5 — реализация инфраструктуры очереди импорта рецептов с BullMQ и Redis.**

Наша цель — создать рабочую и проверенную очередь, которую на следующем этапе можно будет использовать для фонового парсинга рецептов.

Работаем с существующим проектом. Не создавай новую архитектуру с нуля и не переписывай готовые модули.

---

# 1. Подготовка и аудит

Перед началом:

1. Прочитай корневой `AGENTS.md`.
2. Прочитай `apps/codex/AGENT_PROGRESS.md`.
3. Изучи текущий `apps/codex/CODEX_TASK.md`.
4. Изучи backend, конфигурацию и Docker Compose.
5. Выполни `git status`.
6. Проверь версии существующих dependencies.

Особенно изучи:

```text
apps/backend/package.json
apps/backend/src/app.module.ts
apps/backend/src/main.ts
apps/backend/src/config/validate-environment.ts
apps/backend/src/recipes/recipes.module.ts
apps/backend/src/recipes/recipes.service.ts
apps/backend/src/recipes/entities/recipe.entity.ts
apps/backend/src/recipes/enums/recipe-status.enum.ts
apps/backend/.env.example
docker-compose.yml
```

Не предполагай, что описание проекта полностью совпадает с кодом. Фактический код имеет приоритет.

**Сначала выполни аудит, покажи результаты и остановись.**

---

# 2. Текущее состояние Dishly

Уже завершены:

```text
Этап 1 — Project Bootstrap
Этап 2 — Database Schema and Entities
Этап 3 — Backend Authentication
Этап 4 — Recipes Backend API
```

Работают следующие endpoints:

```http
GET    /recipes
GET    /recipes/:id
DELETE /recipes/:id
```

Backend использует:

- NestJS;
- TypeScript;
- PostgreSQL;
- TypeORM;
- JWT + HttpOnly cookie;
- глобальный JwtAuthGuard.

Существуют Entity:

```text
User
Recipe
RecipeIngredient
RecipeStep
```

Существуют статусы:

```ts
enum RecipeStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}
```

Redis уже добавлен в Docker Compose.

Локальный host port:

```text
6380
```

Внутренний порт контейнера:

```text
6379
```

Backend запускается локально, не в Docker.

Поэтому при локальной разработке подключение должно использовать:

```text
REDIS_HOST=localhost
REDIS_PORT=6380
```

Не хардкодить эти значения.

---

# 3. Главная цель этапа

Создать инфраструктуру:

```text
NestJS
   |
   v
BullMQ Queue
   |
   v
Redis
   |
   v
RecipeImportProcessor
```

Нужно добиться рабочего сценария:

```text
Добавляем тестовую задачу
          |
          v
      queue.add()
          |
          v
         Redis
          |
          v
        Worker
          |
          v
    Обработка задачи
          |
          v
       Completed
```

На этом этапе worker выполняет только тестовую обработку.

Он ещё НЕ должен:

- скачивать HTML;
- парсить сайты;
- сохранять ингредиенты;
- изменять Recipe;
- создавать новые Recipe.

Это будет реализовано позднее.

---

# 4. Архитектурный контракт очереди

Фиксируем имя очереди:

```ts
export const RECIPE_IMPORT_QUEUE = "recipe-import";
```

Имя задачи:

```ts
export const IMPORT_RECIPE_JOB = "import-recipe";
```

Данные задачи:

```ts
export interface ImportRecipeJobData {
  recipeId: number;
}
```

Пример:

```ts
await queue.add(IMPORT_RECIPE_JOB, {
  recipeId: 42,
});
```

Именно такой формат должен использоваться в будущем API импорта.

Не передавать в job весь Recipe.

Не передавать:

```ts
{
  (userId, sourceUrl, title, ingredients, steps, status);
}
```

**PostgreSQL остаётся основным источником данных.**

В будущем worker получит `recipeId` и самостоятельно загрузит Recipe из БД.

---

# 5. Границы текущего этапа

Сейчас создаём только queue infrastructure.

Не реализовывать:

```http
POST /recipes/import
POST /recipes/:id/retry
```

Не менять существующие GET/DELETE endpoints.

Не добавлять временный публичный API вроде:

```http
POST /queue/test
```

только для проверки очереди.

Тестовый запуск будем выполнять через отдельный локальный smoke-test или другую безопасную dev-only процедуру.

Никаких новых HTTP endpoints на этом этапе не требуется.

---

# 6. Планируемая структура

Предпочтительное направление:

```text
apps/backend/src/
│
├── config/
│   └── validate-environment.ts
│
├── recipes/
│   ├── queue/
│   │   ├── recipe-import.constants.ts
│   │   ├── recipe-import.types.ts
│   │   ├── recipe-import.queue.ts
│   │   └── recipe-import.processor.ts
│   │
│   ├── recipes.module.ts
│   └── ...
│
└── app.module.ts
```

Имена файлов можно скорректировать, если в текущем проекте есть более подходящее соглашение.

Не создавай отдельную папку или файл на каждую константу, если это только усложняет структуру.

Не создавай generic queue framework, BaseQueue, QueueFactory и дополнительные abstraction layers.

У нас пока одна очередь.

---

# 7. Порядок работы

Работаем последовательно.

Перед каждым крупным блоком:

1. Коротко объясни, что делаем.
2. Объясни зачем.
3. Назови файлы, которые будут изменены.
4. Покажи необходимые команды.
5. Выполни изменения после моего подтверждения.

Если требуется установить библиотеку:

- сначала покажи команду;
- объясни назначение dependency;
- дождись, пока я выполню установку.

Не устанавливай пакеты молча.

После каждого логического блока:

- проверяй компиляцию;
- запускай подходящие тесты;
- обновляй `apps/codex/AGENT_PROGRESS.md`.

Не создавай commit без моего отдельного разрешения.

---

# Step 1 — аудит Redis и backend

Сначала ничего не меняй.

Проверь:

- как Redis описан в Docker Compose;
- используется ли persistent volume;
- включено ли сохранение данных Redis;
- как настроена environment validation;
- подключён ли BullMQ ранее;
- какие зависимости потребуются;
- куда логичнее зарегистрировать очередь;
- как работает lifecycle NestJS при завершении приложения.

Отдельно проверь, не содержит ли существующий проект похожую инфраструктуру, которую можно переиспользовать.

После аудита покажи короткий план файлов и остановись.

---

# Step 2 — установить BullMQ

Нам нужны:

```text
@nestjs/bullmq
bullmq
```

Ожидаемая команда из:

```text
apps/backend
```

```bash
npm install @nestjs/bullmq bullmq
```

Но сначала проверь актуальную совместимость пакетов с установленным NestJS и между собой.

Используй официальную документацию.

Не устанавливай:

```text
@nestjs/bull
bull
```

Это другая интеграция.

Не устанавливай одновременно Bull и BullMQ.

Не добавляй вручную дополнительные Redis dependencies, если BullMQ уже обеспечивает всё необходимое для нашей конфигурации.

Если дополнительный пакет действительно требуется, объясни причину.

---

# Step 3 — Redis environment variables

Сейчас в backend `.env.example` нет Redis connection variables.

Добавь:

```env
REDIS_HOST=localhost
REDIS_PORT=6380
```

Используй тот же подход к конфигурации, который уже применяется для PostgreSQL.

Не дублируй Redis host/port строками в разных файлах.

Обнови:

```text
apps/backend/.env.example
```

Также нужно обновить локальный:

```text
apps/backend/.env
```

Не записывай реальные secrets в Git.

---

## Environment validation

В:

```text
src/config/validate-environment.ts
```

добавь проверку:

```text
REDIS_HOST
REDIS_PORT
```

`REDIS_HOST` — непустая строка.

`REDIS_PORT` — корректный TCP port:

```text
1–65535
```

Не принимай:

```text
abc
0
70000
6380abc
```

Проверь, можно ли переиспользовать существующую логику проверки порта без создания ненужных абстракций.

При неправильной конфигурации приложение должно выдавать понятную ошибку на этапе запуска.

---

# Step 4 — проверить сохранение данных Redis

Сейчас Redis описан в Docker Compose без persistent volume.

Для очереди это важный момент.

Если контейнер пересоздаётся, мы не должны без необходимости терять ожидающие задачи.

Изучи возможность включить Redis AOF persistence и добавить named volume.

Предпочтительный подход:

```text
Redis
  |
  v
AOF persistence
  |
  v
Docker named volume
```

Внеси минимальные необходимые изменения в `docker-compose.yml`.

Не меняй PostgreSQL configuration.

Не выполняй:

```bash
docker compose down -v
```

Это может удалить существующие данные PostgreSQL.

Не обещай абсолютную сохранность каждой задачи при любом сбое: Redis persistence имеет собственные гарантии и ограничения.

Для текущего этапа достаточно корректной локальной конфигурации и понятного поведения при обычном перезапуске контейнера.

Проверь также Redis `maxmemory-policy`; для очереди ожидается политика без автоматического вытеснения ключей.

---

# Step 5 — зарегистрировать BullMQ в NestJS

Изучи официальную интеграцию NestJS с BullMQ.

Используй:

```ts
BullModule;
```

и подходящую асинхронную конфигурацию через:

```ts
ConfigService;
```

Предпочтительно:

```ts
BullModule.forRootAsync(...)
```

Подключение должно использовать:

```text
REDIS_HOST
REDIS_PORT
```

Не хардкодить:

```ts
host: 'localhost',
port: 6379
```

Важно:

```text
localhost:6380
```

актуально только для нашего локального запуска.

Если backend позже будет запущен внутри Docker Compose, адрес потребуется настроить через env для контейнерной сети.

Не добавлять сейчас Dockerfile для backend.

---

# Step 6 — зарегистрировать очередь

Создай queue:

```text
recipe-import
```

Используй:

```ts
BullModule.registerQueue(...)
```

Размести регистрацию в подходящем NestJS module.

Предпочтительно использовать существующий:

```text
RecipesModule
```

поскольку очередь относится к домену рецептов.

Но Redis connection configuration должна быть централизована.

Не дублируй настройки подключения внутри каждой очереди.

Не создавай отдельный большой `QueueModule` без необходимости.

---

# Step 7 — типизация job

Создай единый контракт:

```ts
interface ImportRecipeJobData {
  recipeId: number;
}
```

Используй его и при добавлении задачи, и в processor.

Нельзя иметь разные версии payload в producer и worker.

Не использовать:

```ts
Job<any>;
```

если можно явно типизировать данные.

Важно: TypeScript-типы не заменяют runtime validation.

Processor должен корректно реагировать на явно некорректные данные задачи, например отсутствие положительного целочисленного `recipeId`.

Не создавай для этого полноценную DTO/HTTP validation инфраструктуру.

---

# Step 8 — создать producer

Нужно реализовать минимальный механизм добавления задачи в очередь.

Например сервис:

```text
RecipeImportQueue
```

или другое понятное название.

Его задача:

```text
recipeId
   |
   v
queue.add()
```

Внутри должен использоваться:

```ts
@InjectQueue(RECIPE_IMPORT_QUEUE)
```

и типизированный:

```ts
Queue;
```

Предполагаемый метод:

```ts
enqueue(recipeId: number)
```

Он должен возвращать результат или необходимую информацию об успешном добавлении задачи.

Не привязывай producer к Express request/response.

Не помещай в него бизнес-логику создания Recipe.

В будущем `RecipesService` сможет использовать этот producer после создания Recipe в PostgreSQL.

Но сейчас не подключай новый import flow к существующему `RecipesService`.

---

# Step 9 — создать processor

Создай:

```text
RecipeImportProcessor
```

Используй:

```ts
@Processor(...)
```

и:

```ts
WorkerHost;
```

Processor должен обрабатывать задачу:

```text
import-recipe
```

Сейчас он выполняет только:

```text
получить job
↓
проверить имя/payload
↓
залогировать начало обработки
↓
завершить задачу
```

Пример полезного логирования:

```text
Processing recipe import job 123 for recipe 42
```

Используй стандартный:

```ts
Logger;
```

из NestJS.

Не используй `console.log()` в качестве постоянной инфраструктуры логирования.

Не логируй JWT, cookie или secrets.

---

## Очень важно

Processor пока НЕ должен:

```text
SELECT Recipe
UPDATE Recipe
fetch HTML
parse HTML
save ingredients
save steps
```

И не должен переводить Recipe в:

```text
PROCESSING
COMPLETED
FAILED
```

На данном этапе мы тестируем только инфраструктуру очереди.

Эти бизнес-статусы будут реализованы на этапе 7.

---

# Step 10 — обработка неизвестных jobs

Processor должен явно обрабатывать ситуацию, когда получил job с неожиданным именем.

Не нужно молча считать неизвестную задачу успешно выполненной.

Предпочтительно выбросить ошибку.

Не добавлять сложную систему регистрации десятков job handlers.

У нас сейчас один тип задачи.

---

# Step 11 — Job lifecycle

Нужно разобраться со следующими состояниями BullMQ:

```text
waiting
active
completed
failed
delayed
```

Не путать их с RecipeStatus.

BullMQ:

```text
job state
```

PostgreSQL:

```text
recipe business status
```

Это разные вещи.

Frontend в будущем должен получать статус рецепта через PostgreSQL/API, а не через прямой доступ к Redis.

---

# Step 12 — Completed / Failed events

Добавь минимальное логирование результатов обработки.

Нужно видеть:

```text
Job completed
```

или:

```text
Job failed
```

Используй подходящие возможности BullMQ/NestJS.

При ошибке processor должен выбрасывать исключение.

Не делай:

```ts
catch (error) {
  logger.error(error);
  return;
}
```

Иначе BullMQ может посчитать задачу успешно выполненной.

Если ошибка перехватывается для логирования, она должна корректно передаваться дальше.

Не создавать собственную большую error-handling infrastructure.

---

# Step 13 — Retry configuration

В Dishly обязательно предусмотрена возможность повторных попыток.

Начальная конфигурация:

```ts
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
}
```

Это означает максимум три попытки выполнения задачи.

Настройки можно разместить в:

```text
defaultJobOptions
```

или непосредственно при добавлении job.

Выбери один понятный вариант.

Не дублируй настройки в нескольких местах.

Сейчас нужно:

- корректно настроить retries;
- понять поведение BullMQ;
- покрыть настройки/ошибки необходимыми тестами.

Не реализовывать изменение `Recipe.status` при retries.

Это будет на этапе 7.

Не добавлять искусственную ветку в production processor вроде `if (recipeId === 999) throw`, только чтобы проверить ошибку.

Проверяй failure behavior через тесты.

---

# Step 14 — поведение при недоступном Redis

Предусмотри, что Redis может быть временно недоступен.

Важно различать:

```text
API producer
```

и:

```text
background worker
```

В будущем API не должен бесконечно ждать ответа Redis.

Проверь соответствующие connection/retry options установленной версии BullMQ.

Если необходимо, выбери разумную fail-fast конфигурацию для producer.

Не отключай бесконечное восстановление соединения worker без понимания последствий.

Не создавай самостоятельно сложную retry system поверх BullMQ.

---

# Step 15 — graceful shutdown

Проверь lifecycle BullMQ при завершении NestJS.

При остановке приложения должны корректно закрываться используемые подключения и worker.

Используй встроенные возможности NestJS/BullMQ, если они уже обеспечивают это.

Не создавай собственный connection manager без необходимости.

Если потребуется:

```ts
app.enableShutdownHooks();
```

объясни почему.

Проверь, что процесс не зависает из-за оставшихся Redis connections.

Не добавляй принудительное закрытие соединений, если это может оборвать выполняющиеся задачи без необходимости.

---

# Step 16 — подготовить безопасный smoke-test

Сейчас публичного endpoint для добавления Recipe ещё нет.

Поэтому нужно проверить очередь отдельно.

Предпочтительно создать минимальный dev-only способ отправить одну job через Nest dependency injection.

Например:

```text
apps/backend/scripts/queue-smoke.ts
```

Точное расположение выбери с учётом текущей структуры проекта.

Не создавай огромный CLI framework.

Не создавай HTTP endpoint для тестирования.

Тестовый механизм должен использовать настоящую зарегистрированную очередь или producer.

Не создавать независимый `new Queue(...)` с отдельными захардкоженными Redis settings.

После завершения smoke-test приложение должно корректно освобождать ресурсы.

Если отдельный файл для этого не нужен и есть более простой безопасный способ — объясни и используй его.

---

# Step 17 — manual verification

Нужно выполнить реальную проверку.

Сначала:

```bash
docker compose ps
```

Проверить, что Redis работает.

Затем запустить backend:

```bash
npm run start:dev
```

Добавить тестовую job:

```ts
{
  recipeId: 42;
}
```

Ожидаемое поведение:

```text
Producer
   |
   v
Redis
   |
   v
Worker receives job
   |
   v
Completed
```

Проверить:

- задача добавляется;
- worker её получает;
- логируется ожидаемый `recipeId`;
- задача завершается успешно;
- Redis содержит ожидаемое состояние job либо это подтверждается через BullMQ API;
- отсутствие parser не мешает работе очереди.

После проверки убрать временные тестовые данные, если это необходимо и безопасно.

Не удалять другие Redis keys вслепую.

Не использовать:

```bash
FLUSHALL
FLUSHDB
```

для очистки тестов.

---

# Step 18 — тесты

Добавить focused tests.

## Producer tests

Проверить:

```text
enqueue(42)
```

вызывает:

```ts
queue.add(...)
```

с правильными:

```text
job name
payload
options
```

Не подключать настоящий Redis в обычных unit tests.

Использовать подходящий mock.

## Processor tests

Проверить:

- корректная job обрабатывается;
- правильный `recipeId` читается из payload;
- неизвестная job не завершается успешно;
- некорректный payload обрабатывается ошибкой;
- ошибка обработки не проглатывается.

Не писать тесты на конкретный текст логов без необходимости.

## Retry tests

Проверить конфигурацию attempts/backoff и важное поведение при ошибке.

Не создавать огромную integration-test инфраструктуру только для одной очереди.

---

# Step 19 — не изменять Recipe Entity

На этом этапе никаких изменений в БД не требуется.

Не менять:

```text
Recipe
RecipeIngredient
RecipeStep
RecipeStatus
```

Не создавать новую migration без реальной причины.

Не редактировать существующую:

```text
CreateInitialSchema
```

Бизнес-логика импорта будет реализована позже.

---

# Step 20 — README

Обновить README минимально.

Нужно объяснить:

- что Redis используется для BullMQ;
- какие Redis env variables нужны;
- как запустить Redis;
- как запустить backend;
- как проверить очередь через smoke-test, если он добавлен.

Не писать большую документацию на десятки страниц.

---

# Step 21 — что НЕ входит в этот этап

Категорически не реализовывать:

```text
POST /recipes/import
POST /recipes/:id/retry

HTML fetcher
JSON-LD extractor
Good Food parser
AI parser

создание Recipe через API
обновление Recipe.status
сохранение Ingredients
сохранение Steps

Frontend changes
React Query
Recipe cards
Add Recipe modal
Polling
WebSockets
SSE
Shopping list
```

Следующие этапы:

```text
Этап 6 — Good Food Parser

Этап 7 — Queue + Parser + PostgreSQL integration
```

Не переходить к ним автоматически.

---

# Step 22 — финальные проверки

Обязательно выполнить:

```bash
npm run build
npm run lint
npm test
```

Из:

```text
apps/backend
```

Также проверить:

```bash
npm run migration:show
```

Убедиться, что миграции не затронуты.

Из корня проекта:

```bash
docker compose ps
```

Проверить реальный smoke-test очереди.

Проверить:

```bash
git status
git diff
```

Не утверждать, что тест прошёл, если он не запускался.

Если запуск невозможен из-за окружения — объясни конкретную причину.

---

# 23. Definition of Done

Этап 5 считается завершённым, если:

- [ ] BullMQ установлен и подключён к NestJS.
- [ ] Используется `@nestjs/bullmq`, а не старый Bull.
- [ ] Redis host/port берутся из env.
- [ ] Redis env variables валидируются.
- [ ] Redis persistence настроена и проверена в доступных пределах.
- [ ] Очередь `recipe-import` зарегистрирована.
- [ ] Job `import-recipe` имеет единый типизированный payload.
- [ ] Producer создан.
- [ ] Producer использует `queue.add()`.
- [ ] Processor создан.
- [ ] Processor использует `WorkerHost`.
- [ ] Processor получает правильный `recipeId`.
- [ ] Job успешно завершается.
- [ ] Ошибки не проглатываются.
- [ ] Completed/Failed events логируются.
- [ ] Retry/backoff настроены.
- [ ] Проверено поведение подключений и остановки приложения.
- [ ] Unit tests проходят.
- [ ] Реальный smoke-test с Redis проходит.
- [ ] Backend build проходит.
- [ ] Backend lint проходит.
- [ ] Существующие tests проходят.
- [ ] Миграции не изменены.
- [ ] Recipe Entity не изменена.
- [ ] Auth и Recipes API не сломаны.
- [ ] Frontend не изменялся.
- [ ] Parser не реализован.
- [ ] Новые production HTTP endpoints не создавались.

---

# 24. Финальный review

После завершения не переходи к Этапу 6.

Дай отчёт.

## Что изменено

Перечисли файлы и назначение изменений.

## Архитектура

Покажи итоговую цепочку:

```text
Producer
   |
   v
BullMQ
   |
   v
Redis
   |
   v
Processor
```

## Configuration

Объясни, откуда берутся Redis host/port.

## Retry

Покажи настройки и объясни поведение при ошибке.

## Tests

Укажи, какие тесты реально запускались.

## Manual verification

Опиши результат реального добавления и обработки job.

## MUST FIX

Проблемы, блокирующие следующий этап.

## SHOULD IMPROVE

Желательные неблокирующие изменения.

## OPTIONAL

То, что можно оставить на будущее.

## VERDICT

Однозначно укажи:

```text
Этап 5 готов к переходу на Этап 6
```

или:

```text
Этап 5 пока не готов
```

С объяснением причины.

Обнови:

```text
apps/codex/AGENT_PROGRESS.md
```

Зафиксируй там:

- новые зависимости;
- архитектурные решения;
- изменённые файлы;
- результаты проверок;
- особенности Redis;
- следующий этап.

Не создавай Git commit без моего разрешения.

---

# Начало работы

Начни только с:

**Step 1 — аудит Redis и текущего backend.**

Пока ничего не меняй.

Сначала покажи:

1. какие зависимости нужно установить;
2. какие Redis-настройки уже существуют;
3. как настроить Redis connection;
4. куда зарегистрировать BullMQ;
5. предлагаемую структуру файлов;
6. какие проблемы ты обнаружил;
7. с какого изменения предлагаешь начать.

После аудита остановись и дождись моего ответа.
