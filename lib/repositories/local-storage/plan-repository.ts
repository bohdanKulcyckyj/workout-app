import type { WorkoutPlan, FlexibleWorkoutPlan } from "../../types";
import type { PlanRepository } from "../types";

const STORAGE_KEY = "workout-plans";

export class LocalStoragePlanRepository implements PlanRepository {
  // Get all plans in flexible format (supports both old and new schema)
  async getAllFlexible(): Promise<FlexibleWorkoutPlan[]> {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as FlexibleWorkoutPlan[];
  }

  // Get all plans in new format (only returns migrated plans)
  async getAll(): Promise<WorkoutPlan[]> {
    const flexiblePlans = await this.getAllFlexible();
    // Filter to only plans that have been migrated (have exerciseIds)
    return flexiblePlans
      .filter((p) => p.exerciseIds !== undefined)
      .map((p) => ({
        id: p.id,
        name: p.name,
        exerciseIds: p.exerciseIds!,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
  }

  async getById(id: string): Promise<WorkoutPlan | null> {
    const plans = await this.getAll();
    return plans.find((p) => p.id === id) ?? null;
  }

  async save(plan: WorkoutPlan): Promise<void> {
    const plans = await this.getAllFlexible();
    const index = plans.findIndex((p) => p.id === plan.id);

    // Convert to new format with exerciseIds
    const newPlan: FlexibleWorkoutPlan = {
      id: plan.id,
      name: plan.name,
      exerciseIds: plan.exerciseIds,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };

    if (index >= 0) {
      plans[index] = newPlan;
    } else {
      plans.push(newPlan);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    window.dispatchEvent(new Event("plans-updated"));
  }

  async delete(id: string): Promise<void> {
    const plans = (await this.getAllFlexible()).filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    window.dispatchEvent(new Event("plans-updated"));
  }

  async removeExerciseFromAllPlans(exerciseId: string): Promise<void> {
    const plans = await this.getAllFlexible();
    let updated = false;

    for (const plan of plans) {
      if (plan.exerciseIds?.includes(exerciseId)) {
        plan.exerciseIds = plan.exerciseIds.filter((id) => id !== exerciseId);
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
      window.dispatchEvent(new Event("plans-updated"));
    }
  }
}
