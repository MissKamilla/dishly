# Dishly — Этап 8: Frontend Architecture / Foundation

Продолжаем разработку fullstack-проекта **Dishly**.

Backend MVP foundation уже реализован:

```text
Authentication
Recipes API
BullMQ + Redis
Good Food Parser
Recipe Import Pipeline
```

Сейчас начинаем frontend.

Текущий этап:

**Этап 8 — Frontend Architecture / Foundation**

На этом этапе НЕ реализуем полноценную авторизацию, список рецептов, импорт рецепта или дизайн страниц.

Главная задача — подготовить чистую frontend-основу, поверх которой следующие этапы будут реализовываться без архитектурных переделок.

---

# 1. Перед началом

Обязательно:

1. Прочитай корневой `AGENTS.md`.
2. Прочитай `apps/codex/AGENT_PROGRESS.md`.
3. Изучи текущий `apps/frontend`.
4. Выполни:

```bash
git status
```

5. Проверь фактически установленные frontend dependencies и их версии.
6. Не обновляй библиотеки только потому, что существует более новая версия.

Особенно изучи:

```text
apps/frontend/package.json

apps/frontend/src/
apps/frontend/src/main.tsx

vite.config.*
tsconfig*

apps/frontend/.env.example
```

Также проверь существующую настройку:

```text
React Router
TanStack Query
VITE_API_URL
```

Они были добавлены ещё на Bootstrap этапе, поэтому не реализовывай их повторно, если они уже работают.

Сначала проведи аудит.

До завершения аудита ничего не меняй.

---

# 2. Цель этапа

После Этапа 8 frontend должен иметь понятную foundation:

```text
main.tsx
   ↓
App providers
   ↓
Router
   ↓
Layout
   ↓
Pages
```

И отдельный API слой:

```text
React / TanStack Query
        ↓
API client
        ↓
VITE_API_URL
        ↓
NestJS backend
```

Следующие этапы должны иметь возможность без переделки foundation добавить:

```text
Frontend Authentication
Recipes List
Add Recipe
Processing UI
Recipe Details
Profile
i18n
```

---

# 3. Главный принцип

Не пытайся сейчас заранее реализовать весь frontend.

Нужна:

```text
простая
понятная
масштабируемая
но не переусложнённая
```

структура.

Не создавать архитектуру уровня enterprise SPA.

Dishly пока небольшой проект.

---

# 4. Что уже используется

Frontend stack:

```text
React
TypeScript
Vite
React Router
TanStack Query
```

На будущих этапах будет добавлен:

```text
i18next / react-i18next
```

Но на Этапе 8 i18n пока НЕ устанавливать.

---

# 5. Redux

Redux Toolkit на этом этапе НЕ нужен.

Не устанавливать:

```text
@reduxjs/toolkit
react-redux
```

Server state будет находиться в:

```text
TanStack Query
```

Local UI state:

```text
React state
```

Redux добавляется только если позже появится реальная задача, которую нельзя нормально решить этими средствами.

---

# 6. Предлагаемая структура frontend

Не создавать сотни директорий заранее.

Предпочтительная основа:

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers/
│       └── AppProviders.tsx
│
├── pages/
│   ├── HomePage/
│   ├── LoginPage/
│   ├── RecipesPage/
│   └── NotFoundPage/
│
├── shared/
│   ├── api/
│   │   ├── api-client.ts
│   │   ├── api-error.ts
│   │   └── api.types.ts
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   └── ui/
│
├── main.tsx
└── ...
```

Это ориентир.

Не создавать пустые:

```text
features/
entities/
widgets/
hooks/
utils/
services/
store/
```

только потому, что они могут понадобиться когда-нибудь.

Добавляй новые folders тогда, когда появляется реальный код.

---

# 7. Не использовать сложную Feature-Sliced архитектуру

Не внедрять полный:

```text
Feature-Sliced Design
Atomic Design
Clean Architecture frontend
Hexagonal frontend
```

только ради структуры.

Dishly должен быть понятен разработчику без отдельной документации по архитектурному framework.

Достаточно:

```text
app
pages
shared
```

А `features` можно добавить позже, когда реально появятся:

```text
auth
recipe import
profile
```

---

# 8. Как со мной работать

Работай логическими блоками.

Перед каждым блоком объясняй:

## Что делаем

## Почему

## Какие файлы меняются

## Как проверить

Не переписывай сразу весь frontend.

Если требуется dependency:

1. сначала проверь `package.json`;
2. объясни зачем она нужна;
3. покажи команду;
4. дождись моего подтверждения.

Не создавай Git commit без моего разрешения.

После крупных изменений обновляй:

```text
apps/codex/AGENT_PROGRESS.md
```

---

# Step 1 — аудит текущего frontend

Сначала изучи текущее состояние.

Покажи:

1. текущую структуру `src`;
2. установленную версию React;
3. установленную версию React Router;
4. установленную версию TanStack Query;
5. существующий router setup;
6. существующий QueryClient setup;
7. существующий API health-check;
8. существующие env variables;
9. какие файлы относятся к Vite demo и могут быть удалены;
10. что можно сохранить без изменений.

После этого остановись.

---

# Step 2 — очистить Bootstrap/demo код

После аудита удалить оставшийся Vite/demo код, который не относится к Dishly.

Например, если существуют:

```text
Vite logos
counter demo
unused CSS
demo components
```

их удалить.

Не удалять работающую инфраструктуру:

```text
Router
QueryClient
env
```

только ради перестройки структуры.

---

# Step 3 — App entry point

Сделать понятную цепочку:

```text
main.tsx
↓
AppProviders
↓
App
```

`main.tsx` должен быть минимальным.

Пример ответственности:

```text
React root
↓
global providers
↓
application
```

Не помещать туда:

```text
API requests
auth logic
routes definitions
business logic
```

---

# Step 4 — AppProviders

Создать единое место для application-level providers.

Например:

```text
src/app/providers/AppProviders.tsx
```

На текущем этапе там может находиться:

```text
QueryClientProvider
RouterProvider
```

или router может оставаться внутри `App`, если это соответствует текущей установленной версии React Router и получается проще.

Не создавать provider ради каждого React context.

Главная цель:

```text
main.tsx не должен постепенно превращаться в список из 10 wrappers
```

---

# Step 5 — QueryClient

Проверь существующую настройку TanStack Query.

Нужен единый:

```ts
QueryClient;
```

для приложения.

Не создавать QueryClient внутри React component render.

Минимально определить разумные defaults.

Например:

```text
retry
refetchOnWindowFocus
staleTime
```

Но НЕ задавай глобально агрессивную конфигурацию без причины.

---

# 6. Retry TanStack Query

Не путать:

```text
frontend request retry
```

с:

```text
BullMQ recipe import retry
```

Это разные механизмы.

Не делать frontend API requests бесконечно.

Можно оставить стандартное или небольшое количество retry для GET requests.

Для mutations не добавлять автоматические повторные POST запросы без осознанной причины.

Особенно в будущем:

```text
POST /recipes/import
```

не должен случайно выполниться несколько раз из-за frontend retry policy.

---

# Step 7 — environment config

Сейчас frontend использует:

```text
VITE_API_URL
```

Создать одно место для чтения environment configuration.

Например:

```text
src/shared/config/env.ts
```

Не использовать:

```ts
import.meta.env.VITE_API_URL;
```

в десятках компонентов.

---

# Step 8 — validate VITE_API_URL

Frontend должен рано обнаруживать неправильную configuration.

Минимально проверить:

```text
VITE_API_URL существует
является непустой строкой
может быть преобразован в URL
```

Не нужно устанавливать Zod только ради одной env variable.

Обычной небольшой функции достаточно.

---

# Step 9 — API URL

В development ожидается что-то вроде:

```env
VITE_API_URL=http://localhost:3000
```

Но не хардкодить:

```ts
const API_URL = "http://localhost:3000";
```

в коде.

Также избегай проблем вида:

```text
http://localhost:3000//recipes
```

API client должен аккуратно собирать URL.

Не создавай сложный URL builder framework.

---

# Step 10 — единый API client

Создай:

```text
src/shared/api/api-client.ts
```

Нужен небольшой wrapper поверх стандартного:

```ts
fetch();
```

Axios пока не устанавливать.

Стандартного fetch достаточно.

---

# Step 11 — API client responsibilities

API client должен централизованно обеспечивать:

```text
base URL
credentials
headers
JSON serialization
JSON parsing
HTTP errors
204 responses
```

Пример conceptual API:

```ts
apiRequest<T>(path, options);
```

или похожий простой вариант.

Не создавай класс:

```text
ApiClientFactory
HttpRepositoryAdapter
BaseService<T>
```

без необходимости.

---

# Step 12 — credentials

Очень важно.

Backend authentication использует:

```text
JWT
+
HttpOnly cookie
```

Поэтому каждый frontend request должен поддерживать:

```ts
credentials: "include";
```

Это должно быть централизовано в API client.

Не писать `credentials: 'include'` вручную в каждом hook.

---

# Step 13 — Content-Type

Если request содержит JSON:

```text
Content-Type: application/json
```

Но не ставить этот header слепо для любого возможного request.

В будущем могут появиться:

```text
FormData
file upload
```

Поэтому API wrapper должен быть достаточно простым и не ломать будущие non-JSON body.

На текущем этапе главное корректно поддержать JSON API.

---

# Step 14 — 204 No Content

Backend уже использует:

```text
204 No Content
```

например для:

```text
logout
delete recipe
```

API client не должен делать:

```ts
await response.json();
```

для `204`.

Иначе получим JSON parse error после успешного backend response.

Добавь корректную обработку:

```text
204
→ undefined
```

---

# Step 15 — API errors

Создай простой:

```text
ApiError
```

который хранит минимум:

```text
status
message
```

При необходимости:

```text
body
```

Но не таскай весь Response object по application layer.

---

# Step 16 — NestJS error response

Backend может возвращать:

```json
{
  "statusCode": 400,
  "message": "..."
}
```

или:

```json
{
  "statusCode": 400,
  "message": ["...", "..."]
}
```

API client должен корректно получить пользовательское/техническое сообщение.

Если:

```text
message = string[]
```

можно объединить сообщения в понятную строку.

Не привязывай всю архитектуру frontend к NestJS response format.

Используй его только как один из поддерживаемых error payload formats.

---

# Step 17 — non-JSON error

Backend/proxy может вернуть:

```text
502
HTML response
```

или пустой response.

API client не должен падать второй ошибкой при попытке распарсить JSON.

В таком случае вернуть generic:

```text
Request failed
```

с HTTP status.

---

# Step 18 — network error

Если fetch не получил HTTP response:

```text
network failure
backend unavailable
```

API client должен вернуть понятный frontend error.

Не придумывать HTTP status, которого не было.

Например:

```text
status = null
```

допустимо.

---

# Step 19 — AbortSignal

API client должен позволять передавать:

```ts
signal;
```

Чтобы TanStack Query мог отменять запросы.

Не создавать собственную cancellation implementation.

Использовать стандартный `AbortSignal`.

---

# Step 20 — типы API

Создай небольшое место для общих API types, если это реально нужно.

Например:

```text
src/shared/api/api.types.ts
```

Но не копируй туда сразу весь backend domain.

На этом этапе не нужно создавать:

```text
Recipe
User
Ingredient
Step
```

типы заранее.

Они появятся на соответствующих frontend этапах.

---

# Step 21 — React Router foundation

Приведи routing к понятной структуре.

Routes на текущем этапе:

```text
/
/login
/recipes
/*
```

Например:

```text
/           → HomePage
/login      → LoginPage
/recipes    → RecipesPage
*           → NotFoundPage
```

Пока это placeholders.

---

# Step 22 — route definitions отдельно от page implementation

Не помещать все route declarations в:

```text
main.tsx
```

Предпочтительно:

```text
src/app/router.tsx
```

или аналогичный файл.

---

# Step 23 — пока нет protected routes

НЕ реализовывать сейчас:

```text
ProtectedRoute
RequireAuth
redirect unauthenticated user
/auth/me query
```

Это задача:

**Этап 9 — Frontend Authentication.**

На Этапе 8 `/recipes` может быть обычной placeholder page.

---

# Step 24 — App Layout

Создать минимальный общий layout.

Например:

```text
AppLayout
```

Он может содержать:

```text
header
main
Outlet
```

Но дизайн пока должен быть минимальным.

Не тратить время на:

```text
sidebar
complex navigation
mobile menu
user menu
animations
```

---

# Step 25 — router layout

Желательная структура:

```text
AppLayout
├── HomePage
├── RecipesPage
└── ...
```

Но login в будущем может использовать отдельный auth layout.

Не создавай второй layout сейчас, если он ничего не решает.

---

# Step 26 — Placeholder pages

Создай минимальные:

```text
HomePage
LoginPage
RecipesPage
NotFoundPage
```

Например только:

```text
Dishly
Home

Dishly
Login

Dishly
Recipes
```

Не реализовывать настоящий UI.

Не создавать формы.

Не обращаться к Recipes API.

---

# Step 27 — Home route

Реши простой временный вариант для:

```text
/
```

Например HomePage.

Не строить landing page.

В будущем `/` можно будет перенаправить на:

```text
/recipes
```

после внедрения Authentication.

Сейчас этого не требуется.

---

# Step 28 — global CSS foundation

Проверь текущий CSS.

Удалить Vite demo styles.

Создать очень небольшую базу:

```text
box-sizing
body margin
font inheritance
basic background/text
button/input font inheritance
```

Не создавать полноценный design system.

---

# Step 29 — дизайн

Полноценный дизайн Dishly пока НЕ реализовывать.

Мы позже будем адаптировать UI из предыдущего проекта под кухонную тематику.

Сейчас допускаются только базовые neutral styles, чтобы страницы можно было использовать во время разработки.

Не тратить время на:

```text
recipe cards
food colors
animations
shadows system
complex typography
dark mode
responsive dashboard
```

---

# Step 30 — UI components

Не создавать заранее:

```text
Button
Input
Modal
Card
Select
Badge
Spinner
Toast
```

только потому, что они понадобятся позже.

Создадим их тогда, когда появится реальное использование.

На этом этапе `shared/ui` может вообще оставаться пустым или не существовать.

Не создавать пустую директорию только ради структуры.

---

# Step 31 — Health check

На Bootstrap этапе мог существовать временный frontend health query.

Проверь его.

Если он используется только как проверка связи:

```text
GET /health
```

и больше не нужен продукту, его можно удалить из пользовательского UI.

Не создавай постоянную HealthPage.

Если health query полезен как development smoke-test и не мешает архитектуре — можно оставить маленький dev-only механизм.

Сначала объясни решение.

---

# Step 32 — не создавать API modules заранее

На Этапе 8 НЕ создавать:

```text
auth.api.ts
recipes.api.ts
profile.api.ts
```

если они пока не используются.

На следующем этапе появится:

```text
auth API
```

а затем:

```text
recipes API
```

Сейчас нужен только reusable transport layer:

```text
apiRequest()
```

---

# Step 33 — TanStack Query Devtools

Не устанавливать автоматически.

Если уже установлены — оцени, нужны ли они.

Если нет:

```text
@tanstack/react-query-devtools
```

не обязательны для MVP.

Не устанавливать package только ради nice-to-have.

---

# Step 34 — ESLint

Не переписывать ESLint configuration без необходимости.

Проверить существующие правила.

Новые файлы должны проходить:

```bash
npm run lint
```

Не делать большой formatting/lint refactor всего frontend.

---

# Step 35 — path aliases

Не вводить:

```text
@/app
@/shared
@/pages
```

только потому, что это красиво.

Если текущие относительные imports остаются короткими и понятными:

```ts
../shared/api/api-client
```

этого достаточно.

Path alias можно добавить позже, если nesting реально станет проблемой.

Не усложнять Vite + tsconfig без необходимости.

---

# Step 36 — Barrel exports

Не создавать в каждой директории:

```text
index.ts
```

автоматически.

Barrel exports использовать только если они реально улучшают imports.

Избегать circular dependencies.

---

# Step 37 — tests для API client

API transport layer — важная foundation.

Добавь focused tests, если текущая frontend test infrastructure уже существует или её можно добавить без большого отдельного setup.

Обязательно проверить поведение:

```text
200 JSON
204 No Content
400 JSON error
500 non-JSON error
network failure
credentials included
base URL
AbortSignal forwarding
```

Если frontend test runner ещё вообще не настроен и его настройка станет отдельным большим проектом, не добавляй Jest/Vitest infrastructure только ради одного helper.

В таком случае:

1. объясни отсутствие test setup;
2. проверяй TypeScript/build/lint;
3. автоматические frontend tests добавим на финальном testing этапе или при первой реальной feature.

Не переусложнять.

---

# Step 38 — проверить API client через /health

Для manual verification можно временно использовать:

```text
GET /health
```

через новый API client.

Цель:

```text
frontend API client
↓
NestJS
↓
200
```

Не превращай health в пользовательскую feature.

После проверки временный UI можно убрать.

---

# Step 39 — environment docs

Проверь:

```text
apps/frontend/.env.example
```

Должно присутствовать:

```env
VITE_API_URL=http://localhost:3000
```

Не помещать туда secrets.

Frontend environment variables являются публичными для browser bundle.

Никогда не помещать туда:

```text
JWT_SECRET
DB_PASSWORD
REDIS_PASSWORD
```

---

# Step 40 — README

Обновить README только если текущие инструкции запуска frontend устарели.

Не документировать ещё не существующие frontend features.

Достаточно, чтобы разработчик понимал:

```text
как создать .env
как запустить frontend
какой backend URL нужен
```

---

# Step 41 — scope: что НЕ делать

На Этапе 8 категорически НЕ реализовывать:

```text
Register form
Login form
Logout button

GET /auth/current or /auth/me integration
auth context
auth query
protected routes

Recipes API hooks
Recipe list
Recipe card
Recipe details

Add Recipe modal
POST /recipes/import

processing polling
retry button

Profile

i18n

Redux

AI

shopping list
```

Это последующие этапы.

---

# Step 42 — backend scope

Backend на Этапе 8 не менять.

Не исправлять parser.

Не менять queue.

Не менять migrations.

Не менять Recipe Entity.

Не менять Authentication API.

Если frontend обнаружит настоящий backend contract bug — сначала сообщи и остановись, прежде чем менять backend.

---

# Step 43 — expected result structure

После завершения структура должна быть примерно:

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers/
│       └── AppProviders.tsx
│
├── pages/
│   ├── HomePage/
│   │   └── HomePage.tsx
│   ├── LoginPage/
│   │   └── LoginPage.tsx
│   ├── RecipesPage/
│   │   └── RecipesPage.tsx
│   └── NotFoundPage/
│       └── NotFoundPage.tsx
│
├── shared/
│   ├── api/
│   │   ├── api-client.ts
│   │   └── api-error.ts
│   │
│   └── config/
│       └── env.ts
│
├── main.tsx
└── ...
```

Не воспринимать это как обязательство создать каждый файл.

Если часть структуры пока не нужна — не создавать её.

---

# Step 44 — manual navigation verification

Запустить:

```bash
npm run dev
```

Проверить:

```text
/
```

открывается.

```text
/login
```

открывается.

```text
/recipes
```

открывается.

```text
/something-that-does-not-exist
```

показывает NotFoundPage.

Перезагрузка браузера непосредственно на `/recipes` не должна ломать development app.

---

# Step 45 — API verification

Проверить:

```text
VITE_API_URL
↓
apiRequest('/health')
↓
backend
```

Убедиться:

- URL собирается правильно;
- credentials включены;
- JSON parse работает;
- network failure обрабатывается;
- API URL не захардкожен.

---

# Step 46 — build

Выполнить из:

```text
apps/frontend
```

```bash
npm run build
npm run lint
```

Если frontend tests существуют:

```bash
npm test
```

или соответствующую команду текущего проекта.

Не придумывай команду, которой нет в `package.json`.

---

# Step 47 — regression

Поскольку backend не меняется:

не нужно повторно прогонять весь backend test suite только ради frontend restructuring.

Но убедись через `git diff`, что backend действительно не изменён.

---

# Step 48 — Git check

Перед завершением:

```bash
git status
git diff
git diff --check
```

Проверь, что случайно не добавлены:

```text
.env
dist
node_modules
IDE files
```

---

# Definition of Done

Этап 8 считается завершённым, если:

```text
[ ] существующий frontend полностью изучен

[ ] Vite demo code удалён

[ ] main.tsx минимальный

[ ] application providers структурированы

[ ] один QueryClient используется всем приложением

[ ] QueryClient не создаётся внутри render

[ ] React Router структурирован отдельно

[ ] / работает

[ ] /login работает

[ ] /recipes работает

[ ] 404 route работает

[ ] существует минимальный общий layout

[ ] полноценный UI ещё не реализован

[ ] VITE_API_URL читается централизованно

[ ] VITE_API_URL валидируется

[ ] backend URL не захардкожен

[ ] единый API client создан

[ ] API client использует credentials: include

[ ] API client умеет отправлять JSON

[ ] API client умеет читать JSON

[ ] API client корректно обрабатывает 204

[ ] ApiError реализован

[ ] NestJS validation errors обрабатываются

[ ] non-JSON error не ломает API client

[ ] network error обрабатывается

[ ] AbortSignal поддерживается

[ ] /health можно вызвать через API client

[ ] Redux не добавлен

[ ] Axios не добавлен без необходимости

[ ] Auth UI не реализован

[ ] Auth state не реализован

[ ] ProtectedRoute не реализован

[ ] Recipes API integration не реализована

[ ] Add Recipe не реализован

[ ] i18n не добавлен

[ ] backend не изменён

[ ] frontend build проходит

[ ] frontend lint проходит

[ ] git diff чист от случайных файлов
```

---

# Финальный review

После завершения не переходи автоматически к Auth.

Составь отчёт.

## Что изменено

Перечисли файлы.

## Frontend architecture

Покажи итоговую структуру:

```text
app
pages
shared
```

и коротко объясни ответственность каждого слоя.

## App startup

Покажи:

```text
main
↓
providers
↓
router
↓
pages
```

## API layer

Объясни:

```text
component / future hook
↓
apiRequest
↓
fetch
↓
NestJS
```

## Cookies

Подтверди:

```text
credentials: include
```

и объясни, почему это необходимо для Dishly HttpOnly JWT auth.

## Routes

Перечисли существующие placeholder routes.

## Validation

Укажи реальные результаты:

```text
build
lint
tests, если существуют
manual navigation
/health request
```

## MUST FIX

Проблемы, блокирующие Auth frontend.

## SHOULD IMPROVE

Неблокирующие улучшения.

## OPTIONAL

То, что можно сделать позже.

## VERDICT

Однозначно:

```text
Этап 8 готов к переходу на Этап 9 — Frontend Authentication.
```

или:

```text
Этап 8 пока не готов.
```

с причиной.

Обнови:

```text
apps/codex/AGENT_PROGRESS.md
```

Зафиксируй:

- новую frontend структуру;
- API client;
- env handling;
- QueryClient;
- router;
- выполненные проверки;
- что backend не менялся;
- следующий этап.

Не создавай Git commit без моего разрешения.

---

# Следующий этап

После моего разрешения:

**Этап 9 — Frontend Authentication**

Там будут реализованы:

```text
Register
Login
Current User
Logout
Protected Routes
Auth loading state
```

на базе уже подготовленного API layer и TanStack Query.

Но сейчас ничего из этого не реализовывать.

---

# Начало работы

Начни только со:

**Step 1 — аудит текущего frontend.**

Пока ничего не меняй.

Покажи:

1. текущую структуру frontend;
2. что осталось от Vite demo;
3. как сейчас настроен React Router;
4. как сейчас настроен TanStack Query;
5. как используется `VITE_API_URL`;
6. есть ли frontend test infrastructure;
7. какие файлы предлагаешь создать/переместить/удалить;
8. какие dependencies реально нужны;
9. видишь ли ты архитектурные проблемы.

После этого остановись и дождись моего ответа.
