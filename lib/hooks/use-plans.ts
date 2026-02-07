"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePlanRepository } from "../repositories";
import type { WorkoutPlan } from "../types";
import { workoutPlansSchema } from "../types";

const STORAGE_KEY = "workout-plans";

// Snapshot functions for useSyncExternalStore
function getSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function getServerSnapshot(): string {
  return "[]";
}

// Subscribe to both storage events and custom events
function subscribe(callback: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("plans-updated", callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("plans-updated", callback);
  };
}

export function usePlans() {
  const repository = usePlanRepository();

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const parsed = workoutPlansSchema.safeParse(JSON.parse(raw));
  const plans: WorkoutPlan[] = parsed.success
    ? parsed.data.toSorted((a, b) => a.name.localeCompare(b.name))
    : [];

  const refresh = useCallback(() => {
    window.dispatchEvent(new Event("plans-updated"));
  }, []);

  const savePlan = useCallback(
    async (plan: WorkoutPlan) => {
      await repository.save(plan);
      refresh();
    },
    [repository, refresh]
  );

  const deletePlan = useCallback(
    async (id: string) => {
      await repository.delete(id);
      refresh();
    },
    [repository, refresh]
  );

  return { plans, isLoading: false, refresh, savePlan, deletePlan };
}

export function usePlan(id: string) {
  const repository = usePlanRepository();

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const parsed = workoutPlansSchema.safeParse(JSON.parse(raw));
  const plans: WorkoutPlan[] = parsed.success ? parsed.data : [];
  const plan = plans.find((p) => p.id === id) ?? null;

  const refresh = useCallback(() => {
    window.dispatchEvent(new Event("plans-updated"));
  }, []);

  const savePlan = useCallback(
    async (updatedPlan: WorkoutPlan) => {
      await repository.save(updatedPlan);
      refresh();
    },
    [repository, refresh]
  );

  return { plan, isLoading: false, refresh, savePlan };
}
