# Supabase Backend Integration - Implementation Plan

## Overview

Move the app from a purely client-side, localStorage-backed store to a Supabase
backend with real authentication, per-user data isolation via RLS, and a
deployment script for schema changes.

The app is currently 100% client components with no server code at all. The
repository abstraction introduced in the previous refactor ([lib/repositories/types.ts](lib/repositories/types.ts))
is already async and is the correct seam — Supabase implementations drop in
behind the existing interfaces. The real work is the **read path**: the hooks
([lib/hooks/use-plans.ts](lib/hooks/use-plans.ts), [lib/hooks/use-exercises.ts](lib/hooks/use-exercises.ts))
bypass the repository entirely and read raw localStorage JSON through
`useSyncExternalStore`. That cannot survive a network-backed store and must be
rewritten.

> **Status after Phase 4:** done. Both hooks now read through the repository with
> `useState`/`useEffect`, expose `{ ..., isLoading, error, refresh, save*, delete* }`,
> and `useSyncExternalStore` and the `plans-updated`/`exercises-updated` window
> events are gone from the read path.

> **Status after Phase 5:** all five phases complete. The localStorage → Supabase
> import ships behind a dismissible banner, the `db:*` scripts are in
> [package.json](package.json), and the README documents the setup, the schema
> and the deploy. 76/76 E2E specs pass. The one open item is the production
> deploy itself (Vercel env vars + Supabase redirect URLs), which needs console
> access rather than code — see Phase 5 Deviations.

### Key Decisions

- **Auth**: email + password only. No OAuth, no magic links, no SMTP dependency.
- **Data import**: an idempotent function that copies the signed-in user's
  localStorage data into Supabase. Safe to re-run; never duplicates.
- **E2E tests**: run against a local `supabase start` stack with a seeded test
  user. Tests exercise the real auth flow and real RLS.
- **Deployment**: no CI. A local `npm run db:deploy` script wrapping
  `supabase db push`.
- **Client-side Supabase, not server actions.** Every page in this app is a
  client component. RLS is the authorization boundary. Introducing server
  actions would mean rewriting every page for no security gain.
- **Ordered plan exercises** are preserved via a `position` column on a join
  table — the current `exerciseIds` array is order-sensitive and that order is
  rendered.
- **`removeExerciseFromAllPlans` is deleted** from the repository interface.
  A database `on delete cascade` replaces the hand-rolled cascade.

### Target Schema

```sql
exercises
  id          uuid primary key default gen_random_uuid()
  user_id     uuid not null references auth.users(id) on delete cascade
  label       text not null check (length(trim(label)) > 0)
  description text
  weight      numeric
  reps        integer
  created_at  timestamptz not null default now()
  updated_at  timestamptz not null default now()

plans
  id          uuid primary key default gen_random_uuid()
  user_id     uuid not null references auth.users(id) on delete cascade
  name        text not null check (length(trim(name)) > 0)
  created_at  timestamptz not null default now()
  updated_at  timestamptz not null default now()

plan_exercises
  plan_id     uuid not null references plans(id) on delete cascade
  exercise_id uuid not null references exercises(id) on delete cascade
  position    integer not null
  primary key (plan_id, exercise_id)
```

Rationale for the join table over a `uuid[]` column on `plans`: the array form
cannot express a foreign key, so deleting an exercise would silently leave
dangling IDs — exactly the problem `removeExerciseFromAllPlans` exists to paper
over today. The join table lets the database own that cascade.

**Extensibility.** The near-future entities named in [.ai/goal.md](.ai/goal.md)
(workout sessions, per-set logging, exercise categories) all attach as new
tables referencing `plans`/`exercises` without altering these three. A future
`workout_sessions (id, user_id, plan_id, started_at, completed_at)` plus
`session_sets (session_id, exercise_id, set_index, weight, reps, done)` is
purely additive.

**RLS.** Every table is `user_id = (select auth.uid())` for all four operations
(select, insert, update, delete).

`plan_exercises` has no `user_id` of its own — it is a link row saying "plan X
contains exercise Y at position N". Its policies derive ownership by looking up
the parent plan with an `exists` subquery. The alternative, denormalising
`user_id` onto the link row, stores the same fact twice and lets the two copies
disagree; deriving it means there is only one place the answer lives.

The subquery is not a per-row lookup: Postgres inlines RLS policies into the
query and rewrites a foreign-key-correlated `exists` into a semi-join. Since
every application query reaches `plan_exercises` *through* `plans` (the nested
select in Phase 3), the policy filters a table already present in the join, and
the composite primary key `(plan_id, exercise_id)` already indexes the join
column.

`auth.uid()` is wrapped as `(select auth.uid())` throughout. Bare `auth.uid()`
can be re-evaluated per row in some plan shapes; the subquery form forces it
into an InitPlan evaluated exactly once. This is Supabase's documented RLS
performance recommendation and costs nothing to adopt up front.

### Key Files (Current)

Data layer — the seam being replaced:
- [lib/types.ts](lib/types.ts) — Zod schemas: `standaloneExerciseSchema`, `workoutPlanSchema`
- [lib/repositories/types.ts](lib/repositories/types.ts) — `PlanRepository`, `ExerciseRepository` interfaces
- [lib/repositories/provider.tsx](lib/repositories/provider.tsx) — React context, instantiates localStorage repos, wires the cascade
- [lib/repositories/local-storage/plan-repository.ts](lib/repositories/local-storage/plan-repository.ts) — localStorage plans
- [lib/repositories/local-storage/exercise-repository.ts](lib/repositories/local-storage/exercise-repository.ts) — localStorage exercises
- [lib/repositories/index.ts](lib/repositories/index.ts) — barrel export
- [lib/hooks/use-plans.ts](lib/hooks/use-plans.ts) — **reads localStorage directly**, bypassing the repository
- [lib/hooks/use-exercises.ts](lib/hooks/use-exercises.ts) — same
- [lib/hooks/index.ts](lib/hooks/index.ts) — barrel export
- [lib/migrations.ts](lib/migrations.ts) — legacy inline-exercise → standalone localStorage migration

Consuming pages (all `"use client"`):
- [app/layout.tsx](app/layout.tsx) — wraps app in `RepositoryProvider`, renders `NavHeader`
- [app/page.tsx](app/page.tsx) — plan list
- [app/plan/create/page.tsx](app/plan/create/page.tsx) — create plan
- [app/plan/[id]/page.tsx](app/plan/[id]/page.tsx) — plan detail, derives exercises via `useMemo`
- [app/plan/[id]/edit/page.tsx](app/plan/[id]/edit/page.tsx) — edit plan
- [app/plan/[id]/workout/page.tsx](app/plan/[id]/workout/page.tsx) — workout session, writes weight/reps back on finish
- [app/exercise/page.tsx](app/exercise/page.tsx) — exercise list
- [app/exercise/create/page.tsx](app/exercise/create/page.tsx) — create exercise
- [app/exercise/[id]/page.tsx](app/exercise/[id]/page.tsx) — exercise detail, lists plans using it
- [app/exercise/[id]/edit/page.tsx](app/exercise/[id]/edit/page.tsx) — edit exercise

Components:
- [components/nav-header.tsx](components/nav-header.tsx) — Plans | Exercises nav
- [components/plan-form.tsx](components/plan-form.tsx), [components/plan-list-table.tsx](components/plan-list-table.tsx)
- [components/exercise-form.tsx](components/exercise-form.tsx), [components/exercise-list-table.tsx](components/exercise-list-table.tsx), [components/exercise-table.tsx](components/exercise-table.tsx)
- [components/exercise-selector.tsx](components/exercise-selector.tsx), [components/exercise-modal.tsx](components/exercise-modal.tsx)

Tests (11 spec files, ~1370 lines):
- [e2e/helpers.ts](e2e/helpers.ts) — `clearStorage`, `createExercise`, `createPlan`
- [e2e/create-plan.spec.ts](e2e/create-plan.spec.ts), [e2e/edit-plan.spec.ts](e2e/edit-plan.spec.ts), [e2e/delete-plan.spec.ts](e2e/delete-plan.spec.ts), [e2e/view-plan.spec.ts](e2e/view-plan.spec.ts)
- [e2e/exercise-crud.spec.ts](e2e/exercise-crud.spec.ts), [e2e/exercise-cascade.spec.ts](e2e/exercise-cascade.spec.ts), [e2e/exercise-edge-cases.spec.ts](e2e/exercise-edge-cases.spec.ts)
- [e2e/workout.spec.ts](e2e/workout.spec.ts), [e2e/workout-propagation.spec.ts](e2e/workout-propagation.spec.ts)
- [e2e/navigation.spec.ts](e2e/navigation.spec.ts)
- [playwright.config.ts](playwright.config.ts) — starts `npm run dev`, single worker

### Environment Status (verified)

- Supabase CLI `v2.108.0`, authenticated. Two unrelated projects exist; **no
  workout project yet** — one will be created in Phase 1.
- Git remote: `git@github.com:bohdanKulcyckyj/workout-app.git`. No `.github/`.
- Vercel CLI installed; no `.vercel/` link in this repo. The README claims a
  live Vercel deploy, so the project exists remotely but is not linked locally.
- No `.env*` files. `.gitignore` already ignores `.env*`.
- Docker is required for `supabase start`. **Verify this first** — it gates
  Phase 1 and all E2E work from Phase 4 onward.

---

## Phase 1: Supabase Project, Schema & RLS

- [x] Complete

### Goals

Stand up the Supabase project and the complete database schema with RLS. No
application code changes in this phase — the app continues to work entirely on
localStorage. This phase is verifiable purely at the database level.

### Steps

1. **Verify Docker availability**
   - `docker info` must succeed. `supabase start` cannot run without it.
   - If unavailable, stop and report — Phase 1 verification and all later E2E
     work depend on the local stack.

2. **Initialise Supabase in the repo**
   - `supabase init` → creates `supabase/config.toml` and `supabase/migrations/`.
   - Commit `supabase/` (config and migrations are source; the `.branches` and
     `.temp` dirs that `supabase init` gitignores stay ignored).

3. **Create the remote project**
   - `supabase projects create workout-app --org-id wwlyjxuejwjzkygmgshp --region eu-central-1 --db-password <generated>`
   - Record the project ref. Store the DB password in a password manager — it
     is shown once.
   - `supabase link --project-ref <ref>`

4. **Write the schema migration** (`supabase/migrations/<ts>_init_schema.sql`)
   - Create `exercises`, `plans`, `plan_exercises` exactly as specified in the
     Overview.
   - Index `exercises(user_id)`, `plans(user_id)`, `plan_exercises(exercise_id)`.
     The `plan_exercises` primary key already covers `plan_id` lookups.
   - Add an `updated_at` trigger function and attach it to `exercises` and
     `plans`, so `updated_at` is maintained by the database rather than by each
     client write:
     ```sql
     create function public.set_updated_at() returns trigger
       language plpgsql as $$
       begin new.updated_at = now(); return new; end $$;
     ```

5. **Write the RLS migration** (`supabase/migrations/<ts>_rls.sql`)
   - `alter table ... enable row level security` on all three tables.
   - `exercises` and `plans`: one policy per operation,
     `user_id = (select auth.uid())`. `with check` on insert/update as well as
     `using` — without `with check`, a user could update a row to assign it to
     someone else.
   - `plan_exercises`: policies via
     `exists (select 1 from plans p where p.id = plan_id and p.user_id = (select auth.uid()))`.
     Guard the `exercise_id` side on insert too, so a user cannot attach another
     user's exercise to their own plan.
   - Use the `(select auth.uid())` form everywhere, never bare `auth.uid()` —
     see the RLS note in the Overview.

6. **Seed file for local development** (`supabase/seed.sql`)
   - Insert a deterministic test user into `auth.users` with a known
     email/password hash (`test@example.com` / `test-password-123`), plus its
     `auth.identities` row. This user is what the E2E suite signs in as from
     Phase 4.
   - Keep the seed to the user only — no plans or exercises. Tests create their
     own data and must start from a clean slate.

7. **Apply and verify locally**
   - `supabase start`, then `supabase db reset` to apply migrations + seed from
     scratch.

### Verification

- [x] `docker info` succeeds
- [x] `supabase start` brings the stack up; Studio reachable at `http://localhost:54423`
      (ports shifted — see Deviations)
- [x] `supabase db reset` applies all migrations and the seed with no errors
- [x] All three tables exist with the specified columns and constraints
- [x] `select relrowsecurity from pg_class where relname in ('exercises','plans','plan_exercises')` returns `true` for all three
- [x] Deleting an `exercises` row cascades: its `plan_exercises` rows disappear
      (3 links → 2 on one exercise delete)
- [x] Deleting a `plans` row cascades: its `plan_exercises` rows disappear
      (2 links → 0; the 3 exercises survive)
- [x] RLS isolation proven with two users: owner reads 3 exercises / 1 plan /
      1 link, stranger reads 0/0/0 — filtered silently, no error
- [x] Updating a row bumps `updated_at` without the client sending it
- [x] `supabase db push` applies the same migrations to the remote project
      (both migrations listed local↔remote)

Beyond the plan, the write-side policies were checked too, since read isolation
alone would not catch them: a second user cannot insert a row owned by another
user, cannot reassign an existing row to itself (0 rows stolen), and cannot
attach another user's exercise to its own plan. All three are rejected by RLS.

### Deviations from plan

- **Local ports shifted 543xx → 544xx** ([supabase/config.toml](supabase/config.toml)).
  The default ports collided with another local Supabase project already
  running on this machine (`houshold-duties-manager`). Studio is now
  `http://127.0.0.1:54423`, API `54421`, db `54422`. Note `supabase start`
  exits 0 even when this collision aborts the startup — check `supabase status`
  rather than trusting the exit code.
- **Table grants added** to the schema migration. RLS policies and table grants
  are independent layers; without `grant ... to authenticated`, PostgREST is
  refused with `42501` before any policy is consulted. Granted to
  `authenticated` only — these tables have no anonymous access.
- **Seed sets the auth token columns to `''`**, not `NULL`. GoTrue scans
  `confirmation_token` and friends into non-nullable Go strings, so a `NULL`
  makes every sign-in fail with a 500 rather than a clean auth error.
- **Remote vs local anon behaviour differs harmlessly.** The remote project
  pre-grants `anon` at the schema level, so an anonymous read reaches RLS and
  returns `[]`; locally it is refused earlier at the grant layer. Both are
  secure — RLS is the boundary in both cases, and anonymous writes are
  rejected on both.
- **Remote project**: ref `ziyvvujjnmxmsermgxwj`, eu-central-1. The DB password
  is in the gitignored `.env` as `SUPABASE_DB_PASSWORD`; Supabase shows it only
  once, so it also belongs in a password manager.

---

## Phase 2: Authentication

- [x] Complete

### Goals

Add email + password auth with session handling, a login/signup page, route
protection, and sign-out. Data still comes from localStorage at the end of this
phase — auth and data are deliberately decoupled so each is verifiable alone.

### Steps

1. **Install dependencies**
   - `npm install @supabase/supabase-js @supabase/ssr`
   - `@supabase/ssr` is required for cookie-based sessions that Next.js
     middleware can read and refresh. The plain `supabase-js` browser client
     stores sessions in localStorage, which middleware cannot see.

2. **Environment files**
   - `.env.local` (gitignored) with `NEXT_PUBLIC_SUPABASE_URL` and
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Commit a `.env.example` documenting both names with placeholder values.
     Note in it that local values come from `supabase status`.
   - Both keys are `NEXT_PUBLIC_` by design — the anon key is meant to be
     public, and RLS is what protects the data. **The service-role key must
     never appear in this app.**

3. **Supabase clients** (`lib/supabase/`)
   - `client.ts` — `createBrowserClient` for client components.
   - `server.ts` — `createServerClient` bound to `next/headers` cookies, for
     middleware and any future server code.
   - `middleware.ts` — the session-refresh helper `@supabase/ssr` requires.

4. **Next.js middleware** ([proxy.ts](proxy.ts), repo root — new file; Next 16
   renamed this convention from `middleware.ts`, see Deviations)
   - Refresh the auth session on every request.
   - Redirect unauthenticated requests to `/login`, and authenticated requests
     hitting `/login` to `/`.
   - `matcher` must exclude `_next/static`, `_next/image`, and `favicon.ico`.

5. **Auth context** (`lib/auth/provider.tsx` — new file)
   - Expose `{ user, session, isLoading, signIn, signUp, signOut }`.
   - Subscribe to `onAuthStateChange`; unsubscribe on unmount.
   - Wrap the app in [app/layout.tsx](app/layout.tsx), **outside**
     `RepositoryProvider` — Phase 3 makes the repositories depend on the user.

6. **Login page** (`app/login/page.tsx` — new file)
   - Single page toggling between sign-in and sign-up, matching the existing
     form idiom: React Hook Form + `zodResolver` + shadcn `Input`/`Button`, as
     in [components/exercise-form.tsx](components/exercise-form.tsx).
   - Surface Supabase auth errors inline (`text-destructive`, consistent with
     existing validation messages).
   - This route renders outside the `NavHeader` shell.

7. **Sign-out in the nav** ([components/nav-header.tsx](components/nav-header.tsx))
   - Add the user's email and a sign-out button on the right of the existing
     nav. On sign-out, redirect to `/login`.

8. **Disable email confirmation for local development**
   - Set `enable_confirmations = false` under `[auth.email]` in
     `supabase/config.toml` so signup yields an immediately usable session
     locally. Leave the remote project's default in place.

### Verification

- [x] Visiting `/` while signed out redirects to `/login` (307 → `/login`; also
      verified for `/exercise`)
- [x] Sign-up with a new email creates a user — `newuser@example.com` appeared
      in `auth.users`, already confirmed, with an immediately usable session
- [x] Sign-in with correct credentials lands on `/` with the nav showing the email
- [x] Sign-in with wrong credentials shows an inline error ("Invalid login
      credentials") and does not navigate
- [x] Session survives a hard page refresh — and it is genuinely cookie-based:
      `sb-127-auth-token` is present in `document.cookie`, and no `auth-token`
      key exists in localStorage
- [x] Sign-out returns to `/login`; pressing Back lands back on `/login` — the
      client router starts restoring the old route, then the proxy redirect wins
- [x] Visiting `/login` while signed in redirects to `/`
- [x] Every existing page still works when signed in (still localStorage-backed)
      — created an exercise and a plan, plan detail renders its exercise row
- [x] `npx tsc --noEmit` passes
- [x] Static assets still load — a real emitted chunk returns 200 with zero
      redirects, and `/favicon.ico` returns 200. The `matcher` is not over-broad.

Console was clean throughout: the only error logged across the whole session was
the expected 400 from the deliberate wrong-password attempt.

### Deviations from plan

- **`middleware.ts` → `proxy.ts`.** Next 16.1 deprecates the `middleware` file
  convention and warns on every dev start. The file is [proxy.ts](proxy.ts)
  exporting `proxy()`; the `@supabase/ssr` session helper it calls is unchanged
  at [lib/supabase/middleware.ts](lib/supabase/middleware.ts), since that is the
  name the Supabase docs use. Redirects were re-verified after the rename.
- **Both redirects live in the session helper**, not in separate route guards.
  `updateSession` already has to call `getUser()` to refresh the session, so
  deciding both redirects there reuses that single call rather than adding a
  second auth lookup.
- **`NavHeader` hides itself on `/login`** rather than the login route being
  moved into its own route group. Same rendered result, one line, no layout
  restructuring — and Phase 3+ pages keep the shell they already have.
- **Env files already existed.** `.env.local` and `.env.example` were written in
  Phase 1, so step 2 was already satisfied; nothing was changed.
- **`enable_confirmations` was already `false`** in
  [supabase/config.toml](supabase/config.toml) — the CLI's default for local.
  Step 8 needed no edit, and sign-up was confirmed to yield an immediate session.
- **Server client `setAll` swallows its throw.** Cookies are read-only in Server
  Components; the proxy is what actually refreshes the session, so the failure
  there is expected rather than an error to surface.
- **Test data cleaned up.** The sign-up test user was deleted afterwards, so
  `auth.users` is back to the Phase 1 seed (`test@example.com`,
  `other@example.com`).

---

## Phase 3: Supabase Repositories

- [x] Complete

### Goals

Implement the repository interfaces against Supabase and select the
implementation based on auth state. Hooks are untouched in this phase, so the
UI still reads localStorage — the new repositories are verified directly.

### Steps

1. **Row types and mappers** (`lib/supabase/mappers.ts` — new file)
   - Snake_case DB rows ↔ camelCase domain types from [lib/types.ts](lib/types.ts).
   - `exercises` maps cleanly. `plans` needs assembly: the domain `WorkoutPlan`
     carries `exerciseIds: string[]`, built from `plan_exercises` ordered by
     `position`.
   - Postgres `numeric` arrives as a **string** over the wire. Coerce `weight`
     with `Number(...)` in the mapper or the Zod parse will fail.

2. **Supabase exercise repository** (`lib/repositories/supabase/exercise-repository.ts` — new file)
   - Implements `ExerciseRepository`.
   - `save` uses `upsert` — the interface has a single `save` for both create
     and update, and the form already generates the id client-side via
     `crypto.randomUUID()` ([components/exercise-form.tsx:58](components/exercise-form.tsx#L58)),
     which is a valid Postgres `uuid`.
   - `user_id` is set from the current session on insert.
   - `delete` is a plain delete — the FK cascade handles `plan_exercises`.

3. **Supabase plan repository** (`lib/repositories/supabase/plan-repository.ts` — new file)
   - Implements `PlanRepository`.
   - `getAll` selects plans with a nested `plan_exercises(exercise_id, position)`
     and maps to ordered `exerciseIds`.
   - `save` upserts the plan row, then reconciles `plan_exercises`: delete rows
     no longer present, upsert the current set with their `position`. Ordering
     changes must be persisted, not just membership.
   - **Drop `removeExerciseFromAllPlans`** from
     [lib/repositories/types.ts](lib/repositories/types.ts) and from
     [lib/repositories/local-storage/exercise-repository.ts](lib/repositories/local-storage/exercise-repository.ts).
     The localStorage exercise repo keeps its own cascade internally (it has no
     database to do it), but it no longer needs the injected `PlanRepository`
     for it — which also removes the circular-dependency wiring in
     [lib/repositories/provider.tsx:38-40](lib/repositories/provider.tsx#L38-L40).

4. **Provider selects implementation** ([lib/repositories/provider.tsx](lib/repositories/provider.tsx))
   - When a user is signed in **and** Supabase env vars are present, provide
     Supabase repositories; otherwise localStorage.
   - Keep the existing prop overrides — they are the injection point for tests.
   - Move `migrateLocalStorage()` out of the `useMemo` body. Running a
     side-effecting migration inside `useMemo` is incorrect under StrictMode
     double-invocation; it belongs in a `useEffect`.

5. **Temporary verification harness**
   - Since the hooks still read localStorage, add a throwaway dev-only page or
     a script that exercises the Supabase repositories directly (create, read,
     update, delete, reorder) against the local stack.
   - Delete it at the end of the phase — its job is proving Phase 3 in
     isolation, and Phase 4 supersedes it.

### Verification

- [x] Every `ExerciseRepository` method works against the local stack — all five
      exercised as `test@example.com`: `getAll` returned the three seeded rows
      sorted by label, `getById` hit and miss (miss → `null`), `getByIds`
      preserved the argument order `[C,A]` and returned `[]` for `[]`, `save`
      created then updated in place (label and weight changed, count stayed 3 —
      the upsert does not duplicate), `delete` removed the row
- [x] Every `PlanRepository` method works against the local stack — `getAll`
      returned `Alpha Plan[1]`, `Zed Plan[3]` sorted by name, `getById` hit and
      miss, `save` covered create / reorder / membership-drop / empty-set, and
      `delete` removed the plan and cascaded its links to 0
- [x] `plan.exerciseIds` order round-trips: saved `[A,B,C]`, reloaded, got
      `[A,B,C]` back — and the reload survived `workoutPlanSchema.parse()`
- [x] Reordering to `[C,A,B]` and reloading returns `[C,A,B]` — the upsert
      rewrites `position` on the existing composite-key rows; positions swap
      cleanly because nothing uniquely constrains `(plan_id, position)`
- [x] Deleting an exercise removes it from plans via the DB cascade, with no
      application-level cascade code involved — deleting B took `Zed Plan` from
      `[A,B,C]` to `[A,C]` and `Alpha Plan` from `[B]` to `[]`. The Supabase
      exercise repo's `delete` is a bare `delete().eq("id", id)`; nothing in it
      touches `plan_exercises`
- [x] `weight` returns as a `number`, not a string — `typeof weight === "number"`
      and `standaloneExerciseSchema.parse()` succeeded. See Deviations: PostgREST
      already emits `numeric` as a JSON number here, so the `Number(...)` coercion
      is defensive rather than load-bearing
- [x] Rows carry the correct `user_id`; a second user sees none of them — every
      row's `user_id` equalled the signed-in id, and `other@example.com` read
      0 exercises / 0 plans, with `getById` on a known id returning `null`
      (filtered silently, not an error). A stranger `delete` on another user's
      exercise was also a no-op — the row survived
- [x] `removeExerciseFromAllPlans` no longer exists anywhere in the codebase —
      `grep -rn "removeExerciseFromAllPlans\|setPlanRepository"` over all
      `.ts`/`.tsx` outside `node_modules` returns nothing
- [x] `npx tsc --noEmit` passes — clean. `npx eslint` is unchanged from the
      pre-Phase-3 baseline (11 problems / 6 errors / 5 warnings, all
      pre-existing); no new lint errors were introduced
- [x] With no Supabase env vars set, the app still runs fully on localStorage —
      with both `.env` and `.env.local` moved aside, `/` and `/exercise` return
      200 with **zero** redirects (no `/login` wall), the plans UI renders the
      real empty state, and the browser console is clean: 0 errors, 0 warnings.
      This needed three guards that Phase 2 had not added — see Deviations

### Deviations from plan

- **`numeric` does not arrive as a string.** The plan's central warning (also in
  Risks & Notes) does not hold for this stack: PostgREST serialises `numeric` as
  a JSON number. Verified at the raw HTTP layer, bypassing `supabase-js`
  entirely — `GET /rest/v1/exercises?select=weight` returns
  `[{"label":"wire test","weight":62.5,"reps":null}]`, an unquoted number. The
  `Number(...)` coercion is kept anyway: it costs one call, it is correct either
  way, and the serialiser's behaviour is not something the app should depend on.
  The mapper comment says exactly this rather than repeating the plan's claim.
- **Three guards were needed for the no-env-vars fallback, in code Phase 2
  wrote.** The last verification checkbox was unreachable as the code stood:
  `createBrowserClient` throws `"Your project's URL and API key are required"`
  on a missing URL, so with no env vars the app crashed rather than falling back.
  Fixed at the source instead of in each caller —
  [lib/supabase/client.ts](lib/supabase/client.ts) `createClient()` now returns
  `null` when unconfigured, [lib/auth/provider.tsx](lib/auth/provider.tsx)
  handles that null (stays signed out; `signIn`/`signUp` return a clear error
  rather than throwing), and [lib/supabase/middleware.ts](lib/supabase/middleware.ts)
  returns early so the proxy does not redirect everything to `/login` when there
  is no auth to enforce. Phase 2's own verification passed only because env vars
  were always present.
- **The localStorage cascade now reads the plans key directly.** Dropping
  `removeExerciseFromAllPlans` removed the only method the injected
  `PlanRepository` was there for, so
  [lib/repositories/local-storage/exercise-repository.ts](lib/repositories/local-storage/exercise-repository.ts)
  does the cascade against `localStorage["workout-plans"]` itself. That deletes
  `setPlanRepository`, the `planRepository` field, and the provider's
  circular-dependency wiring — the plan asked for the wiring to go but did not
  say what replaces the cascade's access path.
- **No parameter properties in the Supabase repositories.** Both constructors
  assign fields explicitly rather than using TypeScript's `private x` parameter
  shorthand. The shorthand is a transform rather than pure type erasure, so
  Node's `--experimental-strip-types` rejects it — which is what the throwaway
  harness ran under. Costs three lines, keeps the files runnable by plain Node.
- **`other@example.com`'s password is `other-password-123`**, not
  `test-password-123`. The Phase 2 notes name the user but not its password, and
  it is not in [supabase/seed.sql](supabase/seed.sql) — only `test@example.com`
  is. Phase 4's `resetAndLogin` helper should use the seeded user; if it ever
  needs the second user for an isolation test, that user exists only in the
  local database and would not survive a `supabase db reset`.
- **Leftover rows from Phase 2 were truncated.** Phase 2's manual UI check left
  6 exercises, 1 plan and 1 link in the local database. Truncated before the
  harness ran, and the harness cleans up after itself — the tables are back to
  0/0/0.
- **Harness ran as a script, not a dev-only page.** Step 5 allowed either. A
  Node script sidesteps mounting React and lets it drive two signed-in users in
  one process for the isolation check. It lived in the scratchpad, and is
  deleted — `grep` for `verify-phase3` returns nothing.

---

## Phase 4: Async Hooks & E2E Against Supabase

- [x] Complete

### Goals

Rewrite the hooks to read through the repository asynchronously, making the UI
genuinely Supabase-backed, and repoint the E2E suite at the local Supabase stack
with a seeded test user. This is the phase where the app actually changes over.

### Steps

1. **Rewrite [lib/hooks/use-plans.ts](lib/hooks/use-plans.ts)**
   - Replace `useSyncExternalStore` + `localStorage.getItem` with `useState` +
     `useEffect` calling `repository.getAll()`.
   - Keep the exported shape identical — `{ plans, isLoading, refresh, savePlan,
     deletePlan }` and `usePlan(id)` returning `{ plan, isLoading, refresh,
     savePlan }` — so consuming pages need no changes.
   - `isLoading` becomes real. Pages already render a loading branch for it
     (e.g. [app/page.tsx:16-22](app/page.tsx#L16-L22)), which until now was dead
     code because the value was hardcoded `false`.
   - `refresh` re-fetches instead of dispatching a window event.
   - Preserve the existing alphabetical sort. Prefer `order("name")` in the
     query over sorting client-side.
   - Guard against out-of-order responses: ignore a resolved fetch if a newer
     one has started or the component unmounted.

2. **Rewrite [lib/hooks/use-exercises.ts](lib/hooks/use-exercises.ts)**
   - Same treatment. Keep `getExercisesByIds` — it is already repository-backed.

3. **Handle the `null` plan race**
   - Pages currently treat "plan not found" as `!plan` and render a Not Found
     state ([app/plan/[id]/page.tsx:37](app/plan/[id]/page.tsx#L37)). With async
     loading, `plan` is `null` *during* the fetch too. The `isLoading` branch
     must be checked before the `!plan` branch on every detail page, otherwise
     a Not Found flashes on each load.
   - Affects the plan detail, plan edit, exercise detail, exercise edit, and
     workout pages.

4. **Verify the workout page still derives correctly** ([app/plan/[id]/workout/page.tsx](app/plan/[id]/workout/page.tsx))
   - The `useMemo` deriving `initialWorkoutExercises` from `plan.exerciseIds` +
     `allExercises` ([lines 59-71](app/plan/[id]/workout/page.tsx#L59-L71)) now
     runs against async data. The `exercisesLoaded` latch
     ([lines 81-86](app/plan/[id]/workout/page.tsx#L81-L86)) already guards
     against re-initialising the form; confirm it still holds when both hooks
     resolve at different times.
   - The previous refactor hit an infinite re-render loop here. Re-verify
     explicitly.

5. **Add error surfacing**
   - Network and RLS failures are now possible where localStorage could not
     fail. Add an `error` field to both hooks and render a minimal inline
     message. Do not let a failed write pass silently — the user would believe
     data was saved.
   - The Phase 3 Supabase repositories **throw** the PostgREST error rather than
     returning it, so every hook call site needs a `try`/`catch`. Note that RLS
     denial is not among the throws: it returns empty data, so a missing row is
     indistinguishable from a permission failure at this layer.

6. **Rework [e2e/helpers.ts](e2e/helpers.ts)**
   - Replace `clearStorage` with `resetAndLogin(page)`:
     truncate the test user's rows (via a `service_role` client from the local
     stack, in Node — never in app code), then sign in through the UI at
     `/login` as the seeded user.
   - `createExercise` and `createPlan` keep their signatures and bodies; they
     drive the UI and are agnostic to the backend.
   - Add `await`s for network settling where the old localStorage writes were
     synchronous. Prefer Playwright's auto-waiting assertions over fixed sleeps.

7. **Update all 11 spec files**
   - Swap `clearStorage` → `resetAndLogin` in each `beforeEach`. Spec bodies
     stay as they are.
   - [e2e/exercise-cascade.spec.ts](e2e/exercise-cascade.spec.ts) is the
     important one: it now proves the *database* cascade rather than the
     application one.

8. **Update [playwright.config.ts](playwright.config.ts)**
   - Keep `workers: 1`. Tests share one seeded user and truncate between tests,
     so they cannot run in parallel.
   - Point the dev server at the local Supabase env.
   - Raise `webServer.timeout` — the stack plus Next.js dev start is slower than
     30s cold.

### Verification

- [x] `supabase start` running, then all 11 spec files pass against it — **68/68
      tests passed** in 3.2m, run against a freshly `supabase db reset` database
      so the result does not depend on accumulated local state
- [x] Data created in a test is visible in local Studio under the test user —
      checked at the source of truth instead: after creating "Push Day" through
      the UI, `plans join auth.users` returned
      `Push Day | test@example.com | 2 links`, and both exercises were present
- [x] Signing out and back in shows the same data — signed out, signed in as
      `other@example.com`, signed out, signed back in as `test@example.com`:
      "Push Day / 2 exercises" returned intact. Nothing was in localStorage
- [x] Opening the app as a different user shows an empty state, not the first
      user's data — `other@example.com` saw "No workout plans yet", and
      navigating directly to the first user's plan URL rendered "Plan Not
      Found". Note this is the **empty state / Not Found**, not an error banner:
      the RLS-filtered read returns `[]`, which is exactly the distinction the
      error surfacing must not conflate
- [x] Loading states appear during fetches; no Not Found flash on detail pages —
      proven with a `MutationObserver` recording every distinct body state
      across a client-side navigation, so a flash lasting a single frame would
      still be caught. Plan detail, exercise detail and workout page each
      recorded exactly `["LOADING", "LOADED"]` — `NOTFOUND` never appeared
- [x] Workout page loads, checkboxes work, confetti fires on completion — both
      rows rendered from Supabase, checking both took the counter to
      "2 / 2 exercises done", and `document.querySelectorAll('canvas')` went
      0 → 1 (canvas-confetti mounts its canvas on fire)
- [x] Weight/reps edits during a workout persist to Supabase on finish — changed
      Bench Press 60 → 72.5 mid-workout, ended the workout, and the database row
      read `72.5` with `updated_at > created_at`. The untouched Overhead Press
      row was correctly *not* written (`updated_at = created_at`), so the
      change-detection guard still holds. 72.5 also re-confirms `numeric`
      round-trips as a number
- [x] Deleting an exercise removes it from plans that use it — the two
      `exercise-cascade` specs covering one plan and multiple plans pass, and
      they now prove the *database* cascade: the Supabase exercise repo's
      `delete` is a bare `delete().eq("id", id)` with no application cascade
- [x] No infinite re-render loops — check the console on every page — drove
      plan list, exercise list, both create pages, both detail pages, both edit
      pages and the workout page in a real browser: **0 React errors**, no
      "Maximum update depth exceeded". The only console output was Next's HMR
      WebSocket reconnect noise and a pre-existing Radix `aria-describedby`
      warning from the exercise modal, neither related to this phase
- [x] A forced failure (stop Supabase mid-session) surfaces an error rather than
      silently appearing to succeed — `docker stop supabase_rest_workout-app`,
      then a delete through the UI: the row stayed put and an inline alert read
      **"An invalid response was received from the upstream server"**. The
      database confirmed nothing was written. This check is what caught the
      `[object Object]` bug — see Deviations
- [x] `npx tsc --noEmit` passes; `npm run lint` clean — tsc clean; eslint at
      **11 problems (6 errors, 5 warnings)**, byte-identical to the pre-Phase-3
      baseline. No new lint problems were introduced

Beyond the plan, the no-Supabase-env-vars fallback was re-verified, since this
phase rewrites the exact read path that regression lives on: with `.env` and
`.env.local` moved aside, `/` and `/exercise` return 200 with **zero** redirects
(no `/login` wall), creating an exercise writes it to `localStorage["exercises"]`
and renders it in the list, and the console is clean — 0 errors, 0 warnings.

### Deviations from plan

- **Step 3 was already done.** All five detail pages already checked `isLoading`
  before `!plan`; the ordering the plan warns about was correct in the code as
  written. The real work was the opposite problem — see the next two entries.
- **`isLoading` had to mean "no data yet", not "a request is in flight".** The
  plan's model of `isLoading` breaks on refetch. Setting it true inside `load()`
  meant that saving an exercise from the modal inside the plan form swapped the
  page to its Loading branch, **unmounting `PlanForm` and destroying the user's
  half-filled form** — the typed plan name and the selected exercises both
  vanished. Caught in the browser, not by the suite: the two failing specs only
  reported a wrong row count. `isLoading` is now set at the *effect* (first load,
  and when the repository or id changes), never on a refetch.
- **Detail pages must gate on both hooks, not one.** Pages that derive their
  content from a plan *and* the exercise list (plan detail, plan edit, workout,
  and plan create for its dropdown) render an empty table if only the first hook
  has settled. Each now waits for both. Exercise detail additionally waits on
  `usePlans`, since the delete dialog's "used in N plans" count comes from it.
- **A non-UUID id is a PostgREST error, not an empty result.** Two existing specs
  visit `/exercise/nonexistent-id`; Postgres rejects that with `22P02` (verified
  at the raw HTTP layer: `400 {"code":"22P02"}`). Left alone this rendered an
  error banner instead of "Not Found". Fixed in `getById` on both Supabase
  repositories — one guard where every caller routes through, rather than
  special-casing in the hooks or the pages.
- **The save→navigate chain dropped its promise in three places.** `ExerciseForm`
  → `ExerciseModal` → `PlanForm` all typed `onSave` as `() => void` and never
  awaited. Free under localStorage; under Supabase the modal closed and the row
  was added before the write landed, so the new exercise rendered as nothing.
  All three now thread `void | Promise<void>` and await. This also keeps
  react-hook-form's `isSubmitting` true for the real duration of the write.
- **`service_role` had no DML grant** — new migration
  [supabase/migrations/20260823120000_grant_service_role.sql](supabase/migrations/20260823120000_grant_service_role.sql).
  Phase 1 granted `authenticated` only, so the E2E reset helper was refused with
  `permission denied for table plans` before RLS was consulted. Added as a new
  migration rather than editing the applied one, which is already pushed remote.
- **`process.loadEnvFile` does not overwrite already-set variables**, and `.env`
  holds the **remote** project URL while `.env.local` holds the local one.
  Loading them in the obvious order would have pointed the entire E2E suite at
  production. [playwright.config.ts](playwright.config.ts) loads `.env.local`
  first, deliberately, with a comment saying why. Verified the semantics directly
  rather than assuming them. Node's stdlib `loadEnvFile` also meant no `dotenv`
  dependency for two files.
- **PostgREST errors are plain objects, so `String(e)` yields `[object Object]`.**
  The forced-failure check is what exposed this — the first version surfaced a
  literal `[object Object]` to the user. The `message()` helper in both hooks now
  reads `.message` off any object before falling back to `String(e)`.
- **Sorting moved into the localStorage repositories.** The hooks used to sort
  client-side; the Supabase repos sort in SQL via `order("name")`/`order("label")`.
  Rather than re-sorting in the hooks, the two localStorage repos now sort in
  `getAll()`, so both implementations honour the same contract and the hooks stay
  free of it.
- **`other@example.com` is now in [supabase/seed.sql](supabase/seed.sql).** It
  existed only in the local database and would not have survived a
  `supabase db reset`, as Phase 3 flagged. Added properly (id
  `2222...`, password `other-password-123`) so the RLS isolation check is
  reproducible from a clean reset.
- **One new component**, [components/error-message.tsx](components/error-message.tsx)
  — nine lines wrapping the `role="alert" text-sm text-destructive` idiom the
  forms already use, rather than repeating it in nine pages.
- **Write failures rethrow from the hooks** so save handlers can skip their
  `router.push`, while the hook records the message in `error`. Fire-and-forget
  callers (`handleDelete` on the two list pages) `.catch(() => {})` so the
  already-recorded failure is not also an unhandled rejection.
- **The workout page's dead `exercises-updated` event was removed.** Nothing
  listens for it now that the hooks no longer subscribe to window events; the
  pages it navigates to refetch on mount. The `useMemo`/`exercisesLoaded` latch
  needed no change and was confirmed to hold when the two hooks resolve at
  different times.

---

## Phase 5: Data Import & Deployment Script

- [x] Complete

### Goals

Give existing users a way to bring their localStorage data into their Supabase
account, and add the deployment script for schema changes. This closes out the
migration path and the tooling.

### Steps

1. **Import function** (`lib/import-local-data.ts` — new file)
   - Signature: `importLocalData(exerciseRepo, planRepo): Promise<ImportResult>`
     where `ImportResult` reports counts of imported and skipped records.
   - **Run [lib/migrations.ts](lib/migrations.ts) `migrateLocalStorage()` first.**
     A browser holding pre-refactor data still has inline `exercises` arrays on
     its plans; reading it directly would import nothing useful. Chaining the
     existing migration normalises the shape before import.
   - Read from localStorage directly (not via the repositories — those now point
     at Supabase). Note the localStorage repositories' `getAll()` now sorts
     (Phase 4 moved the hooks' sort down into them), so read the raw keys rather
     than going through `LocalStorage*Repository` if insertion order matters.
     `plan.exerciseIds` order must be preserved either way — it is rendered.
   - **Idempotency**, which is the explicit requirement here:
     - Exercises and plans carry client-generated UUIDs already, so `upsert` on
       the primary key is naturally idempotent — re-running overwrites the same
       rows rather than duplicating.
     - `plan_exercises` is upserted on its composite key `(plan_id,
       exercise_id)`, and rows absent from the local data are deleted, so a
       re-run converges rather than accumulating.
     - Legacy IDs that are **not** valid UUIDs must be remapped. Data created
       before the standalone-exercise refactor used `crypto.randomUUID()`, so
       this is unlikely — but a non-UUID id would be rejected by Postgres, so
       validate and remap deterministically rather than crashing mid-import.
     - Write an `import-completed-<userId>` marker to localStorage so the prompt
       stops appearing. The marker is a UX affordance only — correctness must
       come from the upserts, so that clearing the marker and re-running is
       still safe.
   - Import order matters: exercises first, then plans, then `plan_exercises` —
     the foreign keys require it.

2. **Import UI**
   - After sign-in, if localStorage holds plans or exercises and no marker
     exists for this user, show a dismissible prompt offering the import.
   - Report the outcome ("Imported 12 exercises and 3 plans"). On failure,
     report it and leave localStorage untouched — it is the only copy.
   - Do **not** clear localStorage after a successful import. Keep it as a
     fallback; the marker suppresses the prompt.

3. **Test the import**
   - Add `e2e/import.spec.ts`: seed localStorage with known data before sign-in,
     sign in, run the import, assert the data appears.
   - The helper is now `resetAndLogin(page)` from
     [e2e/helpers.ts](e2e/helpers.ts) (Phase 4 replaced `clearStorage`). It
     truncates the user's rows via `service_role` **and** signs in, so seed
     localStorage *after* calling it — it navigates to `/login` first.
   - **Assert idempotency explicitly**: clear the marker, run the import a
     second time, and assert counts are unchanged. This is the requirement, so
     it needs a test rather than an argument.
   - Add a case seeding *legacy-format* localStorage (inline `exercises` arrays)
     to prove the `migrateLocalStorage()` chaining works.

4. **Deployment script**
   - Add to [package.json](package.json):
     ```json
     "db:deploy": "supabase db push",
     "db:diff":   "supabase db diff -f",
     "db:reset":  "supabase db reset"
     ```
   - `db:deploy` pushes local migrations to the linked remote project.
   - Confirm `supabase link` is in place before running; the script fails
     clearly if not.

5. **Remote environment**
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on the
     Vercel project (the README references an existing deployment at
     `workout-app-wine-psi.vercel.app`).
   - Verify the production auth redirect URLs in the Supabase dashboard include
     the Vercel domain, or sign-in will fail in production.

6. **Documentation** ([README.md](README.md))
   - Update the Tech Stack table: storage is Supabase, not localStorage.
   - Update the now-stale Project Structure block — it still lists
     `lib/storage.ts` and `lib/use-local-storage-plans.ts`, neither of which
     exists.
   - Add setup steps: `supabase start`, `.env.local`, `npm run db:reset`.
   - Document `db:deploy` and the schema.

### Verification

- [x] Import with legacy inline-exercise localStorage brings data across intact —
      covered by a spec, and driven by hand in a real browser: a plan carrying
      an inline `exercises` array (no `exerciseIds`, no migration marker)
      imported as "Imported 2 exercises and 1 plan", with the legacy `name` →
      `label` mapping and both weights/reps intact
- [x] Import with current-format localStorage brings data across intact — 3
      exercises and 1 plan, each exercise present with its values
- [x] Plan → exercise associations and their order survive the import — the
      fixture's `exerciseIds` is deliberately non-alphabetical
      (`[Deadlift, Bench Press, Squat]`) and the plan detail renders exactly
      that order; confirmed at the database level too, `position` 0/1 in the
      original order
- [x] **Running the import twice produces no duplicates and no changed counts** —
      asserted in a spec, and verified at the source of truth: after two full
      imports the database holds `plans=1, exercises=2, links=2`
- [x] Clearing the marker and re-importing is still safe — that is exactly how
      the double-import above is triggered; correctness comes from the upserts,
      not the marker
- [x] Import of an empty localStorage is a no-op, not an error — the prompt is
      never offered when there is nothing to import
- [x] A failed import leaves localStorage intact and reports the failure — the
      write path is stubbed to a 500, the banner reads "Import failed: ...",
      and localStorage still holds its 1 plan / 3 exercises
- [x] The prompt does not reappear after a successful import — gone on reload
      and on a fresh route
- [x] A second user importing their own data does not touch the first user's —
      both users end up with their own copy (`other@example.com` and
      `test@example.com` each own 1 plan / 2 exercises / 2 links). This check is
      what caught the primary-key collision — see Deviations
- [x] `npm run db:deploy` applies pending migrations to the remote project — it
      applied the pending `20260823120000_grant_service_role`, and
      `supabase migration list` now shows all three matching local↔remote
- [x] `npm run db:reset` rebuilds the local database from migrations + seed —
      all three migrations plus the seed, exit 0
- [ ] Production deploy: sign-up, sign-in, and CRUD all work against the remote
      project — **not done.** Setting Vercel env vars and the dashboard redirect
      URLs needs access to those consoles; the schema half of step 5 (the remote
      migrations) is deployed and verified. See Deviations
- [x] All E2E specs pass, including the new import spec — **76/76** against a
      freshly `supabase db reset` database (68 pre-existing + 8 new import specs)
- [x] README no longer references deleted files — `storage.ts` and
      `use-local-storage-plans.ts` are gone from it; the structure block now
      matches the tree on disk

Beyond the plan: the no-Supabase-env-vars fallback was re-verified, since this
phase touches the localStorage plan repository. With `.env` and `.env.local`
moved aside, `/` and `/exercise` return 200 with **zero** redirects, the plan
list renders, and the console is clean — 0 errors, 0 warnings. The console was
clean across the whole browser session, including both import runs and the
user switch.

### Deviations from plan

- **Row ids are derived per user, not reused verbatim** —
  [lib/row-id.ts](lib/row-id.ts). The plan assumed client-generated UUIDs make
  `upsert` naturally idempotent, and that legacy non-UUID ids were the only
  remapping case. Both hold, but they miss the real problem: `id` is the sole
  primary key, so two users importing the *same browser's* localStorage collide.
  Verified against the live stack rather than reasoned about — the second user's
  upsert is rejected with `42501 new row violates row-level security policy`, so
  their import would fail outright while the first user's row is (correctly)
  never touched. Deriving the id from `(userId, localId)` fixes both cases at
  once: stable per user, so a re-run still upserts the same rows and stays
  idempotent, and distinct across users, so each account gets its own copy.
  This is why the "second user" verification is an import that *succeeds* rather
  than one that is merely harmless.
- **`rowId` has a self-check**, [lib/import-local-data.test.ts](lib/import-local-data.test.ts),
  run with `node --experimental-strip-types`. It covers well-formed v4 output
  for UUID, non-UUID, empty and oversized input, stability, per-user and
  per-record distinctness, and 4000 derivations without a collision. It lives in
  its own module with no imports so plain Node can run it; `tsconfig.json` gains
  `allowImportingTsExtensions` (safe under `noEmit`) so tsc still checks it.
- **A real crash was found and fixed in the localStorage plan repository.**
  `PlanListTable` reads `plan.exerciseIds.length`, and a legacy plan has no
  `exerciseIds` — `usePlans` fetches on mount *before* the provider's migration
  effect runs, so the un-migrated shape reaches the table and took the whole
  page down with "Application error: a client-side exception has occurred".
  Pre-existing, but on the path this phase exercises. Fixed once in
  [lib/repositories/local-storage/plan-repository.ts](lib/repositories/local-storage/plan-repository.ts)
  where every caller routes through, rather than guarding in the table.
- **Import offerability is snapshotted once per mount.** Recomputing it each
  render read back the marker the import had just written, unmounting the banner
  before the user could see "Imported N…". Caught by the suite when six specs
  went red after a refactor. `useSyncExternalStore` supplies the
  server/client gate instead of a mount effect, which also keeps the
  `react-hooks/set-state-in-effect` lint rule satisfied.
- **The provider gained a `reload()`.** After an import, the page's hooks have
  already fetched. `reload` swaps in a fresh `epoch` object so the repositories
  are rebuilt, which is the refetch signal the hooks already key on — no new
  event channel, and no window events reintroduced. Confirmed live: the plan
  list populated immediately after the import with no manual reload.
- **The prompt is a dismissible banner, not a dialog.** Step 2 said
  "dismissible prompt"; a banner below the nav is the smaller thing that does
  it, and it does not trap focus over a page the user may want to read first.
- **Step 5 is half-done, deliberately.** The remote *database* is deployed and
  verified via `npm run db:deploy`. The Vercel environment variables and the
  Supabase dashboard redirect URLs are console operations on accounts not
  reachable from here, so they are left for a human — they are the only reason
  the production-deploy checkbox above is unticked.
- **`db:diff` takes the migration name as an argument**: `npm run db:diff -- <name>`,
  since `supabase db diff -f` requires one. Documented that way in the README.

---

## Risks & Notes

- **Docker is a hard dependency** for the local stack and therefore for E2E from
  Phase 4 on. Verify at the start of Phase 1, not at Phase 4.
- ~~**`numeric` → string.**~~ **Did not hold.** PostgREST serialises `numeric` as
  a JSON *number* on this stack — verified in Phase 3 at the raw HTTP layer
  (`{"weight":62.5}`, unquoted) and again in Phase 4 through the full UI
  (a 72.5 kg workout edit round-tripped as a number). The `Number(...)` coercion
  in [lib/supabase/mappers.ts](lib/supabase/mappers.ts) is kept as cheap defence,
  not because the string case was ever observed. `numeric` remains the right
  column type for the 0.5kg increments the form uses
  ([components/exercise-form.tsx:105](components/exercise-form.tsx#L105)).
- **RLS returns empty, not errors.** A misconfigured policy looks like "no data"
  rather than "permission denied", which reads as a bug in the app. The
  two-user isolation check in Phase 1 is what distinguishes them.
- **Single shared test user** forces `workers: 1`. If the suite becomes slow,
  the fix is a user per worker, not parallel workers on one user.
- **The anon key is public by design.** RLS is the security boundary. The
  service-role key belongs only in the E2E reset helper, which runs in Node
  against the local stack — never in application code, and never in a
  `NEXT_PUBLIC_` variable.
- **`.env*` is already gitignored**, so `.env.local` will not be committed. The
  committed `.env.example` must contain placeholders only.
