import { WorkoutPlan } from "./types";

const STORAGE_KEY = "workout-plans";

export interface StorageService {
  getPlans(): WorkoutPlan[];
  getPlan(id: string): WorkoutPlan | null;
  savePlan(plan: WorkoutPlan): void;
  deletePlan(id: string): void;
}

class LocalStorageService implements StorageService {
  getPlans(): WorkoutPlan[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as WorkoutPlan[];
  }

  getPlan(id: string): WorkoutPlan | null {
    const plans = this.getPlans();
    return plans.find((p) => p.id === id) ?? null;
  }

  savePlan(plan: WorkoutPlan): void {
    const plans = this.getPlans();
    const index = plans.findIndex((p) => p.id === plan.id);
    if (index >= 0) {
      plans[index] = plan;
    } else {
      plans.push(plan);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  }

  deletePlan(id: string): void {
    const plans = this.getPlans().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  }
}

export const storage: StorageService = new LocalStorageService();
