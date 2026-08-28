# Dishly — Project Instructions for AI Coding Agents

## 1. Project Overview

**Dishly** is a full-stack web application for importing, organizing, and viewing cooking recipes.

The core product flow is:

1. A user finds a recipe on an external website.
2. The user copies the recipe URL.
3. The user pastes the URL into Dishly.
4. Dishly creates an import task.
5. The task is placed into a background queue.
6. A worker downloads and analyzes the external page.
7. Recipe data is extracted and normalized into Dishly's internal data model.
8. The normalized recipe is saved to PostgreSQL.
9. The user sees the recipe in their personal recipe collection.

The project is being developed as an internship project, but engineering decisions should be made as if the product were intended for a serious commercial customer and long-term maintenance.

This means:

- code must be understandable;
- architecture must have clear responsibilities;
- important business logic must be testable;
- security concerns must not be ignored;
- database design must be intentional;
- unnecessary enterprise complexity must be avoided.

The goal is **professional simplicity**, not maximal abstraction.

---

# 2. Product Goals

The MVP must support:

- user registration;
- user authentication;
- personal user profile;
- personal recipe collection;
- recipe import by URL;
- asynchronous recipe processing;
- recipe processing statuses;
- recipe ingredients;
- recipe preparation steps;
- English and Russian UI localization;
- recipe import failures and retries;
- background processing through a queue.

The application should eventually be extensible to:

- additional recipe websites;
- AI-assisted parsing;
- shopping lists;
- ingredient normalization;
- tags and categories;
- search and filtering;
- recipe editing;
- favorites.

These future features must NOT influence the MVP architecture unless there is a clear current requirement.

---

# 3. Initial Supported Recipe Source

The first supported recipe website is:

```text
bbcgoodfood.com
```

The initial parser must be developed and tested against a small known set of Good Food recipes.

Do not attempt to support arbitrary websites during the MVP.

The system must explicitly reject unsupported domains.

---

# 4. Recipe Import Architecture

The intended import flow is:

```text
Client
  ↓
POST recipe URL
  ↓
NestJS API
  ↓
Create Recipe with PENDING status
  ↓
Add import job to BullMQ
  ↓
Redis
  ↓
Recipe import worker
  ↓
Set Recipe to PROCESSING
  ↓
Fetch external HTML
  ↓
Extract structured recipe data
  ↓
Normalize into ParsedRecipe
  ↓
Save Recipe + Ingredients + Steps
  ↓
Set Recipe to COMPLETED
```

If processing ultimately fails:

```text
PROCESSING
    ↓
FAILED
```

The recipe record should remain in the database so that:

- the user can see that the import failed;
- debugging information can be preserved;
- retry functionality can be implemented.

---

# 5. Queue Architecture

Use:

- BullMQ;
- Redis;
- NestJS BullMQ integration.

Queue:

```text
recipe-import
```

Job name:

```text
import-recipe
```

Job data should be minimal:

```ts
interface ImportRecipeJobData {
  recipeId: number;
}
```

Do not put the full Recipe object into Redis.

Do not duplicate mutable PostgreSQL data in the queue job unless there is a strong reason.

PostgreSQL is the source of truth.

The worker should load the current Recipe using `recipeId`.

Business recipe status belongs in PostgreSQL:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

BullMQ job states are infrastructure states and must not become the frontend business model.

The frontend must never communicate directly with Redis or BullMQ.

---

# 6. Recipe Parsing Strategy

Recipe parsing must use a layered strategy.

Preferred order:

```text
1. Structured data / JSON-LD
2. Site-specific HTML parser
3. AI fallback — future feature
```

AI must NOT be the primary parser for the MVP.

Many recipe websites expose Schema.org Recipe data through:

```html
<script type="application/ld+json">
```

The parser should first attempt to find a Schema.org:

```text
@type = Recipe
```

JSON-LD structures may contain the Recipe:

- directly;
- inside an array;
- inside `@graph`;
- nested inside other structures.

Do not assume that:

```ts
json["@type"] === "Recipe";
```

is sufficient.

---

# 7. Parser Responsibilities

Keep responsibilities separated.

Conceptual pipeline:

```text
URL
 ↓
URL validation
 ↓
HTML fetcher
 ↓
JSON-LD extractor
 ↓
Schema Recipe parser
 ↓
Normalizer
 ↓
ParsedRecipe
```

### URL validation

The backend must not blindly request arbitrary URLs.

During the MVP, only explicitly supported recipe domains should be accepted.

This is also important for SSRF protection.

Do not allow arbitrary requests to addresses such as:

```text
localhost
127.0.0.1
private network addresses
internal services
```

### HTML fetcher

Responsibility:

```text
URL → HTML
```

The HTML fetcher must not contain recipe-specific parsing logic.

### JSON-LD extractor

Responsibility:

```text
HTML → parsed JSON-LD objects
```

### Recipe parser

Responsibility:

```text
Schema.org Recipe data → recipe source data
```

### Normalizer

Responsibility:

```text
external recipe format → Dishly ParsedRecipe
```

---

# 8. Internal Parsed Recipe Contract

All parsers must ultimately produce the same internal format.

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

`ParsedRecipe` is a parser domain object.

It must NOT contain persistence-specific fields such as:

```text
id
userId
recipeId
createdAt
updatedAt
database status
```

The parser must not know how PostgreSQL entities are stored.

---

# 9. Ingredient Parsing Rules

Always preserve the original ingredient string.

Example:

```text
2 tbsp olive oil
```

may become:

```ts
{
  rawText: '2 tbsp olive oil',
  name: 'olive oil',
  quantity: 2,
  unit: 'tbsp',
}
```

For ambiguous values:

```text
salt to taste
```

prefer:

```ts
{
  rawText: 'salt to taste',
  name: 'salt',
  quantity: null,
  unit: null,
}
```

Do not invent data.

Rule:

```text
uncertain structured value → null
```

not:

```text
uncertain structured value → guessed value
```

Complex ingredient normalization is not an MVP requirement.

Examples that do NOT need perfect handling initially:

```text
½ - 1 tsp chilli flakes
a handful of parsley
200-250g chicken
```

`rawText` exists so that original information is never lost.

---

# 10. Recipe Step Rules

Recipe steps support:

```ts
text: string;
group: string | null;
durationMinutes: number | null;
imageUrl: string | null;
```

Example groups:

```text
For the chicken
For the sauce
For the filling
```

If no group exists:

```ts
group = null;
```

The frontend must then render steps without group separation.

Do not force artificial groups.

Step duration and image are nullable because source websites may not provide them.

---

# 11. Database Model

The MVP contains these main entities:

```text
User
Recipe
RecipeIngredient
RecipeStep
```

Relationship structure:

```text
User
 └── 1:N Recipe
       ├── 1:N RecipeIngredient
       └── 1:N RecipeStep
```

---

# 12. Recipe Entity

Conceptual fields:

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

user

createdAt
updatedAt
```

Most parsed fields are nullable because the Recipe record is created before parsing starts.

Example initial record:

```text
sourceUrl = provided URL
status = PENDING

title = null
description = null
...
```

After successful processing:

```text
status = COMPLETED
```

---

# 13. Recipe Status

Use a clear enum:

```ts
enum RecipeStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}
```

Expected lifecycle:

```text
PENDING
   ↓
PROCESSING
   ↓
COMPLETED
```

or:

```text
PENDING
   ↓
PROCESSING
   ↓
FAILED
```

---

# 14. RecipeIngredient Entity

Conceptual fields:

```text
id

rawText
name
quantity
unit

position

recipe
```

`position` must explicitly preserve ingredient order.

Do not depend on database primary key order.

Useful constraint:

```text
UNIQUE(recipe_id, position)
```

---

# 15. RecipeStep Entity

Conceptual fields:

```text
id

text
group
durationMinutes
imageUrl

position

recipe
```

Use:

```text
UNIQUE(recipe_id, position)
```

Do not rely on IDs for step order.

---

# 16. Database Deletion Rules

Recipe children must not become orphan records.

Use database-level foreign key behavior intentionally.

Expected behavior:

```text
delete Recipe
↓
delete RecipeIngredient rows
delete RecipeStep rows
```

Use:

```text
ON DELETE CASCADE
```

where appropriate.

If a User is deleted, their personal Recipes should also be removed unless product requirements later change.

Understand the difference between:

```text
TypeORM cascade
```

and:

```text
database ON DELETE CASCADE
```

Do not enable ORM cascades everywhere just to reduce code.

---

# 17. Technology Stack

## Monorepo

Dishly is a monorepo.

Preferred high-level structure:

```text
dishly/
├── apps/
│   ├── frontend/
│   └── backend/
├── AGENTS.md
├── README.md
├── docker-compose.yml
└── ...
```

Do not introduce Nx, Turborepo, or another monorepo framework unless there is a concrete need.

A repository containing multiple applications is already a monorepo.

Avoid infrastructure that does not solve an actual current problem.

---

# 18. Frontend Stack

Use:

- React;
- TypeScript;
- Vite;
- React Router;
- TanStack Query;
- i18next / react-i18next.

Do not add Redux Toolkit by default.

Redux Toolkit should only be introduced when the application gains substantial shared client-side state that cannot be handled cleanly using local state/context.

Server state belongs in TanStack Query.

Avoid:

```text
useEffect + fetch
```

for normal API server-state fetching when TanStack Query is appropriate.

---

# 19. Backend Stack

Use:

- NestJS;
- TypeScript;
- PostgreSQL;
- TypeORM;
- BullMQ;
- Redis.

NestJS responsibilities should remain clear.

Typical direction:

```text
Controller
   ↓
Service
   ↓
Repository / persistence
```

Controllers must not contain business logic.

DTO is not Entity.

Entity describes database persistence.

DTO describes external input/output contracts where appropriate.

Services contain business rules and orchestration.

Repositories/persistence layer handle database access.

Processors handle queue job execution and orchestration.

Parsers handle recipe extraction.

---

# 20. PostgreSQL and TypeORM Rules

Do not allow TypeORM to hide database understanding.

When adding:

- relations;
- indexes;
- unique constraints;
- nullable columns;
- cascade deletion;

understand the corresponding relational database behavior.

Prefer migrations for controlled schema evolution.

Do not rely on:

```ts
synchronize: true;
```

as a production database strategy.

Avoid unnecessary `eager` relationships.

Avoid loading large object graphs when a query only needs several fields.

Consider indexes based on real query patterns, not speculative optimization.

---

# 21. Authentication

The MVP requires:

- registration;
- login;
- logout;
- current authenticated user;
- protected backend routes;
- protected frontend pages.

Authentication should use JWT unless requirements change.

Never store plain-text passwords.

Passwords must be securely hashed before persistence.

Authorization matters separately from authentication.

A logged-in user must not be able to access another user's Recipe by manually changing an ID.

Every user-owned Recipe operation must enforce ownership.

---

# 22. API Principles

Prefer REST-style endpoints.

Examples:

```text
POST /auth/register
POST /auth/login
GET  /auth/me

GET    /recipes
GET    /recipes/:id
POST   /recipes/import
DELETE /recipes/:id

POST /recipes/:id/retry
```

Exact endpoints may evolve.

Use DTO validation for external input.

Do not expose database Entities directly merely because it is convenient.

Error responses should be understandable and intentional.

---

# 23. Frontend Recipe Flow

Primary user experience:

```text
Recipes page
↓
Add Recipe
↓
modal
↓
paste URL
↓
Import
↓
PENDING
↓
PROCESSING
↓
COMPLETED
```

For MVP, realtime recipe-status updates may use TanStack Query polling.

Do not introduce WebSockets unless there is a demonstrated need.

When no recipes are being processed, polling should stop.

Failed recipes should show an understandable error state and later support Retry.

---

# 24. Recipes Page

The main recipe page should include:

```text
All
Processing
```

`Processing` represents Recipes in:

```text
PENDING
PROCESSING
```

The UI must handle:

- loading;
- empty state;
- processing state;
- completed recipe;
- failed import;
- network errors.

---

# 25. Recipe Details

Recipe details should support:

- title;
- description;
- main image;
- servings;
- preparation time;
- cooking time;
- ingredients;
- preparation steps;
- grouped steps;
- optional step image;
- optional step duration.

Do not build features that are not required by the MVP.

---

# 26. Profile

Initial profile functionality should remain simple.

Expected data:

```text
name
email
language
```

Do not overbuild profile management.

---

# 27. Internationalization

Use:

```text
i18next
react-i18next
```

Initial UI languages:

```text
English
Russian
```

Translate the application interface.

Do NOT automatically translate imported recipe content in the MVP.

These are separate concerns:

```text
UI localization
```

and:

```text
recipe content translation
```

Do not mix them.

---

# 28. Frontend Design Direction

The UI should remain intentionally simple.

Do not spend excessive engineering time on visual complexity.

The design will be based on an existing previous project and adapted slightly toward a cooking/recipe theme.

General direction:

- clean;
- light;
- modern;
- food photography should provide most visual interest;
- simple recipe cards;
- simple forms;
- simple modal;
- warm kitchen-related accents;
- minimal decorative complexity.

Avoid unnecessary:

- elaborate animations;
- complex page transitions;
- custom icon systems;
- dark mode during MVP;
- complicated landing pages;
- excessive visual variants.

Prioritize usability and the recipe-import flow.

---

# 29. State Management Rules

### Server state

Use TanStack Query for:

- recipes;
- current user fetched from API;
- mutations;
- loading states;
- request errors;
- caching;
- invalidation;
- polling.

### Local UI state

Use React local state when appropriate.

Examples:

```text
modal open/closed
temporary form state
selected local UI option
```

### Redux Toolkit

Do not introduce Redux unless a real cross-application client-state requirement appears.

Do not store API/server data in Redux simply because Redux exists.

---

# 30. Error Handling

Do not silently swallow errors.

Queue processing errors must correctly propagate to BullMQ.

Do not catch a processing error, mark a Recipe as FAILED, and then allow the BullMQ job to look successful.

Infrastructure state and business state should remain consistent.

User-facing error messages should not expose unnecessary internal details.

Internal logging may contain more technical information.

---

# 31. Retry Strategy

BullMQ may eventually use:

```text
attempts
backoff
```

Do not mark a Recipe permanently FAILED while BullMQ still intends to retry the job.

Only the final exhausted failure should become the final FAILED business state.

A manual retry endpoint can later enqueue the Recipe again.

---

# 32. Security Requirements

Always consider:

- password hashing;
- authentication;
- authorization;
- ownership checks;
- DTO validation;
- SQL safety;
- SSRF protection;
- CORS;
- environment variables;
- secrets;
- external URL validation.

Never commit real secrets.

Never place secrets directly into source code.

Provide `.env.example` with placeholder values where appropriate.

---

# 33. Testing Strategy

Testing should focus on behavior that can realistically break.

High-value backend targets:

- authentication;
- ownership checks;
- recipe service logic;
- URL validation;
- JSON-LD extraction;
- Schema Recipe discovery;
- normalization;
- recipe import worker;
- failed imports;
- retry behavior.

Parser tests should preferably use saved HTML/JSON fixtures.

Do not make the core parser test suite depend on a live external website.

External sites change and network availability is unreliable.

High-value frontend targets:

- authentication flow;
- recipes query;
- Add Recipe flow;
- processing states;
- failure states;
- recipe details.

Do not write tests solely to maximize test count.

---

# 34. Code Quality Rules

Prefer:

```text
clear code
```

over:

```text
clever code
```

Avoid:

- premature abstraction;
- unnecessary generic factories;
- excessive inheritance;
- huge utility modules;
- giant services;
- giant React components;
- duplicated business rules;
- unexplained magic values;
- speculative architecture.

Names should express intent.

Functions should have focused responsibilities.

Do not create interfaces simply because every class might theoretically need one.

Do not create abstraction layers until there are actual multiple implementations or a meaningful architectural boundary.

---

# 35. Dependency Rules

Before installing a dependency, determine:

1. what specific problem it solves;
2. whether the platform/framework already solves that problem;
3. whether the dependency is maintained;
4. whether the added complexity is justified.

Do not install packages merely because they are common in other projects.

Prefer standard platform capabilities for simple problems.

---

# 36. Development Approach

Work incrementally.

For substantial changes:

1. inspect the existing code first;
2. understand the relevant architecture;
3. propose the smallest reasonable implementation;
4. implement only the requested scope;
5. run relevant validation;
6. report what changed.

Do not rewrite unrelated code.

Do not opportunistically refactor unrelated modules during feature work unless necessary to make the requested feature correct.

---

# 37. Working With the Developer

The developer is implementing this project as part of a full-stack internship.

Do not merely produce working code.

When requested to explain or mentor:

- explain what needs to be done;
- explain why;
- identify the file to modify;
- provide a small next step;
- avoid dumping an entire large implementation unless explicitly requested.

The developer should understand the implementation rather than blindly paste generated code.

When reviewing developer-written code, be strict.

Explicitly separate:

```text
MUST FIX
SHOULD IMPROVE
OPTIONAL
```

Identify:

- bugs;
- architecture problems;
- security problems;
- unnecessary complexity;
- duplicated logic;
- incorrect framework usage.

Do not praise code automatically.

---

# 38. Scope Discipline

The MVP is the priority.

Order of priorities:

```text
1. Working required behavior
2. Correct architecture
3. Clean code
4. Tests for important behavior
5. Improvements
6. Optional features
```

Do not allow optional ideas to block completion of required functionality.

---

# 39. Features Explicitly Outside the Initial MVP

Do not implement unless explicitly requested:

- arbitrary recipe websites;
- Instagram import;
- TikTok import;
- YouTube import;
- AI-based primary recipe parsing;
- automatic recipe translation;
- shopping lists;
- advanced ingredient unit conversion;
- nutritional calculations;
- ratings;
- comments;
- social features;
- complex recommendations;
- complex search infrastructure;
- WebSockets;
- microservices;
- Kubernetes;
- message brokers other than the selected queue;
- GraphQL;
- Nx/Turborepo unless later justified;
- dark mode;
- elaborate animation systems.

---

# 40. Planned Development Phases

The intended project sequence is:

```text
01. Project bootstrap
02. Database schema and entities
03. Backend authentication
04. Recipes backend
05. BullMQ recipe queue
06. Good Food recipe parser
07. Full recipe import pipeline
08. Frontend architecture
09. Frontend authentication
10. Recipes list
11. Add Recipe modal + processing UI
12. Recipe details
13. Profile + i18n
14. MVP review and tests
```

Do not implement later phases while working on an earlier phase unless an explicit dependency requires it.

---

# 41. Git Rules

Use feature branches for meaningful development tasks.

Prefer branch names such as:

```text
feature/project-setup
feature/database-schema
feature/auth
feature/recipes-api
feature/recipe-queue
feature/recipe-parser
```

Before considering work complete, inspect:

```bash
git status
git diff
```

Run applicable:

```bash
npm test
npm run build
npm run lint
```

depending on what exists in the project.

Do not create commits unless explicitly requested by the developer.

When asked for a commit message, use concise conventional-style messages where reasonable, for example:

```text
feat: add recipe import queue
feat: implement Good Food recipe parser
fix: prevent access to recipes owned by other users
chore: configure PostgreSQL and Redis
```

Do not use meaningless messages such as:

```text
fix
changes
update
final
```

---

# 42. Validation Before Finishing a Task

When code has been modified, make a reasonable attempt to validate it.

Depending on scope, check:

```text
TypeScript compilation
lint
unit tests
integration tests
production build
database migration
Docker services
```

Do not claim something works if it was not tested.

If validation cannot be performed, state exactly what was not verified.

---

# 43. AI Agent Response Style

When working interactively with the developer:

- be concise;
- be technical;
- do not give long lectures unless requested;
- prefer concrete next actions;
- explain architectural choices briefly;
- flag unnecessary complexity immediately.

For implementation tasks, normally report:

```text
What changed
Why
Files affected
How it was validated
Any remaining issue
```

For code review, report:

```text
Must fix
Should improve
Optional
Verdict
```

---

# 44. Current Project Principle

When uncertain between:

```text
a more sophisticated architecture
```

and:

```text
a simpler architecture that cleanly satisfies current requirements
```

choose the simpler solution unless there is a concrete technical reason not to.

Dishly should look like a professionally engineered product, not an architecture demonstration.
