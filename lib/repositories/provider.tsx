"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlanRepository, ExerciseRepository } from "./types";
import {
  LocalStoragePlanRepository,
  LocalStorageExerciseRepository,
} from "./local-storage";
import { SupabasePlanRepository } from "./supabase/plan-repository";
import { SupabaseExerciseRepository } from "./supabase/exercise-repository";
import { createClient } from "../supabase/client";
import { useAuth } from "../auth/provider";
import { migrateLocalStorage } from "../migrations";

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface RepositoryContextValue {
  planRepository: PlanRepository;
  exerciseRepository: ExerciseRepository;
  /**
   * Re-issue the repositories, so every mounted hook refetches. The hooks key
   * their effect on repository identity, so a new instance is the refresh
   * signal they already understand. Used after a bulk import.
   */
  reload: () => void;
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
  const { user } = useAuth();
  const userId = hasSupabaseEnv ? (user?.id ?? null) : null;
  // The repositories are rebuilt whenever this changes; `reload` swaps in a
  // fresh object so the hooks, which key their effect on repository identity,
  // refetch. Used after a bulk import.
  const [epoch, setEpoch] = useState<object>({});
  const reload = useCallback(() => setEpoch({}), []);

  useEffect(() => {
    // Side effect, so not in the useMemo below -- StrictMode double-invokes it
    migrateLocalStorage();
  }, []);

  const value = useMemo(() => {
    void epoch; // part of the memo key: a new epoch means new repositories
    // Signed in with Supabase configured -> server-backed; otherwise localStorage
    const supabase = userId ? createClient() : null;

    return {
      planRepository:
        planRepository ??
        (supabase && userId
          ? new SupabasePlanRepository(supabase, userId)
          : new LocalStoragePlanRepository()),
      exerciseRepository:
        exerciseRepository ??
        (supabase && userId
          ? new SupabaseExerciseRepository(supabase, userId)
          : new LocalStorageExerciseRepository()),
      reload,
    };
  }, [planRepository, exerciseRepository, userId, reload, epoch]);

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
