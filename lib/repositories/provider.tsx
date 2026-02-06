"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PlanRepository } from "./types";
import { LocalStoragePlanRepository } from "./local-storage";

interface RepositoryContextValue {
  planRepository: PlanRepository;
}

const RepositoryContext = createContext<RepositoryContextValue | null>(null);

interface RepositoryProviderProps {
  children: ReactNode;
  planRepository?: PlanRepository;
}

export function RepositoryProvider({
  children,
  planRepository,
}: RepositoryProviderProps) {
  const value = useMemo(
    () => ({
      planRepository: planRepository ?? new LocalStoragePlanRepository(),
    }),
    [planRepository]
  );

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
