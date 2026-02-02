# UI Tests Implementation Plan

## Overview

End-to-end UI tests using **Playwright** to verify the core user flows of the workout app: creating, viewing, editing, deleting workout plans, and tracking workouts. Tests run against the Next.js dev server and interact with the app through the browser, including localStorage-based persistence.

### Tech Stack
- **Playwright**  E2E test framework with built-in browser automation
- **@playwright/test**  test runner with assertions, fixtures, and parallel execution
- No CI setup  tests run locally via `npx playwright test`

### Key Files
- [app/page.tsx](app/page.tsx)  Home page, plan list
- [app/plan/create/page.tsx](app/plan/create/page.tsx)  Create plan form
- [app/plan/[id]/page.tsx](app/plan/[id]/page.tsx)  Plan detail view
- [app/plan/[id]/edit/page.tsx](app/plan/[id]/edit/page.tsx)  Edit plan form
- [app/plan/[id]/workout/page.tsx](app/plan/[id]/workout/page.tsx)  Workout tracking
- [components/plan-form.tsx](components/plan-form.tsx)  Reusable plan form (create/edit)
- [components/plan-list-table.tsx](components/plan-list-table.tsx)  Plan list with actions
- [components/exercise-table.tsx](components/exercise-table.tsx)  Read-only exercise display
- [lib/types.ts](lib/types.ts)  Zod schemas and TypeScript types
- [lib/storage.ts](lib/storage.ts)  LocalStorage service
- [lib/use-local-storage-plans.ts](lib/use-local-storage-plans.ts)  Reactive storage hook

### Conventions
- Test files live in `e2e/` directory at project root
- Each phase gets its own test file
- Tests clear localStorage before each test for isolation
- Tests use Playwright's built-in `expect` assertions
- Locators use accessible roles/labels where possible, falling back to test-ids if needed

---

## Phase 1: Playwright Setup + Create & View Plan Tests

- [x] Complete

### Steps

1. **Install Playwright and configure**
   - Install `@playwright/test` as a dev dependency
   - Run `npx playwright install` to install browser binaries (chromium only for speed)
   - Create `playwright.config.ts` at project root with:
     - Base URL pointing to `http://localhost:3000`
     - `webServer` config to auto-start `npm run dev` before tests
     - Single project (chromium only)
     - Reasonable timeouts

2. **Add npm script**
   - Add `"test:e2e": "playwright test"` to [package.json](package.json)

3. **Create test helper for localStorage cleanup**
   - Create `e2e/helpers.ts` with a `clearStorage` helper that clears localStorage before each test

4. **Write create plan tests** (`e2e/create-plan.spec.ts`)
   - **Test: empty state shows prompt to create plan**  navigate to `/`, verify empty state message and create button visible
   - **Test: can create a plan with exercises**  navigate to `/plan/create`, fill plan name, fill exercise name/weight/reps, add a second exercise, submit form, verify redirect to plan detail page, verify plan name and exercises displayed
   - **Test: can add and remove exercise rows**  verify add button creates new row, verify delete (X) button removes a row, verify deleting last row auto-appends blank row

5. **Write view plan tests** (`e2e/create-plan.spec.ts` continued or separate)
   - **Test: plan detail page shows all exercise data**  create a plan, navigate to detail page, verify plan name, exercise names, weights, reps all displayed correctly
   - **Test: plan appears in home page list**  create a plan, navigate to home, verify plan name and exercise count shown in list
   - **Test: plan detail has navigation buttons**  verify "Start Workout", "Edit Plan", and back button are present

### Verification
- Run `npx playwright test`  all tests pass
- Tests start dev server automatically and clean up after themselves

---

## Phase 2: Edit & Delete Plan Tests

- [x] Complete

### Steps

1. **Write edit plan tests** (`e2e/edit-plan.spec.ts`)
   - **Test: can navigate to edit page from plan detail**  create a plan, go to detail, click "Edit Plan", verify form is pre-filled with existing data
   - **Test: can edit plan name**  change plan name, save, verify updated name on detail page
   - **Test: can edit exercise details**  modify exercise name/weight/reps, save, verify changes persisted on detail page
   - **Test: can add exercises during edit**  add a new exercise row, fill it in, save, verify new exercise appears
   - **Test: can remove exercises during edit**  remove an exercise, save, verify it's gone from detail page

2. **Write delete plan tests** (`e2e/delete-plan.spec.ts`)
   - **Test: can delete a plan from home page**  create a plan, go to home, open dropdown menu, click delete, confirm in dialog, verify plan removed from list
   - **Test: delete confirmation dialog can be cancelled**  open delete dialog, cancel, verify plan still exists
   - **Test: deleting last plan shows empty state**  create one plan, delete it, verify empty state message appears

### Verification
- Run `npx playwright test`  all tests pass (including Phase 1 tests)
- Edit tests verify data persists correctly through the create � edit � view cycle

---

## Phase 3: Workout Tracking Tests

- [x] Complete

### Steps

1. **Write workout tracking tests** (`e2e/workout.spec.ts`)
   - **Test: can start workout from plan detail**  create a plan, go to detail, click "Start Workout", verify workout page loads with exercises
   - **Test: can start workout from home page**  create a plan, click workout button on home list, verify workout page loads
   - **Test: can check off exercises**  check an exercise checkbox, verify it visually updates (row styling), verify progress counter updates (e.g., "1 / 2 exercises done")
   - **Test: can modify weight and reps during workout**  change weight/reps values in the workout table, verify inputs accept new values
   - **Test: completing all exercises triggers confetti**  check all exercises, verify confetti canvas or animation triggers
   - **Test: end workout with all exercises complete**  complete all exercises, click "End Workout", verify redirect to home, verify exercises reset to unchecked for next workout
   - **Test: end workout with incomplete exercises shows confirmation**  leave exercises unchecked, click "End Workout", verify confirmation dialog appears, confirm, verify redirect to home
   - **Test: can cancel end workout confirmation**  leave exercises unchecked, click "End Workout", cancel dialog, verify still on workout page

### Verification
- Run `npx playwright test`  all tests pass (all 3 phases)
- Workout tests verify the full lifecycle: start � track � complete � reset
