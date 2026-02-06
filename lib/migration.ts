import type { StandaloneExercise, WorkoutPlan, FlexibleWorkoutPlan } from "./types";

const MIGRATION_KEY = "migration-v1";
const PLANS_STORAGE_KEY = "workout-plans";
const EXERCISES_STORAGE_KEY = "exercises";

interface LegacyExerciseData {
  id: string;
  name: string;
  weight: number;
  reps: number;
  done: boolean;
}

interface LegacyPlanData {
  id: string;
  name: string;
  exercises: LegacyExerciseData[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Migrates inline exercises from old plan format to standalone exercise entities.
 *
 * This migration:
 * 1. Reads all plans from localStorage
 * 2. For each plan with inline exercises (old format):
 *    - Extracts exercises and creates StandaloneExercise entities
 *    - Deduplicates by label (same name = same exercise)
 *    - Saves standalone exercises to exercises storage
 *    - Converts plan to use exerciseIds array
 * 3. Saves updated plans
 * 4. Marks migration as complete
 */
export function migrateInlineExercises(): void {
  if (typeof window === "undefined") return;

  // Check if migration already completed
  if (localStorage.getItem(MIGRATION_KEY) === "done") {
    return;
  }

  const plansData = localStorage.getItem(PLANS_STORAGE_KEY);
  if (!plansData) {
    // No plans to migrate, mark as done
    localStorage.setItem(MIGRATION_KEY, "done");
    return;
  }

  let plans: FlexibleWorkoutPlan[];
  try {
    plans = JSON.parse(plansData);
  } catch {
    // Invalid data, mark as done to prevent repeated failures
    localStorage.setItem(MIGRATION_KEY, "done");
    return;
  }

  // Check if any plans need migration (have inline exercises)
  const plansNeedingMigration = plans.filter(
    (plan) =>
      Array.isArray((plan as unknown as LegacyPlanData).exercises) &&
      (plan as unknown as LegacyPlanData).exercises.length > 0 &&
      !plan.exerciseIds
  );

  if (plansNeedingMigration.length === 0) {
    // No plans need migration
    localStorage.setItem(MIGRATION_KEY, "done");
    return;
  }

  // Load existing standalone exercises (if any)
  const existingExercisesData = localStorage.getItem(EXERCISES_STORAGE_KEY);
  const existingExercises: StandaloneExercise[] = existingExercisesData
    ? JSON.parse(existingExercisesData)
    : [];

  // Map to deduplicate exercises by label
  const exercisesByLabel = new Map<string, StandaloneExercise>();

  // Add existing exercises to map
  for (const exercise of existingExercises) {
    exercisesByLabel.set(exercise.label.toLowerCase(), exercise);
  }

  // Process each plan
  const migratedPlans: FlexibleWorkoutPlan[] = plans.map((plan) => {
    const legacyPlan = plan as unknown as LegacyPlanData;

    // Skip if already migrated or no inline exercises
    if (plan.exerciseIds || !legacyPlan.exercises) {
      return plan;
    }

    const exerciseIds: string[] = [];

    for (const legacyExercise of legacyPlan.exercises) {
      const label = legacyExercise.name;
      const labelKey = label.toLowerCase();

      let standaloneExercise = exercisesByLabel.get(labelKey);

      if (!standaloneExercise) {
        // Create new standalone exercise
        standaloneExercise = {
          id: legacyExercise.id,
          label: label,
          weight: legacyExercise.weight || undefined,
          reps: legacyExercise.reps || undefined,
        };
        exercisesByLabel.set(labelKey, standaloneExercise);
      }

      exerciseIds.push(standaloneExercise.id);
    }

    // Return migrated plan
    return {
      id: plan.id,
      name: plan.name,
      exerciseIds,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  });

  // Save standalone exercises
  const allExercises = Array.from(exercisesByLabel.values());
  localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify(allExercises));

  // Save migrated plans
  localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(migratedPlans));

  // Mark migration as complete
  localStorage.setItem(MIGRATION_KEY, "done");

  // Dispatch events to notify React of changes
  window.dispatchEvent(new Event("exercises-updated"));
  window.dispatchEvent(new Event("plans-updated"));

  console.log(
    `Migration complete: ${plansNeedingMigration.length} plans migrated, ${allExercises.length} exercises created`
  );
}

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MIGRATION_KEY) !== "done";
}

/**
 * Reset migration flag (useful for testing)
 */
export function resetMigration(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MIGRATION_KEY);
}
