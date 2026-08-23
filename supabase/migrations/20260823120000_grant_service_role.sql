-- service_role needs DML to reset the test user's data between E2E runs.
-- The init migration granted `authenticated` only; service_role was left with
-- just the ownership-default TRUNCATE/TRIGGER/REFERENCES, so PostgREST refused
-- the reset with 42501 before RLS was ever consulted.
--
-- service_role bypasses RLS by design (it has BYPASSRLS) and its key is never
-- shipped to the browser -- it lives in .env.local and is read only by the E2E
-- helper running in Node. This grant does not widen what the app can do.
grant select, insert, update, delete
  on public.exercises, public.plans, public.plan_exercises
  to service_role;
