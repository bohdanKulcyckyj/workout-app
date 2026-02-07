"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PlanRepository, ExerciseRepository } from "./types";
import {
  LocalStoragePlanRepository,
  LocalStorageExerciseRepository,
} from "./local-storage";
import { migrateLocalStorage } from "../migrations";

interface RepositoryContextValue {
  planRepository: PlanRepository;
  exerciseRepository: ExerciseRepository;
}

const RepositoryContext = createContext<RepositoryContextValue | null>(null);

interface RepositoryProviderProps {
  children: ReactNode;
  planRepository?: PlanRepository;
  exerciseRepository?: ExerciseRepository;
}

export function RepositoryProvider({
  children,
  planRepository,
  exerciseRepository,
}: RepositoryProviderProps) {
  const value = useMemo(() => {
    // Migrate legacy data before creating repositories
    migrateLocalStorage();

    const planRepo = planRepository ?? new LocalStoragePlanRepository();
    const exerciseRepo =
      exerciseRepository ?? new LocalStorageExerciseRepository();

    // Wire up circular dependency for cascade delete
    if (exerciseRepo instanceof LocalStorageExerciseRepository) {
      exerciseRepo.setPlanRepository(planRepo);
    }

    return {
      planRepository: planRepo,
      exerciseRepository: exerciseRepo,
    };
  }, [planRepository, exerciseRepository]);

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepositories(): RepositoryContextValue {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error("useRepositories must be used within a RepositoryProvider");
  }
  return context;
}

export function usePlanRepository(): PlanRepository {
  return useRepositories().planRepository;
}

export function useExerciseRepository(): ExerciseRepository {
  return useRepositories().exerciseRepository;
}
