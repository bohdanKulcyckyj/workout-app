import { migrateLocalStorage } from "./migrations";
import { rowId } from "./row-id";
import type { ExerciseRepository, PlanRepository } from "./repositories/types";
import type { StandaloneExercise, WorkoutPlan } from "./types";

const PLANS_KEY = "workout-plans";
const EXERCISES_KEY = "exercises";

export interface ImportResult {
  exercises: number;
  plans: number;
}

/** Has this user already been offered/run the import? */
export function importMarkerKey(userId: string) {
  return `import-completed-${userId}`;
}

export function hasLocalData(): boolean {
  if (typeof window === "undefined") return false;
  migrateLocalStorage();
  return readArray(PLANS_KEY).length > 0 || readArray(EXERCISES_KEY).length > 0;
}

function readArray(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


/**
 * Copy this browser's localStorage data into the signed-in user's Supabase
 * account. Idempotent: every write is an upsert keyed on an id derived from
 * (userId, local id), so re-running overwrites the same rows rather than
 * duplicating them -- see rowId for why the local id is not used verbatim.
 *
 * localStorage is never modified -- it stays as the fallback copy.
 */
export async function importLocalData(
  exerciseRepo: ExerciseRepository,
  planRepo: PlanRepository,
  userId: string
): Promise<ImportResult> {
  // Pre-refactor browsers hold inline `exercises` arrays on their plans; this
  // normalises them to the standalone shape the repositories expect.
  migrateLocalStorage();

  // Raw keys, not the localStorage repositories -- those sort in getAll(), and
  // insertion order is the only order legacy data has.
  const exercises = readArray(EXERCISES_KEY) as StandaloneExercise[];
  const plans = readArray(PLANS_KEY) as WorkoutPlan[];

  // Exercises first: plan_exercises has an FK onto them.
  for (const exercise of exercises) {
    await exerciseRepo.save({
      ...exercise,
      id: rowId(userId, exercise.id),
      label: exercise.label || "Unnamed exercise",
    });
  }

  const importedIds = new Set(
    exercises.map((e) => rowId(userId, e.id))
  );

  for (const plan of plans) {
    await planRepo.save({
      ...plan,
      id: rowId(userId, plan.id),
      // Drop ids with no exercise behind them -- the FK would reject them.
      exerciseIds: (plan.exerciseIds ?? [])
        .map((id) => rowId(userId, id))
        .filter((id) => importedIds.has(id)),
    });
  }

  return { exercises: exercises.length, plans: plans.length };
}
