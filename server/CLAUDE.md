# CLAUDE.md — Backend Development Guide

## Project Overview

Monorepo (FE + BE). All backend code lives under `app/server/src/`.

---

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Fastify
- **Validation:** Zod
- **ORM:** Prisma (`@prisma/client`)
- **Database:** PostgreSQL

---

## Folder Structure

Note: Zod schemas live in `packages/types/` at the monorepo root, not inside the server.

```
app/server/src/
├── modules/
│   ├── ingredients/                 ← complex module, has domain folder
│   │   ├── domain/
│   │   │   ├── ingredients.rules.ts
│   │   │   └── ingredients.algorithms.ts
│   │   ├── tests/
│   │   │   ├── ingredients.routes.test.ts
│   │   │   ├── ingredients.service.test.ts
│   │   │   ├── ingredients.repository.test.ts
│   │   │   └── ingredients.domain.test.ts
│   │   ├── ingredients.routes.ts
│   │   ├── ingredients.service.ts
│   │   └── ingredients.repository.ts
│   ├── recipes/                     ← complex module with domain logic
│   │   ├── domain/
│   │   │   ├── recipes.rules.ts     ← pure rule functions
│   │   │   └── recipes.algorithms.ts ← complex calculations
│   │   ├── tests/
│   │   │   ├── recipes.routes.test.ts
│   │   │   ├── recipes.service.test.ts
│   │   │   ├── recipes.repository.test.ts
│   │   │   └── recipes.domain.test.ts
│   │   ├── recipes.routes.ts
│   │   ├── recipes.service.ts
│   │   └── recipes.repository.ts
│   └── ... (one folder per module)
├── routes/
│   └── api.ts                      ← registers /api/v1 prefix, imports all module routes
├── plugins/
│   ├── prisma.ts                   ← decorates fastify.prisma, needs fp
│   ├── auth.ts                     ← decorates fastify.authenticate + fastify.requirePermission, needs fp
│   └── cookie.ts                   ← @fastify/cookie, registered in auth module setup
├── utils/
│   └── errors.ts                   ← error factory helpers + isP2002 helper, import from here in all modules
├── lib/
│   └── ai/
│       ├── types.ts                ← AIClient interface + AIProvider type
│       ├── anthropic.ts            ← Anthropic implementation
│       ├── openai.ts               ← OpenAI implementation
│       └── index.ts                ← exports active client based on AI_PROVIDER constant
└── constants/
    ├── index.ts                    ← barrel export, import all constants from here
    ├── errorCodes.ts
    ├── errorMessages.ts
    ├── httpStatus.ts
    ├── permissions.ts
    └── ai.ts                       ← AI_PROVIDER constant
```

---

## Architecture Rules

### Layer responsibilities

- **routes/api.ts** → Registers the `/api/v1` prefix and all module route plugins. Never add business logic here.
- **modules/\*/\*.routes.ts** → Registers routes relative to the module prefix. Validates input with Zod, calls service, returns response. No business logic.
- **modules/\*/\*.service.ts** → Orchestrates business logic. Calls domain functions and repositories. Throws errors when rules are violated. Catches Prisma errors (e.g. P2002) and converts them to domain errors.
- **modules/\*/domain/\*.rules.ts** → Pure business rule functions (validation, constraints). No DB access, no HTTP concerns.
- **modules/\*/domain/\*.algorithms.ts** → Complex calculations and algorithms (e.g. schedule generation). No DB access, no HTTP concerns.
- **modules/\*/\*.repository.ts** → All Prisma queries. Always scope by `workspace_id`. Never throw HTTP errors — return data or null. Never call `isP2002` or throw domain errors.
- **modules/\*/tests/\*.routes.test.ts** → Route tests — mock services, use `fastify.inject()`, test HTTP layer (status codes, response shape, auth enforcement).
- **modules/\*/tests/\*.service.test.ts** → Service tests — mock repositories, test business logic and error handling.
- **modules/\*/tests/\*.repository.test.ts** → Repository tests — use real test DB, truncate tables before each test.
- **modules/\*/tests/\*.domain.test.ts** → Domain tests — pure unit tests, no mocks needed.

**Domain folder:** Only create the `domain/` subfolder when the module has substantial business logic. For 1-2 simple rule checks, a single `<module>.domain.ts` at the module root is fine.

### All functions are plain functions — no classes.

### onDelete: Cascade vs. block

- Use `onDelete: Cascade` on child join table relations that have no meaning without their parent (e.g. `RecipeIngredient`, `RecipeDishType`, `RecipeMealType` → `Recipe`). These rows are owned by the parent and should be cleaned up automatically on delete.
- Block deletion with a 409 when the record is referenced by a shared entity that exists independently (e.g. block `Recipe` deletion if referenced by `MealRecipe`, block `Ingredient` deletion if referenced by `RecipeIngredient`). The 409 response must include enough context for the frontend to surface a meaningful message — see conflict response shape below.

### Conflict response shape (409)

When blocking a delete or update due to schedule usage, return a structured 409:

```json
{
  "statusCode": 409,
  "error": "recipe_in_use",
  "message": "Human-readable explanation of the conflict.",
  "affected_schedules": [
    { "scheduleId": "string", "scheduleName": "string", "dates": ["YYYY-MM-DD"] }
  ]
}
```

Use a specific `error` code per conflict type (e.g. `recipe_in_use`, `recipe_dish_type_conflict`, `recipe_meal_type_conflict`). Always include `affected_schedules` when the conflict involves schedule data.

---

## Route Registration & Prefixes

The `/api/v1` prefix and each module's base path are registered **once** and never repeated inside route files.

### routes/api.ts

```ts
// routes/api.ts
async function apiRoutes(fastify: FastifyInstance) {
  fastify.register(ingredientRoutes, { prefix: '/ingredients' });
  fastify.register(recipeRoutes, { prefix: '/recipes' });
  fastify.register(dishTypeRoutes, { prefix: '/dish-types' });
  fastify.register(mealTypeRoutes, { prefix: '/meal-types' });
  fastify.register(layoutRoutes, { prefix: '/layouts' });
  fastify.register(scheduleRoutes, { prefix: '/schedules' });
  fastify.register(scheduleMealRoutes, { prefix: '/schedule-meals' });
  fastify.register(authRoutes, { prefix: '/auth' });
}

export default apiRoutes;
```

Register `api.ts` in the main app with the base prefix:

```ts
fastify.register(apiRoutes, { prefix: '/api/v1' });
```

### Module route files

Each module route file only defines paths relative to its own base. Never include `/api/v1` or the module name:

```ts
// modules/ingredients/ingredients.routes.ts
async function ingredientRoutes(fastify: FastifyInstance) {
  fastify.get('/', ...)         // → GET /api/v1/ingredients
  fastify.get('/:id', ...)      // → GET /api/v1/ingredients/:id
  fastify.post('/', ...)        // → POST /api/v1/ingredients
  fastify.patch('/:id', ...)    // → PATCH /api/v1/ingredients/:id
  fastify.delete('/:id', ...)   // → DELETE /api/v1/ingredients/:id
}

export default ingredientRoutes  // no fp needed — route files are self-contained
```

### Health check

Health check lives outside `/api/v1` — register it directly on the app at root level:

```ts
fastify.register(healthRoutes); // → GET /health
```

---

## fastify-plugin (fp)

`fp` (imported as `import fp from 'fastify-plugin'`) breaks Fastify's default plugin scoping so that decorations are visible to the whole app.

**Use `fp`** only when the plugin decorates the Fastify instance with something other plugins/routes need:

- `plugins/prisma.ts` — decorates `fastify.prisma`
- `plugins/auth.ts` — decorates `fastify.authenticate` and `fastify.requirePermission`

**Do NOT use `fp`** on `routes/api.ts` or module route files — they are self-contained and share nothing upward.

---

## Authentication & Authorization

### JWT payload shape

```ts
// plugins/auth.ts
import { Role } from '@app/types/roles';

type JWTPayload = {
  userId: string;
  workspaceId: string;
  role: Role;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}
```

After `fastify.authenticate` runs, the decoded JWT is available as `request.user`:

```ts
const { userId, workspaceId, role } = request.user;
```

### Roles

`ROLES` and `Role` are defined in the shared types package and imported directly from there everywhere — including server code, seed files, and plugins. There is no `constants/roles.ts`.

```ts
import { ROLES, type Role } from '@app/types/roles';
```

Three roles: `admin`, `editor`, `viewer`.
Role is stored in both the JWT and the database (`workspace_users.role_id` → `roles.key`).
Always import from `@app/types/roles` — never hardcode role strings.

### Permissions

Permissions are defined as a const object in `constants/permissions.ts`, grouped by domain (module name):

```ts
// constants/permissions.ts
export const PERMISSIONS = {
  INGREDIENTS: {
    CREATE: { domain: 'ingredients', key: 'create' },
    UPDATE: { domain: 'ingredients', key: 'update' },
    DELETE: { domain: 'ingredients', key: 'delete' },
  },
  DISH_TYPES: {
    CREATE: { domain: 'dish-types', key: 'create' },
    UPDATE: { domain: 'dish-types', key: 'update' },
    DELETE: { domain: 'dish-types', key: 'delete' },
  },
  MEAL_TYPES: {
    CREATE: { domain: 'meal-types', key: 'create' },
    UPDATE: { domain: 'meal-types', key: 'update' },
    DELETE: { domain: 'meal-types', key: 'delete' },
  },
  RECIPES: {
    CREATE: { domain: 'recipes', key: 'create' },
    UPDATE: { domain: 'recipes', key: 'update' },
    DELETE: { domain: 'recipes', key: 'delete' },
  },
  SCHEDULES: {
    CREATE: { domain: 'schedules', key: 'create' },
    UPDATE: { domain: 'schedules', key: 'update' },
    DELETE: { domain: 'schedules', key: 'delete' },
  },
  SCHEDULE_MEALS: {
    CREATE: { domain: 'schedule-meals', key: 'create' },
    UPDATE: { domain: 'schedule-meals', key: 'update' },
    DELETE: { domain: 'schedule-meals', key: 'delete' },
  },
  USERS: {
    READ: { domain: 'users', key: 'read' },
    CREATE: { domain: 'users', key: 'create' },
    UPDATE: { domain: 'users', key: 'update' },
    DELETE: { domain: 'users', key: 'delete' },
  },
  PERMISSIONS: {
    READ: { domain: 'permissions', key: 'read' },
    CREATE: { domain: 'permissions', key: 'create' },
    UPDATE: { domain: 'permissions', key: 'update' },
    DELETE: { domain: 'permissions', key: 'delete' },
  },
} as const;
```

Read on workspace data modules (ingredients, recipes, etc.) is not permission-gated — any authenticated user can read. Only write actions (create, update, delete) require a permission check. Admin-only modules (users, permissions) gate all four actions including read.

Always import from `constants/index.ts` — never hardcode domain or key strings in routes.

### requirePermission

`requirePermission` is decorated onto the Fastify instance in `plugins/auth.ts`. It queries the DB to verify the current user's role has the required permission, and throws `forbiddenError()` if not.

```ts
// plugins/auth.ts (relevant excerpt)
import { forbiddenError } from '../utils/errors';

type Permission = { domain: string; key: string };

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (permission: Permission) => (request: FastifyRequest) => Promise<void>;
  }
}

// inside the plugin:
fastify.decorate(
  'requirePermission',
  (permission: Permission) => async (request: FastifyRequest) => {
    const found = await fastify.prisma.permission.findFirst({
      where: {
        domain: permission.domain,
        key: permission.key,
        roles_permissions: {
          some: { role: { key: request.user.role } },
        },
      },
    });
    if (!found) throw forbiddenError();
  },
);
```

**MVP note:** One DB call per protected request. Acceptable for MVP.
**Post-MVP:** Add in-memory cache keyed by role with ~5 min TTL.

### Auth middleware pattern

Always use `fastify.authenticate` and `fastify.requirePermission` as preHandlers. Never import `requirePermission` as a standalone function — it lives on the `fastify` instance.

```ts
import { PERMISSIONS } from '../../constants';

// JWT auth only (read endpoints on workspace data modules)
fastify.get('/', { preHandler: [fastify.authenticate] }, handler);

// JWT auth + permission check (write endpoints)
fastify.post(
  '/',
  {
    preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.RECIPES.CREATE)],
  },
  handler,
);

fastify.delete(
  '/:id',
  {
    preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.RECIPES.DELETE)],
  },
  handler,
);
```

Always use `PERMISSIONS` constants — never pass raw domain/key strings to `requirePermission`.

---

## Multi-tenancy

**Every single DB query must be scoped by `workspace_id`.**
Always read `workspaceId` from `request.user.workspaceId` and pass it to the repository.
Never trust a `workspaceId` from the request body or params — always use the one from the JWT.

**Exception:** `WeekDaysLayout` and `MealSlot` are scoped through their `schedule_id` relation, not directly by `workspace_id`. For layout endpoints, scope by `layoutId` from params and verify ownership through the schedule → workspace chain in the service.

**Exception:** `Unit` is a global table with no `workspace_id`. Never filter `Unit` queries by workspace. See Unit table section below.

---

## AI Provider

AI matching logic (used by the ingredients module) is abstracted behind a shared interface so the provider can be swapped without touching business logic.

### Structure

```
app/server/src/lib/ai/
├── types.ts       ← AIClient interface + AIProvider type
├── anthropic.ts   ← Anthropic implementation
├── openai.ts      ← OpenAI implementation
└── index.ts       ← exports active client based on AI_PROVIDER constant
```

### types.ts

```ts
export type AIProvider = 'anthropic' | 'openai';

export interface AIClient {
  matchIngredient(
    name: string,
    candidates: string[],
  ): Promise<{ match: string | null; confidence: 'high' | 'low' }>;
}
```

### constants/ai.ts

```ts
import type { AIProvider } from '../lib/ai/types';

export const AI_PROVIDER: AIProvider = 'openai'; // change to 'anthropic' to switch
```

### lib/ai/index.ts

```ts
import { AI_PROVIDER } from '../../constants';
import { AIClient } from './types';
import { OpenAIClient } from './openai';
import { AnthropicClient } from './anthropic';

export const aiClient: AIClient =
  AI_PROVIDER === 'openai' ? new OpenAIClient() : new AnthropicClient();
```

### Switching providers

Change `AI_PROVIDER` in `constants/ai.ts` — nothing else needs to change. Both implementations are always present.

Each implementation reads its API key from env:

- OpenAI: `process.env.OPENAI_API_KEY`
- Anthropic: `process.env.ANTHROPIC_API_KEY`

Both must return `{ match: string | null, confidence: 'high' | 'low' }`. Only treat as a match if confidence is `'high'`.

---

## Workspace Ingredient Seeding

When a new workspace is created (in the auth register flow), the workspace must be seeded with the global ingredient list from `prisma/global-ingredients.json`.

The seeding function lives in `modules/ingredients/ingredients.service.ts`:

```ts
export const seedWorkspaceIngredients = async (
  prisma: PrismaClient,
  workspaceId: string,
) => { ... }
```

The auth service calls this after creating the workspace and workspace user:

```ts
await seedWorkspaceIngredients(prisma, workspace.id);
```

`prisma/global-ingredients.json` has the shape:

```json
[
  { "name": "eggplant", "category": "vegetables", "variants": ["aubergine", "brinjal"] },
  { "name": "chicken", "category": "proteins", "variants": ["chicken breast", "chicken thigh", "chicken wings", "whole chicken"] },
  { "name": "cilantro", "category": "herbs", "variants": ["coriander", "dhania"] }
]
```

The `variants` array covers both what were previously called "aliases" (different names for the same thing, e.g. aubergine) and ingredient-family variants (e.g. chicken cuts). Both are stored as `IngredientVariant` records and treated identically for gap calculation purposes.

Each workspace owns its ingredients fully — they are copied from the global list on creation and can be edited or deleted freely. There is no shared global ingredient table at runtime.

---

## Zod Schemas & Types

Zod schemas are defined in the **shared types package** at `packages/types/` (package name: `@app/types`) so they can be used by both the server and the client.

### packages/types structure

```
packages/types/
├── package.json        ← name: "@app/types"
├── roles.ts            ← ROLES const + Role type (source of truth)
├── ingredients.ts
├── dish-types.ts
├── meal-types.ts
├── layouts.ts
├── recipes.ts
├── auth.ts
└── ... (one file per module)
```

### Schema naming

- Each endpoint that requires validation must have its own Zod schema and inferred TypeScript type, even if the structure is currently identical to another schema. Never reuse schemas across endpoints.
- `Create<Entity>Schema`, `Update<Entity>Schema`, `<Entity>ParamsSchema`, `List<Entity>QuerySchema` etc.
- Always export the inferred TypeScript type alongside the schema:

```ts
// packages/types/ingredients.ts
import { z } from 'zod';

export const CreateIngredientSchema = z.object({
  name: z.string().min(1).max(50),
});
export type CreateIngredientInput = z.infer<typeof CreateIngredientSchema>;

export const UpdateIngredientSchema = z.object({
  name: z.string().min(1).max(50),
});
export type UpdateIngredientInput = z.infer<typeof UpdateIngredientSchema>;

export const IngredientParamsSchema = z.object({
  id: z.string().uuid(),
});
export type IngredientParams = z.infer<typeof IngredientParamsSchema>;
```

### Importing in the server

```ts
import { CreateIngredientSchema, CreateIngredientInput } from '@app/types/ingredients';
```

### Response types

Response shapes must be defined as plain TypeScript types (not Zod) in the shared types file alongside the request schemas. Never use Zod for response shapes.

### BE-only types

Internal types that the FE will never need (e.g. repository return shapes, internal service params) can be defined as plain TypeScript interfaces directly in the file that uses them — no separate types file needed.

### Validation in routes

Always use `.parse()` explicitly in the route handler — do not rely on Fastify's JSON schema option:

```ts
const body = CreateIngredientSchema.parse(request.body);
const params = IngredientParamsSchema.parse(request.params);
```

If parsing fails, Zod throws a `ZodError` which should be caught by the global error handler and returned as a 400.

- Validate **inputs only** (body, params, query). Do not validate response shapes with Zod.
- Never include `workspaceId` in any Zod request schema (body, params, or query) — it is always sourced exclusively from `request.user.workspaceId`.

---

## Response Shape

All successful responses return:

```ts
{ data: <result> }
```

Examples:

```ts
return { data: ingredient };
return { data: ingredients };
return { data: { id } };
return { data: { success: true } };
```

---

## Constants

All constants are barrel-exported from `constants/index.ts`. Always import from the index, never from individual files:

```ts
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
  PERMISSIONS,
  AI_PROVIDER,
} from '../../constants';
```

Note: `ROLES` and `Role` are NOT in constants — import them from `@app/types/roles` directly.

---

## Error Handling

Error helpers live in `utils/errors.ts`. Always import and throw from there — never call `@fastify/error` directly in modules.

```ts
import {
  notFoundError,
  conflictError,
  forbiddenError,
  unAuthorizedError,
  ruleViolationError,
  invalidRequestError,
  internalError,
  isP2002,
} from '../../utils/errors';

throw notFoundError();
throw conflictError();
throw forbiddenError();
throw unAuthorizedError();
throw ruleViolationError();
throw invalidRequestError();
throw internalError();
```

### isP2002

`isP2002` is a utility exported from `utils/errors.ts` for detecting Prisma unique constraint violations. Never define it inline in a service — always import it:

```ts
// utils/errors.ts
export const isP2002 = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: string }).code === 'P2002';
```

Use it in services to catch unique constraint violations and rethrow as 409:

```ts
try {
  return await createDishType(prisma, data, workspaceId);
} catch (err) {
  if (isP2002(err)) throw conflictError();
  throw err;
}
```

### 404 behavior

Repositories return `null` for not-found; services must check and throw:

```ts
const ingredient = await getIngredientById(prisma, id, workspaceId);
if (!ingredient) throw notFoundError();
```

### Repository error responsibility

Repositories never throw domain errors and never call `isP2002`. They return data or `null` and let Prisma errors bubble up. Only the service layer catches and converts errors.

---

## Soft Deletes

Not implemented in MVP. Use hard deletes (`prisma.<model>.delete`).

---

## Prisma Client

Prisma is registered as a Fastify plugin in `plugins/prisma.ts` and decorated onto the Fastify instance as `fastify.prisma`. It is **not a standalone singleton** — never import PrismaClient directly in modules.

**Prisma 7:** `PrismaClient` requires a driver adapter — `datasources` and `datasourceUrl` are removed. Always instantiate with `@prisma/adapter-pg`:

```ts
// plugins/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
```

This applies everywhere `PrismaClient` is instantiated, including repository tests.

### Repositories

Repositories receive `prisma` as their first parameter:

```ts
// modules/ingredients/ingredients.repository.ts
import { PrismaClient } from '@prisma/client';

export const getIngredientById = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  return prisma.ingredient.findFirst({
    where: { id, workspace_id: workspaceId },
  });
};
```

### Services

Services receive `prisma` as their first parameter and pass it to repositories:

```ts
// modules/ingredients/ingredients.service.ts
import { PrismaClient } from '@prisma/client';
import { notFoundError } from '../../utils/errors';

export const fetchIngredientById = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
) => {
  const ingredient = await getIngredientById(prisma, id, workspaceId);
  if (!ingredient) throw notFoundError();
  return ingredient;
};
```

### Routes

Routes access `fastify.prisma` and pass it into services:

```ts
// modules/ingredients/ingredients.routes.ts
import { FastifyInstance } from 'fastify';

async function ingredientRoutes(fastify: FastifyInstance) {
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { workspaceId } = request.user;
    const params = IngredientParamsSchema.parse(request.params);
    const result = await fetchIngredientById(fastify.prisma, params.id, workspaceId);
    return { data: result };
  });
}

export default ingredientRoutes;
```

---

## API Prefix

- Global prefix `/api/v1` is registered **once** in `routes/api.ts`
- Each module prefix (e.g. `/ingredients`) is registered **once** in `routes/api.ts`
- Route handlers only define sub-paths (e.g. `/`, `/:id`)
- Health check is registered at root level, outside `/api/v1`

---

## File Naming Conventions

| Layer             | File name pattern                   | Example                            |
| ----------------- | ----------------------------------- | ---------------------------------- |
| Routes            | `<module>.routes.ts`                | `ingredients.routes.ts`            |
| Service           | `<module>.service.ts`               | `ingredients.service.ts`           |
| Repository        | `<module>.repository.ts`            | `ingredients.repository.ts`        |
| Shared types      | `packages/types/<module>.ts`        | `packages/types/ingredients.ts`    |
| Domain (simple)   | `<module>.domain.ts`                | `recipes.domain.ts`                |
| Domain rules      | `domain/<module>.rules.ts`          | `domain/ingredients.rules.ts`      |
| Domain algorithms | `domain/<module>.algorithms.ts`     | `domain/ingredients.algorithms.ts` |
| Route tests       | `tests/<module>.routes.test.ts`     | `tests/recipes.routes.test.ts`     |
| Service tests     | `tests/<module>.service.test.ts`    | `tests/recipes.service.test.ts`    |
| Repository tests  | `tests/<module>.repository.test.ts` | `tests/recipes.repository.test.ts` |
| Domain tests      | `tests/<module>.domain.test.ts`     | `tests/recipes.domain.test.ts`     |

---

## Module List

Completed or generated: `auth`, `ingredients`, `dish-types`, `meal-types`, `layouts`
Pending: `recipes`, `schedules`, `schedule-meals`, `users`, `permissions`

---

## Prisma Schema Reference

Key models and their workspace-scoped fields:

| Model               | Unique constraint                 | Notes                                                                                                                                                                                                                                                                    |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Ingredient`        | `(workspace_id, name)`            | Has `IngredientVariant` children. `category String?` — null treated as `other` on the FE. Block delete if referenced by any `RecipeIngredient`.                                                                                                                         |
| `IngredientVariant` | `(workspace_id, variant)`         | Scoped to workspace. Field is `variant` (not `alias`). Relation on `Ingredient` is `ingredient_variants`. Covers both name variants (aubergine = eggplant) and ingredient-family variants (chicken breast → chicken). Both treated identically for gap calculation.      |
| `DishType`          | `(workspace_id, name)`            |                                                                                                                                                                                                                                                                          |
| `MealType`          | `(workspace_id, name)`            | Simple lookup — name only. No order field. No dish constraints directly on this model.                                                                                                                                                                                   |
| `WeekDaysLayout`    | none                              | Belongs to a `Schedule` (not workspace directly). `days Int[]` — array of day-of-week ints (0=Sunday, 6=Saturday) covered by this layout.                                                                                                                               |
| `MealSlot`          | `(week_days_layout_id, order)`    | Belongs to `WeekDaysLayout`. `order` derived from array index when creating/reordering. Linked to a `MealType`.                                                                                                                                                          |
| `DishAllocation`    | `(meal_slot_id, dish_type_id)`    | Belongs to `MealSlot`. `amount Int` — how many of this dish type are required in this slot.                                                                                                                                                                              |
| `Recipe`            | `(workspace_id, name)`            | Has `RecipeIngredient`, `RecipeMealType`, `RecipeDishType`. Must have at least one dish type and at least one meal type. Block delete if referenced by any `MealRecipe` (return 409 with affected schedule names and dates). Cascade deletes `RecipeIngredient`, `RecipeDishType`, `RecipeMealType` on delete. |
| `RecipeIngredient`  | `(recipe_id, ingredient_id)`      | `is_main` must be exactly 1 per recipe — enforced in service, throw `ruleViolationError()` if violated. `display_name String?` stores the variant name the user typed — falls back to `Ingredient.name` on read if null. `onDelete: Cascade` from `Recipe`.            |
| `RecipeDishType`    | `(recipe_id, dish_type_id)`       | Join table. `onDelete: Cascade` from `Recipe`.                                                                                                                                                                                                                           |
| `RecipeMealType`    | `(recipe_id, meal_type_id)`       | Join table. `onDelete: Cascade` from `Recipe`.                                                                                                                                                                                                                           |
| `Unit`              | `(name)`                          | Global table — no `workspace_id`. Never scope `Unit` queries by workspace. Seeded once globally, never created or deleted via the API.                                                                                                                                   |
| `Schedule`          | `(workspace_id, name)`            | Has `ScheduleDay`, `GenerationSetting`, `WeekDaysLayout[]`                                                                                                                                                                                                               |
| `ScheduleMeal`      | `(schedule_day_id, meal_type_id)` | Has `MealRecipe` children                                                                                                                                                                                                                                                |
| `WorkspaceUser`     | `(user_id, workspace_id)`         | Join table with role                                                                                                                                                                                                                                                     |

### Removed models

`MealTypeDishConstraint` has been removed entirely and replaced by `WeekDaysLayout` + `MealSlot` + `DishAllocation`.

### WeekDaysLayout / MealSlot / DishAllocation

These three models define the week structure for a schedule:

- A schedule has multiple `WeekDaysLayout` records — one per "days range" (e.g. one for Sun–Thu, one for Fri, one for Sat).
- Each `WeekDaysLayout` has multiple `MealSlot` records — one per meal type that appears on those days, ordered by `order`.
- Each `MealSlot` has multiple `DishAllocation` records — one per dish type required, with an `amount`.
- Week layout is created/updated as part of schedule generation — not via standalone CRUD endpoints.
- The only standalone layout endpoint is `PATCH /api/v1/layouts/:layoutId/slots/reorder` — reorders meal slots by accepting the full array of slot IDs in new order, derives `order` from index, updates all in a transaction. This endpoint uses `PERMISSIONS.SCHEDULES.UPDATE` — there is no separate layouts permission.
- A day belongs to exactly one `WeekDaysLayout` per schedule — enforced in the service layer (not DB level).

### day_of_week convention

- `0` = Sunday, `6` = Saturday
- Week start day will be a configurable workspace-level setting in a future version — do not hardcode Sunday as week start in any UI or generation logic

### RecipeIngredient.display_name

When a user adds an ingredient to a recipe, they may type a variant name (e.g. "aubergine"). The client sends a `variantId` if the ingredient was matched via a variant. The service validates the variant belongs to the given `ingredient_id` and workspace, then stores the variant's `variant` field as `display_name`. If no `variantId` is provided, `display_name` is stored as `null`. On read, resolve as: `display_name ?? ingredient.name`. The algorithm always uses `ingredient_id` for gap calculations — never `display_name`.

### Unit table

`Unit` is a global lookup table with no `workspace_id`. It is not scoped per workspace. Units are seeded once globally and are never created or deleted via the API. Repository queries against `Unit` must NOT filter by `workspace_id`.

### Ingredient.category

`category` is a nullable string on the `Ingredient` model. It is set from `prisma/global-ingredients.json` during workspace seeding. The FE treats `null` as `other`. Valid categories: `vegetables`, `fruits`, `proteins`, `dairy`, `grains`, `legumes`, `herbs`, `spices`, `oils-fats`, `nuts-seeds`, `condiments`, `sweeteners`, `baking-confectionery`, `dairy-alternatives`, `alcohol`, `other`.

### Gap calculation

For gap rules, resolve each recipe's main ingredient to its parent ingredient via `IngredientVariant` before comparing. If the ingredient has no variants pointing to it, compare against itself. This means chicken breast and chicken thigh both resolve to chicken for gap purposes.

---

## Testing

- Use **Vitest** for all tests
- Test files live in `modules/<module>/tests/`
- Four test types, each testing a different layer with different isolation strategy

---

### Route tests (`<module>.routes.test.ts`)

- Build a real Fastify instance with plugins registered
- Mock all service functions with `vi.fn()`
- Use `fastify.inject()` to make HTTP calls — no real server needed
- Test: correct status codes, response shape, auth enforcement, permission enforcement
- Generate a real signed JWT for authenticated requests
- Do NOT register `prismaPlugin` — instead mock `fastify.prisma` directly so no DB connection is needed
- `requirePermission` needs `fastify.prisma.permission.findFirst` — mock it to return a permission object

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import authPlugin from '../../../plugins/auth';
import ingredientRoutes from '../ingredients.routes';
import * as service from '../ingredients.service';

vi.mock('../ingredients.service');

const buildApp = async () => {
  const app = Fastify();

  app.decorate('prisma', {
    permission: {
      findFirst: vi.fn().mockResolvedValue({ id: 'perm-1', domain: 'ingredients', key: 'create' }),
    },
  } as any);

  await app.register(authPlugin);
  await app.register(ingredientRoutes, { prefix: '/ingredients' });
  await app.ready();
  return app;
};

const signToken = (app: ReturnType<typeof Fastify>) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' });

describe('GET /ingredients', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => { app = await buildApp(); });
  afterEach(async () => { await app.close(); });

  it('returns 200 with data', async () => {
    vi.mocked(service.listIngredients).mockResolvedValue({
      items: [{ id: '1', name: 'Salt', category: 'spices', variants: [] }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/ingredients',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.items[0].category).toBe('spices');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/ingredients' });
    expect(res.statusCode).toBe(401);
  });
});
```

---

### Service tests (`<module>.service.test.ts`)

- Mock all repository functions with `vi.fn()`
- Pass a mock PrismaClient `{} as any` — it won't be called directly
- Test: business logic, error throwing, edge cases

```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchIngredientById } from '../ingredients.service';
import * as repo from '../ingredients.repository';

vi.mock('../ingredients.repository');

describe('fetchIngredientById', () => {
  it('returns ingredient when found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue({
      id: '1', name: 'Salt', category: 'spices', workspace_id: 'ws-1',
    });
    const result = await fetchIngredientById({} as any, '1', 'ws-1');
    expect(result.name).toBe('Salt');
  });

  it('throws 404 when not found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(null);
    await expect(fetchIngredientById({} as any, '1', 'ws-1')).rejects.toThrow();
  });
});
```

---

### Test DB setup (one-time, do this before writing repository tests)

1. Create a separate Postgres database for tests, e.g. `meal_planner_test`
2. Add `DATABASE_URL` to `.env.test` in `app/server/` — never commit this file:

```
DATABASE_URL="postgresql://user@localhost:5432/meal_planner_test"
```

3. Add `.env.test` to `.gitignore`
4. Run migrations against the test DB:

```bash
DATABASE_URL=postgresql://user@localhost:5432/meal_planner_test npx prisma migrate deploy
```

5. Run seed against the test DB:

```bash
DATABASE_URL=postgresql://user@localhost:5432/meal_planner_test npm run db:seed
```

6. Configure Vitest to load `.env.test` in `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  test: { environment: 'node' },
});
```

### Repository tests (`<module>.repository.test.ts`)

- Use a real PostgreSQL test database (`DATABASE_URL` in `.env.test`)
- Truncate relevant tables in `beforeEach` — each test starts with a clean slate
- Create prerequisite records (e.g. workspace) in `beforeAll`, not `beforeEach`
- Truncate in dependency order — children before parents

```ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getIngredientById } from '../ingredients.repository';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const WS_ID = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: WS_ID },
    update: {},
    create: { id: WS_ID, name: 'Test Workspace' },
  });
});

beforeEach(async () => {
  await prisma.ingredientVariant.deleteMany({ where: { workspace_id: WS_ID } });
  await prisma.ingredient.deleteMany({ where: { workspace_id: WS_ID } });
});
```

---

### Domain tests (`<module>.domain.test.ts`)

- Pure unit tests — no mocks, no DB, no Fastify
- Only create this file if the module has a `domain/` folder or `.domain.ts` file

---

## Module Generation Checklist

When asked to generate a module, always produce all of these files:

1. `packages/types/<module>.ts` — Zod schemas + inferred TypeScript types. One schema per endpoint, never reuse.
2. `modules/<module>/<module>.repository.ts` — Prisma queries, scoped by workspaceId, never throw domain errors.
3. `modules/<module>/<module>.service.ts` — Business logic, uses `isP2002` from `utils/errors.ts`.
4. `modules/<module>/<module>.routes.ts` — Fastify route plugin, validates with Zod, calls service.
5. `modules/<module>/tests/<module>.routes.test.ts` — Route tests with mocked services and mocked prisma.
6. `modules/<module>/tests/<module>.service.test.ts` — Service tests with mocked repositories.
7. `modules/<module>/tests/<module>.repository.test.ts` — Repository tests against test DB.
8. If domain logic exists: domain file(s) + `modules/<module>/tests/<module>.domain.test.ts`.

Then add the module to `routes/api.ts` with its prefix.

Always generate all files in one response unless told otherwise.
