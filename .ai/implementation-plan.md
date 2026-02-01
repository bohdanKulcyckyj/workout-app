# Implementation Plan - Workout App

## Overview

A mobile-first MVP for gym trainers to manage workout plans and track exercises during sessions. The app uses a dark theme (black background, white text, red accents) and stores data in LocalStorage behind an abstraction layer.

**Tech stack:** Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, React Hook Form, Zod, TypeScript, LocalStorage.

**Routing:**
- `/` — Workout plan list
- `/plan/create` — Create new plan (dedicated route)
- `/plan/[id]` — Plan detail (preview mode)
- `/plan/[id]/edit` — Edit mode
- `/plan/[id]/workout` — Workout mode

**Key files (current state):**
- [app/layout.tsx](app/layout.tsx) — Root layout (Geist fonts, dark mode, max-w-lg container)
- [app/page.tsx](app/page.tsx) — Home page (plan list with empty state)
- [app/plan/create/page.tsx](app/plan/create/page.tsx) — Create new plan form
- [app/plan/[id]/page.tsx](app/plan/[id]/page.tsx) — Plan detail (preview mode, read-only)
- [app/plan/[id]/edit/page.tsx](app/plan/[id]/edit/page.tsx) — Edit plan form
- [app/plan/[id]/workout/page.tsx](app/plan/[id]/workout/page.tsx) — Workout mode (stub)
- [app/globals.css](app/globals.css) — Global styles with OKLCH dark gym theme
- [components/plan-list-table.tsx](components/plan-list-table.tsx) — Plan list table with actions
- [components/plan-form.tsx](components/plan-form.tsx) — Shared plan form (create/edit) with React Hook Form + Zod
- [components/exercise-table.tsx](components/exercise-table.tsx) — Read-only exercise table for preview
- [lib/types.ts](lib/types.ts) — Zod schemas and TypeScript types (Exercise, WorkoutPlan)
- [lib/storage.ts](lib/storage.ts) — LocalStorage abstraction layer
- [lib/use-local-storage-plans.ts](lib/use-local-storage-plans.ts) — Reactive plans hook (useSyncExternalStore)
- [package.json](package.json) — Next.js 16, React 19, Tailwind v4, React Hook Form, Zod 4
- [tsconfig.json](tsconfig.json) — Strict TS, `@/*` path alias

---

## Phase 1: Foundation (Project Setup, Types, Storage, Routing, Theme)

Initialize shadcn with a dark/red gym theme, define data types, build the LocalStorage abstraction, and set up the app shell with routing.

### Steps

- [x] **1.1 Initialize shadcn/ui**
  - Run `npx shadcn@latest init` with dark mode, neutral base, red as primary accent
  - This creates `components.json` and a `components/ui/` directory
  - Verify `components.json` exists and [app/globals.css](app/globals.css) is updated with shadcn CSS variables

- [x] **1.2 Customize the dark gym theme**
  - Edit [app/globals.css](app/globals.css) to set up a forced dark theme (no light mode toggle needed):
    - Background: near-black (`#0a0a0a` / `hsl(0 0% 3.9%)`)
    - Foreground: white/off-white
    - Primary: gym red (`hsl(0 72% 51%)` / `#dc2626` range)
    - Muted, card, border: dark grays
  - Remove the `prefers-color-scheme` media query — always dark
  - Add `dark` class to `<html>` in [app/layout.tsx](app/layout.tsx)

- [x] **1.3 Define TypeScript types**
  - Create `lib/types.ts` with:
    ```ts
    export interface Exercise {
      id: string;        // crypto.randomUUID()
      name: string;
      weight: number;
      reps: number;
      done: boolean;
    }

    export interface WorkoutPlan {
      id: string;        // crypto.randomUUID()
      name: string;
      exercises: Exercise[];
      createdAt: string; // ISO date
      updatedAt: string; // ISO date
    }
    ```

- [x] **1.4 Build LocalStorage service**
  - Create `lib/storage.ts` with an abstraction layer:
    ```ts
    export interface StorageService {
      getPlans(): WorkoutPlan[];
      getPlan(id: string): WorkoutPlan | null;
      savePlan(plan: WorkoutPlan): void;
      deletePlan(id: string): void;
    }
    ```
  - Implement `LocalStorageService` class that implements this interface
  - Use a single key `"workout-plans"` storing a JSON array
  - Export a default instance for easy swapping later

- [x] **1.5 Set up app shell and routing**
  - Update [app/layout.tsx](app/layout.tsx):
    - Change metadata title/description to "Workout App"
    - Add mobile viewport meta
    - Set max-width container, padding for mobile
  - Create route files (empty shells with basic headings):
    - `app/page.tsx` — Plan list (replace default content)
    - `app/plan/create/page.tsx` — Create new plan
    - `app/plan/[id]/page.tsx` — Plan detail (preview)
    - `app/plan/[id]/edit/page.tsx` — Edit mode
    - `app/plan/[id]/workout/page.tsx` — Workout mode

- [x] **1.6 Install required shadcn components**
  - Install base components needed across phases: `button`, `table`, `input`, `checkbox`, `dialog`, `dropdown-menu`

- [x] **1.7 Install React Hook Form**
  - Run `npm install react-hook-form`
  - Will be used for the plan edit/create forms and inline editing in workout mode

### Verification

- `npm run build` succeeds with no errors
- `npm run lint` passes
- Dev server starts and shows basic page shells at each route
- `components.json` exists, `components/ui/` has installed components
- Dark theme is visible — black background, white text
- `lib/types.ts` and `lib/storage.ts` exist and export correctly

---

## Phase 2: Workout Plan List Page

Build the main landing page with a mobile-optimized table showing all workout plans, action menus, and navigation.

### Steps

- [x] **2.1 Build the plan list page**
  - Edit `app/page.tsx`:
    - "New Plan" button at the top (links to `/plan/create`)
    - Styled with primary red color
  - Added `lib/use-local-storage-plans.ts` hook using `useSyncExternalStore` to reactively read plans from LocalStorage (avoids lint issues with `setState` in effects)

- [x] **2.2 Build the plans table**
  - Create `components/plan-list-table.tsx`:
    - Mobile-optimized table using shadcn `Table` components
    - Columns: Plan name (clickable, links to `/plan/[id]`), "Start" button (links to `/plan/[id]/workout`), three-dot menu
    - The "Start" button should be compact/icon-style for mobile
    - Three-dot menu uses shadcn `DropdownMenu` with "Edit" ( link to plan detail in edit mode ) and "Delete" options

- [x] **2.3 Implement delete functionality**
  - "Delete" from dropdown calls `StorageService.deletePlan(id)` and refreshes the list
  - Add a confirmation dialog using shadcn `Dialog` before deleting

- [x] **2.4 Handle empty state**
  - When no plans exist, show a friendly message and prominent "Create your first plan" button

- [x] **2.5 Mobile optimization**
  - Ensure table doesn't overflow on small screens
  - Use compact padding, appropriate font sizes
  - "Start" button and three-dot menu should be touch-friendly (min 44px tap targets)

### Verification

- Plan list page renders at `/`
- "New Plan" button navigates to `/plan/create`
- Plans from LocalStorage are displayed in the table
- Clicking plan name navigates to `/plan/[id]`
- "Start" button navigates to `/plan/[id]/workout`
- Three-dot menu opens with "Edit" and "Delete" options
- "Edit" navigates to `/plan/[id]/edit`
- "Delete" shows confirmation dialog, then removes the plan
- Empty state is shown when no plans exist
- Layout looks good on a 375px-wide viewport (mobile)

---

## Phase 3: Plan Detail — Preview & Edit Modes

Build the plan detail page with preview mode (read-only view) and edit mode (full CRUD on exercises), plus the create-new-plan flow.

### Steps

- [x] **3.1 Build preview mode page**
  - Edit `app/plan/[id]/page.tsx`:
    - Fetches plan by ID from `StorageService`
    - Displays plan name as heading with back button
    - "Start Workout" button (links to `/plan/[id]/workout`) and "Edit" button (links to `/plan/[id]/edit`)
    - Read-only exercise table: exercise name, weight (with "kg" unit), reps
    - Shows "Plan Not Found" error page with "Back to Plans" link for invalid IDs
    - Uses `use(params)` for Next.js 16 async params

- [x] **3.2 Build the exercise table component**
  - Created `components/exercise-table.tsx`:
    - Read-only table component for preview mode using shadcn `Table` components
    - Columns: Exercise name, Weight (with "kg" suffix), Reps
    - Empty state message when no exercises exist
    - Mobile-optimized column widths

- [x] **3.3 Build edit mode page**
  - Edit `app/plan/[id]/edit/page.tsx`:
    - Editable plan name input at the top
    - Uses shared `PlanForm` component with `initialPlan` prop
    - "Save Changes" button validates and saves to `StorageService`, navigates to preview
    - Shows "Plan Not Found" error for invalid IDs
    - Back button navigates to plan detail

- [x] **3.4 Build create plan page**
  - Edit `app/plan/create/page.tsx`:
    - Uses shared `PlanForm` component without `initialPlan` (starts empty)
    - On save: generates new UUID, saves plan, redirects to `/plan/[id]`
    - Back button navigates to home page

- [x] **3.5 Extract shared plan form component**
  - Created `components/plan-form.tsx`:
    - Shared between edit and create pages
    - Uses React Hook Form with `useFieldArray` for dynamic exercise rows
    - Zod validation via `@hookform/resolvers` (plan name required, exercise name required, weight >= 0, reps >= 1)
    - Uses `z.number()` (not `z.coerce.number()`) with `valueAsNumber` register option for Zod 4 compatibility
    - Accepts `initialPlan` prop (empty for create, existing for edit) as `defaultValues`
    - "Reset" uses React Hook Form's `reset()` to revert to `defaultValues`
    - Emits `onSave(plan: WorkoutPlan)` callback via `handleSubmit`
    - Delete row button (X icon) disabled when only one exercise remains
    - Installed `@hookform/resolvers` as new dependency

### Verification

- Preview page at `/plan/[id]` shows plan name and exercise table
- "Edit" and "Workout" buttons navigate correctly
- Edit page at `/plan/[id]/edit` loads existing plan data into editable fields
- All cells are editable (name, weight, reps)
- "Add Exercise" adds a new row
- "Save" persists changes to LocalStorage and navigates to preview
- "Reset" reverts to last saved state
- Create page at `/plan/create` starts empty
- Saving a new plan generates a UUID and redirects to the plan detail
- Non-existent plan IDs are handled gracefully
- All pages look good on mobile (375px viewport)

---

## Phase 4: Workout Mode & Playwright Validation

Build the workout tracking mode with done checkboxes, inline editing, end-workout flow with confirmation, and automated Playwright tests.

### Steps

- [ ] **4.1 Build workout mode page**
  - Edit `app/plan/[id]/workout/page.tsx`:
    - Plan name as heading
    - Exercise table with columns: name (read-only), weight (editable), reps (editable), done checkbox
    - Use React Hook Form with `useFieldArray` for the exercise rows (weight, reps, done fields)
    - Weight and reps are editable inline (tap to edit) via registered inputs
    - Checkbox toggleable per exercise
    - Visual feedback: completed rows get a muted/strikethrough style

- [ ] **4.2 Implement "End Workout" button logic**
  - "End Workout" button below the table
  - On click:
    - If ALL checkboxes are checked: uncheck all, navigate to `/`
    - If NOT all checked: show shadcn `Dialog` with confirmation message (e.g., "You haven't completed all exercises. End workout anyway?")
    - On confirm: uncheck all checkboxes, navigate to `/`
    - On cancel: close dialog, stay on page

- [ ] **4.3 Persist workout state**
  - Save weight/reps changes to LocalStorage as the user edits (so progress isn't lost on accidental navigation)
  - On "End Workout": save final state with all checkboxes unchecked

- [ ] **4.4 Playwright smoke tests**
  - Use Playwright MCP to validate the following flows:
    - Navigate to `/` — verify empty state or plan list renders
    - Create a new plan with exercises via `/plan/create`
    - Verify the plan appears in the list on `/`
    - Navigate to plan detail, verify preview mode shows correct data
    - Navigate to edit mode, modify an exercise, save, verify changes persist
    - Navigate to workout mode, check some boxes, edit weight/reps
    - Test "End Workout" with incomplete checkboxes — verify dialog appears
    - Test "End Workout" with all checkboxes — verify redirect to `/`

- [ ] **4.5 Final polish**
  - Verify all navigation flows work end-to-end
  - Ensure consistent spacing, font sizes, and touch targets across all pages
  - Verify dark theme is consistent everywhere
  - Test on mobile viewport (375px)
  - Run `npm run build` and `npm run lint` — fix any issues

### Verification

- Workout mode at `/plan/[id]/workout` shows exercises with checkboxes
- Weight and reps are editable inline
- Checking a box visually marks the exercise as done
- "End Workout" with all checked: unchecks all, redirects to `/`
- "End Workout" with some unchecked: shows confirmation dialog
- Dialog confirm: unchecks all, redirects to `/`
- Dialog cancel: stays on page
- Weight/reps changes persist in LocalStorage
- All Playwright tests pass
- `npm run build` succeeds
- `npm run lint` passes
- App works correctly on mobile viewport
