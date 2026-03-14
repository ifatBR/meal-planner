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
│   ├── ingredients/                 ← simple module, no domain complexity
│   │   ├── tests/
│   │   │   ├── ingredients.routes.test.ts      ← mocked services, fastify.inject()
│   │   │   ├── ingredients.service.test.ts     ← mocked repositories
│   │   │   ├── ingredients.repository.test.ts  ← real test DB, truncate before each
│   │   │   └── ingredients.domain.test.ts      ← only if domain file exists
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
│   └── auth.ts                     ← decorates fastify.authenticate, needs fp
└── constants/
    ├── errorCodes.ts
    ├── errorMessages.ts
    ├── httpStatus.ts
    ├── roles.ts
    └── permissions.ts
```

---

## Architecture Rules

### Layer responsibilities
- **routes/api.ts** → Registers the `/api/v1` prefix and all module route plugins. Never add business logic here.
- **modules/\*/\*.routes.ts** → Registers routes relative to the module prefix. Validates input with Zod, calls service, returns response. No business logic.
- **modules/\*/\*.service.ts** → Orchestrates business logic. Calls domain functions and repositories. Throws errors when rules are violated.
- **modules/\*/domain/\*.rules.ts** → Pure business rule functions (validation, constraints). No DB access, no HTTP concerns.
- **modules/\*/domain/\*.algorithms.ts** → Complex calculations and algorithms (e.g. schedule generation). No DB access, no HTTP concerns.
- **modules/\*/\*.repository.ts** → All Prisma queries. Always scope by `workspace_id`. Never throw HTTP errors — return data or null.
- **modules/\*/\*.types.ts** → Zod schemas for request input validation. Also export inferred TypeScript types.
- **modules/\*/tests/\*.routes.test.ts** → Route tests — mock services, use `fastify.inject()`, test HTTP layer (status codes, response shape, auth enforcement).
- **modules/\*/tests/\*.service.test.ts** → Service tests — mock repositories, test business logic and error handling.
- **modules/\*/tests/\*.repository.test.ts** → Repository tests — use real test DB, truncate tables before each test.
- **modules/\*/tests/\*.domain.test.ts** → Domain tests — pure unit tests, no mocks needed.

**Domain folder:** Only create the `domain/` subfolder when the module has substantial business logic. For 1-2 simple rule checks, a single `<module>.domain.ts` at the module root is fine.

### All functions are plain functions — no classes.

---

## Route Registration & Prefixes

The `/api/v1` prefix and each module's base path are registered **once** and never repeated inside route files.

### routes/api.ts
```ts
// routes/api.ts
async function apiRoutes(fastify: FastifyInstance) {
  fastify.register(ingredientRoutes, { prefix: '/ingredients' })
  fastify.register(recipeRoutes, { prefix: '/recipes' })
  fastify.register(dishTypeRoutes, { prefix: '/dish-types' })
  fastify.register(mealTypeRoutes, { prefix: '/meal-types' })
  fastify.register(scheduleRoutes, { prefix: '/schedules' })
  fastify.register(scheduleMealRoutes, { prefix: '/schedule-meals' })
  fastify.register(authRoutes, { prefix: '/auth' })
}

export default fp(apiRoutes)
```

Wait — `api.ts` DOES need `fp` here so the `/api/v1` prefix registration propagates correctly to the parent app instance.

Register `api.ts` in the main app with the base prefix:
```ts
fastify.register(apiRoutes, { prefix: '/api/v1' })
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
fastify.register(healthRoutes)  // → GET /health
```

---

## fastify-plugin (fp)

`fp` (imported as `import fp from 'fastify-plugin'`) breaks Fastify's default plugin scoping so that decorations are visible to the whole app.

**Use `fp`** only when the plugin decorates the Fastify instance with something other plugins/routes need:
- `plugins/prisma.ts` — decorates `fastify.prisma`
- `plugins/auth.ts` — decorates `fastify.authenticate`
- `routes/api.ts` — needed for correct prefix propagation

**Do NOT use `fp`** on module route files — they are self-contained and share nothing upward.

---

## Authentication & Authorization

### JWT payload shape
```ts
// Extend FastifyRequest in plugins/auth.ts:
import { Role } from '../../constants/roles'

type JWTPayload = {
  userId: string
  workspaceId: string
  role: Role
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
    user: JWTPayload
  }
}
```

After `fastify.authenticate` runs, the decoded JWT is available as `request.user`:
```ts
const { userId, workspaceId, role } = request.user
```

### Roles
Roles are defined as a const object in `constants/roles.ts`:

```ts
// constants/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]
```

Three roles: `admin`, `editor`, `viewer`.
Role is stored in both the JWT and the database (`workspace_users.role_id` → `roles.key`).
Always import `ROLES` and `Role` from `constants/roles.ts` — never hardcode role strings.

### Permissions
Permissions are defined as a const object in `constants/permissions.ts`, grouped by domain (module name):

```ts
// constants/permissions.ts
export const PERMISSIONS = {
  INGREDIENTS: {
    CREATE: { domain: 'ingredients', key: 'create' },
    READ:   { domain: 'ingredients', key: 'read' },
    UPDATE: { domain: 'ingredients', key: 'update' },
    DELETE: { domain: 'ingredients', key: 'delete' },
  },
  DISH_TYPES: {
    CREATE: { domain: 'dish-types', key: 'create' },
    READ:   { domain: 'dish-types', key: 'read' },
    UPDATE: { domain: 'dish-types', key: 'update' },
    DELETE: { domain: 'dish-types', key: 'delete' },
  },
  MEAL_TYPES: {
    CREATE: { domain: 'meal-types', key: 'create' },
    READ:   { domain: 'meal-types', key: 'read' },
    UPDATE: { domain: 'meal-types', key: 'update' },
    DELETE: { domain: 'meal-types', key: 'delete' },
  },
  RECIPES: {
    CREATE: { domain: 'recipes', key: 'create' },
    READ:   { domain: 'recipes', key: 'read' },
    UPDATE: { domain: 'recipes', key: 'update' },
    DELETE: { domain: 'recipes', key: 'delete' },
  },
  SCHEDULES: {
    CREATE: { domain: 'schedules', key: 'create' },
    READ:   { domain: 'schedules', key: 'read' },
    UPDATE: { domain: 'schedules', key: 'update' },
    DELETE: { domain: 'schedules', key: 'delete' },
  },
  SCHEDULE_MEALS: {
    CREATE: { domain: 'schedule-meals', key: 'create' },
    READ:   { domain: 'schedule-meals', key: 'read' },
    UPDATE: { domain: 'schedule-meals', key: 'update' },
    DELETE: { domain: 'schedule-meals', key: 'delete' },
  },
} as const
```

Always import from `constants/permissions.ts` — never hardcode domain or key strings in routes.

### requirePermission helper
Define `requirePermission` in `plugins/auth.ts` as a preHandler factory that checks the user's role permissions against the DB.

Permissions are stored in the DB as `{ domain, key }` pairs (e.g. `{ domain: 'recipes', key: 'create' }`), linked to roles via `roles_permissions`.

```ts
// plugins/auth.ts
import { PERMISSIONS } from '../../constants/permissions'

type Permission = { domain: string; key: string }

export const requirePermission = (permission: Permission) =>
  async (request: FastifyRequest) => {
    const found = await request.server.prisma.permission.findFirst({
      where: {
        roles_permissions: {
          some: {
            role: { key: request.user.role }
          }
        },
        domain: permission.domain,
        key: permission.key,
      }
    })
    if (!found) {
      throw createError(ERROR_CODES.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)()
    }
  }
```

**MVP note:** This makes one DB call per protected request. This is acceptable for MVP.
**Post-MVP:** Add a simple in-memory cache keyed by role, with a TTL of ~5 minutes, to avoid repeated DB hits. Role permissions change rarely so stale cache risk is low.

### Auth middleware pattern
```ts
import { PERMISSIONS } from '../../constants/permissions'

// JWT auth only
fastify.get('/', { preHandler: [fastify.authenticate] }, handler)

// JWT auth + permission check
fastify.post('/', { preHandler: [fastify.authenticate, requirePermission(PERMISSIONS.RECIPES.CREATE)] }, handler)
fastify.delete('/:id', { preHandler: [fastify.authenticate, requirePermission(PERMISSIONS.RECIPES.DELETE)] }, handler)
```

Always use `PERMISSIONS` constants — never pass raw domain/key strings to `requirePermission`.

---

## Multi-tenancy
**Every single DB query must be scoped by `workspace_id`.**
Always read `workspaceId` from `request.user.workspaceId` and pass it to the repository.
Never trust a `workspaceId` from the request body or params — always use the one from the JWT.

---

## Zod Schemas & Types

Zod schemas are defined in the **shared types package** at `packages/types/` (package name: `@app/types`) so they can be used by both the server and the client.

### packages/types structure
```
packages/types/
├── package.json        ← name: "@app/types"
├── ingredients.ts
├── recipes.ts
├── auth.ts
└── ... (one file per module)
```

### Schema naming
- `Create<Entity>Schema`, `Update<Entity>Schema`, `<Entity>ParamsSchema`
- Always export the inferred TypeScript type alongside the schema:

```ts
// packages/types/ingredients.ts
import { z } from 'zod'

export const CreateIngredientSchema = z.object({
  name: z.string().min(1),
})
export type CreateIngredientInput = z.infer<typeof CreateIngredientSchema>

export const IngredientParamsSchema = z.object({
  id: z.string().uuid(),
})
export type IngredientParams = z.infer<typeof IngredientParamsSchema>
```

### Importing in the server
```ts
import { CreateIngredientSchema, CreateIngredientInput } from '@app/types/ingredients'
```

### Response types
Response shapes must be defined as plain TypeScript types (not Zod) in the shared types file alongside the request schemas:

```ts
// packages/types/ingredients.ts

// Request schema (Zod — used for runtime validation)
export const CreateIngredientSchema = z.object({
  name: z.string().min(1),
})
export type CreateIngredientInput = z.infer<typeof CreateIngredientSchema>

// Response type (plain TypeScript — no runtime validation needed)
export type IngredientResponse = {
  id: string
  name: string
  workspaceId: string
  createdAt: string
}
```

Never use Zod for response shapes — they are never validated at runtime, only used for type safety between BE and FE.

### BE-only types
Internal types that the FE will never need (e.g. repository return shapes, internal service params) can be defined as plain TypeScript interfaces directly in the file that uses them — no separate types file needed.

### Validation in routes
Always use `.parse()` explicitly in the route handler — do not rely on Fastify's JSON schema option:

```ts
const body = CreateIngredientSchema.parse(request.body)
const params = IngredientParamsSchema.parse(request.params)
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
return { data: ingredient }
return { data: ingredients }
return { data: { id } }
```

---

## Error Handling

Import from the shared constants:
```ts
import { ERROR_CODES } from '../../constants/errorCodes'
import { ERROR_MESSAGES } from '../../constants/errorMessages'
import { HTTP_STATUS } from '../../constants/httpStatus'
```

Throw errors using `@fastify/error`. The signature is `createError(code, message, statusCode)`:

```ts
import createError from '@fastify/error'

// Not found
throw createError(ERROR_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)()

// Conflict (duplicate)
throw createError(ERROR_CODES.CONFLICT, ERROR_MESSAGES.CONFLICT, HTTP_STATUS.CONFLICT)()

// Forbidden
throw createError(ERROR_CODES.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)()

// Domain rule violation
throw createError(ERROR_CODES.RULE_VIOLATION, ERROR_MESSAGES.RECIPE_MAIN_INGREDIENT, HTTP_STATUS.RULE_VIOLATION)()
```

### 404 behavior
When a resource is not found, **always throw a 404 error**. Never return null from a service.
Repositories may return `null` — services must check and throw:

```ts
const ingredient = await getIngredientById(prisma, id, workspaceId)
if (!ingredient) throw createError(ERROR_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)()
```

### Prisma P2002 unique constraint violations
When Prisma throws a unique constraint error, catch it in the service and rethrow as 409.
Prisma unique constraint errors have `error.code === 'P2002'`:

```ts
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

try {
  return await createIngredient(prisma, data, workspaceId)
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
    throw createError(ERROR_CODES.CONFLICT, ERROR_MESSAGES.CONFLICT, HTTP_STATUS.CONFLICT)()
  }
  throw error
}
```

---

## Soft Deletes

Not implemented in MVP. Use hard deletes (`prisma.<model>.delete`).

---

## Prisma Client

Prisma is registered as a Fastify plugin in `plugins/prisma.ts` and decorated onto the Fastify instance as `fastify.prisma`. It is **not a standalone singleton** — never import PrismaClient directly in modules.

### Repositories
Repositories receive `prisma` as their first parameter:

```ts
// modules/ingredients/ingredients.repository.ts
import { PrismaClient } from '@prisma/client'
import { CreateIngredientInput } from '@app/types/ingredients'

export const getIngredientById = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string
) => {
  return prisma.ingredient.findFirst({
    where: { id, workspace_id: workspaceId },
  })
}

export const getAllIngredients = async (
  prisma: PrismaClient,
  workspaceId: string
) => {
  return prisma.ingredient.findMany({
    where: { workspace_id: workspaceId },
  })
}

export const createIngredient = async (
  prisma: PrismaClient,
  data: CreateIngredientInput,
  workspaceId: string
) => {
  return prisma.ingredient.create({
    data: { ...data, workspace_id: workspaceId },
  })
}
```

### Services
Services receive `prisma` as their first parameter and pass it to repositories:

```ts
// modules/ingredients/ingredients.service.ts
import { PrismaClient } from '@prisma/client'

export const fetchIngredientById = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string
) => {
  const ingredient = await getIngredientById(prisma, id, workspaceId)
  if (!ingredient) throw createError(ERROR_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)()
  return ingredient
}
```

### Routes
Routes access `fastify.prisma` and pass it into services:

```ts
// modules/ingredients/ingredients.routes.ts
import { FastifyInstance } from 'fastify'

async function ingredientRoutes(fastify: FastifyInstance) {
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { workspaceId } = request.user
    const params = IngredientParamsSchema.parse(request.params)
    const result = await fetchIngredientById(fastify.prisma, params.id, workspaceId)
    return { data: result }
  })
}

export default ingredientRoutes
```

---

## API Prefix

- Global prefix `/api/v1` is registered **once** in `routes/api.ts`
- Each module prefix (e.g. `/ingredients`) is registered **once** in `routes/api.ts`
- Route handlers only define sub-paths (e.g. `/`, `/:id`)
- Health check is registered at root level, outside `/api/v1`

---

## File Naming Conventions

| Layer | File name pattern | Example |
|---|---|---|
| Routes | `<module>.routes.ts` | `ingredients.routes.ts` |
| Service | `<module>.service.ts` | `ingredients.service.ts` |
| Repository | `<module>.repository.ts` | `ingredients.repository.ts` |
| Shared types | `packages/types/<module>.ts` | `packages/types/ingredients.ts` |
| Domain (simple) | `<module>.domain.ts` | `recipes.domain.ts` |
| Domain rules | `domain/<module>.rules.ts` | `domain/recipes.rules.ts` |
| Domain algorithms | `domain/<module>.algorithms.ts` | `domain/recipes.algorithms.ts` |
| Route tests | `tests/<module>.routes.test.ts` | `tests/recipes.routes.test.ts` |
| Service tests | `tests/<module>.service.test.ts` | `tests/recipes.service.test.ts` |
| Repository tests | `tests/<module>.repository.test.ts` | `tests/recipes.repository.test.ts` |
| Domain tests | `tests/<module>.domain.test.ts` | `tests/recipes.domain.test.ts` |

---

## Module List

Current modules: `auth`, `ingredients`, `dish-types`, `meal-types`, `recipes`, `schedules`, `schedule-meals`

---

## Prisma Schema Reference

Key models and their workspace-scoped fields:

| Model | Unique constraint | Notes |
|---|---|---|
| `Ingredient` | `(workspace_id, name)` | Has `IngredientAlias` children |
| `DishType` | `(workspace_id, name)` | |
| `MealType` | `(workspace_id, name)` | Has `MealTypeDishConstraint` children |
| `Recipe` | `(workspace_id, name)` | Has `RecipeIngredient`, `RecipeMealType` |
| `RecipeIngredient` | `(recipe_id, ingredient_id)` | `is_main` must be exactly 1 per recipe (domain rule) |
| `Schedule` | `(workspace_id, name)` | Has `ScheduleDay`, `GenerationSetting` |
| `ScheduleMeal` | `(schedule_day_id, meal_type_id)` | Has `MealRecipe` children |
| `WorkspaceUser` | `(user_id, workspace_id)` | Join table with role |

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

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import authPlugin from '../../../plugins/auth'
import ingredientRoutes from '../ingredients.routes'
import * as service from '../ingredients.service'

vi.mock('../ingredients.service')

const buildApp = async () => {
  const app = Fastify()
  await app.register(authPlugin)
  await app.register(ingredientRoutes, { prefix: '/ingredients' })
  await app.ready()
  return app
}

const signToken = (app: Fastify.FastifyInstance) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' })

describe('GET /ingredients/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeEach(async () => { app = await buildApp() })
  afterEach(async () => { await app.close() })

  it('returns 200 with data', async () => {
    vi.mocked(service.fetchIngredientById).mockResolvedValue({ id: '1', name: 'Salt', workspace_id: 'ws-1' })
    const res = await app.inject({
      method: 'GET',
      url: '/ingredients/1',
      headers: { authorization: `Bearer ${signToken(app)}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ data: { id: '1', name: 'Salt', workspace_id: 'ws-1' } })
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/ingredients/1' })
    expect(res.statusCode).toBe(401)
  })
})
```

---

### Service tests (`<module>.service.test.ts`)
- Mock all repository functions with `vi.fn()`
- Pass a mock PrismaClient `{} as any` — it won't be called directly
- Test: business logic, error throwing, edge cases

```ts
import { describe, it, expect, vi } from 'vitest'
import { fetchIngredientById } from '../ingredients.service'
import * as repo from '../ingredients.repository'

vi.mock('../ingredients.repository')

describe('fetchIngredientById', () => {
  it('returns ingredient when found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue({ id: '1', name: 'Salt', workspace_id: 'ws-1' })
    const result = await fetchIngredientById({} as any, '1', 'ws-1')
    expect(result.name).toBe('Salt')
  })

  it('throws 404 when not found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(null)
    await expect(fetchIngredientById({} as any, '1', 'ws-1')).rejects.toThrow()
  })
})
```

---

### Test DB setup (one-time, do this before writing repository tests)

1. Create a separate Postgres database for tests, e.g. `myapp_test`
2. Create `.env.test` manually in `app/server/` — never commit this file:
```
DATABASE_TEST_URL="postgresql://user:password@localhost:5432/myapp_test"
```
3. Add `.env.test` to `.gitignore`
4. Run migrations against the test DB:
```bash
DATABASE_URL=$DATABASE_TEST_URL npx prisma migrate deploy
```
5. Configure Vitest to load `.env.test` in `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

### Repository tests (`<module>.repository.test.ts`)
- Use a real PostgreSQL test database (set `DATABASE_TEST_URL` in `.env.test`)
- Truncate relevant tables in `beforeEach` to keep tests isolated — each test starts with a clean slate
- Test: correct Prisma queries, workspace scoping, unique constraint behaviour

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getIngredientById, createIngredient } from '../ingredients.repository'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_TEST_URL } }
})

beforeEach(async () => {
  await prisma.ingredient.deleteMany()
})

describe('getIngredientById', () => {
  it('returns ingredient scoped to workspace', async () => {
    const created = await prisma.ingredient.create({
      data: { name: 'Salt', workspace_id: 'ws-1' }
    })
    const result = await getIngredientById(prisma, created.id, 'ws-1')
    expect(result?.name).toBe('Salt')
  })

  it('does not return ingredient from different workspace', async () => {
    const created = await prisma.ingredient.create({
      data: { name: 'Salt', workspace_id: 'ws-1' }
    })
    const result = await getIngredientById(prisma, created.id, 'ws-2')
    expect(result).toBeNull()
  })
})
```

---

### Domain tests (`<module>.domain.test.ts`)
- Pure unit tests — no mocks, no DB, no Fastify
- Only create this file if the module has a `domain/` folder or `.domain.ts` file
- Test every rule and edge case exhaustively — these are the cheapest tests to write

---

## Module Generation Checklist

When asked to generate a module, always produce all of these files:
1. `packages/types/<module>.ts` — Zod schemas + inferred TypeScript types (shared with FE)
2. `modules/<module>/<module>.repository.ts` — Prisma queries, always scoped by workspaceId
3. `modules/<module>/<module>.service.ts` — Business logic, calls repository + domain, handles P2002
4. `modules/<module>/<module>.routes.ts` — Fastify route plugin, validates with Zod, calls service
5. `modules/<module>/tests/<module>.routes.test.ts` — Route tests with mocked services
6. `modules/<module>/tests/<module>.service.test.ts` — Service tests with mocked repositories
7. `modules/<module>/tests/<module>.repository.test.ts` — Repository tests against test DB
8. If the module has business rules or algorithms, create either:
   - `modules/<module>/<module>.domain.ts` — for simple/single rule checks
   - `modules/<module>/domain/<module>.rules.ts` and/or `modules/<module>/domain/<module>.algorithms.ts` — for substantial domain logic
9. If domain logic exists: `modules/<module>/tests/<module>.domain.test.ts` — pure unit tests

Then add the module to `routes/api.ts` with its prefix.

Always generate all files in one response unless told otherwise.
