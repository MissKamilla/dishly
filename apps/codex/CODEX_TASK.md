Я начинаю разработку fullstack-проекта **Dishly**.

Dishly — приложение для хранения рецептов и импорта рецептов по URL.

В будущем пользователь сможет:

```text
найти рецепт на внешнем сайте
→ скопировать ссылку
→ вставить её в Dishly
→ рецепт попадёт в очередь обработки
→ backend получит данные рецепта
→ нормализует их
→ сохранит в PostgreSQL
→ пользователь увидит готовый рецепт
```

Но сейчас мы выполняем **только Этап 1 — Project Bootstrap**.

Не переходи к следующим этапам раньше времени.

---

# Главная цель этапа

Создать чистую и профессиональную основу проекта, на которой дальше будут реализованы:

- authentication;
- recipes;
- queue;
- parser;
- frontend;
- i18n.

После завершения этого этапа у нас должен быть работающий пустой fullstack-проект:

```text
React frontend
+
NestJS backend
+
PostgreSQL
+
Redis
```

без бизнес-логики.

---

# Важный контекст

Проекта пока вообще нет.

Мы начинаем с пустой директории.

Я хочу писать код сама, поэтому:

- не создавай весь проект за меня одним большим ответом;
- веди меня маленькими шагами;
- сначала объясняй действие;
- потом показывай команду или небольшой код;
- жди моего результата;
- после проверки переходи дальше.

Работаем так, как будто это коммерческий проект для серьёзного заказчика.

Но не добавляем лишнюю enterprise-сложность.

Главный принцип:

```text
простое корректное решение
>
сложное решение "на будущее"
```

---

# Планируемый стек Dishly

## Frontend

- React;
- TypeScript;
- Vite;
- React Router;
- TanStack Query.

Redux Toolkit сейчас НЕ добавляем.

Он появится только если позже возникнет реальная необходимость в сложном global client state.

Server state должен в будущем храниться через TanStack Query.

---

## Backend

- NestJS;
- TypeScript;
- PostgreSQL;
- TypeORM;
- ConfigModule.

Позже будут:

- BullMQ;
- Redis;
- JWT;
- parser.

Но бизнес-функциональность сейчас не реализуем.

---

# Инфраструктура

Используем Docker Compose для:

```text
PostgreSQL
Redis
```

Frontend и backend пока запускаем локально через Node.js.

Не нужно сейчас Dockerize frontend/backend.

---

# Предполагаемая структура проекта

Предпочтительно:

```text
dishly/
├── apps/
│   ├── frontend/
│   └── backend/
│
├── AGENTS.md
├── README.md
├── docker-compose.yml
├── .gitignore
└── .env.example
```

Если считаешь другую структуру объективно лучше — сначала объясни причину.

Не добавляй Nx, Turborepo и другие monorepo frameworks.

Нам пока достаточно обычного monorepo.

---

# Как со мной работать

Каждый шаг оформляй так:

## 1. Что сейчас делаем

Очень коротко.

## 2. Почему это нужно

1–3 предложения.

## 3. Где работать

Укажи:

```text
директория
файл
```

## 4. Что сделать

Дай конкретную команду или небольшой код.

## 5. Что проверить

Напиши точную команду проверки и какой результат я должна увидеть.

После этого остановись и дождись моего результата.

Не выдавай сразу следующий шаг.

---

# Шаги Этапа 1

Веди меня строго последовательно.

---

## Step 1 — создать Git repository и структуру проекта

Нужно:

- создать директорию `dishly`;
- инициализировать Git;
- создать `apps`;
- подготовить структуру для frontend/backend;
- создать базовый `.gitignore`.

Пока не генерировать React/NestJS.

Проверить:

```bash
git status
```

---

## Step 2 — создать backend

Создать NestJS приложение:

```text
apps/backend
```

Не создавать сейчас:

- auth module;
- recipes module;
- users module;
- parser;
- queue.

Оставить только стандартный bootstrap NestJS.

Проверить:

```bash
npm run start:dev
```

и:

```bash
npm run build
```

---

## Step 3 — очистить NestJS demo-код

Разобрать стандартные:

```text
main.ts
app.module.ts
app.controller.ts
app.service.ts
```

Удалить или упростить demo-код, который нам не нужен.

Но не усложнять структуру.

Объясни мне назначение каждого базового NestJS файла.

---

## Step 4 — подключить ConfigModule

Установить:

```text
@nestjs/config
```

Настроить environment variables.

Конфигурация не должна быть захардкожена.

Подготовить:

```text
.env
.env.example
```

`.env` должен быть в `.gitignore`.

`.env.example` должен попасть в Git.

На этом этапе могут понадобиться переменные вроде:

```text
PORT

DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD

REDIS_HOST
REDIS_PORT

FRONTEND_URL
```

Но не добавлять переменные без реальной необходимости.

---

## Step 5 — настроить global ValidationPipe

В `main.ts` подключить глобальный `ValidationPipe`.

Разобрать со мной:

```text
whitelist
transform
forbidNonWhitelisted
```

И выбрать разумную конфигурацию.

Сейчас DTO ещё может не быть — это нормально.

Наша задача подготовить infrastructure foundation.

---

## Step 6 — Docker Compose для PostgreSQL

Создать:

```text
docker-compose.yml
```

Добавить PostgreSQL.

Настроить через environment variables:

```text
database
user
password
port
```

Добавить persistent volume.

Не использовать production secrets.

Запустить:

```bash
docker compose up -d
```

Проверить:

```bash
docker compose ps
```

PostgreSQL должен быть running/healthy.

---

## Step 7 — TypeORM

Установить:

```text
@nestjs/typeorm
typeorm
pg
```

Подключить TypeORM к PostgreSQL.

Конфигурацию брать только из environment variables.

Entity сейчас НЕ создавать.

Наша задача:

```text
NestJS
↓
TypeORM
↓
PostgreSQL
```

должны успешно соединяться.

Обязательно отдельно объясни разницу между:

```text
synchronize
```

и:

```text
migrations
```

Для проекта Dishly мы должны ориентироваться на migrations.

Не строить production architecture на:

```ts
synchronize: true;
```

Если временно используем его локально — объясни зачем и когда отключим.

---

## Step 8 — добавить Redis

Добавить Redis в тот же:

```text
docker-compose.yml
```

Пока НЕ устанавливать BullMQ.

Сейчас Redis просто должен запускаться как часть инфраструктуры.

Проверить:

```bash
docker compose ps
```

Должны работать:

```text
PostgreSQL
Redis
```

---

## Step 9 — создать frontend

Создать:

```text
apps/frontend
```

Использовать:

```text
Vite
React
TypeScript
```

Проверить:

```bash
npm run dev
```

и:

```bash
npm run build
```

Удалить стандартный Vite demo-контент.

Не делать дизайн Dishly.

Не создавать recipe cards.

---

## Step 10 — React Router

Установить React Router.

Создать минимальную routing foundation.

Можно использовать временные маршруты:

```text
/
/login
/recipes
```

Пока страницы могут быть простыми заглушками.

Наша задача — только проверить routing.

---

## Step 11 — TanStack Query

Установить TanStack Query.

Настроить:

```text
QueryClient
QueryClientProvider
```

Не писать реальные API queries.

Объясни, почему TanStack Query должен использоваться для server state.

Не добавлять Redux Toolkit.

---

## Step 12 — frontend environment variables

Настроить API URL через Vite env.

Например:

```text
VITE_API_URL
```

Frontend не должен содержать разбросанные:

```text
http://localhost:3000
```

в разных компонентах.

---

## Step 13 — простой backend health endpoint

Добавить простой:

```text
GET /health
```

Например response:

```json
{
  "status": "ok"
}
```

Не делать сейчас сложную health-check infrastructure.

Цель — проверить:

```text
browser/frontend
↓
NestJS backend
```

---

## Step 14 — CORS

Настроить CORS в NestJS.

Frontend origin получать из env.

Не использовать без необходимости:

```ts
origin: "*";
```

Для local development должен быть разрешён конкретный frontend URL.

---

## Step 15 — проверить связь frontend/backend

Сделать максимально простой временный вызов `/health`.

Не использовать:

```text
useEffect + fetch
```

если мы уже подключили TanStack Query.

Можно создать временный query только для проверки связи.

Если этот код после проверки не нужен архитектуре — обсудить, удалить ли его.

---

## Step 16 — README

Создать базовый:

```text
README.md
```

README должен позволить другому разработчику выполнить:

```text
clone
↓
install dependencies
↓
создать .env
↓
docker compose up
↓
запустить backend
↓
запустить frontend
```

README должен содержать:

- краткое описание Dishly;
- stack;
- prerequisites;
- installation;
- environment setup;
- Docker commands;
- frontend start;
- backend start;
- build commands.

Не писать огромную документацию.

---

## Step 17 — финальная проверка

Проверить:

### Backend

```bash
npm run build
```

Если есть lint:

```bash
npm run lint
```

### Frontend

```bash
npm run build
```

Если есть lint:

```bash
npm run lint
```

### Infrastructure

```bash
docker compose ps
```

### Git

```bash
git status
git diff
```
