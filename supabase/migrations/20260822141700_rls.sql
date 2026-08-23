-- RLS: every row belongs to exactly one user.
-- (select auth.uid()) not bare auth.uid() -- forces one InitPlan evaluation
-- instead of a per-row call. Supabase's documented recommendation.

alter table public.exercises enable row level security;
alter table public.plans enable row level security;
alter table public.plan_exercises enable row level security;

create policy exercises_select on public.exercises for select
  using (user_id = (select auth.uid()));
create policy exercises_insert on public.exercises for insert
  with check (user_id = (select auth.uid()));
create policy exercises_update on public.exercises for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy exercises_delete on public.exercises for delete
  using (user_id = (select auth.uid()));

create policy plans_select on public.plans for select
  using (user_id = (select auth.uid()));
create policy plans_insert on public.plans for insert
  with check (user_id = (select auth.uid()));
create policy plans_update on public.plans for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy plans_delete on public.plans for delete
  using (user_id = (select auth.uid()));

-- plan_exercises has no user_id of its own; ownership is derived from the
-- parent plan so the fact lives in exactly one place. Insert/update also
-- guard exercise_id, else a user could attach someone else's exercise.
create policy plan_exercises_select on public.plan_exercises for select
  using (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.user_id = (select auth.uid())
  ));

create policy plan_exercises_insert on public.plan_exercises for insert
  with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_id and p.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.user_id = (select auth.uid())
    )
  );

create policy plan_exercises_update on public.plan_exercises for update
  using (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_id and p.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.user_id = (select auth.uid())
    )
  );

create policy plan_exercises_delete on public.plan_exercises for delete
  using (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.user_id = (select auth.uid())
  ));
