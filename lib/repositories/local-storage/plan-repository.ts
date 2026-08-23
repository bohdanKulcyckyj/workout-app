import type { WorkoutPlan } from "../../types";
import type { PlanRepository } from "../types";

const STORAGE_KEY = "workout-plans";

export class LocalStoragePlanRepository implements PlanRepository {
  async getAll(): Promise<WorkoutPlan[]> {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    // exerciseIds may be missing: a legacy browser's plans carry an inline
    // `exercises` array instead, and the read can land before the migration
    // effect runs. Default it here, where every caller routes through --
    // PlanListTable reads .length on it and would crash the page.
    const plans = (JSON.parse(data) as WorkoutPlan[]).map((plan) => ({
      ...plan,
      exerciseIds: plan.exerciseIds ?? [],
    }));
    // Sorted here, matching the Supabase repo's order("name") -- the hooks used
    // to sort and no longer do, so the contract lives in both implementations.
    return plans.toSorted((a, b) => a.name.localeCompare(b.name));
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
