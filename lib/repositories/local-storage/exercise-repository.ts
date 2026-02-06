import type { StandaloneExercise } from "../../types";
import type { ExerciseRepository, PlanRepository } from "../types";

const STORAGE_KEY = "exercises";

export class LocalStorageExerciseRepository implements ExerciseRepository {
  private planRepository: PlanRepository | null = null;

  setPlanRepository(planRepository: PlanRepository): void {
    this.planRepository = planRepository;
  }

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

    // Cascade: remove exercise ID from all plans
    if (this.planRepository) {
      await this.planRepository.removeExerciseFromAllPlans(id);
    }

    window.dispatchEvent(new Event("exercises-updated"));
  }
}
