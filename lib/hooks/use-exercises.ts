"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useExerciseRepository } from "../repositories";
import type { StandaloneExercise } from "../types";
import { standaloneExercisesSchema } from "../types";

const STORAGE_KEY = "exercises";

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
  window.addEventListener("exercises-updated", callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("exercises-updated", callback);
  };
}

export function useExercises() {
  const repository = useExerciseRepository();

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const parsed = standaloneExercisesSchema.safeParse(JSON.parse(raw));
  const exercises: StandaloneExercise[] = parsed.success ? parsed.data : [];

  const refresh = useCallback(() => {
    window.dispatchEvent(new Event("exercises-updated"));
  }, []);

  const saveExercise = useCallback(
    async (exercise: StandaloneExercise) => {
      await repository.save(exercise);
      refresh();
    },
    [repository, refresh]
  );

  const deleteExercise = useCallback(
    async (id: string) => {
      await repository.delete(id);
      refresh();
    },
    [repository, refresh]
  );

  const getExercisesByIds = useCallback(
    async (ids: string[]): Promise<StandaloneExercise[]> => {
      return repository.getByIds(ids);
    },
    [repository]
  );

  return {
    exercises,
    isLoading: false,
    refresh,
    saveExercise,
    deleteExercise,
    getExercisesByIds,
  };
}

export function useExercise(id: string) {
  const repository = useExerciseRepository();

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const parsed = standaloneExercisesSchema.safeParse(JSON.parse(raw));
  const exercises: StandaloneExercise[] = parsed.success ? parsed.data : [];
  const exercise = exercises.find((e) => e.id === id) ?? null;

  const refresh = useCallback(() => {
    window.dispatchEvent(new Event("exercises-updated"));
  }, []);

  const saveExercise = useCallback(
    async (updatedExercise: StandaloneExercise) => {
      await repository.save(updatedExercise);
      refresh();
    },
    [repository, refresh]
  );

  return { exercise, isLoading: false, refresh, saveExercise };
}
