import type { StandaloneExercise, WorkoutPlan } from "../types";

// Rows as PostgREST returns them. Hand-written rather than generated -- three
// tables, and `supabase gen types` would need regenerating on every migration.
// ponytail: swap for generated types if the schema grows past a handful of tables.
export interface ExerciseRow {
  id: string;
  label: string;
  description: string | null;
  weight: string | number | null;
  reps: number | null;
}

export interface PlanRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  plan_exercises: { exercise_id: string; position: number }[];
}

export function toExercise(row: ExerciseRow): StandaloneExercise {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? undefined,
    // PostgREST emits numeric as a JSON number today, but that is a serialiser
    // detail -- a string would fail the Zod parse, so coerce and be done.
    weight: row.weight === null ? undefined : Number(row.weight),
    reps: row.reps ?? undefined,
  };
}

export function toExerciseRow(exercise: StandaloneExercise, userId: string) {
  return {
    id: exercise.id,
    user_id: userId,
    label: exercise.label,
    description: exercise.description ?? null,
    weight: exercise.weight ?? null,
    reps: exercise.reps ?? null,
  };
}

export function toPlan(row: PlanRow): WorkoutPlan {
  return {
    id: row.id,
    name: row.name,
    // the nested select has no ordering guarantee -- position is the source of truth
    exerciseIds: [...row.plan_exercises]
      .sort((a, b) => a.position - b.position)
      .map((link) => link.exercise_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPlanRow(plan: WorkoutPlan, userId: string) {
  return {
    id: plan.id,
    user_id: userId,
    name: plan.name,
    created_at: plan.createdAt,
    // updated_at is maintained by the database trigger
  };
}
