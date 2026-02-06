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
- [lib/migration.ts](lib/migration.ts) — Migration logic for inline exercises to standalone entities
- [components/migration-runner.tsx](components/migration-runner.tsx) — Component that runs migration on app load
- [components/plan-form.tsx](components/plan-form.tsx) — Plan create/edit form (creates exercises + plan with exerciseIds)
- [components/exercise-table.tsx](components/exercise-table.tsx) — Read-only exercise display (uses StandaloneExercise)
- [app/page.tsx](app/page.tsx) — Home page with plan list
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

- [ ] Complete

### Goals
Create the exercise list and detail pages for managing standalone exercises.

### Steps

1. **Create exercise list page** ([app/exercise/page.tsx](app/exercise/page.tsx) - new file)
   - Similar layout to plan list ([app/page.tsx](app/page.tsx))
   - Show all exercises in a table/list with: label, description (truncated), weight, reps
   - "Create Exercise" button linking to detail page in create mode
   - Each row: click to view details, dropdown menu with Edit/Delete actions
   - Delete action: confirmation dialog, then cascade delete
   - Empty state when no exercises exist

2. **Create exercise list component** ([components/exercise-list-table.tsx](components/exercise-list-table.tsx) - new file)
   - Reusable table component similar to [components/plan-list-table.tsx](components/plan-list-table.tsx)
   - Columns: Label, Description, Weight, Reps, Actions
   - Actions dropdown: View, Edit, Delete

3. **Create exercise detail page** ([app/exercise/[id]/page.tsx](app/exercise/[id]/page.tsx) - new file)
   - View mode: Display all exercise fields, "Edit" button, "Delete" button, back navigation
   - Show which plans use this exercise (query via plan repository)

4. **Create exercise form component** ([components/exercise-form.tsx](components/exercise-form.tsx) - new file)
   - Fields: label (required), description (optional textarea), weight (optional number), reps (optional number)
   - Used for both create and edit
   - Validation with Zod schema

5. **Create exercise create page** ([app/exercise/create/page.tsx](app/exercise/create/page.tsx) - new file)
   - Uses exercise form component
   - On save: create exercise, redirect to exercise detail or list

6. **Create exercise edit page** ([app/exercise/[id]/edit/page.tsx](app/exercise/[id]/edit/page.tsx) - new file)
   - Uses exercise form component with initial data
   - On save: update exercise, redirect to exercise detail

7. **Add navigation**
   - Add "Exercises" link to home page or create a nav header
   - Consider adding a simple top nav: Plans | Exercises

### Verification
- [ ] Can navigate to exercise list page
- [ ] Can create a new exercise with all fields
- [ ] Can view exercise details
- [ ] Can edit an existing exercise
- [ ] Can delete an exercise (with confirmation)
- [ ] Deleting exercise removes it from plans that use it
- [ ] Exercise detail shows which plans reference it

---

## Phase 3: Plan Form Refactoring

- [ ] Complete

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

### Verification
- [ ] Plan form shows dropdown instead of inline exercise inputs
- [ ] Can select existing exercises from dropdown
- [ ] Can create new exercise via modal from dropdown
- [ ] Selected exercises display in plan form with remove option
- [ ] Saving plan stores only exercise IDs
- [ ] Plan detail page correctly displays exercises fetched by ID
- [ ] Edit plan page loads existing exercises correctly

---

## Phase 4: Workout Page Updates & Cleanup

- [ ] Complete

### Goals
Update workout tracking to work with standalone exercises and clean up deprecated code.

### Steps

1. **Update workout page** ([app/plan/[id]/workout/page.tsx](app/plan/[id]/workout/page.tsx))
   - Fetch exercises by ID from exercise storage
   - Workout state needs to track `done` status per exercise
   - Store workout state in local component state (session-only)
   - On workout end, state is discarded

2. **Handle weight/reps during workout**
   - Standalone exercise has default weight/reps
   - During workout, user can modify - these are session-only values
   - On workout end, modifications are discarded (or optionally prompt to update exercise defaults)

3. **Update plan storage** ([lib/storage.ts](lib/storage.ts))
   - Remove old exercise-inline logic
   - Ensure `savePlan` works with `exerciseIds` only

4. **Clean up old code**
   - Remove unused `exerciseSchema` fields if no longer needed
   - Remove old inline exercise form components if any
   - Update any remaining references to `plan.exercises`

5. **Update E2E tests** ([e2e/](e2e/))
   - Update create-plan tests for new dropdown flow
   - Update edit-plan tests for exercise selection
   - Update workout tests for new data flow
   - Add new tests for exercise CRUD

6. **Final migration testing**
   - Test fresh install (no localStorage)
   - Test with existing plans (migration runs)
   - Verify all features work post-migration

### Verification
- [ ] Workout page loads exercises from standalone storage
- [ ] Can check off exercises during workout
- [ ] Can modify weight/reps during workout (session-only)
- [ ] Completing workout works correctly
- [ ] All E2E tests pass
- [ ] No console errors or type errors
- [ ] Migration works for existing users
- [ ] Fresh installs work without issues
