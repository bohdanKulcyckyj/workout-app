/**
 * Migrate legacy localStorage data from the old format (inline exercises)
 * to the new format (standalone exercises referenced by ID).
 *
 * Old format (key: "workout-plans"):
 *   [{ id, name, exercises: [{ id, name, weight, reps, done }], createdAt, updatedAt }]
 *
 * New format:
 *   key "workout-plans": [{ id, name, exerciseIds: string[], createdAt, updatedAt }]
 *   key "exercises":     [{ id, label, weight?, reps? }]
 *
 * This function is idempotent — already-migrated data is left untouched.
 */
export function migrateLocalStorage(): void {
  if (typeof window === "undefined") return;

  const PLANS_KEY = "workout-plans";
  const EXERCISES_KEY = "exercises";
  const MIGRATION_KEY = "migration-v1-done";

  // Skip if already migrated
  if (localStorage.getItem(MIGRATION_KEY)) return;

  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (!raw) {
      // Nothing to migrate
      localStorage.setItem(MIGRATION_KEY, "true");
      return;
    }

    const plans = JSON.parse(raw);

    if (!Array.isArray(plans)) {
      clearAppData(PLANS_KEY, EXERCISES_KEY, MIGRATION_KEY);
      return;
    }

    // Check whether any plan uses the old inline `exercises` array
    const needsMigration = plans.some(
      (p: any) => Array.isArray(p?.exercises) && !Array.isArray(p?.exerciseIds)
    );

    if (!needsMigration) {
      // Data is already in the new shape (or empty)
      localStorage.setItem(MIGRATION_KEY, "true");
      return;
    }

    // Load existing standalone exercises (in case some already exist)
    let existingExercises: any[] = [];
    try {
      const exRaw = localStorage.getItem(EXERCISES_KEY);
      if (exRaw) existingExercises = JSON.parse(exRaw);
    } catch {
      existingExercises = [];
    }

    const exerciseMap = new Map<string, any>(
      existingExercises.map((e: any) => [e.id, e])
    );

    const migratedPlans = plans.map((plan: any) => {
      // Already migrated plan — leave as-is
      if (Array.isArray(plan.exerciseIds)) return plan;

      const inlineExercises: any[] = plan.exercises ?? [];
      const exerciseIds: string[] = [];

      for (const ex of inlineExercises) {
        if (!exerciseMap.has(ex.id)) {
          exerciseMap.set(ex.id, {
            id: ex.id,
            label: ex.name ?? "Unknown",
            weight: ex.weight,
            reps: ex.reps,
          });
        }
        exerciseIds.push(ex.id);
      }

      // Return plan in the new shape (drop the old `exercises` field)
      const { exercises: _dropped, ...rest } = plan;
      return { ...rest, exerciseIds };
    });

    // Write migrated data back
    localStorage.setItem(PLANS_KEY, JSON.stringify(migratedPlans));
    localStorage.setItem(
      EXERCISES_KEY,
      JSON.stringify(Array.from(exerciseMap.values()))
    );
    localStorage.setItem(MIGRATION_KEY, "true");
  } catch {
    // Migration failed — wipe all app data so the user starts fresh
    clearAppData(PLANS_KEY, EXERCISES_KEY, MIGRATION_KEY);
  }
}

function clearAppData(
  plansKey: string,
  exercisesKey: string,
  migrationKey: string
): void {
  localStorage.removeItem(plansKey);
  localStorage.removeItem(exercisesKey);
  localStorage.setItem(migrationKey, "true");
}
