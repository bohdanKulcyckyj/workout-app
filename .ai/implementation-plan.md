# Exercise Entity Refactoring - Implementation Plan

## Overview

Refactor exercises from inline plan data to standalone entities that can be reused across multiple workout plans. This enables an exercise library where users manage exercises independently, then compose plans by selecting from existing exercises.

### Key Decisions
- **Reference model**: Plans store exercise IDs only; always fetch fresh exercise data (single source of truth)
- **Migration**: Auto-migrate existing inline exercises to standalone entities on first load
- **Deletion**: Cascade delete - removing an exercise removes it from all plans
- **Creation**: Plan form dropdown includes "Create new exercise" modal option
- **Data layer**: Repository pattern abstraction to enable easy backend swap later

### Tech Stack
- Zod schemas for validation
- Repository pattern for data access (localStorage now, API later)
- localStorage for persistence (separate keys for exercises vs plans)
- React Hook Form for forms
- shadcn/ui components (Dialog, Command/Combobox for dropdown)

### Key Files (Current)
- [lib/types.ts](lib/types.ts) — Zod schemas and TypeScript types (StandaloneExercise, WorkoutPlan with exerciseIds)
- [lib/repositories/](lib/repositories/) — Repository pattern abstraction layer
  - [lib/repositories/types.ts](lib/repositories/types.ts) — Repository interfaces (PlanRepository, ExerciseRepository)
  - [lib/repositories/provider.tsx](lib/repositories/provider.tsx) — React context for dependency injection
  - [lib/repositories/local-storage/plan-repository.ts](lib/repositories/local-storage/plan-repository.ts) — localStorage plan implementation
  - [lib/repositories/local-storage/exercise-repository.ts](lib/repositories/local-storage/exercise-repository.ts) — localStorage exercise implementation
- [lib/hooks/use-plans.ts](lib/hooks/use-plans.ts) — React hooks for plan state (uses repository)
- [lib/hooks/use-exercises.ts](lib/hooks/use-exercises.ts) — React hooks for exercise state (uses repository)
- [components/nav-header.tsx](components/nav-header.tsx) — Top navigation header (Plans | Exercises)
- [components/plan-form.tsx](components/plan-form.tsx) — Plan create/edit form (uses exercise selector dropdown)
- [components/exercise-selector.tsx](components/exercise-selector.tsx) — Combobox dropdown for selecting exercises
- [components/exercise-modal.tsx](components/exercise-modal.tsx) — Modal for quick inline exercise creation
- [components/plan-list-table.tsx](components/plan-list-table.tsx) — Plan list table with actions
- [components/exercise-form.tsx](components/exercise-form.tsx) — Exercise create/edit form
- [components/exercise-list-table.tsx](components/exercise-list-table.tsx) — Exercise list table with actions
- [components/exercise-table.tsx](components/exercise-table.tsx) — Read-only exercise display (uses StandaloneExercise)
- [app/page.tsx](app/page.tsx) — Home page with plan list
- [app/exercise/page.tsx](app/exercise/page.tsx) — Exercise list page
- [app/exercise/create/page.tsx](app/exercise/create/page.tsx) — Create exercise page
- [app/exercise/[id]/page.tsx](app/exercise/[id]/page.tsx) — Exercise detail page
- [app/exercise/[id]/edit/page.tsx](app/exercise/[id]/edit/page.tsx) — Edit exercise page
- [app/plan/[id]/workout/page.tsx](app/plan/[id]/workout/page.tsx) — Workout tracking page (session-only state)

---

## Phase 0: Data Layer Abstraction (Repository Pattern)

- [x] Complete

### Goals
Introduce a repository abstraction layer for data access. This decouples storage implementation from business logic, enabling easy swap from localStorage to a real backend API later.

### Steps

1. **Define repository interfaces** ([lib/repositories/types.ts](lib/repositories/types.ts) - new file)
   ```typescript
   export interface PlanRepository {
     getAll(): Promise<WorkoutPlan[]>;
     getById(id: string): Promise<WorkoutPlan | null>;
     save(plan: WorkoutPlan): Promise<void>;
     delete(id: string): Promise<void>;
   }

   export interface ExerciseRepository {
     getAll(): Promise<StandaloneExercise[]>;
     getById(id: string): Promise<StandaloneExercise | null>;
     getByIds(ids: string[]): Promise<StandaloneExercise[]>;
     save(exercise: StandaloneExercise): Promise<void>;
     delete(id: string): Promise<void>;
   }
   ```

2. **Implement localStorage plan repository** ([lib/repositories/local-storage/plan-repository.ts](lib/repositories/local-storage/plan-repository.ts) - new file)
   - Migrate existing logic from [lib/storage.ts](lib/storage.ts)
   - Implement `PlanRepository` interface
   - Keep same localStorage key `"workout-plans"`

3. **Create repository provider/context** ([lib/repositories/provider.tsx](lib/repositories/provider.tsx) - new file)
   - React context to provide repository instances
   - Default to localStorage implementations
   - Easy to swap to API implementations later

4. **Update React hooks to use repositories** ([lib/use-local-storage-plans.ts](lib/use-local-storage-plans.ts))
   - Rename to [lib/hooks/use-plans.ts](lib/hooks/use-plans.ts)
   - Use repository from context instead of direct localStorage access
   - Keep same hook API (`usePlans`, `usePlan`)

5. **Update all consuming components**
   - Wrap app with repository provider
   - Update imports from old hook location to new
   - Ensure all pages still work with async repository methods

6. **Remove old storage service** ([lib/storage.ts](lib/storage.ts))
   - Delete after migration complete
   - All access now goes through repository

### Verification
- [x] Repository interfaces defined with full CRUD operations
- [x] localStorage implementation passes all existing functionality
- [x] React hooks work with repository abstraction
- [x] All existing pages/components still function correctly
- [x] No direct localStorage access outside repository implementations

---

## Phase 1: Exercise Entity & Storage Infrastructure

- [x] Complete

### Goals
Create the standalone exercise entity, implement its repository, and add migration logic to convert existing inline exercises.

### Steps

1. **Update types** ([lib/types.ts](lib/types.ts))
   - Create new `StandaloneExercise` schema:
     ```typescript
     export const standaloneExerciseSchema = z.object({
       id: z.string(),
       label: z.string().min(1),
       description: z.string().optional(),
       weight: z.number().optional(),
       reps: z.number().optional(),
     });
     ```
   - Update `WorkoutPlan` to reference exercise IDs instead of inline exercises:
     ```typescript
     export const workoutPlanSchema = z.object({
       id: z.string(),
       name: z.string(),
       exerciseIds: z.array(z.string()), // Changed from exercises array
       createdAt: z.string(),
       updatedAt: z.string(),
     });
     ```
   - Keep old `exerciseSchema` temporarily for workout tracking (has `done` flag)

2. **Implement localStorage exercise repository** ([lib/repositories/local-storage/exercise-repository.ts](lib/repositories/local-storage/exercise-repository.ts) - new file)
   - Implement `ExerciseRepository` interface from Phase 0
   - Storage key: `"exercises"`
   - On `delete`: Also remove exercise ID from all plans (cascade) via plan repository

3. **Create exercise React hooks** ([lib/hooks/use-exercises.ts](lib/hooks/use-exercises.ts) - new file)
   - `useExercises()` — returns all exercises with loading/refresh
   - `useExercise(id)` — returns single exercise
   - Uses exercise repository from context

4. **Update repository provider** ([lib/repositories/provider.tsx](lib/repositories/provider.tsx))
   - Add exercise repository to context
   - Provide localStorage implementation by default

5. **Implement migration logic** ([lib/migration.ts](lib/migration.ts) - new file)
   - `migrateInlineExercises()` function:
     - Read all plans via plan repository
     - For each plan with inline `exercises` array (old format):
       - Extract each exercise, generate `StandaloneExercise` (use existing id, map `name`→`label`)
       - Deduplicate by label (same name = same exercise)
       - Save to exercise repository
       - Update plan to use `exerciseIds` array
       - Save updated plan via plan repository
     - Mark migration complete with `localStorage.setItem("migration-v1", "done")`
   - Run migration on app startup (check flag first)

6. **Update plan repository** ([lib/repositories/local-storage/plan-repository.ts](lib/repositories/local-storage/plan-repository.ts))
   - Handle both old (inline exercises) and new (exerciseIds) schema during migration period
   - After migration, work with new schema only

### Verification
- [x] Exercise repository works independently (can save/load exercises)
- [x] Migration converts existing plans correctly
- [x] Plans now store `exerciseIds` instead of inline exercises
- [x] Deleting an exercise removes its ID from all plans (cascade)
- [x] App still loads without errors after migration

---

## Phase 2: Exercise Management Pages

- [x] Complete

### Goals
Create the exercise list and detail pages for managing standalone exercises.

### Steps

1. **Create exercise list page** ([app/exercise/page.tsx](app/exercise/page.tsx))
   - Similar layout to plan list ([app/page.tsx](app/page.tsx))
   - Show all exercises in a table/list with: label, description (truncated), weight, reps
   - "Create Exercise" button linking to detail page in create mode
   - Each row: click to view details, dropdown menu with Edit/Delete actions
   - Delete action: confirmation dialog, then cascade delete
   - Empty state when no exercises exist

2. **Create exercise list component** ([components/exercise-list-table.tsx](components/exercise-list-table.tsx))
   - Reusable table component similar to [components/plan-list-table.tsx](components/plan-list-table.tsx)
   - Columns: Label, Description, Weight, Reps, Actions
   - Actions dropdown: Edit, Delete

3. **Create exercise detail page** ([app/exercise/[id]/page.tsx](app/exercise/[id]/page.tsx))
   - View mode: Display all exercise fields, "Edit" button, "Delete" button, back navigation
   - Show which plans use this exercise (query via plan repository)

4. **Create exercise form component** ([components/exercise-form.tsx](components/exercise-form.tsx))
   - Fields: label (required), description (optional textarea), weight (optional number), reps (optional number)
   - Used for both create and edit
   - Validation with Zod schema

5. **Create exercise create page** ([app/exercise/create/page.tsx](app/exercise/create/page.tsx))
   - Uses exercise form component
   - On save: create exercise, redirect to exercise list

6. **Create exercise edit page** ([app/exercise/[id]/edit/page.tsx](app/exercise/[id]/edit/page.tsx))
   - Uses exercise form component with initial data
   - On save: update exercise, redirect to exercise detail

7. **Add navigation** ([components/nav-header.tsx](components/nav-header.tsx))
   - Created top nav header with Plans | Exercises links
   - Added to layout.tsx to appear on all pages

### Verification
- [x] Can navigate to exercise list page
- [x] Can create a new exercise with all fields
- [x] Can view exercise details
- [x] Can edit an existing exercise
- [x] Can delete an exercise (with confirmation)
- [x] Deleting exercise removes it from plans that use it
- [x] Exercise detail shows which plans reference it

---

## Phase 3: Plan Form Refactoring

- [x] Complete

### Goals
Replace the inline exercise creation in plan form with a dropdown selector and "Create new" modal.

### Steps

1. **Create exercise selector component** ([components/exercise-selector.tsx](components/exercise-selector.tsx) - new file)
   - Combobox/Command dropdown (shadcn) listing all available exercises
   - Shows exercise label, optionally weight/reps as hint
   - "Create new exercise" option at bottom of list
   - Fires `onSelect(exerciseId)` callback
   - Filters exercises already added to current plan

2. **Create exercise modal** ([components/exercise-modal.tsx](components/exercise-modal.tsx) - new file)
   - Dialog containing the exercise form
   - Used for quick inline creation from plan form
   - On save: creates exercise, returns new exercise ID to parent
   - Can reuse [components/exercise-form.tsx](components/exercise-form.tsx)

3. **Refactor plan form** ([components/plan-form.tsx](components/plan-form.tsx))
   - Remove inline exercise rows (name, weight, reps inputs per row)
   - Replace with:
     - List of selected exercises (read-only display with remove button)
     - Exercise selector dropdown to add exercises
   - Form now manages `exerciseIds: string[]` instead of `exercises: Exercise[]`
   - When saving, pass `exerciseIds` to storage

4. **Update plan display components**
   - [components/exercise-table.tsx](components/exercise-table.tsx): Fetch exercises by IDs to display
   - [app/plan/[id]/page.tsx](app/plan/[id]/page.tsx): Load exercises from IDs for display

5. **Update plan create/edit pages**
   - [app/plan/create/page.tsx](app/plan/create/page.tsx): Works with new form structure
   - [app/plan/[id]/edit/page.tsx](app/plan/[id]/edit/page.tsx): Load plan's exercises by ID for initial form state

6. **Update workout page** ([app/plan/[id]/workout/page.tsx](app/plan/[id]/workout/page.tsx))
   - Derive exercises from plan's exerciseIds and the exercise store via `useMemo`
   - Workout state tracks `done` status per exercise (session-only)
   - On workout end, state is discarded

7. **Update E2E tests** ([e2e/](e2e/))
   - Updated create-plan tests for new dropdown flow
   - Updated edit-plan tests for exercise selection
   - Updated workout tests for new data flow
   - Added test helper `createExercise` for exercise CRUD via UI
   - Added test helper `createPlan` for plan creation via dropdown selector

### Bug Fix: Infinite re-render loop in plan detail and workout pages

Both [app/plan/[id]/page.tsx](app/plan/[id]/page.tsx) and [app/plan/[id]/workout/page.tsx](app/plan/[id]/workout/page.tsx) initially used `useEffect` + `getExercisesByIds(plan.exerciseIds)` to load exercises. This caused an infinite loop because `plan.exerciseIds` is an array — `useSyncExternalStore` re-parses JSON from localStorage on each subscription event, producing a new array reference every time. React sees it as a changed `useEffect` dependency, re-fires the effect, which triggers state updates, which re-renders, and the loop repeats, freezing the browser.

**Fix**: Replaced async `useEffect` + `getExercisesByIds` with synchronous `useMemo` derivation from `allExercises` (already available via `useSyncExternalStore`). This eliminates the effect-based loop since `useMemo` doesn't trigger side effects.

### Verification
- [x] Plan form shows dropdown instead of inline exercise inputs
- [x] Can select existing exercises from dropdown
- [x] Can create new exercise via modal from dropdown
- [x] Selected exercises display in plan form with remove option
- [x] Saving plan stores only exercise IDs
- [x] Plan detail page correctly displays exercises fetched by ID
- [x] Edit plan page loads existing exercises correctly
- [x] Workout page loads exercises from standalone storage
- [x] Can check off exercises during workout
- [x] Can modify weight/reps during workout (session-only)
- [x] Completing workout works correctly
- [x] All 24 E2E tests pass
- [x] No infinite re-render loops

---

## Phase 4: Cleanup & Final Testing

- [x] Complete

### Goals
Clean up deprecated code and run final migration testing. Workout page updates and E2E tests were completed in Phase 3.

### Steps

1. **Clean up old code**
   - Removed `legacyExerciseSchema`, `legacyWorkoutPlanSchema`, and all associated types (`LegacyExercise`, `LegacyWorkoutPlan`)
   - Removed `flexibleWorkoutPlanSchema`, `FlexibleWorkoutPlan` type, and `workoutPlansSchema` (replaced with strict `z.array(workoutPlanSchema)`)
   - Removed `getAllFlexible()` from `PlanRepository` interface and `LocalStoragePlanRepository`
   - Simplified `LocalStoragePlanRepository` to work directly with `WorkoutPlan` (no flexible/migration-aware conversion)
   - Removed `toWorkoutPlans()` conversion function from `use-plans.ts` hook
   - Deleted `lib/migration.ts` (migration logic) and `components/migration-runner.tsx`
   - Removed `MigrationRunner` wrapper from `app/layout.tsx`

2. **Final testing**
   - TypeScript compiles with zero errors (`tsc --noEmit`)
   - All 24 E2E tests pass
   - Fresh install verified via Playwright: empty states display correctly, can create exercises and plans
   - Workout flow verified: exercise data loads from standalone storage, check-off works correctly

### Verification
- [x] No unused legacy types or schemas remain
- [x] No console errors or type errors
- [x] Fresh installs work without issues
- [x] All 24 E2E tests pass
