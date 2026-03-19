# Meal Planner — Developer Documentation

## What This App Does

A meal cycle planner for large kitchens (restaurants, catering, institutions). Kitchens plan 1–3 month meal cycles — defining what meals are served on which days, ensuring variety through gap rules (e.g. no chicken twice in 3 days), and automatically generating schedules based on constraints.

The system is multi-tenant: each kitchen is a "workspace" with its own ingredients, recipes, dish types, meal types, and schedules.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Fastify |
| Validation | Zod |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Testing | Vitest |
| Monorepo | npm workspaces |

---

## Repository Structure

```
meal-planner/
├── app/
│   ├── server/          ← backend (this codebase)
│   └── client/          ← frontend (TBD)
└── packages/
    └── types/           ← shared Zod schemas and TypeScript types
```

### Backend structure

```
app/server/src/
├── modules/             ← one folder per feature module
├── routes/
│   └── api.ts           ← registers /api/v1 prefix and all module routes
├── plugins/
│   ├── prisma.ts        ← Prisma client as Fastify plugin
│   └── auth.ts          ← JWT auth + permission middleware
├── utils/
│   └── errors.ts        ← error factory functions + isP2002 helper
├── lib/
│   └── ai/              ← AI provider abstraction (OpenAI / Anthropic)
└── constants/
    └── index.ts         ← barrel export for all constants
```

---

## Getting Started

### Prerequisites
- Node.js v20+
- PostgreSQL

### Setup

```bash
# Install dependencies
cd app/server
npm install

# Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, OPENAI_API_KEY (or ANTHROPIC_API_KEY)

# Run migrations
npm run db:migrate

# Seed roles and permissions
npm run db:seed

# Start dev server
npm run dev
```

### Test database setup

```bash
# Create a separate test database
createdb meal_planner_test

# Add to app/server/.env.test:
# DATABASE_URL="postgresql://user@localhost:5432/meal_planner_test"

# Run migrations on test DB
npm run db:migrate_test

# Seed test DB
dotenv -e .env.test -- tsx prisma/seed.ts
```

### Running tests

```bash
npm run test
```

---

## Core Concepts

### Workspace
Every piece of data belongs to a workspace. A workspace is created when a user registers. The `workspace_id` is embedded in the JWT and automatically scoped to every DB query. Users never provide `workspace_id` in requests — it always comes from the JWT.

### Roles and Permissions
Three roles: `admin`, `editor`, `viewer`.

- **Viewer** — can read all workspace data, no write access
- **Editor** — can read and write workspace data (ingredients, recipes, meal types, etc.)
- **Admin** — full access including user and permission management

Permissions are stored in the DB and checked per request via `fastify.requirePermission`. Read endpoints on workspace data (ingredients, recipes, etc.) only require authentication — no permission check. Write endpoints require a specific permission.

### JWT
JWT payload: `{ userId, workspaceId, role }`. Access tokens are short-lived. Refresh tokens are hashed with SHA-256 before storage. Dual delivery: httpOnly cookie (web) + response body (mobile).

---

## Module Overview

### Auth (`/api/v1/auth`)

Handles registration, login, logout, token refresh, and `GET /me`.

On registration:
1. Creates a user with an Argon2-hashed password
2. Creates a workspace
3. Seeds the workspace with the global ingredient dictionary from `prisma/global-ingredients.json`
4. Returns access + refresh tokens

### Ingredients (`/api/v1/ingredients`)

Manages the workspace ingredient dictionary. Seeded from a global JSON file on workspace creation, then fully owned by the workspace (can be edited or deleted freely).

**Two-step ingredient creation flow:**
1. Client calls `POST /ingredients/match` with a name — server checks for exact match first, then uses AI if no exact match found. Returns the matched ingredient or null. Never creates anything.
2. Only if match returns null does the client call `POST /ingredients` to create.

This prevents duplicates without the server making creation decisions.

**Variants:**
Ingredients have variants — these serve two purposes:
- Name variants: "aubergine" and "brinjal" are variants of "eggplant" (same thing, different name)
- Family variants: "chicken breast", "chicken thigh", "chicken wings" are variants of "chicken" (same ingredient family)

Both types are stored identically in the `IngredientVariant` table and treated the same way for gap calculation: all variants resolve to their parent ingredient when checking gaps.

When a user types "aubergine" in a recipe, the `RecipeIngredient.display_name` stores "aubergine" for display, but `ingredient_id` points to the canonical "eggplant" ingredient for gap logic.

**AI provider:**
Abstracted behind `lib/ai/AIClient` interface. Switch provider by changing `AI_PROVIDER` in `constants/ai.ts`. Both OpenAI and Anthropic implementations are present. Only high-confidence AI matches are used.

### Dish Types (`/api/v1/dish-types`)

Simple CRUD. Examples: "Salad", "Main", "Soup", "Dessert". Scoped to workspace. Cannot delete if referenced by recipes or meal slots.

### Meal Types (`/api/v1/meal-types`)

Simple CRUD — name only. Examples: "Breakfast", "Lunch", "Dinner", "Brunch". Scoped to workspace. Cannot delete if referenced by recipes, schedule meals, or meal slots.

Meal types are just labels. They have no dish constraints or ordering on them directly — that's defined in the week layout (see below).

### Layouts (`/api/v1/layouts`)

A single endpoint: `PATCH /layouts/:layoutId/slots/reorder`. Reorders meal slots within a week days layout by accepting the full array of slot IDs in the new order. Order is derived from array index. Uses `SCHEDULES.UPDATE` permission.

Layouts themselves are created and managed as part of schedule creation/generation — not via standalone CRUD.

---

## Week Structure Model

This is the most important domain model to understand. It defines how a week is structured for a schedule.

```
Schedule
└── WeekDaysLayout         ← "Sunday through Thursday"
│   ├── days: [0,1,2,3,4]  ← day-of-week ints (0=Sunday, 6=Saturday)
│   └── MealSlot           ← "Lunch" at order 2
│       └── DishAllocation ← "2 x Main dish"
│       └── DishAllocation ← "1 x Salad"
└── WeekDaysLayout         ← "Friday"
    ├── days: [5]
    └── MealSlot           ← "Festive Lunch" at order 1
        └── DishAllocation ← "1 x Festive Main"
```

**WeekDaysLayout** — a group of days that share the same meal structure. One schedule can have multiple layouts (e.g. weekdays vs Friday vs Saturday).

**MealSlot** — a meal that appears on those days, in a specific order position. Points to a `MealType`.

**DishAllocation** — how many of a specific dish type are required in that meal slot.

A day belongs to exactly one layout per schedule — enforced in the service layer.

---

## Schedule Generation (not yet built)

The generation algorithm will:
1. Read the week structure (WeekDaysLayouts → MealSlots → DishAllocations) for the schedule
2. For each day in the schedule date range, find the matching layout
3. For each meal slot in that layout, find a recipe that:
   - Matches the dish type and meal type
   - Doesn't violate gap rules (same main ingredient gap, same recipe gap)
4. Assign the recipe to the schedule meal
5. Mark any unfillable slots with explanations (best-effort mode)

Gap rules are stored in `GenerationSetting` per schedule:
- `recipe_gap` — minimum days between the same recipe
- `main_ing_gap` — minimum days between the same main ingredient
- `is_allow_same_day_ing` — whether the same main ingredient can appear in two different meals on the same day

---

## Adding a New Module

Follow this checklist:

1. **Zod schemas** → `packages/types/<module>.ts` — one schema per endpoint, never reuse
2. **Repository** → `modules/<module>/<module>.repository.ts` — Prisma queries, scoped by `workspace_id`, returns data or null, never throws domain errors
3. **Service** → `modules/<module>/<module>.service.ts` — business logic, calls repository, throws domain errors, catches P2002 using `isP2002` from `utils/errors.ts`
4. **Routes** → `modules/<module>/<module>.routes.ts` — validates with Zod, calls service, returns `{ data: result }`
5. **Tests** — route tests (mocked service + mocked prisma), service tests (mocked repository), repository tests (real test DB), domain tests (if applicable)
6. **Register** → add to `routes/api.ts` with its prefix

### Key conventions

- `prisma` is always the first parameter in repository and service functions
- `workspaceId` always comes from `request.user.workspaceId` — never from body or params
- All responses return `{ data: <result> }`
- All error helpers are imported from `utils/errors.ts`
- All constants are imported from `constants/index.ts` (barrel export)
- `ROLES` and `Role` are imported from `@app/types/roles` — not from constants
- `fp` is only used on `plugins/prisma.ts` and `plugins/auth.ts` — never on route files
- Read endpoints use `fastify.authenticate` only. Write endpoints add `fastify.requirePermission(PERMISSIONS.<MODULE>.<ACTION>)`

---

## Error Handling

All error helpers are in `utils/errors.ts`:

| Helper | HTTP Status | When to use |
|--------|-------------|-------------|
| `notFoundError()` | 404 | Repository returned null |
| `conflictError()` | 409 | Unique constraint violation or referential constraint on delete |
| `forbiddenError()` | 403 | Permission check failed |
| `unAuthorizedError()` | 401 | Not authenticated |
| `ruleViolationError()` | 422 | Business rule violated |
| `invalidRequestError()` | 400 | Invalid input not caught by Zod |
| `internalError()` | 500 | Unexpected server error |

`isP2002(err)` — checks if a Prisma error is a unique constraint violation (P2002). Use this in services to catch and rethrow as `conflictError()`.

---

## Prisma

Prisma 7 requires a driver adapter. Always instantiate with:

```ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
```

Prisma is never imported directly in modules. It is registered as a Fastify plugin in `plugins/prisma.ts` and accessed as `fastify.prisma` in routes, then passed down to services and repositories as the first parameter.

---

## Testing Strategy

| Test type | Isolation | What it tests |
|-----------|-----------|---------------|
| Route tests | Mocked service + mocked prisma | HTTP layer: status codes, response shape, auth, permissions |
| Service tests | Mocked repository, `{} as any` for prisma | Business logic, error throwing, edge cases |
| Repository tests | Real test DB, truncated before each test | Prisma queries, workspace scoping, constraint behaviour |
| Domain tests | Pure functions, no mocks | Business rules and algorithms |

Route tests never hit the DB. Repository tests always use a real DB (`DATABASE_TEST_URL` in `.env.test`).

---

## Planned Post-MVP Features

- **Day-level overrides** — ability to override a specific day's meal structure within a generated schedule (e.g. special meal for a holiday). After saving an override, the system offers to regenerate the schedule from that date forward, preserving everything before it.
- **Partial regeneration** — regenerate from a specific date, keeping locked meals intact
- **Feasibility check** — pre-generation check that warns if constraints make a valid schedule impossible
- **Strict generation mode** — stop at first failure instead of best-effort
- **Permission management UI** — the backend is fully implemented, the UI is deferred
- **AI match caching** — cache ingredient match results per workspace to reduce AI API calls
- **Schedule templates** — reusable week structures across schedules
- **Multi-language ingredient dictionary** — currently English only
- **Role permission caching** — cache permission checks per role (currently one DB query per protected request)
