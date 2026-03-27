# Meal Planner — Developer Documentation

## What This App Does

A meal cycle planner for large kitchens (restaurants, catering, institutions). Kitchens plan 1–3 month meal cycles — defining what meals are served on which days, ensuring variety through gap rules (e.g. no chicken twice in 3 days), and automatically generating schedules based on constraints.

The system is multi-tenant: each kitchen is a "workspace" with its own ingredients, recipes, dish types, meal types, layouts, and schedules.

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
│   ├── errors.ts        ← error factory functions + isP2002 helper
│   └── date.ts          ← parseDate() and formatDate() — always import from here
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

Permissions are stored in the DB and checked per request via `fastify.requirePermission`. Read endpoints on workspace data only require authentication — no permission check. Write endpoints require a specific permission.

### JWT
JWT payload: `{ userId, workspaceId, role }`. Access tokens are short-lived. Refresh tokens are hashed with SHA-256 before storage. Dual delivery: httpOnly cookie (web) + response body (mobile).

---

## Module Overview

### Auth (`/api/v1/auth`) ✅

Handles registration, login, logout, token refresh, and `GET /me`.

On registration:
1. Creates a user with an Argon2-hashed password
2. Creates a workspace
3. Seeds the workspace with the global ingredient dictionary from `prisma/global-ingredients.json`
4. Returns access + refresh tokens

### Ingredients (`/api/v1/ingredients`) ✅

Manages the workspace ingredient dictionary. Seeded from a global JSON file on workspace creation, then fully owned by the workspace (can be edited or deleted freely).

**Two-step ingredient creation flow:**
1. Client calls `POST /ingredients/match` with a name — server checks for exact match first, then uses AI if no exact match found. Returns the matched ingredient or null. Never creates anything.
2. Only if match returns null does the client call `POST /ingredients` to create.

**Variants:**
Ingredients have variants serving two purposes:
- Name variants: "aubergine" and "brinjal" are variants of "eggplant"
- Family variants: "chicken breast", "chicken thigh" are variants of "chicken"

Both types are stored identically in `IngredientVariant` and treated the same way for gap calculation: all variants resolve to their parent ingredient when checking gaps.

### Dish Types (`/api/v1/dish-types`) ✅

Simple CRUD. Examples: "Salad", "Main", "Soup", "Dessert". Scoped to workspace. Cannot delete if referenced by recipes or meal slots.

### Meal Types (`/api/v1/meal-types`) ✅

Simple CRUD — name only. Examples: "Breakfast", "Lunch", "Dinner". Scoped to workspace. Meal types are just labels — dish constraints are defined in the week layout structure, not on meal types directly.

### Layouts (`/api/v1/layouts`) ✅

A `Layout` is a workspace-level reusable entity. Multiple schedules can share the same layout. Layouts have a name and own a set of `WeekDaysLayout` records that define the week structure.

**Key behaviours:**
- Structural edits (changing `weekDaysLayouts`) are blocked if the layout is used by 2+ schedules. If used by only 1 schedule, edits are allowed.
- PATCH and DELETE accept a `scheduleId` query param for context when enforcing the above rule.
- `inUse` boolean is included on list responses (calculated, never stored).
- `usedBySchedules: [{ id, name }]` is included on detail responses.
- A clone endpoint creates an editable copy of an in-use layout.
- PATCH with `weekDaysLayouts` performs wholesale replacement — existing records are deleted and recreated in a transaction. Order is derived from array index.
- Layout write endpoints use `PERMISSIONS.SCHEDULES.UPDATE` — there is no separate layouts permission.

### Recipes (`/api/v1/recipes`) ✅

Recipes have ingredients, dish types, and meal types. Key rules:
- Must have at least one dish type and at least one meal type.
- Must have exactly one main ingredient (`is_main = true`) per recipe.
- `RecipeIngredient.display_name` stores the variant name typed by the user (e.g. "aubergine") — falls back to `Ingredient.name` on read if null.
- Cannot delete a recipe referenced by any `MealRecipe` — returns 409 with affected schedule names and dates.

### Schedules (`/api/v1/schedules`) ✅

Schedules define a date range and reference a layout. Generation produces `ScheduleDay` and `ScheduleMeal` records.

**Key behaviours:**
- `layoutId` is required at creation and can be changed at generation time. It cannot be changed via PATCH.
- `startDate` and `endDate` are immutable after creation.
- `ScheduleDay` records are only created during generation — not at schedule creation.
- Calendar window: anchorDate−7 through anchorDate+13 (21 days), clamped to schedule bounds.

**Generation:**
- Runs synchronously, best-effort — returns partial results with warnings.
- Summary counters (`filledMealSlots`, `partialMealSlots`, `emptyMealSlots`) are per meal slot, not per dish allocation.
- Locked meals carry their existing recipes through regeneration unchanged.
- All unlocked `ScheduleMeal.isManuallyEdited` flags reset to `false` on regeneration.

### Schedule Meals (`/api/v1/schedule-meals`) ✅

Manages individual meal assignments within a generated schedule.

**`isManuallyEdited` flag:**
- Set to `true` on any manual PATCH or DELETE.
- Reset to `false` on regeneration for all unlocked meals.
- `DELETE /schedule-meals/:id/recipes` sets `isLocked=false` AND `isManuallyEdited=true`.

### Users ⏳ Post-MVP
### Permissions ⏳ Post-MVP

---

## Week Structure Model

This is the most important domain model to understand.

```
Layout (workspace-level, reusable)
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

**Layout** — workspace-level, reusable across schedules. Has a name.

**WeekDaysLayout** — a group of days that share the same meal structure. One layout can have multiple (e.g. weekdays vs Friday vs Saturday).

**MealSlot** — a meal that appears on those days, in a specific order position. Points to a `MealType`.

**DishAllocation** — how many of a specific dish type are required in that meal slot.

A schedule references a layout via `layout_id`. A day belongs to exactly one `WeekDaysLayout` per layout — enforced in the service layer.

---

## Schedule Generation

The algorithm:
1. Reads the week structure (WeekDaysLayouts → MealSlots → DishAllocations) for the layout
2. For each day in the schedule date range, finds the matching layout
3. For each meal slot, finds a recipe that matches dish type and meal type without violating gap rules
4. Assigns the recipe to the schedule meal
5. Marks any unfillable slots with explanations (best-effort)

Gap rules are stored in `GenerationSetting` per schedule:
- `recipe_gap` — minimum days between the same recipe
- `main_ing_gap` — minimum days between the same main ingredient
- `is_allow_same_day_ing` — whether the same main ingredient can appear in two different meals on the same day

All date parsing uses `parseDate()` from `src/utils/date.ts` (uses `Date.UTC()` to avoid off-by-one errors in non-UTC timezones). Never use `new Date('YYYY-MM-DD')` directly.

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
- `parseDate` and `formatDate` always imported from `../../utils/date` — never defined inline
- `fp` is only used on `plugins/prisma.ts` and `plugins/auth.ts` — never on route files
- Read endpoints use `fastify.authenticate` only. Write endpoints add `fastify.requirePermission(PERMISSIONS.<MODULE>.<ACTION>)`

---

## Error Handling

All error helpers are in `utils/errors.ts`:

| Helper | HTTP Status | When to use |
|--------|-------------|-------------|
| `notFoundError()` | 404 | Repository returned null for the route param resource |
| `conflictError()` | 409 | Unique constraint violation or referential constraint on delete |
| `forbiddenError()` | 403 | Permission check failed |
| `unAuthorizedError()` | 401 | Not authenticated |
| `ruleViolationError()` | 422 | Business rule violated |
| `invalidRequestError()` | 400 | Invalid input in request body (e.g. body IDs that don't exist) |
| `internalError()` | 500 | Unexpected server error |

**404 vs 400:** `notFoundError()` is for the resource identified by the route param. `invalidRequestError()` is for invalid values in the request body (e.g. `dishTypeIds` that don't exist). Never return 404 for a body value that doesn't exist.

`isP2002(err)` — checks if a Prisma error is a unique constraint violation (P2002). Use in services to catch and rethrow as `conflictError()`.

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

Route tests never hit the DB. Repository tests always use a real DB (`DATABASE_URL` in `.env.test`).

---

## Planned Post-MVP Features

- **Day-level overrides** — override a specific day's meal structure within a generated schedule (e.g. special meal for a holiday), with optional partial regeneration from that date forward
- **Feasibility check** — pre-generation check that warns if constraints make a valid schedule impossible
- **Strict generation mode** — stop at first failure instead of best-effort
- **Permission management UI** — backend is fully implemented, UI deferred
- **AI match caching** — cache ingredient match results per workspace to reduce AI API calls
- **Schedule templates** — reusable week structures across schedules
- **Multi-language ingredient dictionary** — currently English only
- **Role permission caching** — currently one DB query per protected request
