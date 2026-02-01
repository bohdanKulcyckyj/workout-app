"use client";

import { useCallback, useSyncExternalStore } from "react";
import { WorkoutPlan, workoutPlansSchema } from "@/lib/types";

const STORAGE_KEY = "workout-plans";

function getSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function getServerSnapshot(): string {
  return "[]";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useLocalStoragePlans() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const parsed = workoutPlansSchema.safeParse(JSON.parse(raw));
  const plans: WorkoutPlan[] = parsed.success ? parsed.data : [];

  const refresh = useCallback(() => {
    // Dispatch a storage event to trigger re-read
    window.dispatchEvent(new Event("storage"));
  }, []);

  return { plans, refresh };
}

export function useLocalStoragePlan(id: string) {
  const { plans, refresh } = useLocalStoragePlans();
  const plan = plans.find((p) => p.id === id) ?? null;
  return { plan, refresh };
}
