# Dishly — Этап 6: Good Food Recipe Parser

Мы продолжаем разработку fullstack-приложения **Dishly**.

Сейчас выполняем только **Этап 6 — разработка парсера рецептов Good Food**.

Это отдельный этап. Мы должны получить рабочий механизм, который принимает URL рецепта, скачивает HTML, извлекает структурированные данные и возвращает объект `ParsedRecipe`.

НЕ подключаем парсер к очереди и не сохраняем рецепты в PostgreSQL. Это задача этапа 7.

---

# 1. Обязательная подготовка

Перед изменением кода:

1. Прочитай корневой `AGENTS.md`.
2. Прочитай `apps/codex/AGENT_PROGRESS.md`.
3. Изучи текущий backend.
4. Изучи Recipe Entity и существующие relations.
5. Изучи очередь и текущий RecipeImportProcessor.
6. Изучи package.json и TypeScript configuration.
7. Выполни `git status`.

Особенно изучи:

```text
apps/backend/package.json

apps/backend/src/app.module.ts

apps/backend/src/recipes/
├── recipes.module.ts
├── recipes.service.ts
├── entities/
├── queue/
└── types/

apps/backend/src/config/

apps/codex/AGENT_PROGRESS.md
```

В `AGENT_PROGRESS.md` могут быть устаревшие сведения о текущей Git-ветке.

Фактическое состояние Git проверяй отдельно.

Сначала выполни аудит и покажи результат. Не изменяй файлы до согласования первого блока.

---

# 2. Текущее состояние проекта

Завершены:

- Этап 1 — Bootstrap.
- Этап 2 — Database Schema.
- Этап 3 — Backend Authentication.
- Этап 4 — Recipes API.
- Этап 5 — BullMQ + Redis.

Сейчас существуют:

```text
User
Recipe
RecipeIngredient
RecipeStep

RecipesService
RecipesController

RecipeImportQueue
RecipeImportProcessor
```

Очередь уже поддерживает:

```ts
{
  recipeId: number;
}
```

Но processor пока выполняет только проверку данных и логирование.

Не изменяй его на этом этапе.

---

# 3. Главная цель

Реализовать:

```ts
parse(url: string): Promise<ParsedRecipe>
```

Основной процесс:

```text
Good Food URL
      ↓
URL validation
      ↓
HTML fetcher
      ↓
JSON-LD extractor
      ↓
Schema.org Recipe
      ↓
Normalizer
      ↓
ParsedRecipe
```

Пример:

```ts
const recipe = await parser.parse(
  "https://www.bbcgoodfood.com/recipes/marry-me-chicken",
);
```

Результат должен соответствовать единому внутреннему контракту Dishly.

Парсер ничего не должен знать о конкретном пользователе, JWT, BullMQ или PostgreSQL.

---

# 4. Поддерживаемый источник

В MVP поддерживаем только:

```text
https://www.bbcgoodfood.com
https://bbcgoodfood.com
```

Основной тестовый рецепт:

```text
https://www.bbcgoodfood.com/recipes/marry-me-chicken
```

Дополнительные рецепты можно использовать для проверки разных структур данных, но не превращать этот этап в поддержку десятков источников.

Перед реализацией проверь реальную доступность страницы из локального backend-окружения.

Не считай, что успешное открытие страницы в браузере автоматически означает, что Node.js получит тот же HTML.

Если сайт возвращает CAPTCHA, 403 или ограничивает автоматические запросы, не пытайся обходить защиту.

В таком случае продолжай реализацию на сохранённых тестовых fixtures и явно сообщи, что live integration не проверена.

Не подменяй ожидаемую страницу другим сайтом без согласования.

---

# 5. Архитектура

Предпочтительная структура:

```text
src/recipes/
│
├── parser/
│   ├── types/
│   │   └── parsed-recipe.ts
│   │
│   ├── url-validator.ts
│   ├── html-fetcher.ts
│   ├── json-ld.extractor.ts
│   ├── schema-recipe.parser.ts
│   ├── recipe.normalizer.ts
│   └── recipe-parser.service.ts
│
├── queue/
├── entities/
├── recipes.module.ts
└── ...
```

Это ориентир, не обязательное количество файлов.

Не создавай отдельный класс для каждого простого преобразования.

Если функцию удобно разместить в существующем файле без нарушения ответственности — так и сделай.

Не добавляй:

```text
BaseParser
AbstractParserFactory
ParserRegistry
ParserPluginManager
```

Сейчас у нас один источник.

При появлении второго источника архитектуру можно расширить.

---

# 6. Порядок работы

Работай логическими блоками.

Перед каждым блоком показывай:

**Что делаем:** кратко.

**Почему:** техническая причина.

**Какие файлы изменятся:** конкретные пути.

**Что проверяем:** конкретная команда или тест.

После согласования реализуй законченный логический блок и проверь результат.

Если требуется новая библиотека:

1. Проверь, нет ли её уже в package.json.
2. Объясни, какую проблему она решает.
3. Покажи команду установки.
4. Дождись моего подтверждения установки.

Не устанавливай зависимости молча.

Не создавай Git commit без моего разрешения.

После каждого крупного блока обновляй `apps/codex/AGENT_PROGRESS.md`.

---

# Step 1 — аудит и выбор библиотек

Сначала ничего не меняй.

Определи:

- Какая версия Node.js требуется проекту?
- Доступен ли встроенный `fetch`?
- Чем сейчас обрабатываются HTTP-запросы?
- Есть ли Cheerio?
- Как устроен NestJS dependency injection?
- Нужно ли создавать отдельный ParserModule?

Предварительное предпочтение:

```text
HTML fetching → Node.js fetch

HTML parsing → Cheerio

JSON-LD parsing → JSON.parse

Validation → небольшие TypeScript type guards
```

Не устанавливай Axios, Puppeteer, Playwright, jsdom или AI SDK без доказанной необходимости.

Cheerio можно установить, если без него придётся писать собственный HTML parser.

Ожидаемая команда:

```bash
npm install cheerio
```

Выполнять из `apps/backend` после проверки совместимости.

Заверши аудит предложением конкретной структуры файлов и остановись.

---

# Step 2 — контракт ParsedRecipe

Создай:

```text
src/recipes/parser/types/parsed-recipe.ts
```

Нужны три интерфейса.

```ts
export interface ParsedIngredient {
  rawText: string;
  name: string | null;
  quantity: number | null;
  unit: string | null;
}

export interface ParsedRecipeStep {
  text: string;
  group: string | null;
  durationMinutes: number | null;
  imageUrl: string | null;
}

export interface ParsedRecipe {
  title: string;
  description: string | null;

  imageUrl: string | null;

  servings: number | null;

  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;

  ingredients: ParsedIngredient[];
  steps: ParsedRecipeStep[];
}
```

Это внутренний результат парсера.

НЕ добавлять:

```text
id
recipeId
userId
status
sourceUrl
errorMessage
createdAt
updatedAt
position
```

`position` назначит persistence layer на этапе 7.

Не менять существующие Entity ради ParsedRecipe.

После создания проверь TypeScript compilation.

---

# Step 3 — URL validation

Реализуй отдельную функцию или небольшой сервис для проверки URL.

Разрешены только два точных hostname:

```text
bbcgoodfood.com
www.bbcgoodfood.com
```

Проверка должна выполняться через стандартный `URL`.

Нельзя использовать:

```ts
url.includes("bbcgoodfood.com");
```

Это небезопасно.

Разрешать только HTTPS.

Запретить:

- HTTP;
- file://;
- ftp://;
- localhost;
- IP addresses;
- произвольные порты;
- username/password внутри URL;
- похожие домены;
- поддомены, которых нет в allowlist.

Пример:

```text
https://www.bbcgoodfood.com/recipes/example
→ accepted
```

```text
https://bbcgoodfood.com.evil.example/recipes/example
→ rejected
```

```text
http://localhost:3000
→ rejected
```

```text
https://example.com
→ rejected
```

Для MVP можно ограничить допустимые страницы путём `/recipes/...`, если это подтверждается форматом выбранного источника.

Не добавляй generic URL validation framework.

---

# Step 4 — SSRF protection

Мы скачиваем страницу по внешнему URL.

Это потенциальная SSRF-уязвимость.

Проверки только исходного URL недостаточно, если HTTP-клиент следует redirects.

Нужно:

1. Использовать точный hostname allowlist.
2. Запретить произвольные протоколы.
3. Запретить произвольные порты.
4. Отключить автоматическое следование redirects.
5. Не переходить на неизвестные адреса.

Для MVP предпочтительно отклонять redirects.

Если Good Food использует необходимый легитимный redirect, сначала изучи его и объясни, как безопасно разрешить конкретный переход.

Не добавляй автоматическое перенаправление на любой URL из заголовка Location.

Отдельно оцени риски DNS/IP resolution и DNS rebinding для используемого HTTP-клиента. Если безопасный контроль невозможно гарантировать обычным fetch, предложи минимальное технически корректное решение и не объявляй SSRF полностью закрытым одной проверкой hostname.

Не создавай огромную security infrastructure для произвольного веб-скрейпера: наш MVP ограничен одним источником.

Добавь тесты для URL validation.

---

# Step 5 — HTML fetcher

Реализуй:

```ts
fetchHtml(url: string): Promise<string>
```

Его задача только:

```text
URL → HTML
```

Fetcher не должен знать, что такое Recipe, Ingredient или Step.

Обязательно предусмотри:

- timeout;
- HTTP status validation;
- проверку Content-Type;
- ограничение максимального размера ответа;
- корректное завершение загрузки;
- понятную обработку network errors.

Ориентиры для MVP:

```text
timeout: 10 секунд

max HTML size: 5 MB
```

Если реальные потребности сайта требуют другого значения, объясни изменение.

Не ограничивай размер только по Content-Length: этот заголовок может отсутствовать или быть недостоверным.

Контролируй фактически получаемый объём данных.

При превышении лимита прекращай чтение ответа.

Не логируй полный HTML.

Не добавляй browser automation.

---

# Step 6 — тесты HTML fetcher

HTTP-запросы в обычных unit tests должны мокаться.

Проверь:

- успешный HTML response;
- 404;
- 403;
- 500;
- timeout;
- redirect;
- неправильный Content-Type;
- response больше лимита;
- network failure.

Тесты не должны делать реальные запросы к Good Food.

Не проверяй fetcher через случайные публичные URL.

---

# Step 7 — JSON-LD extractor

Следующая задача:

```text
HTML → JSON-LD objects
```

На HTML-странице ищем:

```html
<script type="application/ld+json">
```

Используй Cheerio для поиска элементов.

Не пытайся извлекать JSON-LD регулярным выражением из полного HTML.

Не выполнять JavaScript со страницы.

Не использовать:

```ts
eval();
```

или выполнение кода из script tags.

Нужно получить JSON-содержимое подходящих script elements и обработать через JSON.parse.

Учитывай, что на странице может находиться несколько JSON-LD script tags.

Не предполагай, что Recipe обязательно находится в первом script.

---

# Step 8 — поиск Recipe в JSON-LD

Структура может выглядеть так:

```json
{
  "@type": "Recipe",
  "name": "Chicken Pasta"
}
```

Или так:

```json
[
  {
    "@type": "BreadcrumbList"
  },
  {
    "@type": "Recipe"
  }
]
```

Или так:

```json
{
  "@graph": [
    {
      "@type": "WebPage"
    },
    {
      "@type": "Recipe"
    }
  ]
}
```

Также:

```json
{
  "@type": ["Recipe", "CreativeWork"]
}
```

Extractor должен находить Recipe в таких структурах.

Не считай достаточной проверку:

```ts
data["@type"] === "Recipe";
```

При этом не делай универсальный JSON graph engine.

Поддержи реальные и разумные варианты Schema.org.

Если на странице несколько Recipe, не выбирай произвольный без анализа.

Для MVP можно использовать явно определённое правило выбора главного Recipe. Если выбрать однозначно невозможно — возвращай понятную ошибку.

---

# Step 9 — обработка повреждённого JSON-LD

Один некорректный script не должен автоматически ломать поиск в остальных script tags.

Например:

```text
Script 1 → malformed JSON

Script 2 → valid Recipe
```

Нужно найти Recipe во втором script.

Если ни один script не содержит подходящий Recipe, вернуть контролируемую ошибку.

Не возвращать:

```ts
{} as ParsedRecipe
```

Не выдумывать Recipe из случайных данных страницы.

Не подавлять ошибки полностью: различай отсутствие структурированных данных и некорректную структуру там, где это практически полезно.

---

# Step 10 — Schema Recipe parser

Получаем найденный Schema.org Recipe object.

Нужно извлечь:

| Schema.org         | Dishly          |
| ------------------ | --------------- |
| name               | title           |
| description        | description     |
| image              | imageUrl        |
| recipeYield        | servings        |
| prepTime           | prepTimeMinutes |
| cookTime           | cookTimeMinutes |
| recipeIngredient   | ingredients     |
| recipeInstructions | steps           |

Не добавлять сейчас:

```text
nutrition
ratings
author
video
categories
tags
keywords
```

Не сохранять весь исходный Schema.org object в БД.

---

# Step 11 — нормализация простых полей

## title

Обязательная непустая строка.

Если title отсутствует, Recipe не должен считаться успешно распарсенным.

## description

Строка либо null.

Нормализовать лишние пробелы.

Не уничтожать смысловое содержимое.

## imageUrl

Поддержать типичные варианты:

```text
string
array of strings
ImageObject.url
```

Вернуть один валидный URL либо null.

Если URL относительный, можно разрешить его относительно URL исходной страницы.

Не загружать изображение.

Не сохранять его на диск.

Не создавать image storage.

---

# Step 12 — время приготовления

Schema.org может возвращать:

```text
PT20M
PT45M
PT1H30M
```

Нужно получить:

```ts
20;
45;
90;
```

Поддержать корректные ISO 8601 duration values, необходимые для рецептов, включая часы и минуты.

Не писать огромную собственную ISO 8601 library.

Если значение невозможно корректно преобразовать, вернуть null.

Не использовать:

```ts
parseInt("PT45M");
```

Не угадывать значения.

`totalTimeMinutes` в текущем ParsedRecipe не существует.

Не добавлять его самостоятельно.

---

# Step 13 — servings

Примеры:

```text
"4"
4
"4 servings"
"Serves 4"
```

Результат:

```ts
servings: 4;
```

Если:

```text
"4-6 servings"
```

не выбирай случайное число.

Для MVP допускается:

```ts
servings: null;
```

Если значение означает количество порций неочевидным образом, также возвращай null.

Не добавлять новые database fields.

---

# Step 14 — ингредиенты

Источник может содержать:

```json
{
  "recipeIngredient": [
    "30g plain flour",
    "4 chicken breasts",
    "½ - 1 tsp chilli flakes",
    "salt to taste"
  ]
}
```

Любой ингредиент должен сохранять исходную строку:

```ts
rawText: string;
```

Для простых случаев можно извлекать:

```text
150ml double cream
```

в:

```ts
{
  rawText: '150ml double cream',
  name: 'double cream',
  quantity: 150,
  unit: 'ml'
}
```

И:

```text
2 tbsp olive oil
```

в:

```ts
{
  rawText: '2 tbsp olive oil',
  name: 'olive oil',
  quantity: 2,
  unit: 'tbsp'
}
```

Если не уверен — возвращай null в структурированных полях.

Не придумывай количество или единицы.

---

# Step 15 — сложные ингредиенты

Обязательно сохрани rawText для:

```text
½ - 1 tsp chilli flakes
200-250g chicken
a handful of parsley
salt to taste
```

Не реализовывать сейчас:

```text
quantityMin
quantityMax
unit conversion
normalized ingredient dictionary
shopping list merging
```

Не использовать AI.

Цель MVP — не потерять исходную информацию.

При этом обрабатывай простые распространённые дроби, если решение не усложняет parser чрезмерно.

Не считай неизвестную структуру ошибкой всего рецепта, если rawText сохранён.

---

# Step 16 — recipeInstructions

Поддержать:

```text
HowToStep
HowToSection
Text
```

Основной формат:

```json
{
  "@type": "HowToStep",
  "text": "Heat the oil."
}
```

Результат:

```ts
{
  text: 'Heat the oil.',
  group: null,
  durationMinutes: null,
  imageUrl: null
}
```

Шаги должны сохранять исходный порядок.

Не создавать database IDs и positions.

---

# Step 17 — группы шагов

Поддержать:

```json
{
  "@type": "HowToSection",
  "name": "For the sauce",
  "itemListElement": [
    {
      "@type": "HowToStep",
      "text": "Add the cream."
    }
  ]
}
```

Результат:

```ts
{
  text: 'Add the cream.',
  group: 'For the sauce',
  durationMinutes: null,
  imageUrl: null
}
```

Если группы нет:

```ts
group: null;
```

Не создавать искусственные названия.

Если source использует вложенные sections, сохрани порядок шагов и выбери простое понятное правило для group.

Не добавляй отдельную Entity RecipeStepGroup.

Не сортируй шаги по названию группы.

Сохраняй порядок source.

---

# Step 18 — durationMinutes и imageUrl шагов

Если у конкретного шага есть структурированная продолжительность, можно заполнить:

```ts
durationMinutes;
```

Если источником предоставлено изображение шага:

```ts
imageUrl;
```

Нормализуй его аналогично главной картинке рецепта.

Если поля отсутствуют:

```ts
durationMinutes: null;
imageUrl: null;
```

Пока НЕ извлекать продолжительность из текста:

```text
Fry for 8-10 minutes
```

Это отдельная логика, которая сейчас не обязательна.

Не использовать LLM для заполнения пропущенных полей.

---

# Step 19 — HTML внутри текстовых полей

Внешние данные нельзя считать доверенными.

Если title, description или step text содержат HTML:

- не выполнять скрипты;
- не сохранять исполняемую разметку как текст для будущего dangerouslySetInnerHTML;
- извлечь безопасное текстовое содержимое;
- сохранить смысловой текст и необходимые разделители.

Не создавать полноценный HTML sanitizer, если в ParsedRecipe используются только текстовые поля.

Не возвращать необработанный HTML для отображения на frontend.

---

# Step 20 — минимальная проверка результата

Перед успешным возвратом ParsedRecipe нужно убедиться, что результат действительно является рецептом.

Для MVP минимум:

```text
title — непустой
ingredients — непустой массив
steps — непустой массив
```

Не возвращать успех для объекта:

```ts
{
  title: '',
  ingredients: [],
  steps: []
}
```

Все остальные поля допускают null согласно контракту.

При отсутствии критически важных данных возвращай понятную ошибку.

---

# Step 21 — RecipeParserService

Создай единый entry point:

```ts
parse(url: string): Promise<ParsedRecipe>
```

Сервис оркестрирует процесс:

```text
validate URL
      ↓
fetch HTML
      ↓
extract JSON-LD
      ↓
find Recipe
      ↓
normalize
      ↓
validate result
      ↓
return ParsedRecipe
```

Не помещай весь алгоритм в один огромный метод.

Но и не создавай отдельный NestJS provider для каждой маленькой pure function.

Где нет необходимости в dependency injection — обычная TypeScript-функция допустима.

---

# Step 22 — NestJS integration

Зарегистрируй parser так, чтобы на этапе 7 его можно было внедрить в RecipeImportProcessor.

Можно использовать существующий RecipesModule или отдельный небольшой ParserModule, если это действительно улучшает структуру.

Не создавай circular dependencies.

Не импортируй в parser:

```text
RecipeImportQueue
RecipeImportProcessor
RecipesService
TypeORM Repository
```

Зависимость должна быть направлена так:

```text
Будущий Processor
        ↓
RecipeParserService
```

Не наоборот.

---

# Step 23 — Error handling

Ошибки парсера должны быть предсказуемыми.

Различай хотя бы:

```text
Unsupported URL
Failed to fetch HTML
Recipe data not found
Invalid recipe data
```

Если сайт возвращает 403 или 429, не скрывай этот факт за сообщением «Recipe not found».

Не нужно создавать 15 классов ошибок.

Достаточно минимального понятного подхода.

Не возвращай наружу весь HTML страницы или технические секреты.

На этом этапе не нужно привязывать ошибки к HTTP status codes.

Парсер не является HTTP controller.

---

# Step 24 — подготовка к будущему Retry

На этапе 7 BullMQ будет делать retries.

Поэтому важно понимать различие:

```text
Temporary failure:
- timeout
- connection error
- 503
- возможно 429
```

и:

```text
Permanent failure:
- unsupported URL
- отсутствует Recipe
- невалидные обязательные данные
```

Сделай ошибки различимыми настолько, чтобы позже worker мог принять решение о retry.

Но сейчас НЕ меняй настройки BullMQ и не реализовывай retry logic.

Не создавай свою систему очередей поверх BullMQ.

---

# Step 25 — fixtures

Добавь тестовые HTML fixtures.

Предпочтительное расположение:

```text
src/recipes/parser/__fixtures__/
```

или другая понятная директория рядом с parser tests.

Нужны:

1. HTML с валидным Recipe JSON-LD.
2. HTML с JSON-LD внутри @graph.
3. HTML с массивом JSON-LD objects.
4. HTML с HowToSection.
5. HTML без Recipe.
6. HTML с malformed JSON-LD.

Можно сохранить небольшой реальный пример Good Food, если доступ получен корректно.

Удаляй из fixture ненужные:

```text
scripts
analytics
advertising
tracking data
cookies
```

Не нужно хранить огромную страницу ради трёх полей.

Fixtures должны быть воспроизводимыми и не зависеть от интернета.

Не выдавай синтетический fixture за точную копию реального сайта.

---

# Step 26 — unit tests

Обязательно протестировать:

## URL validation

```text
supported URL
unsupported hostname
localhost
invalid protocol
invalid URL
unsafe redirect
```

## HTML fetcher

```text
success
timeout
non-HTML
HTTP error
oversized response
```

## JSON-LD extractor

```text
direct Recipe
array
@graph
multiple scripts
malformed JSON
missing Recipe
```

## Normalizer

```text
title
image
servings
ISO duration
ingredients
steps
group
nullable fields
```

## RecipeParserService

Проверить orchestration.

Использовать моки для внешнего HTTP.

Не обращаться к Good Food из обычных unit tests.

Не подключать PostgreSQL или Redis в unit tests парсера.

---

# Step 27 — реальная проверка Good Food

После успешных unit tests выполнить отдельную live-проверку.

Использовать:

```text
https://www.bbcgoodfood.com/recipes/marry-me-chicken
```

Проверить, что backend получает:

```text
title
description
servings
prepTimeMinutes
cookTimeMinutes
ingredients
steps
```

Ожидаемые ориентиры для этого рецепта:

```text
Servings: 4
Prep: 20 minutes
Cook: 45 minutes
```

Эти значения должны быть получены parser-ом, а не захардкожены.

Проверь, сколько ингредиентов и шагов реально извлечено.

Не утверждай, что live parser работает, если страницу невозможно скачать.

Если источник недоступен:

- не обходи ограничения;
- зафиксируй ошибку;
- используй fixtures;
- обозначь live integration как непроверенную.

---

# Step 28 — smoke-test парсера

Предусмотри минимальный способ локально проверить:

```text
URL
↓
RecipeParserService
↓
ParsedRecipe
```

Можно создать небольшой dev-only script.

Не создавать production HTTP endpoint:

```text
GET /parse?url=...
```

Не создавать отдельную CLI infrastructure.

Smoke-test должен запускать настоящий parser, а не возвращать заранее прописанный объект.

Если используешь Nest application context — корректно закрывай его.

Не логируй полный HTML.

Можно выводить краткое summary:

```text
Title
Servings
Ingredients count
Steps count
```

---

# Step 29 — не изменять Queue

Сейчас НЕ менять:

```text
recipe-import.queue.ts
recipe-import.processor.ts
recipe-import.contract.ts
```

Не запускать parser внутри worker.

Не менять job payload.

Не менять retries/backoff.

Существующий queue smoke-test должен продолжать работать.

На этапе 7 очередь и парсер будут соединены.

---

# Step 30 — не изменять PostgreSQL

Не менять:

```text
Recipe Entity
RecipeIngredient Entity
RecipeStep Entity
RecipeStatus
```

Не создавать migration.

Не добавлять parser-specific поля в таблицы.

Не сохранять ParsedRecipe в PostgreSQL.

На этом этапе:

```text
parse(url)
↓
ParsedRecipe
```

и всё.

---

# Step 31 — frontend scope

Frontend не трогаем.

Не создавать:

```text
Add Recipe modal
Recipe cards
Recipe details
Processing UI
```

Не устанавливать React dependencies.

Не добавлять TanStack Query hooks.

---

# Step 32 — AI scope

AI НЕ используется на этапе 6.

Не подключать:

```text
OpenAI SDK
Gemini
Ollama
Hugging Face
LangChain
```

Не добавлять API keys или model configuration.

Сначала должен работать deterministic JSON-LD parser.

AI fallback — отдельная будущая задача.

---

# Step 33 — ограничения MVP

Не реализовывать сейчас:

- произвольные сайты;
- много отдельных site parsers;
- поддержку социальных сетей;
- browser automation;
- обход CAPTCHA;
- AI extraction;
- ingredient unit conversion;
- shopping lists;
- nutrition calculations;
- automatic recipe translation;
- сохранение изображений;
- сложный parser registry.

Не добавлять abstractions только потому, что позже могут появиться другие сайты.

---

# Step 34 — финальные проверки

После реализации выполнить из:

```text
apps/backend
```

```bash
npm run build
npm run lint
npm test
```

Проверить, что существующие тесты Auth, Recipes API и Queue не сломались.

При наличии работающей инфраструктуры отдельно проверить:

```bash
npm run migration:show
```

Миграции должны оставаться без изменений.

Проверить:

```bash
git status
git diff
```

Убедиться, что не изменены:

- frontend;
- Recipe Entity;
- существующие migrations;
- BullMQ producer/processor;
- Auth.

Если что-то изменилось — объясни почему.

Не выполнять автоматически Git commit.

---

# 35. Definition of Done

Этап 6 готов только если:

- [ ] Текущий backend изучен.
- [ ] URL validation реализована.
- [ ] Поддерживается только разрешённый Good Food hostname.
- [ ] Unsafe URL отклоняется.
- [ ] Redirect policy безопасна.
- [ ] HTML fetcher реализован.
- [ ] Fetch timeout работает.
- [ ] HTTP errors обрабатываются.
- [ ] HTML size limit работает.
- [ ] JSON-LD scripts извлекаются.
- [ ] Поддерживаются object, array и @graph.
- [ ] Recipe обнаруживается корректно.
- [ ] Создан ParsedRecipe contract.
- [ ] title нормализуется.
- [ ] description нормализуется.
- [ ] imageUrl нормализуется.
- [ ] servings нормализуется.
- [ ] prepTimeMinutes нормализуется.
- [ ] cookTimeMinutes нормализуется.
- [ ] rawText ингредиентов сохраняется.
- [ ] Простые quantity/unit извлекаются.
- [ ] Неоднозначные значения не выдумываются.
- [ ] HowToStep поддерживается.
- [ ] HowToSection поддерживается.
- [ ] group заполняется при наличии.
- [ ] group = null при отсутствии.
- [ ] durationMinutes поддерживается при наличии данных.
- [ ] imageUrl шага поддерживается.
- [ ] Порядок ингредиентов и шагов сохраняется.
- [ ] Обязательные поля проверяются.
- [ ] Ошибки парсера контролируемы.
- [ ] RecipeParserService возвращает ParsedRecipe.
- [ ] NestJS integration работает.
- [ ] Unit tests проходят.
- [ ] Fixtures созданы.
- [ ] Live-проверка выполнена либо её блокирующая причина явно зафиксирована.
- [ ] Parser smoke-test работает, если live-доступ доступен.
- [ ] Backend build проходит.
- [ ] Backend lint проходит.
- [ ] Существующие тесты проходят.
- [ ] Очередь не изменена.
- [ ] Entity не изменены.
- [ ] Миграции не изменены.
- [ ] Frontend не изменён.
- [ ] Импорт API не реализован.
- [ ] AI не добавлен.

---

# 36. Финальный review

После реализации не переходи к этапу 7.

Составь отчёт.

## Что изменено

Перечисли файлы и назначение.

## Parser architecture

Покажи итоговую цепочку:

```text
URL
 ↓
Fetcher
 ↓
Extractor
 ↓
Normalizer
 ↓
ParsedRecipe
```

## Реальный рецепт

Покажи краткий результат обработки тестовой страницы.

Например:

```text
Title
Servings
Prep time
Cook time
Ingredients count
Steps count
```

Не показывай полный рецепт, если это не требуется для проверки.

## Security

Какие URL ограничения и fetch protections реализованы.

Отдельно укажи, какие риски остались.

## Tests

Какие тесты реально выполнялись.

## MUST FIX

Блокирующие проблемы.

## SHOULD IMPROVE

Желательные изменения.

## OPTIONAL

Будущие улучшения.

## VERDICT

Напиши:

```text
Этап 6 готов к переходу на Этап 7
```

или:

```text
Этап 6 пока не готов
```

с объяснением.

Если unit tests проходят, но live-парсинг проверить невозможно, явно раздели готовность реализации и неподтверждённую интеграцию с внешним сайтом.

Не выдавай непроверенное за работающее.

Обнови:

```text
apps/codex/AGENT_PROGRESS.md
```

Зафиксируй:

- новые зависимости;
- структуру parser;
- архитектурные решения;
- ограничения;
- результаты тестов;
- результат live-проверки;
- следующий этап.

---

# 37. Следующий этап

После моего отдельного разрешения:

**Этап 7 — Full Recipe Import Pipeline.**

Там мы соединим:

```text
POST /recipes/import
        ↓
Recipe PENDING
        ↓
BullMQ
        ↓
RecipeImportProcessor
        ↓
RecipeParserService
        ↓
PostgreSQL transaction
        ↓
COMPLETED / FAILED
```

Но сейчас этого не делать.

---

# Начало работы

Начни только со Step 1 — аудит текущего backend и выбор библиотек.

Пока ничего не изменяй.

После аудита покажи:

1. Что уже готово для parser.
2. Какие зависимости нужны.
3. Как будет устроен HTML fetcher.
4. Как будем извлекать JSON-LD.
5. Как обеспечим безопасность URL.
6. Какую структуру файлов предлагаешь.
7. Какие технические риски обнаружены.

После этого остановись и дождись моего ответа.
