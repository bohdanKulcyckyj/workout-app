# Workout App

A sleek, mobile-first workout plan manager and tracker built with Next.js. Create custom workout plans, track exercises in real-time, and celebrate when you finish.

**[Live Demo](https://workout-app-wine-psi.vercel.app/)**

## Screenshots

<div align="center">
<table>
<tr>
<td align="center"><strong>Plan List</strong></td>
<td align="center"><strong>Create Plan</strong></td>
</tr>
<tr>
<td><img src="public/screenshots/plan-list.png" width="300" /></td>
<td><img src="public/screenshots/create-plan.png" width="300" /></td>
</tr>
<tr>
<td align="center"><strong>Plan Detail</strong></td>
<td align="center"><strong>Workout Tracking</strong></td>
</tr>
<tr>
<td><img src="public/screenshots/plan-detail.png" width="300" /></td>
<td><img src="public/screenshots/workout-tracking.png" width="300" /></td>
</tr>
</table>
</div>

## Features

- **Create & manage workout plans** -- name your plan and add exercises with weight and reps
- **Real-time workout tracking** -- check off exercises as you go with a live progress counter
- **Adjust on the fly** -- modify weight and reps mid-workout
- **Confetti celebration** -- canvas confetti fires when you complete all exercises
- **Edit & delete plans** -- full CRUD with confirmation dialogs
- **Accounts & private data** -- email/password auth, with row-level security so
  every user sees only their own plans and exercises
- **Import your local data** -- data from the pre-account localStorage version is
  offered for one-click import after sign-in
- **Dark theme** -- gym-friendly dark UI with red accents
- **Mobile-first** -- touch-friendly buttons and responsive layout

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) |
| Forms | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Icons | [Lucide React](https://lucide.dev) |
| Effects | [canvas-confetti](https://github.com/catdad/canvas-confetti) |
| Backend | [Supabase](https://supabase.com) (Postgres, Auth, RLS) |
| Storage | Supabase Postgres, behind a repository interface (localStorage fallback when unconfigured) |
| Testing | [Playwright](https://playwright.dev) (E2E) |
| Language | TypeScript |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- [Docker](https://docs.docker.com/get-docker/) and the
  [Supabase CLI](https://supabase.com/docs/guides/cli) -- the local database
  stack runs in Docker

### Install & Run

```bash
git clone https://github.com/<your-username>/workout-app.git
cd workout-app
npm install

# Start the local Supabase stack (Postgres, Auth, PostgREST, Studio)
supabase start

# Apply migrations and the seed (creates the test users)
npm run db:reset
```

Copy [.env.example](.env.example) to `.env.local` and fill in the values that
`supabase status` prints:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54421
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY, used only by the E2E reset helper>
```

Both `NEXT_PUBLIC_` keys are public by design -- the anon key is meant to be
exposed, and RLS is what protects the data. The service-role key bypasses RLS
and must never appear in application code.

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, or sign in with
the seeded user `test@example.com` / `test-password-123`.

Without the Supabase env vars the app still runs, falling back to localStorage
with no sign-in required.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run db:reset` | Rebuild the local database from migrations + seed |
| `npm run db:diff -- <name>` | Generate a migration from local schema changes |
| `npm run db:deploy` | Push pending migrations to the linked remote project |

## Project Structure

```
app/
  page.tsx                      # Home -- plan list
  login/page.tsx                # Sign in / sign up
  plan/
    create/page.tsx             # Create new plan
    [id]/page.tsx               # Plan detail view
    [id]/edit/page.tsx          # Edit existing plan
    [id]/workout/page.tsx       # Workout tracking session
  exercise/                     # Exercise list, create, detail, edit
components/
  plan-form.tsx                 # Reusable create/edit form
  plan-list-table.tsx           # Plan list with actions
  exercise-table.tsx            # Read-only exercise table
  import-prompt.tsx             # Offers the localStorage -> account import
  nav-header.tsx                # Nav, current user, sign out
  error-message.tsx             # Inline error for failed reads/writes
  ui/                           # shadcn/ui primitives
lib/
  types.ts                      # Zod schemas (StandaloneExercise, WorkoutPlan)
  auth/provider.tsx             # Auth context
  supabase/                     # Browser/server clients + row mappers
  repositories/
    types.ts                    # PlanRepository / ExerciseRepository interfaces
    provider.tsx                # Picks Supabase or localStorage by auth state
    supabase/                   # Supabase implementations
    local-storage/              # localStorage implementations (fallback)
  hooks/                        # usePlans / useExercises, async via repositories
  import-local-data.ts          # localStorage -> Supabase import
  row-id.ts                     # Deterministic per-user row ids for the import
  migrations.ts                 # Legacy inline-exercise localStorage migration
proxy.ts                        # Session refresh + auth redirects (Next proxy)
supabase/
  migrations/                   # Schema and RLS, source of truth
  seed.sql                      # Local test users
e2e/                            # Playwright E2E tests
```

## Database

Three tables, all protected by row-level security on
`user_id = (select auth.uid())`:

| Table | Purpose |
|-------|---------|
| `exercises` | Standalone exercises: label, description, default weight/reps |
| `plans` | Workout plans: name, timestamps |
| `plan_exercises` | Ordered join, `(plan_id, exercise_id)` + `position` |

`plan_exercises` derives ownership from its parent plan rather than storing a
second copy of `user_id`. Its foreign keys are `on delete cascade`, so deleting
an exercise removes it from every plan without any application-level cascade.

Schema changes are migrations under `supabase/migrations/`. Edit the local
database, run `npm run db:diff -- <name>` to capture the change, then
`npm run db:deploy` to push it to the linked remote project (`supabase link`
must have been run first, or the push fails with a clear error).

## Testing

The project includes comprehensive Playwright E2E tests covering every core user flow:

- Plan creation, viewing, editing, and deletion
- Exercise CRUD, and the database cascade when an exercise is deleted
- Workout tracking: checking exercises, modifying values, confetti trigger
- The localStorage import, including idempotency and per-user isolation
- Edge cases: empty states, confirmation dialogs, exercise reset

The suite runs against the local Supabase stack and exercises the real auth
flow and real RLS. It signs in as the seeded user and truncates that user's rows
between tests, so it runs single-worker.

```bash
supabase start          # if it isn't already running
npm run test:e2e        # auto-starts the dev server
```

## Deployment

Deployed on [Vercel](https://vercel.com). Push to `main` to trigger a new
deployment.

Two things the app needs in production:

1. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set as Vercel
   environment variables, pointing at the remote Supabase project.
2. The deployed domain listed under **Authentication -> URL Configuration** in
   the Supabase dashboard, or sign-in redirects will fail.

Schema changes are deployed separately, with `npm run db:deploy`.

## License

MIT
