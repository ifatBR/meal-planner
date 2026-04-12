# CLAUDE.md — Frontend Development Guide

## Project Overview

Monorepo (FE + BE). All frontend code lives under `app/client/src/`.

---

## Stack

- **Framework:** Vite + React + TypeScript
- **Server state:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Client state:** Context API only (no Zustand, no Redux)
- **Shared types:** `@app/types` (imported from `packages/types/`)

---

## Folder Structure

```
app/client/src/
├── api/                        ← raw typed fetch functions, one file per backend module
│   ├── auth.ts
│   ├── recipes.ts
│   ├── layouts.ts
│   ├── schedules.ts
│   └── ...
├── components/                 ← shared/reusable UI components
│   ├── Toast.tsx
│   ├── Modal.tsx
│   ├── Sidebar.tsx
│   ├── EmptyState.tsx
│   └── ...
├── context/
│   ├── AuthContext.tsx          ← current user, access token, login/logout
│   └── ToastContext.tsx         ← global toast notifications
├── hooks/
│   ├── useAuth.ts               ← reads from AuthContext
│   ├── useToast.ts              ← reads from ToastContext
│   └── useOnboardingStatus.ts   ← derives onboarding state from React Query cache
├── pages/
│   ├── login/
│   │   └── LoginPage.tsx
│   ├── library/
│   │   ├── LibraryPage.tsx
│   │   └── tabs/
│   │       ├── MealTypesTab.tsx
│   │       ├── DishTypesTab.tsx
│   │       ├── IngredientsTab.tsx
│   │       ├── RecipesTab.tsx
│   │       └── LayoutsTab.tsx
│   └── schedules/
│       ├── ScheduleListPage.tsx
│       ├── SettingsPage.tsx
│       └── calendar/
│           └── CalendarPage.tsx
├── router/
│   ├── index.tsx                ← route definitions
│   └── ProtectedRoute.tsx       ← redirects to /login if not authenticated
├── types/                       ← frontend-only types not shared with BE
└── utils/
    ├── date.ts                  ← date helpers, week snapping to Sunday
    └── constants.ts
```

---

## Architecture Rules

### Server state vs client state

- **React Query** — all server data (recipes, schedules, meal types, etc.). Never duplicate server data in Context or useState.
- **Context** — only for truly global client state: auth and toasts. Nothing else.
- **useState / useReducer** — local component state (form inputs, open/closed modals, active tab).
- **URL params** — anchor date, returnTo, active tab where deep-linking makes sense.

### API layer

Raw fetch functions live in `api/`. They are plain async functions that call the backend and return typed data. They throw on non-OK responses. React Query wraps them — it never knows about the API directly.

```typescript
// api/recipes.ts
export const fetchRecipes = async (params: RecipesParams): Promise<RecipesResponse> => {
  const res = await fetch(`/api/v1/recipes?${new URLSearchParams(params)}`);
  if (!res.ok) throw await res.json();
  return res.json();
};
```

### workspaceId

Never pass workspaceId from the frontend. It is always derived from the JWT on the backend.

### All responses

All backend responses are wrapped in `{ data: <result> }`. Always unwrap before returning from api functions.

---

## Routing

### Route definitions

| Route | Page | Auth |
|-------|------|------|
| `/login` | LoginPage | Public only — redirect to `/schedules` if already authed |
| `/library` | LibraryPage | Protected |
| `/schedules` | ScheduleListPage | Protected |
| `/schedules/:id/settings` | SettingsPage | Protected |
| `/schedules/:id/calendar` | CalendarPage | Protected |

### Protected routes

Wrap protected routes with `ProtectedRoute`. If no valid auth token, redirect to `/login`.

### Settings entry point tracking

When navigating to settings from inside the calendar, pass query params:
```
/schedules/:id/settings?returnTo=calendar&anchorDate=YYYY-MM-DD
```
On back navigation or after regeneration, read these params and route accordingly. If `returnTo` is absent, back goes to `/schedules`.

### Navigation

Sidebar nav has two items only: **Library** and **Schedules**. Settings is never in the nav — it is accessed from the schedule list or from the calendar via toast/banner.

---

## Context

### AuthContext

Provides: `user` (`{ id, email, role }`), `accessToken`, `login()`, `logout()`.

On app load, attempt to refresh the token silently via `POST /auth/refresh`. If it fails, treat as unauthenticated.

### ToastContext

Provides: `showToast(message, type)` where type is `success | error | info | warning`.

One toast container rendered at the root. Toasts auto-dismiss after ~4 seconds. One-time toasts (manual edit warning, lock reminder) must be tracked in component state so they are never shown twice in the same session.

---

## Error Handling

### Rule: match the error type to the context

| Situation | Error type | Example |
|-----------|-----------|---------|
| Field-level validation (unique name, required field, invalid format) | Inline error under the field | "A recipe with this name already exists" |
| Action failed (save, delete, generate) | Toast — error variant | "Failed to save recipe. Try again." |
| Whole section failed to load | Inline error in the section with a retry button | "Failed to load recipes." |
| Unexpected rendering crash | Error boundary fallback | "Something went wrong. Reload the page." |
| 409 conflict with structured data (e.g. recipe in use) | Inline error with context | "This recipe is used in: Schedule A, Schedule B" |

### Never use a toast for field validation errors.
### Never use an inline field error for action failures.
### Error boundaries are for rendering crashes only — not API errors.

### Error boundary setup

- One root error boundary wrapping the entire app — shows generic crash screen with reload button.
- React Router v6 `errorElement` on each route — catches route-level errors, shows back button.
- No per-component error boundaries unless a component has genuinely risky third-party rendering.

---

## Onboarding

On app load after authentication, fire 5 parallel React Query calls:
- meal types list
- dish types list
- layouts list
- recipes list
- schedules list

Use `useOnboardingStatus()` hook to derive missing steps from the cache:

```typescript
// hooks/useOnboardingStatus.ts
export const useOnboardingStatus = () => {
  const mealTypes = useQuery({ queryKey: ['meal-types'], queryFn: fetchMealTypes });
  const dishTypes = useQuery({ queryKey: ['dish-types'], queryFn: fetchDishTypes });
  const layouts = useQuery({ queryKey: ['layouts'], queryFn: fetchLayouts });
  const recipes = useQuery({ queryKey: ['recipes'], queryFn: fetchRecipes });
  const schedules = useQuery({ queryKey: ['schedules'], queryFn: fetchSchedules });

  return {
    needsMealTypes: mealTypes.data?.items.length === 0,
    needsDishTypes: dishTypes.data?.items.length === 0,
    needsLayouts: layouts.data?.items.length === 0,
    needsRecipes: recipes.data?.items.length === 0,
    needsSchedules: schedules.data?.items.length === 0,
    isLoading: mealTypes.isLoading || dishTypes.isLoading || layouts.isLoading || recipes.isLoading || schedules.isLoading,
  };
};
```

Onboarding order when gaps exist: meal types → dish types → layouts → recipes → schedule list.
Ingredients are skipped — seeded on workspace creation.
No modal — inline empty state prompts with contextual instructions per tab.

---

## Manual Edit Behavior

When a user manually edits a meal (adds, deletes, or modifies a recipe in the calendar):

1. First edit in the session → show two toasts (one time only, never repeat):
   - "You've manually edited this schedule, click here to regenerate."
   - "Consider locking edited meals to protect them from regeneration."
2. After first edit → show persistent banner at top of calendar: "This schedule has manual edits — [Regenerate]" (links to settings).
3. Manually edited meals show a warning icon. On hover: "Manually edited."
4. On settings page when manual edits exist → show banner: "Some meals have been manually edited. Regenerating will overwrite unlocked meals."

`isManuallyEdited` on `ScheduleMeal` drives all of the above.

---

## Calendar Rules

- Week view only. Navigation by full weeks (prev/next buttons).
- Week always anchored to Sunday. All `anchorDate` values sent to the API must be Sundays.
- Week picker at top allows jumping to any date within the schedule range — snaps to that week's Sunday before sending.
- Default anchor on open: `startDate` of the schedule.
- Dates outside `startDate`–`endDate` are unselectable in all date pickers.

---

## Design System

### Source of truth
All design decisions live on the frontend. The backend stores design-related fields (like `MealType.color`) but never assigns, generates, or validates them. If the color scheme changes, only frontend files change.

### Design system reference
Based on the "Flower" Figma UI kit. Light mode first. Dark mode is post-MVP.

### Color tokens

```css
/* Primary */
--color-primary: #02472E;
--color-primary-hover: #03603d;
--color-primary-light: #E8F5E0;

/* Secondary */
--color-secondary: #45C9B2;
--color-secondary-hover: #35b09b;
--color-secondary-light: #E0F7F4;

/* Highlight (active sidebar state) */
--color-highlight: #AEE553;
--color-highlight-dark: #48C96D;

/* Supporting palette — used for meal type colors, tags, badges */
--color-support-1: #AEE553;  /* lime */
--color-support-2: #45C9B2;  /* teal */
--color-support-3: #FF6B6B;  /* salmon */
--color-support-4: #FFD93D;  /* yellow */
--color-support-5: #C77DFF;  /* purple */
--color-support-6: #48C96D;  /* green */
--color-support-7: #4FC3F7;  /* cyan */
--color-support-8: #F48FB1;  /* pink */

/* Backgrounds */
--color-bg-base: #F8F8F8;
--color-bg-surface: #FFFFFF;
--color-bg-elevated: #FFFFFF;

/* Text */
--color-text-primary: #1A1A1A;
--color-text-secondary: #6B6B6B;
--color-text-tertiary: #9E9E9E;
--color-text-inverse: #FFFFFF;

/* Border */
--color-border: #EEEEEE;
--color-border-strong: #DDDDDD;

/* Semantic */
--color-error: #FF6B6B;
--color-warning: #FFD93D;
--color-success: #48C96D;
--color-info: #4FC3F7;

/* Semantic backgrounds */
--color-error-bg: #FFF0F0;
--color-warning-bg: #FFFBEB;
--color-success-bg: #F0FFF4;
--color-info-bg: #F0F9FF;
```

### Typography tokens

Font: **Poppins** (Google Fonts)

```css
--font-family: 'Poppins', sans-serif;

/* Sizes */
--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-md: 13px;
--font-size-base: 14px;
--font-size-lg: 16px;
--font-size-xl: 18px;
--font-size-2xl: 22px;
--font-size-3xl: 28px;
--font-size-4xl: 36px;

/* Weights */
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line heights */
--line-height-tight: 1.3;
--line-height-normal: 1.5;
--line-height-relaxed: 1.7;
```

### Spacing tokens

Base unit: 4px. All spacing is multiples of 4.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Border radius tokens

```css
--radius-sm: 6px;   /* list rows, badges, tags */
--radius-md: 8px;   /* inputs, small buttons */
--radius-lg: 12px;  /* buttons (primary), cards */
--radius-xl: 14px;  /* modals, large cards */
--radius-full: 9999px; /* pills, avatars */
```

### Shadow tokens

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
--shadow-md: 0 2px 8px rgba(0,0,0,0.08);
--shadow-lg: 0 4px 16px rgba(0,0,0,0.10);
--shadow-sidebar: 1px 0 2px rgba(0,0,0,0.06);
```

### Sidebar tokens

```css
--sidebar-bg: #FFFFFF;
--sidebar-width-collapsed: 56px;
--sidebar-width-expanded: 220px;
--sidebar-item-active-bg: #AEE553;
--sidebar-item-active-color: #02472E;
--sidebar-item-color: #6B6B6B;
--sidebar-item-hover-bg: #F5F5F5;
```

### Component tokens — Buttons

Two sizes, two border radii:
- Default button: `--radius-lg` (14px)
- Small button: `--radius-md` (8px)

```css
/* Primary button */
--btn-primary-bg: #02472E;
--btn-primary-color: #FFFFFF;
--btn-primary-hover-bg: #03603d;

/* Secondary button */
--btn-secondary-bg: transparent;
--btn-secondary-color: #02472E;
--btn-secondary-border: #02472E;
--btn-secondary-hover-bg: #E8F5E0;

/* Danger button */
--btn-danger-bg: #FF6B6B;
--btn-danger-color: #FFFFFF;
--btn-danger-hover-bg: #ff5252;

/* Disabled state — applies to all button types */
--btn-disabled-bg: #EEEEEE;
--btn-disabled-color: #9E9E9E;
```

### Component tokens — Inputs

```css
--input-bg: #FFFFFF;
--input-border: #DDDDDD;
--input-border-focus: #02472E;
--input-border-error: #FF6B6B;
--input-color: #1A1A1A;
--input-placeholder-color: #9E9E9E;
--input-radius: var(--radius-md);
--input-padding: var(--space-2) var(--space-3);
```

### Meal type colors

Meal types have a `color` field stored in the DB. The frontend assigns a color from the supporting palette when creating a meal type, cycling by index. The backend stores whatever color string is sent — it never assigns or validates colors.

```typescript
// utils/constants.ts
export const MEAL_TYPE_COLORS = [
  '#AEE553', // lime
  '#45C9B2', // teal
  '#FF6B6B', // salmon
  '#FFD93D', // yellow
  '#C77DFF', // purple
  '#48C96D', // green
  '#4FC3F7', // cyan
  '#F48FB1', // pink
];

// Assign color on meal type creation:
const color = MEAL_TYPE_COLORS[existingMealTypes.length % MEAL_TYPE_COLORS.length];
```

In the calendar view, each meal slot card uses the meal type's `color` field for its left border accent and its chip background (tinted).

### Rules
- **Never hardcode color values in components.** Always use CSS variables.
- **Never hardcode spacing values.** Always use spacing tokens.
- **Never hardcode font sizes.** Always use font size tokens.
- **No local style overrides.** If a one-off style is needed, add a token instead.
- All design tokens are defined in `src/styles/tokens.css` and imported once at the app root.

---

## Key Conventions

- Plain functions only — no classes.
- No inline Zod schemas — import from `@app/types`.
- No hardcoded strings for routes — define route constants in `router/index.tsx`.
- Search inputs are debounced 300ms — never fire on every keystroke.
- Mobile and desktop share the same interaction logic. Hover states are visual affordance only — the actual action is always click/tap.
- Recipe ingredients use the two-step match flow: call `/ingredients/match` first, only call `/ingredients` to create if match returns null.
- `RecipeIngredient.display_name` — always send the variant name the user typed, not the canonical ingredient name. On read, display `displayName ?? ingredientName`.
