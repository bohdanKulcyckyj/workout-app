import type { WorkoutPlan } from "../../types";
import type { PlanRepository } from "../types";

const STORAGE_KEY = "workout-plans";

export class LocalStoragePlanRepository implements PlanRepository {
  async getAll(): Promise<WorkoutPlan[]> {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as WorkoutPlan[];
  }

  async getById(id: string): Promise<WorkoutPlan | null> {
    const plans = await this.getAll();
    return plans.find((p) => p.id === id) ?? null;
  }

  async save(plan: WorkoutPlan): Promise<void> {
    const plans = await this.getAll();
    const index = plans.findIndex((p) => p.id === plan.id);

    if (index >= 0) {
      plans[index] = plan;
    } else {
      plans.push(plan);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    window.dispatchEvent(new Event("plans-updated"));
  }

  async delete(id: string): Promise<void> {
    const plans = (await this.getAll()).filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    window.dispatchEvent(new Event("plans-updated"));
  }
}
