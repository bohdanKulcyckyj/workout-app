import type { WorkoutPlan } from "../types";

export interface PlanRepository {
  getAll(): Promise<WorkoutPlan[]>;
  getById(id: string): Promise<WorkoutPlan | null>;
  save(plan: WorkoutPlan): Promise<void>;
  delete(id: string): Promise<void>;
}

// ExerciseRepository will be added in Phase 1 when StandaloneExercise type is created
