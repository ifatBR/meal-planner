# Frontend Decision Log — Meal Planner

This document captures all UX, architecture, and product decisions made during frontend planning. Written for the original developer as a reference.

---

## Stack

- Vite + React + TypeScript — no Next.js. App is a logged-in SaaS with no SSR needs.
- TanStack Query (React Query) for all server state.
- React Router v6 for routing.
- Context API for global client state (auth only). No Zustand.
- Shared types from `@app/types` — never redefine on the frontend. Never import Zod schemas into the frontend — types only.
- Toast system uses Chakra UI v3 `toaster.create()` from `src/components/ui/toaster` — no custom toast context.
- `useToast` hook in `src/hooks/useToast.ts` wraps toaster with convenience methods: `success()`, `error()`, `info()`, `warning()`.

---

## Navigation & Routing

### Sidebar nav

Collapsible sidebar with icons. Expanded shows labels. Two items only: **Library** and **Schedules**.

- Logout at the bottom — shows user name and email when expanded, first initial in a circle when collapsed, logout icon on the right.
- Sidebar nav items use `NavItem` component from `src/components/NavItem.tsx`.
- Tooltips appear on nav items when sidebar is collapsed (placement: right), hidden when expanded — uses Chakra UI Tooltip from `src/components/ui/tooltip`.
- Tabs (Library sub-sections) are NOT in the sidebar — they live on the Library page as tab UI.

### Settings is not a nav item

Settings is accessed only from:

1. The schedule list (Settings button per schedule row)
2. Inside the calendar (via toast "click here to regenerate" or persistent banner)

### Settings entry point tracking

When navigating to settings from the calendar, pass:

```
?returnTo=calendar&anchorDate=YYYY-MM-DD
```

On back or after regeneration, route back to the calendar at the same position. If `returnTo` is absent, back goes to `/schedules`.

### Login redirect logic

- Already authenticated → redirect to `/schedules`
- Not authenticated → `/login`
- Post-login redirect goes to `/schedules`, then onboarding flow takes over if needed

### Router structure

All protected routes use nested React Router v6 layout routes under a single parent with `ProtectedRoute` + `AppLayout`. `AppLayout` renders `<Outlet />` — not a children prop. Router is in `src/router/index.tsx`.

---

## Onboarding Flow

### Trigger

On app load after auth, fire 5 parallel calls: meal types, dish types, layouts, recipes, schedules. Derived via `useOnboardingStatus()` hook from React Query cache — no separate context.

### Flow when gaps exist

Guide user through missing steps only, in order:
**meal types → dish types → layouts → recipes → schedule list**

Ingredients are skipped — seeded on workspace creation.

### UI

No modal. Each step shows an inline empty state with a contextual prompt explaining what to create and why. When all steps are complete, user lands on the schedule list with a "Create your first schedule" CTA.

### Completion condition

All 5 lists are non-empty. Schedules list being non-empty means generation has happened at least once.

---

## Library View (`/library`)

### Tabs

Meal Types, Dish Types, Ingredients, Recipes, Layouts.

### List interaction pattern

- **Desktop:** items show edit + delete icons on hover. Click item or edit icon to edit.
- **Mobile:** tap item to open bottom sheet with Edit / Delete options.
- Inline editing for simple name fields (meal types, dish types): click → becomes input → Enter to save, Escape to cancel, blur to cancel.
- Delete grayed out when blocked. Desktop: tooltip on hover explains why. Mobile: tap grayed delete → toast explains why.
- All list content is constrained to `maxW="600px"`.
- When a feature component file grows too long, extract sub-components into a sibling folder named after the parent tab, e.g. `IngredientTabComponents/`. Sub-components there are private to that tab.

### Meal Types tab

- List of meal type names with colored dot per item.
- Empty state: large prompt encouraging creation.
- Inline edit on click. Delete blocked if used in any layout.

### Meal type color

Each meal type has a `color` field stored in the DB. The frontend assigns a color from
`MEAL_TYPE_COLORS` in `utils/constants.ts` when creating a meal type, based on the
current count of existing meal types in the workspace (index % palette length).
The backend stores whatever color string is sent — it never assigns or validates colors.
Default colors for seed data: Breakfast `#FFD93D`, Lunch `#45C9B2`, Dinner `#AEE553`.

### Dish Types tab

- Same pattern as meal types, no color dot.
- Delete blocked if referenced by recipes or meal slots.

### Ingredients tab

- Search field with Search icon inside input, debounced 300ms.
- "Add ingredient" button sits directly below the search field — always visible at the top, not at the bottom of the list.
- Grouped list using Chakra UI Accordion — one accordion item per parent ingredient.
- Accordion closed by default.
- Ingredients with no variants: no expand arrow, accordion item is not expandable.
- Accordion item content shows "Variants" subtitle (Caption) and variant list.
- "+" button next to ingredient name — tooltip "Add variant to \<name\>" on hover.
  - Clicking auto-expands accordion if closed, shows inline input at bottom of variant list.
- Search behavior:
  - If ingredient name matches: auto-expand and show all variants.
  - If variant matches: auto-expand and show only matching variants under parent.
  - Matching substring highlighted using `<HighlightedText>` with `COLORS.highlight.default` background.
  - Different empty state message for "no ingredients" vs "no search results".
- Pagination using `<Pagination>` component: pageSize 20, page resets to 1 on new search.
- Section load errors use `<LoadingError>` component with retry button.
- Edit/delete on both parent ingredients and individual variants.
- Parent delete blocked if has variants or referenced by recipes (409 → inline error).
- Variant delete: 409 → inline error under variant row.
- Add ingredient: 409 duplicate → inline error under input.
- Accordion and related sub-components are extracted into `src/pages/library/tabs/IngredientTabComponents/`.

### Recipes tab

- Search field — debounced 300ms.
- Click recipe → opens recipe edit view (full screen on mobile, modal on desktop).
- Clone button → popup asking for new name (default: "{original name} (copy)") → on confirm POST clone → redirect to recipe edit view for the new recipe.
- Delete blocked if recipe is used in any active schedule — show inline error with affected schedule names.

### Recipe edit view

Fields: name, ingredients (autocomplete chips), meal types (dropdown, required), dish types (dropdown, required), instructions (textarea, optional).

**Ingredient chips:**

- Type to search, uses two-step match flow (`/ingredients/match` first, then `/ingredients` if null).
- Added as chips with an X to remove.
- First ingredient automatically becomes main (star filled).
- Click another ingredient's star → transfers main status → toast "X is now main ingredient" with undo.
- Long press on mobile to set main (avoids accidental tap).
- Cannot remove main ingredient if others exist — inline warning.
- Cannot save without at least one ingredient, one dish type, one meal type, and exactly one main ingredient.

**Buttons:** Save and Discard. If changes exist and user clicks Discard → confirmation: "Discard changes?" If no changes → Discard closes without confirmation.

**If recipe is used in a schedule:** show warning banner on open: "This recipe is used in X schedules. Changes will affect them." Allow editing freely after acknowledgment.

### Layouts tab

- List of layouts with name and in-use indicator.
- Create / edit opens full screen on mobile, large modal on desktop.
- Layout builder: one card per WeekDaysLayout. Day chips at top (already-assigned days grayed out). Meal slots listed in order, draggable to reorder. Each meal slot has meal type dropdown + dish allocations (dish type dropdown + amount input + drag to reorder).
- If layout is used by 2+ schedules: show banner immediately on open listing which schedules use it. Only action available: "Clone and edit." Form is non-editable.
- If layout is used by 1 schedule: fully editable with a warning banner.
- If layout is unused: fully editable, no banner.
- Buttons: Save and Discard (same confirmation logic as recipe edit).

---

## Destructive Actions

- All delete actions require a confirmation dialog before the DELETE request fires.
- Use `ConfirmDialog` component from `src/components/ConfirmDialog.tsx`.
- Dialog content: title "Delete \<item type\>?", body "This action cannot be undone.", confirm button `variant="danger"`, cancel button `variant="secondary"`.
- The actual DELETE request only fires after user confirms.
- `isLoading` state disables both buttons and shows spinner on confirm button while request is in flight.
- 409 conflict errors are shown after confirmation attempt, as inline errors — never as toasts.

---

## Schedules View (`/schedules`)

- Paginated list of schedules.
- Each row has two actions: **Settings** and **View** (calendar).
- **View** is disabled (grayed) until at least one generation has happened (settings endpoint returns non-404).
- "New Schedule" button → modal asking for name only → POST `/schedules` → redirect to `/schedules/:id/settings`.
- Empty state: onboarding prompt if applicable, otherwise "Create your first schedule" CTA.

---

## Settings View (`/schedules/:id/settings`)

### Fields

- Schedule name (read-only — displayed as page title, not editable here)
- Date range — displayed as read-only text. Dates are immutable after schedule creation.
- Layout — dropdown of all workspace layouts.
- Same recipe gap — number input + "days" label. Renamed from "using same recipe".
- Same main ingredient gap — number input + "days" label. Renamed from "using same main ingredient".
- Blocked meals — list of blocked meal entries. Each entry: date picker (scoped to schedule range) + meal type dropdown, or "All day" checkbox (FE sends one blocked entry per meal type for that date).
- Generate / Regenerate button — label is "Generate" before first generation, "Regenerate" after.

### Banners

- If navigated from calendar with manual edits existing: "Some meals have been manually edited. Regenerating will overwrite unlocked meals."

### Not included

- `is_allow_same_day_ing` — hidden from UI in MVP. Field kept in DB.
- Draft saving — not supported. Settings only persist after generation.

### After generation

- On success → redirect to `/schedules/:id/calendar` (or back to calendar at saved anchor date if `returnTo=calendar` param exists).

---

## Calendar View (`/schedules/:id/calendar`)

### Layout

Week view. Day names and dates at top. Each day contains meal slot cards in layout order.

### Each meal slot card

- Meal type name as card title.
- Recipes listed under dish type subtitles (dish type order from layout).
- Lock checkbox per meal slot.
- Trash button to clear all recipes from the meal slot.
- Plus button to add a recipe → modal: recipe picker + dish type dropdown (filtered to dish types that are both in the meal slot's allocations AND on the selected recipe).
- Each recipe has its own trash button to remove it individually.

### Navigation

- Prev / next week buttons — always move by full weeks.
- Week picker at top — select any date within schedule range, snaps to that week's Sunday.
- Default anchor on open: `startDate` of the schedule. Resets to `startDate` on every re-entry (post-MVP: remember last position).

### Manual edit behavior

1. First manual edit in session → two one-time toasts:
   - "You've manually edited this schedule, click here to regenerate."
   - "Consider locking edited meals to protect them from regeneration."
2. After first edit → persistent banner at top: "This schedule has manual edits — [Regenerate]"
3. Manually edited meals → warning icon. Hover: "Manually edited."
4. No prompts on subsequent edits in the same session.

### Locking

- Lock checkbox per meal slot — locks it from being overwritten on regeneration.
- No "lock whole day" in MVP.

---

## Error Handling Rules

| Situation                                                        | Error type                                          |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| Field validation (unique name, required, invalid format)         | Inline error under the field                        |
| 409 conflict with structured data (recipe in use, layout in use) | Inline error with context (affected schedule names) |
| Action failed (save, delete, generate)                           | Toast — error variant                               |
| Whole section failed to load                                     | `<LoadingError>` component with retry button        |
| Unexpected rendering crash                                       | Error boundary fallback with reload button          |

**Never use a toast for field validation errors.**
**Never use an inline field error for action failures.**
**Error boundaries are for rendering crashes only — not API errors.**

### Error boundary setup

- One root error boundary — generic crash screen with reload button.
- React Router v6 `errorElement` per route — route-level error with back button.
- No per-component error boundaries for MVP.

---

## State Management Rules

| Data type                              | Where it lives                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Server data (recipes, schedules, etc.) | React Query cache                                                                     |
| Current user                           | AuthContext                                                                           |
| Access token                           | AuthContext state + `accessTokenRef` (synced via `setAccessTokenGetter` in apiClient) |
| Toast notifications                    | Chakra `toaster` — no context needed                                                  |
| Onboarding status                      | Derived from React Query cache via `useOnboardingStatus()`                            |
| Form inputs                            | Local useState                                                                        |
| Modal open/closed                      | Local useState                                                                        |
| Active library tab                     | Local useState (or URL param if deep-linking needed)                                  |
| Calendar anchor date                   | URL param                                                                             |
| Settings returnTo                      | URL param                                                                             |

---

## Deferred to Post-MVP

- Remember last viewed calendar position per schedule (reset to startDate for MVP)
- Send schedule to admin for approval before publishing
- Lock whole day in calendar view
- Per-dish-type gap settings (may resurrect `is_allow_same_day_ing`)
- Permissions management UI (backend already implemented)
- Users management UI
- Design system polish / theming / dark mode
- Mobile nav (sidebar is hidden on mobile for MVP)
