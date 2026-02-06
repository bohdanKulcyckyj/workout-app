import type { WorkoutPlan, StandaloneExercise, FlexibleWorkoutPlan } from "../types";

export interface PlanRepository {
  getAll(): Promise<WorkoutPlan[]>;
  getAllFlexible(): Promise<FlexibleWorkoutPlan[]>;
  getById(id: string): Promise<WorkoutPlan | null>;
  save(plan: WorkoutPlan): Promise<void>;
  delete(id: string): Promise<void>;
  removeExerciseFromAllPlans(exerciseId: string): Promise<void>;
}

export interface ExerciseRepository {
  getAll(): Promise<StandaloneExercise[]>;
  getById(id: string): Promise<StandaloneExercise | null>;
  getByIds(ids: string[]): Promise<StandaloneExercise[]>;
  save(exercise: StandaloneExercise): Promise<void>;
  delete(id: string): Promise<void>;
}
