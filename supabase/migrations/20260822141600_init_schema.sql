-- Core schema: exercises, plans, and the ordered join between them.

create table public.exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null check (length(trim(label)) > 0),
  description text,
  weight      numeric,
  reps        integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- position keeps exerciseIds order-stable; the FKs let the database own the
-- cascade that removeExerciseFromAllPlans hand-rolled in the client.
create table public.plan_exercises (
  plan_id     uuid not null references public.plans(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position    integer not null,
  primary key (plan_id, exercise_id)
);

create index exercises_user_id_idx on public.exercises (user_id);
create index plans_user_id_idx on public.plans (user_id);
create index plan_exercises_exercise_id_idx on public.plan_exercises (exercise_id);

create function public.set_updated_at() returns trigger
  language plpgsql
  set search_path = ''
  as $$
  begin new.updated_at = now(); return new; end $$;

create trigger exercises_set_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();

create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- Table grants and RLS are independent layers: without a grant PostgREST is
-- refused (42501) before any policy is consulted. Granting to authenticated
-- only -- these tables have no anonymous access, so anon gets nothing.
grant select, insert, update, delete
  on public.exercises, public.plans, public.plan_exercises
  to authenticated;
