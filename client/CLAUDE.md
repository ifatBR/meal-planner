# CLAUDE.md — Frontend Development Guide

## Project Overview

Monorepo (FE + BE). All frontend code lives under `app/client/src/`.

---

## Stack

- **Framework:** Vite + React + TypeScript
- **Server state:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Client state:** Context API only (no Zustand, no Redux)
- **Shared types:** `@app/types` (imported from `packages/types/`) — never redefine types that exist here, never import Zod schemas into the frontend, types only
- **Toast system:** Chakra UI v3 `toaster.create()` from `src/components/ui/toaster` — no custom toast context. Use `useToast` from `src/hooks/useToast.ts` for convenience methods.

---

## Folder Structure

```
app/client/src/
├── api/                        ← raw typed fetch functions, one file per backend module
│   ├── apiClient.ts            ← apiFetch wrapper + setAccessTokenGetter
│   ├── auth.ts
│   ├── mealTypes.ts
│   ├── dishTypes.ts
│   ├── ingredients.ts
│   ├── recipes.ts
│   ├── layouts.ts
│   ├── schedules.ts
│   └── ...
├── components/                 ← shared/reusable UI components
│   ├── NavItem.tsx             ← reusable nav/sidebar item with icon + label
│   ├── Sidebar.tsx
│   ├── AppLayout.tsx
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── FormField.tsx
│   ├── Typography.tsx
│   ├── InlineEditInput.tsx
│   ├── EditableListItem.tsx
│   ├── ConfirmDialog.tsx
│   ├── Pagination.tsx          ← reusable prev/next pagination
│   ├── LoadingError.tsx        ← inline error message with retry button
│   ├── HighlightedText.tsx     ← highlights matching substring in text
│   ├── Modal.tsx
│   ├── EmptyState.tsx
│   └── ...
├── context/
│   └── AuthContext.tsx          ← current user, access token, login/logout
├── hooks/
│   ├── useAuth.ts               ← reads from AuthContext
│   ├── useToast.ts              ← wraps toaster with success/error/info/warning
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
│   │       ├── IngredientTabComponents/  ← sub-components for IngredientsTab (accordion etc.)
│   │       ├── RecipesTab.tsx
│   │       └── LayoutsTab.tsx
│   └── schedules/
│       ├── ScheduleListPage.tsx
│       ├── SettingsPage.tsx
│       └── calendar/
│           └── CalendarPage.tsx
├── router/
│   ├── index.tsx                ← route definitions, nested layout routes
│   └── ProtectedRoute.tsx       ← redirects to /login if not authenticated
├── styles/
│   ├── designTokens.ts          ← single source of truth for all design values
│   └── theme.ts                 ← Chakra theme built from designTokens
├── types/                       ← frontend-only types not shared with BE
└── utils/
    ├── date.ts                  ← date helpers, week snapping to Sunday
    └── constants.ts             ← ROUTES, MEAL_TYPE_COLORS, API_BASE
```

### File size rule

When a page or tab component grows too long, extract sub-components into a folder named after the parent file, e.g. `src/pages/library/tabs/IngredientTabComponents/`. Sub-components in that folder are private to that tab — do not import them from other pages.

---

## Architecture Rules

### Server state vs client state

- **React Query** — all server data (recipes, schedules, meal types, etc.). Never duplicate server data in Context or useState.
- **Context** — only for truly global client state: auth. Nothing else.
- **useState / useReducer** — local component state (form inputs, open/closed modals, active tab).
- **URL params** — anchor date, returnTo, active tab where deep-linking makes sense.

### API layer

All fetch calls go through `apiFetch` from `src/api/apiClient.ts` — never use raw `fetch` directly. `apiFetch` automatically attaches `Authorization: Bearer <token>` and `credentials: 'include'`. Do not set these manually in individual API functions.

```typescript
// api/mealTypes.ts
export const fetchMealTypes = async (): Promise<MealTypeResponse[]> => {
  const res = await apiFetch(`${API_BASE}/meal-types`);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};
```

### workspaceId

Never pass workspaceId from the frontend. It is always derived from the JWT on the backend.

### All responses

All backend responses are wrapped in `{ data: <r> }`. Always unwrap before returning from api functions.

---

## Auth & Token Management

- Access token lives in `AuthContext` as both `useState` and `useRef`.
- The ref (`accessTokenRef`) is used by `apiFetch` via a getter function.
- Call `setAccessTokenGetter(() => accessTokenRef.current)` once on `AuthContext` mount.
- Update `accessTokenRef.current` on every token change: login, refresh, logout.
- On logout: set ref to `null` and call `setAccessTokenGetter(() => null)`.
- Never store the access token in localStorage or sessionStorage.
- On app load: silently attempt `POST /auth/refresh` → if success fetch `/auth/me` → set user. If refresh fails → unauthenticated, redirect to `/login`.

---

## Routing

### Route structure

All protected routes are nested under a single parent layout route:

```typescript
{
  path: '/',
  element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
  children: [
    { index: true, element: <Navigate to={ROUTES.SCHEDULES} replace /> },
    { path: ROUTES.LIBRARY, element: <LibraryPage /> },
    { path: ROUTES.SCHEDULES, element: <ScheduleListPage /> },
    { path: ROUTES.SCHEDULE_SETTINGS_PATTERN, element: <SettingsPage /> },
    { path: ROUTES.SCHEDULE_CALENDAR_PATTERN, element: <CalendarPage /> },
  ]
}
```

`AppLayout` renders `<Outlet />` for page content — never a `children` prop.

### ROUTES constant

Two forms per route:
- `ROUTES.SCHEDULE_SETTINGS(id)` — for navigation (function)
- `ROUTES.SCHEDULE_SETTINGS_PATTERN` — for route definitions (string pattern)

---

## Context

### AuthContext

Provides: `user` (`{ id, email, role }`), `accessToken`, `login()`, `logout()`.

Internally maintains `accessTokenRef` and calls `setAccessTokenGetter` to keep `apiFetch` in sync.

On app load, attempt to refresh the token silently via `POST /auth/refresh`. If it fails, treat as unauthenticated.

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

## Destructive Actions

- All delete actions must show a `ConfirmDialog` before firing the DELETE request.
- Use `ConfirmDialog` from `src/components/ConfirmDialog.tsx`.
- The DELETE request only fires after user confirms.
- `isLoading` disables both buttons and shows spinner on the confirm button.
- 409 errors after confirmation are shown as inline errors — never as toasts.

---

## Onboarding

On app load after authentication, fire 5 parallel React Query calls:
- meal types list
- dish types list
- layouts list
- recipes list
- schedules list

Use `useOnboardingStatus()` hook to derive missing steps from the cache.

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

## Design System

### Single source of truth

`src/styles/designTokens.ts` is the **only** file that may contain raw hex values or pixel values. All components import from here.

### COLORS structure

```typescript
COLORS.primary.default / .hover / .light
COLORS.secondary.default / .hover / .light
COLORS.highlight.default / .dark
COLORS.palette[1-8]      // for meal types, tags — numbered slots, no color names
COLORS.bg.base / .surface / .elevated
COLORS.text.primary / .secondary / .tertiary / .inverse
COLORS.border.default / .strong
COLORS.semantic.error / .warning / .success / .info / .errorBg etc.
COLORS.sidebar.bg / .itemActiveBg / .itemActiveColor / .itemColor / .itemHoverBg
COLORS.btn.primary / .secondary / .danger / .disabled
COLORS.input.bg / .border / .borderFocus / .borderError / .color / .placeholder
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

### Rules
- **`designTokens.ts` is the only file that may contain raw hex values or pixel values.**
- Never hardcode color, spacing, font, radius, or shadow values in components or any other file.
- No local style overrides — if a one-off style is needed, add a token to `designTokens.ts` instead.
- All color names are semantic (describe purpose, not appearance). The palette is the only exception — numbered slots have no semantic meaning by design.

---

## Testing

### Stack
- **Vitest** — test runner
- **React Testing Library** — component and hook testing
- **jsdom** — browser environment simulation
- **@testing-library/user-event** — user interaction simulation

### Rules
- Every new component, hook, and utility function gets a test file next to it.
- Use `@testing-library/user-event` for all interactions — never `fireEvent`.
- Mock all API calls in component and hook tests — never hit the real API.
- Use `vi.spyOn(global, 'fetch')` in API tests and assert on actual URLs, methods, and `Authorization: Bearer` header.
- Reset spies and the `setAccessTokenGetter` between tests to avoid state leakage.
- If removing a piece of logic would not break any test, the test is not good enough.

### File naming
Test files live next to the file they test:
```
src/utils/date.ts           → src/utils/date.test.ts
src/hooks/useAuth.ts        → src/hooks/useAuth.test.ts
src/api/mealTypes.ts        → src/api/mealTypes.test.ts
src/components/Button.tsx   → src/components/Button.test.tsx
src/pages/library/tabs/MealTypesTab.tsx → src/pages/library/tabs/MealTypesTab.test.tsx
src/pages/library/tabs/IngredientTabComponents/Foo.tsx → src/pages/library/tabs/IngredientTabComponents/Foo.test.tsx
```

---

## Component Conventions

### Golden rule
Never use raw Chakra primitives or HTML elements directly in pages. Always use the semantic components from `src/components/`.

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

### Nav items
Always use `<NavItem>` from `src/components/NavItem.tsx` for sidebar and nav items. Never build inline nav rows with custom hover/active logic.

### Form fields
Always use `<FormField>` from `src/components/FormField.tsx` to wrap inputs. Never use `<Input>` alone in a form.

### Inline editing
Use `<InlineEditInput>` from `src/components/InlineEditInput.tsx`. It dismisses on Enter, Escape, and blur.

### Editable list items
Use `<EditableListItem>` from `src/components/EditableListItem.tsx` for all name-editable, delete-able list rows. It handles inline edit mode, hover-reveal delete, blocked state, and inline errors internally.

### Confirm dialog
Use `<ConfirmDialog>` from `src/components/ConfirmDialog.tsx` for all delete confirmations. Never fire a DELETE request without user confirmation.

### Pagination
Use `<Pagination>` from `src/components/Pagination.tsx` for all paginated lists.
Props: `page`, `totalPages`, `onPageChange`.
Never build inline prev/next pagination in page components.

### Loading error
Use `<LoadingError>` from `src/components/LoadingError.tsx` for all "section failed to load" states.
Props: `message`, `onRetry`.
Never build inline error+retry UI in page components.

### Highlighted text
Use `<HighlightedText>` from `src/components/HighlightedText.tsx` when rendering text that may contain a search match.
Props: `text`, `highlight`.
Uses `COLORS.highlight.default` as background on the matched substring.

### Tooltips
Use Chakra UI Tooltip from `src/components/ui/tooltip` (CLI snippet). Never build custom tooltip components.

### Future components
As new shared components are added (Card, Badge, Modal, BottomSheet, EmptyState, Banner, Spinner), the same rule applies — pages import from `src/components/`, never from Chakra directly.

### Internal implementation rules
- All components must use Chakra primitives internally — `Box`, `Text`, `Heading`, `Flex`, `Stack`, etc.
- Never use raw HTML tags (`<div>`, `<h1>`, `<p>`, `<span>`, `<label>`) inside components.
- Never use the `style` attribute or inline style objects — use Chakra style props instead.
- Import all design values from `src/styles/designTokens.ts` — no hardcoded values in components.

---

## Key Conventions

- Plain functions only — no classes.
- No inline Zod schemas — import from `@app/types`.
- No hardcoded strings for routes — use `ROUTES` constants from `src/utils/constants.ts`.
- Search inputs are debounced 300ms — never fire on every keystroke.
- All list content in library tabs is constrained to `maxW="600px"`.
- Mobile and desktop share the same interaction logic. Hover states are visual affordance only — the actual action is always click/tap.
- Recipe ingredients use the two-step match flow: call `/ingredients/match` first, only call `/ingredients` to create if match returns null.
- `RecipeIngredient.display_name` — always send the variant name the user typed, not the canonical ingredient name. On read, display `displayName ?? ingredientName`.
