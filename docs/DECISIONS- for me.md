# MVP Decision Log — Meal Planner Backend

This document captures the key architectural and design decisions made during the MVP build, including the reasoning behind them and what's been deferred to later versions. Written for the original developer as a reference.

---

## Overall Architecture

### Monorepo structure
The project is a monorepo with `app/server` (backend), `app/client` (frontend, TBD), and `packages/types` (shared Zod schemas and TypeScript types). Shared types live in `packages/types` so both FE and BE can import the same schemas without duplication.

### Plain functions, no classes
All service and repository code uses plain exported functions. No classes, no dependency injection containers. Prisma is passed as the first parameter through every layer (routes → service → repository). This keeps things simple and easy to test without complex mocking setups.

### Hard deletes only
Soft deletes were considered and deferred to post-MVP. For now everything is a hard delete. If soft deletes are needed later, add `deleted_at DateTime?` to relevant models and add a `where: { deleted_at: null }` filter everywhere.

### workspaceId always from JWT
`workspaceId` is never trusted from the request body or params — always sourced from the decoded JWT. This prevents any cross-workspace data leakage.

---

## Auth

### Argon2 for passwords, SHA-256 for refresh tokens
Argon2 is the correct choice for password hashing (slow by design). SHA-256 for refresh tokens is fine because refresh tokens are already random high-entropy strings — they don't need the extra slowness of Argon2.

### Dual delivery (cookie + body)
Auth tokens are returned both as an httpOnly cookie (for web) and in the response body (for mobile). The `rememberMe` flag controls expiry: true = 90 days, false = 30 days.

### requirePermission as a Fastify decorator
`requirePermission` lives on the Fastify instance (`fastify.requirePermission`), not as a standalone import. This was a deliberate choice to keep it tied to the request lifecycle and avoid circular imports. It does a DB query per request for MVP — caching is post-MVP.

### Viewer role has no permissions
Viewers can read all workspace data (ingredients, recipes, etc.) but cannot write anything. Read access is controlled by `fastify.authenticate` only — no permission check needed for reads on workspace data modules.

---

## Ingredients

### Two-step match flow
`POST /ingredients/match` is called first — it checks for an exact match in the workspace, then falls back to AI matching. It never creates anything. Only if it returns null does the client call `POST /ingredients` to create. This prevents duplicates without the server having to decide whether to create or return existing.

### AI matching abstraction
The AI client is abstracted behind an `AIClient` interface in `lib/ai/`. OpenAI is the active provider but Anthropic is also implemented. Switch by changing `AI_PROVIDER` in `constants/ai.ts`. The interface returns `{ match: string | null, confidence: 'high' | 'low' }` — only `high` confidence matches are acted on.

### Variants replace aliases — and also cover ingredient families
What started as "aliases" (aubergine = eggplant) was merged with "variants" (chicken breast, chicken thigh → chicken) into a single `IngredientVariant` model. The reasoning: both serve the same purpose for gap calculation — resolve to a canonical ingredient before comparing. There's no mechanical difference between the two cases, so there's no reason to have two separate mechanisms.

The `IngredientVariant` table has a `variant` field (not `alias`), a `workspace_id`, and an `ingredient_id` pointing to the canonical ingredient.

### Global ingredient dictionary is a JSON file
`prisma/global-ingredients.json` is seeded into each new workspace on registration via `seedWorkspaceIngredients`. There is no shared global ingredient table at runtime — each workspace owns its ingredients fully. This keeps multi-tenancy clean and allows workspaces to freely edit or delete their ingredients.

### Gap calculation uses variants
For gap rules, resolve each recipe's main ingredient to its parent ingredient via `IngredientVariant`. If ingredient X has variants pointing to it, it's the canonical one. If ingredient X is itself a variant of Y, resolve to Y. Chicken breast and chicken thigh both resolve to chicken, so they count as the same ingredient for gap purposes.

---

## Ingredients — Post-MVP notes
- AI matching currently has no caching — every match call hits the AI API. Consider caching results by workspace.
- The global ingredient dictionary is English only (except foreign words commonly used in English). Multi-language support is post-MVP.

---

## Dish Types

Simple CRUD. Nothing notable here. 409 on delete if referenced by recipes or meal slots/dish allocations.

---

## Meal Types

Simple CRUD — name only. Meal types are just labels (Breakfast, Lunch, Dinner). They have no order field and no dish constraints directly on them.

**Important:** Meal types had dish constraints in the original design (`MealTypeDishConstraint`). This was removed entirely during the redesign — dish constraints are now defined in `DishAllocation` within the week layout structure.

---

## Week Structure Redesign — Key Decision

### What changed and why
The original schema had `MealTypeDishConstraint` with a `day_of_week` field. This was flawed — it implied dish requirements were properties of a meal type, when actually they're properties of a specific day structure within a schedule.

The redesigned model:

```
Layout (workspace-level, reusable)
└── WeekDaysLayout (days: [0,1,2,3,4]) ← "Sun–Thu"
    └── MealSlot (meal_type: Lunch, order: 2)
        └── DishAllocation (dish_type: Main, amount: 2)
```

- A `Layout` is a workspace-level entity with a name. It is reusable across schedules.
- A layout has multiple `WeekDaysLayout` records — one per "days range" (e.g. Sun–Thu, Fri, Sat).
- Each layout covers a set of days (`days: Int[]`) that share the same meal structure.
- Each layout has meal slots in order, each slot pointing to a meal type.
- Each slot has dish allocations defining how many of each dish type are required.

### Why layouts are workspace-scoped, not schedule-scoped
`Layout` is a workspace-level entity so it can be reused across multiple schedules. A schedule holds a `layout_id` FK. This means the same week structure can be applied to many schedules without duplication.

`WeekDaysLayout` (and its children `MealSlot`, `DishAllocation`) belong to `Layout`, not to `Schedule`. The schedule just references the layout by ID.

### Layout mutability rules
Editing a layout's structure (its `WeekDaysLayouts`) is blocked if the layout is used by 2 or more schedules. If it's used by exactly 1 schedule, structural edits are allowed (since no other schedule would be affected). The `scheduleId` query param on PATCH and DELETE provides this context.

The `inUse` boolean is calculated on list responses — never stored. The `usedBySchedules: [{ id, name }]` array is included on detail responses so the frontend can render lock state and info tooltips.

A clone endpoint exists for creating an editable copy of an in-use layout.

### layoutId on schedule creation and generation
`layoutId` is required at schedule creation and can be changed at generation time (to apply a different layout to a new or regenerated schedule). It cannot be changed via `PATCH /schedules/:id` — only via the generate endpoint.

### Day overlap enforcement
A day belongs to exactly one `WeekDaysLayout` per layout — enforced in the service layer, not at the DB level (hard to enforce with an array column).

### MealSlot order
`order` on `MealSlot` is derived from the array index when the client sends meal slots. The client sends a full ordered array — the server assigns `order = index`. Reordering is handled via PATCH with a full `weekDaysLayouts` array — order is re-derived from index. No separate reorder endpoint. PATCH performs wholesale replacement: if `weekDaysLayouts` is provided, all existing records are deleted and recreated in a transaction.

### Layouts use SCHEDULES permissions
There is no separate `layouts` permission. Layout write endpoints use `PERMISSIONS.SCHEDULES.UPDATE` — editing a layout is considered editing the schedule.

---

## Schedules

### startDate and endDate are immutable
Once set at creation, the schedule date range cannot be changed. Regeneration can change the layout but not the dates.

### ScheduleDay created on generation, not creation
`ScheduleDay` records are only created during generation. Creating a schedule just stores the metadata (name, dates, layout, generation settings). The actual day/meal records are produced by the generation algorithm.

### Calendar window
The calendar view window is anchorDate−7 through anchorDate+13 (21 days), clamped to schedule bounds.

---

## Schedule Generation

### Built for MVP — best-effort, synchronous
The generation algorithm is fully implemented. It runs synchronously and returns partial results with warnings rather than failing hard when constraints can't be satisfied.

### Deterministic, not AI-driven
The algorithm is a constraint-satisfaction approach — not generative AI. It fills meal slots deterministically based on gap rules and dish type requirements.

### Summary counts meal slots, not dish allocations
All summary counters (`filledMealSlots`, `partialMealSlots`, `emptyMealSlots`) are calculated per meal slot, not per individual dish allocation. `partialMealSlots` is calculated after the dish allocation loop by comparing `totalNeeded` vs `totalFilled`. `emptyMealSlots` counts completely unfilled slots.

### Locked meals preserved on regeneration
Locked meals carry their actual recipes into `GeneratedMeal` during regeneration. The `LockedMealForGeneration` type includes `recipes: Array<{ recipeId, dishTypeId }>` so locked assignments are preserved exactly.

### isManuallyEdited flag
`ScheduleMeal` has an `isManuallyEdited Boolean @default(false)` field. It is set to `true` on any manual PATCH or DELETE of a schedule meal. It is reset to `false` on regeneration for all unlocked meals. `DELETE /schedule-meals/:id/recipes` sets `isLocked=false` AND `isManuallyEdited=true`.

### Timezone handling
All `YYYY-MM-DD` date strings are parsed via `parseDate()` from `src/utils/date.ts`, which uses `Date.UTC()` to avoid off-by-one day errors in non-UTC timezones. Prisma `Date` objects are used directly without re-wrapping. `formatDate` also lives in the same file.

### Feasibility check is post-MVP
A pre-generation check that warns the user if constraints make a valid schedule impossible. Shares ~30% of logic with the generator.

### Strict mode is post-MVP
Stops at first failure instead of best-effort.

---

## Permissions — Post-MVP

The permissions system is fully implemented in the DB and the `requirePermission` middleware, but the UI for managing permissions per role is deferred to post-MVP. For now, permissions are seeded from the `PERMISSIONS` constant in `prisma/seed.ts` and assigned to roles manually.

---

## What's left for MVP

- Frontend
- Registration / workspace bootstrap script or simple internal screen
- Users module (admin only)
- Permissions module (admin only — UI deferred)
