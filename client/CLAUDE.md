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

`src/styles/designTokens.ts` is the **single source of truth** for all design values. Every raw hex value, pixel value, font name, and shadow definition lives there and nowhere else. `src/styles/theme.ts` imports from `designTokens.ts` and feeds values into Chakra. `src/utils/constants.ts` imports from `designTokens.ts` for `MEAL_TYPE_COLORS`. No other file ever contains raw design values.

### Design system reference
Based on the "Flower" Figma UI kit. Light mode first. Dark mode is post-MVP. Reference images in `app/client/design/`.

### designTokens.ts structure

```typescript
// src/styles/designTokens.ts

export const COLORS = {
  primary: {
    default: '#02472E',
    hover: '#03603d',
    light: '#E8F5E0',
  },
  secondary: {
    default: '#45C9B2',
    hover: '#35b09b',
    light: '#E0F7F4',
  },
  highlight: {
    default: '#AEE553',
    dark: '#48C96D',
  },
  palette: {       // used for meal type colors, tags, badges — numbered slots, no semantic color names
    1: '#AEE553',
    2: '#45C9B2',
    3: '#FF6B6B',
    4: '#FFD93D',
    5: '#C77DFF',
    6: '#48C96D',
    7: '#4FC3F7',
    8: '#F48FB1',
  },
  bg: {
    base: '#F8F8F8',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#6B6B6B',
    tertiary: '#9E9E9E',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#EEEEEE',
    strong: '#DDDDDD',
  },
  semantic: {
    error: '#FF6B6B',
    warning: '#FFD93D',
    success: '#48C96D',
    info: '#4FC3F7',
    errorBg: '#FFF0F0',
    warningBg: '#FFFBEB',
    successBg: '#F0FFF4',
    infoBg: '#F0F9FF',
  },
  sidebar: {
    bg: '#FFFFFF',
    itemActiveBg: '#AEE553',
    itemActiveColor: '#02472E',
    itemColor: '#6B6B6B',
    itemHoverBg: '#F5F5F5',
  },
  btn: {
    primary: { bg: '#02472E', color: '#FFFFFF', hoverBg: '#03603d' },
    secondary: { bg: 'transparent', color: '#02472E', border: '#02472E', hoverBg: '#E8F5E0' },
    danger: { bg: '#FF6B6B', color: '#FFFFFF', hoverBg: '#ff5252' },
    disabled: { bg: '#EEEEEE', color: '#9E9E9E' },
  },
  input: {
    bg: '#FFFFFF',
    border: '#DDDDDD',
    borderFocus: '#02472E',
    borderError: '#FF6B6B',
    color: '#1A1A1A',
    placeholder: '#9E9E9E',
  },
} as const;

export const FONTS = {
  body: "'Poppins', sans-serif",
  heading: "'Poppins', sans-serif",
} as const;

export const FONT_SIZES = {
  xs: '11px', sm: '12px', md: '13px', base: '14px',
  lg: '16px', xl: '18px', '2xl': '22px', '3xl': '28px', '4xl': '36px',
} as const;

export const FONT_WEIGHTS = {
  regular: 400, medium: 500, semibold: 600, bold: 700,
} as const;

export const LINE_HEIGHTS = {
  tight: 1.3, normal: 1.5, relaxed: 1.7,
} as const;

export const SPACING = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px',
  6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
} as const;

export const RADII = {
  sm: '6px',    // list rows, badges, tags
  md: '8px',    // inputs, small buttons
  lg: '12px',   // cards
  xl: '14px',   // primary buttons, modals
  full: '9999px',
} as const;

export const SHADOWS = {
  sm: '0 1px 2px rgba(0,0,0,0.06)',
  md: '0 2px 8px rgba(0,0,0,0.08)',
  lg: '0 4px 16px rgba(0,0,0,0.10)',
  sidebar: '1px 0 2px rgba(0,0,0,0.06)',
} as const;

export const SIDEBAR = {
  widthCollapsed: '56px',
  widthExpanded: '220px',
} as const;
```

### theme.ts pattern

`theme.ts` imports from `designTokens.ts` and flattens nested COLORS for Chakra's token system using a `flattenObject` helper. Never put raw values in `theme.ts`.

### Meal type colors

Meal types have a `color` field stored in the DB. The frontend assigns a color from `COLORS.palette` when creating a meal type, cycling by index. The backend stores whatever color string is sent — it never assigns or validates colors.

```typescript
// utils/constants.ts — references designTokens, no hardcoded values
import { COLORS } from '../styles/designTokens';

export const MEAL_TYPE_COLORS = [
  COLORS.palette[1], COLORS.palette[2], COLORS.palette[3], COLORS.palette[4],
  COLORS.palette[5], COLORS.palette[6], COLORS.palette[7], COLORS.palette[8],
] as const;

// Assign color on meal type creation:
const color = MEAL_TYPE_COLORS[existingMealTypes.length % MEAL_TYPE_COLORS.length];
```

In the calendar view, each meal slot card uses the meal type's `color` field for its left border accent and chip background (tinted).

### Rules
- **`designTokens.ts` is the only file that may contain raw hex values or pixel values.**
- Never hardcode color, spacing, font, radius, or shadow values in components or any other file.
- No local style overrides — if a one-off style is needed, add a token to `designTokens.ts` instead.
- All color names are semantic (describe purpose, not appearance). The palette is the only exception — numbered slots have no semantic meaning by design.

---

## Testing

### Stack
- **Vitest** — test runner, same as backend
- **React Testing Library** — component and hook testing
- **jsdom** — browser environment simulation

### Install
```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Vitest config
Add to `vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

### What to test

| Type | Test? | Notes |
|------|-------|-------|
| Utility functions (`date.ts`, `constants.ts`) | Always | Pure functions, easy, high value |
| Custom hooks | Always | Test logic in isolation with `renderHook` |
| Complex components with logic | Yes | Forms, conditional rendering, user interactions |
| Simple presentational components | No | Low value |
| API functions | Yes | Mock fetch, assert correct URL and params |
| Chakra UI components | Never | Not our code |
| Routing config | No | Low value |

### File naming
Test files live next to the file they test:
```
src/utils/date.ts
src/utils/date.test.ts

src/hooks/useOnboardingStatus.ts
src/hooks/useOnboardingStatus.test.ts

src/pages/library/tabs/MealTypesTab.tsx
src/pages/library/tabs/MealTypesTab.test.tsx
```

### Rules
- Every utility function file gets a test file
- Every custom hook gets a test file
- Every component with conditional logic, form handling, or user interaction gets a test file
- Simple presentational components do not need test files
- Mock all API calls in component and hook tests — never hit the real API
- Use `@testing-library/user-event` for simulating user interactions, not `fireEvent`

---

## Component Conventions

### Golden rule
Never use raw Chakra primitives or HTML elements directly in pages. Always use the semantic components from `src/components/`. This ensures visual consistency and makes design changes a single-file operation.

### Typography
Always use components from `src/components/Typography.tsx`:

| Component | Use case | Never use instead |
|-----------|----------|-------------------|
| `<PageTitle>` | Top of each page | `<h1>`, `<Heading>`, `<Text>` |
| `<SectionTitle>` | Card headers, tab section headers | `<h2>`, `<Heading>` |
| `<BodyText>` | Default paragraph text | `<p>`, `<Text>` |
| `<Caption>` | Helper text, labels, metadata | `<small>`, `<Text>` |

### Buttons
Always use `<Button>` from `src/components/Button.tsx` with explicit variant:
- `variant="primary"` — main actions (Save, Generate, Create)
- `variant="secondary"` — secondary actions (Cancel, Back)
- `variant="danger"` — destructive actions (Delete)
- `variant="ghost"` — subtle actions (icon buttons, inline actions)

Never use Chakra's `<Button>` directly in pages.

### Form fields
Always use `<FormField>` from `src/components/FormField.tsx` to wrap inputs. Never use `<Input>` alone in a form — it must always be wrapped in `<FormField>` which provides the label and error message.

### Future components
As new shared components are added (Card, Badge, Modal, BottomSheet, EmptyState, Banner, Spinner, Tooltip), the same rule applies — pages import from `src/components/`, never from Chakra directly.

### Internal implementation rules
- All components must use Chakra primitives internally — `Box`, `Text`, `Heading`, `Flex`, `Stack`, etc.
- Never use raw HTML tags (`<div>`, `<h1>`, `<p>`, `<span>`, `<label>`) inside components
- Never use the `style` attribute or inline style objects — use Chakra style props instead
- Typography components use `<Heading as="h1/h2/...">` and `<Text as="p/span/label/...">` internally
- Import all design values from `src/styles/designTokens.ts` — no hardcoded values in components

---

## Key Conventions

- Plain functions only — no classes.
- No inline Zod schemas — import from `@app/types`.
- No hardcoded strings for routes — define route constants in `router/index.tsx`.
- Search inputs are debounced 300ms — never fire on every keystroke.
- Mobile and desktop share the same interaction logic. Hover states are visual affordance only — the actual action is always click/tap.
- Recipe ingredients use the two-step match flow: call `/ingredients/match` first, only call `/ingredients` to create if match returns null.
- `RecipeIngredient.display_name` — always send the variant name the user typed, not the canonical ingredient name. On read, display `displayName ?? ingredientName`.
