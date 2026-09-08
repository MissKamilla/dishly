# Dishly — Этап 2: Database Schema and TypeORM Entities

Мы продолжаем разработку fullstack-проекта **Dishly**.

Перед началом обязательно:

1. прочитай корневой `AGENTS.md`;
2. прочитай `apps/codex/AGENT_PROGRESS.md`;
3. изучи текущее состояние `apps/backend`;
4. не опирайся только на этот текст — сверяй требования с фактическим кодом проекта;

# 1. Текущее состояние проекта

Этап 1 — Project Bootstrap завершён.

Сейчас уже существует:

```text
dishly/
├── apps/
│   ├── backend/
│   ├── frontend/
│   └── codex/
├── AGENTS.md
├── README.md
├── docker-compose.yml
├── .env.example
└── .gitignore
```

Backend уже содержит:

- NestJS;
- TypeScript;
- `@nestjs/config`;
- `@nestjs/typeorm`;
- TypeORM;
- PostgreSQL driver `pg`;
- глобальный `ValidationPipe`;
- ConfigModule;
- CORS;
- `GET /health`;
- подключение к PostgreSQL.

Текущая TypeORM-конфигурация находится в:

```text
apps/backend/src/app.module.ts
```

и использует:

```ts
autoLoadEntities: true,
synchronize: false,
```

`synchronize: false` необходимо сохранить.

PostgreSQL уже работает через Docker Compose.

Локально используется:

```text
host: localhost
port: 5433
database: dishly
```

Frontend на этом этапе НЕ трогаем.

Redis на этом этапе НЕ трогаем.

---

# 2. Цель этапа

На этом этапе нужно спроектировать и реализовать persistence-модель Dishly.

Нужно получить:

```text
User
  │
  └── 1:N Recipe
         │
         ├── 1:N RecipeIngredient
         │
         └── 1:N RecipeStep
```

Также нужно настроить полноценную работу с TypeORM migrations.

После завершения этапа:

```text
Entity
↓
TypeORM metadata
↓
Migration
↓
PostgreSQL schema
```

должны полностью соответствовать друг другу.

---

# 3. Главный принцип этапа

Не реализовывать бизнес-логику.

На этом этапе работаем только с:

- Entity;
- relations;
- foreign keys;
- indexes;
- constraints;
- enum;
- migration infrastructure;
- migrations;
- минимальными Nest modules, необходимыми для регистрации Entity.

НЕ делать:

- authentication;
- JWT;
- register/login;
- DTO;
- controllers;
- services с бизнес-логикой;
- recipe CRUD;
- repositories;
- BullMQ;
- queue;
- parser;
- JSON-LD;
- frontend;
- i18n.

---

# 4. Как со мной работать

Не выполняй весь этап одним огромным изменением.

Раздели его на логические блоки.

Для каждого блока сначала напиши:

## Что делаем

Коротко.

## Почему

Коротко объясни решение.

## Что собираешься реализовать

Без лишней теории.

После этого выполняй изменения.

После каждого крупного блока:

- запускай подходящую проверку;
- обновляй `apps/codex/AGENT_PROGRESS.md`;
- кратко сообщай результат.

Не создавай commit и не добавляй staget!

---

# 5. План этапа

Работай в следующем порядке.

---

# Step 1 — аудит текущей database-конфигурации

Сначала ничего не меняй.

Изучи:

```text
apps/backend/src/app.module.ts
apps/backend/.env.example
apps/backend/package.json
apps/backend/tsconfig.json
docker-compose.yml
```

Проверь:

- как NestJS сейчас подключается к PostgreSQL;
- какая версия TypeORM установлена;
- какой module system используется;
- как должны запускаться TypeORM migrations в текущем проекте;
- не потребуется ли отдельный `DataSource` для CLI;
- как избежать конфликта между runtime TypeORM config и migration config.

Не добавляй новую архитектуру без необходимости.

Особенно не добавляй сторонний `naming strategy` package только ради snake_case.

Названия таблиц и важных колонок можно задавать явно.

---

# Step 2 — настроить TypeORM migrations

Создай migration infrastructure для backend.

Предпочтительное направление:

```text
apps/backend/src/
├── database/
│   ├── data-source.ts
│   └── migrations/
```

Точное расположение можешь скорректировать, если есть техническая причина.

Нужен TypeORM `DataSource`, который сможет использовать TypeORM CLI.

Он должен использовать те же PostgreSQL environment variables:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

Не хардкодить connection values.

Если для загрузки `.env` напрямую в TypeORM CLI требуется `dotenv`, используй его явно как dependency, а не полагайся на случайную transitive dependency.

---

## Требования к migration setup

Сохранить:

```ts
synchronize: false;
```

Не включать `synchronize: true` даже временно.

Migration должна быть единственным способом создания бизнес-таблиц.

Настрой удобные npm scripts для:

```text
migration:generate
migration:run
migration:revert
migration:show
```

Точные команды выбери с учётом фактически установленной версии TypeORM и текущего NodeNext/ESM setup.

После настройки обязательно реально проверь команды.

Не добавляй migration framework поверх TypeORM.

---

# Step 3 — User Entity

Создай доменную область пользователя.

Предпочтительная структура:

```text
src/users/
├── entities/
│   └── user.entity.ts
└── users.module.ts
```

`UsersModule` сейчас нужен только для корректной регистрации Entity через TypeORM.

Не создавать:

```text
users.controller.ts
users.service.ts
DTO
auth logic
```

---

## Таблица users

Таблица:

```text
users
```

Поля:

```text
id
email
password_hash
name
language
created_at
updated_at
```

### id

Использовать обычный generated integer primary key.

Не вводить UUID без необходимости.

---

### email

```text
NOT NULL
UNIQUE
```

Максимальная разумная длина:

```text
320
```

---

### passwordHash

В TypeScript property:

```ts
passwordHash;
```

В PostgreSQL:

```text
password_hash
```

Поле:

```text
NOT NULL
```

Рекомендуется исключить его из обычных SELECT через возможности TypeORM, чтобы password hash случайно не возвращался вместе с User.

На этапе Auth позже мы будем запрашивать его явно там, где это действительно необходимо.

Никакого password hashing сейчас не реализовывать.

---

### name

```text
NOT NULL
```

Обычная строка разумной длины.

---

### language

Пока:

```text
language
```

с дефолтным значением:

```text
en
```

Не нужно сейчас делать отдельную таблицу Languages.

Не нужно создавать сложную локализационную модель.

Можно хранить language code простой строкой.

Начальные будущие значения:

```text
en
ru
```

Но логика i18n будет реализована позже.

---

### timestamps

Использовать:

```text
created_at
updated_at
```

Хранить timezone-aware timestamps для PostgreSQL, если это нормально поддерживается текущим TypeORM setup.

---

# Step 4 — RecipeStatus и Recipe Entity

Создай:

```text
src/recipes/
├── entities/
├── enums/
└── recipes.module.ts
```

Пока без service/controller.

---

## RecipeStatus

Создай enum:

```ts
enum RecipeStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}
```

Recipe по умолчанию должен создаваться со статусом:

```text
pending
```

---

# Recipe Entity

Таблица:

```text
recipes
```

Поля:

```text
id

title
description

source_url
image_url

servings
prep_time_minutes
cook_time_minutes

status
error_message

user_id

created_at
updated_at
```

---

## id

Generated integer primary key.

---

## title

```text
nullable
```

Потому что Recipe будет создаваться до завершения parser-а.

Разумная максимальная длина строки.

---

## description

```text
text
nullable
```

---

## sourceUrl

TypeScript:

```ts
sourceUrl;
```

PostgreSQL:

```text
source_url
```

Поле:

```text
NOT NULL
```

Использовать `text`, потому что URL теоретически может быть длинным.

Не добавлять UNIQUE constraint.

Один и тот же URL теоретически может быть импортирован несколько раз.

---

## imageUrl

```text
image_url
text
nullable
```

---

## servings

```text
integer
nullable
```

---

## prepTimeMinutes

PostgreSQL:

```text
prep_time_minutes
```

```text
integer
nullable
```

---

## cookTimeMinutes

PostgreSQL:

```text
cook_time_minutes
```

```text
integer
nullable
```

---

## status

Использовать `RecipeStatus`.

```text
NOT NULL
DEFAULT pending
```

---

## errorMessage

PostgreSQL:

```text
error_message
```

```text
text
nullable
```

---

## userId

Recipe должен всегда принадлежать User.

TypeScript должен иметь удобный scalar foreign key:

```ts
userId: number;
```

и relation:

```ts
user: User;
```

Оба должны использовать одну колонку:

```text
user_id
```

Связь:

```text
User 1:N Recipe
```

Foreign key:

```text
recipes.user_id
→ users.id
```

При удалении User:

```text
ON DELETE CASCADE
```

потому что в текущей продуктовой модели Recipes принадлежат конкретному User.

Не использовать ORM `cascade: true` просто ради автоматического save.

---

## Index

Добавить индекс на:

```text
recipes.user_id
```

Потому что основной query pattern приложения:

```text
получить Recipes конкретного User
```

Не добавлять десятки speculative indexes.

---

# Step 5 — RecipeIngredient Entity

Создай:

```text
recipe-ingredient.entity.ts
```

Таблица:

```text
recipe_ingredients
```

Поля:

```text
id
raw_text
name
quantity
unit
position
recipe_id
```

---

## rawText

TypeScript:

```ts
rawText;
```

DB:

```text
raw_text
```

```text
text
NOT NULL
```

Это оригинальная строка ингредиента.

Например:

```text
½ - 1 tsp chilli flakes
```

Её нельзя терять даже если структурированные поля определить не удалось.

---

## name

```text
nullable
```

Разумная строковая длина.

---

## quantity

```text
nullable
```

Количество должно поддерживать дробные значения:

```text
0.5
1.5
2.25
```

Выбери PostgreSQL/TypeORM тип, который нормально отображается в JavaScript `number`.

Не создавай сложный decimal transformer без реальной необходимости.

Для количества ингредиентов достаточно обычного floating-point numeric representation.

---

## unit

```text
nullable
```

Разумная короткая строка.

Например:

```text
g
kg
ml
tbsp
tsp
```

---

## position

```text
integer
NOT NULL
```

Порядок ингредиентов должен храниться явно.

Нельзя рассчитывать на порядок primary key.

---

## recipeId

TypeScript:

```ts
recipeId: number;
```

Relation:

```ts
recipe: Recipe;
```

Оба используют:

```text
recipe_id
```

Foreign key:

```text
recipe_ingredients.recipe_id
→ recipes.id
ON DELETE CASCADE
```

---

## Unique constraint

Обязательно:

```text
UNIQUE(recipe_id, position)
```

У одного Recipe не должно существовать двух ингредиентов с одинаковой позицией.

Отдельный index только на `recipe_id` не нужен, если composite unique index уже эффективно начинается с `recipe_id`.

Не создавать дублирующие индексы.

---

# Step 6 — RecipeStep Entity

Создай:

```text
recipe-step.entity.ts
```

Таблица:

```text
recipe_steps
```

Поля:

```text
id
text
group_name
duration_minutes
image_url
position
recipe_id
```

---

## text

```text
text
NOT NULL
```

---

## group

В TypeScript property оставить:

```ts
group: string | null;
```

В PostgreSQL лучше использовать понятное имя:

```text
group_name
```

чтобы не использовать потенциально неоднозначное SQL-имя `group`.

Поле nullable.

Пример:

```text
For the chicken
For the sauce
```

Если группировки нет:

```text
null
```

---

## durationMinutes

PostgreSQL:

```text
duration_minutes
```

```text
integer
nullable
```

---

## imageUrl

PostgreSQL:

```text
image_url
```

```text
text
nullable
```

---

## position

```text
integer
NOT NULL
```

---

## recipeId

TypeScript:

```ts
recipeId: number;
```

Relation:

```ts
recipe: Recipe;
```

DB:

```text
recipe_id
```

Foreign key:

```text
recipe_steps.recipe_id
→ recipes.id
ON DELETE CASCADE
```

---

## Unique constraint

Добавить:

```text
UNIQUE(recipe_id, position)
```

---

# Step 7 — обратные relations

Entity должны иметь двусторонние relations.

Концептуально:

```text
User
└── recipes: Recipe[]

Recipe
├── user: User
├── ingredients: RecipeIngredient[]
└── steps: RecipeStep[]

RecipeIngredient
└── recipe: Recipe

RecipeStep
└── recipe: Recipe
```

Не включать:

```ts
cascade: true;
```

на всех `OneToMany`.

Сохранение связанных Entity позже должно быть осознанной частью service/business logic.

Удаление children обеспечивается через database:

```text
ON DELETE CASCADE
```

на owning-side foreign keys.

---

# Step 8 — регистрация Entity

Текущий backend использует:

```ts
autoLoadEntities: true;
```

Поэтому зарегистрируй Entity через соответствующие Nest modules.

Например:

```text
UsersModule
→ TypeOrmModule.forFeature([User])

RecipesModule
→ TypeOrmModule.forFeature([
     Recipe,
     RecipeIngredient,
     RecipeStep,
   ])
```

После этого подключи эти modules в `AppModule`.

Не создавать services/controllers только для того, чтобы module выглядел заполненным.

---

# Step 9 — Initial migration

После того как Entity готовы:

1. убедись, что PostgreSQL запущен;
2. проверь, что dev database находится в ожидаемом состоянии;
3. не удаляй существующие данные без моего разрешения;
4. сгенерируй initial migration на основе Entity.

Имя migration должно быть понятным, например:

```text
CreateInitialSchema
```

или:

```text
InitialDatabaseSchema
```

После генерации обязательно открой migration и вручную проверь SQL.

Нельзя просто довериться TypeORM generator.

---

# 10. Что должна создавать migration

Ожидаемые таблицы:

```text
users
recipes
recipe_ingredients
recipe_steps
migrations
```

`migrations` — служебная таблица TypeORM после выполнения migrations.

---

## users

Ожидается:

```text
PK id
UNIQUE email
password_hash
name
language
created_at
updated_at
```

---

## recipes

Ожидается:

```text
PK id

nullable title
nullable description

source_url NOT NULL
image_url nullable

servings nullable
prep_time_minutes nullable
cook_time_minutes nullable

status NOT NULL
error_message nullable

user_id NOT NULL

created_at
updated_at

FK user_id → users.id
ON DELETE CASCADE
```

Плюс индекс по:

```text
user_id
```

---

## recipe_ingredients

Ожидается:

```text
PK id
raw_text
name
quantity
unit
position
recipe_id

FK recipe_id → recipes.id
ON DELETE CASCADE

UNIQUE(recipe_id, position)
```

---

## recipe_steps

Ожидается:

```text
PK id
text
group_name
duration_minutes
image_url
position
recipe_id

FK recipe_id → recipes.id
ON DELETE CASCADE

UNIQUE(recipe_id, position)
```

---

# Step 11 — проверить migration lifecycle

Нужно доказать, что migration infrastructure реально работает.

Проверить:

```text
migration:show
migration:run
```

После `migration:run` проверить PostgreSQL schema.

Не ограничиваться сообщением CLI:

```text
Migration executed successfully
```

Посмотреть реальные таблицы, foreign keys и constraints через PostgreSQL.

После этого, если это безопасно для текущей локальной dev database:

```text
migration:revert
```

Проверить, что migration откатилась корректно.

Затем снова:

```text
migration:run
```

чтобы финальное состояние БД снова соответствовало Entity.

Не оставлять базу в reverted состоянии.

---

# Step 12 — объяснить SQL-модель

После создания migration коротко объясни мне, какой SQL concept стоит за каждым TypeORM relation.

Особенно:

```text
@ManyToOne
@OneToMany
@JoinColumn
@Unique
@Index
onDelete: 'CASCADE'
```

Мне нужно понимать не только TypeORM decorators, но и итоговую PostgreSQL-модель.

Не делай длинную лекцию.

Покажи связь:

```text
TypeORM
→ какой FK/index/constraint появляется в PostgreSQL
```

---

# 13. На что обратить особое внимание

## Entity != DTO

На этом этапе DTO вообще не нужны.

Не создавай DTO только потому, что позже будет API.

---

## Entity != ParsedRecipe

Database Entity и результат parser-а — разные модели.

Не добавлять parser-specific типы в Entity.

Например:

```text
Recipe
```

может содержать:

```text
id
status
userId
errorMessage
createdAt
```

а parser позже будет возвращать отдельный:

```text
ParsedRecipe
```

без database-specific полей.

Сам `ParsedRecipe` пока не требуется реализовывать на этом этапе.

---

## Не использовать eager relations

Не добавлять:

```ts
eager: true;
```

без реальной необходимости.

Позже service сам определит, какие relations нужны конкретному query.

---

## Не использовать ORM cascade save без причины

Не ставить:

```ts
cascade: true;
```

просто чтобы TypeORM автоматически сохранял всё дерево.

Мы хотим явно понимать операции записи.

---

## Не использовать synchronize

Оставить:

```ts
synchronize: false;
```

---

## Не добавлять timestamps всем Entity без необходимости

`createdAt` / `updatedAt` нужны для:

```text
User
Recipe
```

Для:

```text
RecipeIngredient
RecipeStep
```

пока они не нужны.

---

# 14. Что НЕ входит в Этап 2

Категорически не реализовывать сейчас:

```text
AuthService
AuthController
JWT
bcrypt/argon
RegisterDto
LoginDto

RecipesController
RecipesService
Recipe CRUD

BullMQ
queue
worker

HTML fetch
JSON-LD
Good Food parser

frontend changes
i18next
profile UI
shopping list
AI
```

Следующий этап будет:

```text
Этап 3 — Backend Authentication
```

Но к нему не переходить автоматически.

---

# 15. Проверки перед завершением

Обязательно выполнить:

```bash
npm run build
npm run lint
```

из:

```text
apps/backend
```

Проверить TypeORM migration commands.

Проверить:

```bash
docker compose ps
```

из root проекта.

PostgreSQL должен быть healthy.

Проверить migration status.

Проверить database schema.

Проверить:

```bash
git status
git diff
```

Не создавать commit без моего запроса.

---

# 16. Definition of Done

Этап 2 считается готовым только если:

```text
[ ] migration infrastructure настроена

[ ] synchronize остаётся false

[ ] TypeORM DataSource для CLI работает

[ ] migration npm scripts работают

[ ] User Entity создан

[ ] Recipe Entity создан

[ ] RecipeIngredient Entity создан

[ ] RecipeStep Entity создан

[ ] RecipeStatus enum создан

[ ] UsersModule регистрирует User

[ ] RecipesModule регистрирует recipe Entity

[ ] AppModule подключает новые modules

[ ] User 1:N Recipe настроено

[ ] Recipe 1:N RecipeIngredient настроено

[ ] Recipe 1:N RecipeStep настроено

[ ] explicit userId присутствует в Recipe

[ ] explicit recipeId присутствует в Ingredient и Step

[ ] ON DELETE CASCADE настроен корректно

[ ] UNIQUE(recipe_id, position) существует для ingredients

[ ] UNIQUE(recipe_id, position) существует для steps

[ ] index recipes.user_id существует

[ ] initial migration создана

[ ] migration SQL вручную проверен

[ ] migration:run работает

[ ] migration:show работает

[ ] migration:revert проверен

[ ] migration повторно применена после revert

[ ] реальные таблицы/relations/constraints проверены в PostgreSQL

[ ] backend build проходит

[ ] backend lint проходит

[ ] frontend не изменялся

[ ] auth не реализовывался

[ ] parser не реализовывался

[ ] queue не реализовывалась
```

---

# 17. Финальный review

После завершения не переходи к Auth.

Сначала дай отчёт:

## Что изменено

Короткий список файлов и решений.

## Database schema

Покажи итоговую схему:

```text
User
→ Recipe
→ Ingredient / Step
```

## Migration

Укажи:

- имя migration;
- run result;
- revert result;
- repeat run result.

## MUST FIX

Если есть проблемы, которые блокируют следующий этап.

## SHOULD IMPROVE

Не блокирующие улучшения.

## OPTIONAL

То, что можно оставить на будущее.

## VERDICT

Явно:

```text
Этап 2 готов к переходу на Этап 3
```

или:

```text
Этап 2 пока не готов
```

с причиной.

Также обнови:

```text
apps/codex/AGENT_PROGRESS.md
```

так, чтобы другой Codex session мог продолжить работу без потери контекста.

---

# Начало

Сейчас начни с:

```text
Step 1 — аудит текущей database-конфигурации
```

Сначала покажи мне краткий результат аудита и предложенную структуру файлов.

Не начинай создание Entity до того, как станет понятно, как именно в текущем NodeNext + TypeORM setup будут работать migrations.
