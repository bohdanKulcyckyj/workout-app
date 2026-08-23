import type { StandaloneExercise, WorkoutPlan } from "../../types";
import type { ExerciseRepository } from "../types";

const STORAGE_KEY = "exercises";
const PLANS_KEY = "workout-plans";

export class LocalStorageExerciseRepository implements ExerciseRepository {
  async getAll(): Promise<StandaloneExercise[]> {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as StandaloneExercise[];
  }

  async getById(id: string): Promise<StandaloneExercise | null> {
    const exercises = await this.getAll();
    return exercises.find((e) => e.id === id) ?? null;
  }

  async getByIds(ids: string[]): Promise<StandaloneExercise[]> {
    const exercises = await this.getAll();
    const idSet = new Set(ids);
    // Preserve order of IDs
    return ids
      .map((id) => exercises.find((e) => e.id === id))
      .filter((e): e is StandaloneExercise => e !== undefined);
  }

  async save(exercise: StandaloneExercise): Promise<void> {
    const exercises = await this.getAll();
    const index = exercises.findIndex((e) => e.id === exercise.id);
    if (index >= 0) {
      exercises[index] = exercise;
    } else {
      exercises.push(exercise);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
    window.dispatchEvent(new Event("exercises-updated"));
  }

  async delete(id: string): Promise<void> {
    // Remove exercise from storage
    const exercises = (await this.getAll()).filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));

    // Cascade: remove exercise ID from all plans. Supabase gets this from an
    // FK cascade; localStorage has no database, so it does it by hand.
    const plansRaw = localStorage.getItem(PLANS_KEY);
    if (plansRaw) {
      const plans = JSON.parse(plansRaw) as WorkoutPlan[];
      if (plans.some((p) => p.exerciseIds.includes(id))) {
        for (const plan of plans) {
          plan.exerciseIds = plan.exerciseIds.filter((e) => e !== id);
        }
        localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
        window.dispatchEvent(new Event("plans-updated"));
      }
    }

    window.dispatchEvent(new Event("exercises-updated"));
  }
}
