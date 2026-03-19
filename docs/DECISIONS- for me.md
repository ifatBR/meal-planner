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

Simple CRUD. Nothing notable here. 409 on delete if referenced by recipes or meal_type_dish_constraints (now `meal_slots`/`dish_allocations` after the schema redesign).

---

## Meal Types

Simple CRUD — name only. Meal types are just labels (Breakfast, Lunch, Dinner). They have no order field and no dish constraints directly on them.

**Important:** Meal types had dish constraints in the original design (`MealTypeDishConstraint`). This was removed entirely during the redesign. See the WeekDaysLayout section below.

---

## Week Structure Redesign — Key Decision

### What changed and why
The original schema had `MealTypeDishConstraint` with a `day_of_week` field. This was flawed — it implied dish requirements were properties of a meal type, when actually they're properties of a specific day structure within a schedule.

The redesigned model:

```
Schedule
└── WeekDaysLayout (days: [0,1,2,3,4]) ← "Sun–Thu"
    └── MealSlot (meal_type: Lunch, order: 2)
        └── DishAllocation (dish_type: Main, amount: 2)
```

- A schedule has multiple `WeekDaysLayout` records — one per "days range" (e.g. Sun–Thu, Fri, Sat).
- Each layout covers a set of days (`days: Int[]`) that share the same meal structure.
- Each layout has meal slots in order, each slot pointing to a meal type.
- Each slot has dish allocations defining how many of each dish type are required.

### Why schedule-scoped, not workspace-scoped
`WeekDaysLayout` belongs to a `Schedule`, not directly to a `Workspace`. This means different schedules can have different week structures. For MVP this isn't used (one template per schedule), but the model already supports it without schema changes.

### Day overlap enforcement
A day should belong to exactly one `WeekDaysLayout` per schedule. This is enforced in the service layer, not at the DB level (hard to enforce with an array column). The service checks for day overlap when creating/updating layouts.

### MealSlot order
`order` on `MealSlot` is derived from the array index when the client sends meal slots. The client sends a full ordered array — the server assigns `order = index`. Reordering is done via `PATCH /api/v1/layouts/:layoutId/slots/reorder` which accepts the full new array of slot IDs and re-derives order from index in a transaction.

### Layouts reorder uses SCHEDULES.UPDATE permission
There is no separate `layouts` permission. The reorder endpoint uses `PERMISSIONS.SCHEDULES.UPDATE` — editing a layout is considered editing the schedule.

---

## Post-MVP: Day-level overrides

**Planned but not built for MVP:** The ability to override a specific day's meal structure within a generated schedule. For example, a kitchen might want to serve a special meal on a specific date that doesn't match the standard week layout.

The intended flow:
1. User edits the meal structure for a specific date (adding/removing meal slots or dish allocations for that day only).
2. Server saves the override.
3. Server offers to regenerate the schedule from that date forward, keeping everything before it intact.

This requires a new override model (something like `ScheduleDayOverride`) and partial regeneration logic in the schedule generation algorithm. The current `WeekDaysLayout` model does not need to change for this — overrides would sit alongside it.

---

## Permissions — Post-MVP

The permissions system is fully implemented in the DB and the `requirePermission` middleware, but the UI for managing permissions per role is deferred to post-MVP. For now, permissions are seeded from the `PERMISSIONS` constant in `prisma/seed.ts` and assigned to roles manually.

---

## Schedule Generation — Deferred

The generation algorithm is the most complex part of the system and is not yet built. Key decisions already made:

- **Deterministic, not AI-driven** — the algorithm is a constraint-satisfaction approach, not generative AI.
- **Best-effort for MVP** — fills what it can, marks gaps with explanations rather than failing hard.
- **Feasibility check is post-MVP** — a pre-generation check that warns the user if the constraints make a valid schedule impossible. Shares ~30% of logic with the generator.
- **Strict mode is post-MVP** — stops at first failure instead of best-effort.
- **Gap rules** — two types: same main ingredient gap (e.g. no chicken within 3 days), same recipe gap (e.g. no same recipe within 7 days). Stored in `GenerationSetting`. The `is_allow_same_day_ing` flag allows the same main ingredient on the same day (e.g. lunch and dinner both have chicken).

---

## What's left for MVP

- `recipes` module
- `schedules` module (including generation algorithm)
- `schedule-meals` module
- `users` module (admin only)
- `permissions` module (admin only — UI deferred)
- Frontend (not started)
