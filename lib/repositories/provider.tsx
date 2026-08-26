"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { SupabasePlanRepository } from "./supabase/plan-repository";
import { SupabaseExerciseRepository } from "./supabase/exercise-repository";
import { createClient } from "../supabase/client";
import { useAuth } from "../auth/provider";

interface RepositoryContextValue {
  planRepository: SupabasePlanRepository;
  exerciseRepository: SupabaseExerciseRepository;
}

const RepositoryContext = createContext<RepositoryContextValue | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const userId = user?.id ?? null;
  const isLoginRoute = usePathname().startsWith("/login");

  const value = useMemo(() => {
    if (!userId) return null;

    const supabase = createClient();
    return {
      planRepository: new SupabasePlanRepository(supabase, userId),
      exerciseRepository: new SupabaseExerciseRepository(supabase, userId),
    };
  }, [userId]);

  // On a fresh page load `user` is null only because getSession() is still in
  // flight -- it says nothing about whether anyone is signed in. Redirecting on
  // that guess bounced a signed-in user off any route they loaded directly:
  // the proxy answers /login with a 307 to /, so they landed on the plans list
  // instead of the page they asked for. Wait for the real answer.
  if (isLoading && !isLoginRoute) return null;

  // Session resolved and there is genuinely no user. /login is the one route
  // that renders signed out, and it does not touch the repositories. Every
  // other route is behind an auth redirect, but the client gets there a beat
  // later -- on sign-out the user clears before the redirect, and a data page
  // would otherwise render and call useRepositories() against a missing
  // provider. Hold it back until the redirect lands.
  if (!value) {
    return isLoginRoute ? <>{children}</> : <RedirectToLogin />;
  }

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
}

/**
 * Renders nothing, but drives the redirect from inside a *mounted* component.
 *
 * Sign-out clears the user, which lands on the branch above. Returning a bare
 * `null` there unmounts the whole tree -- including NavHeader, whose click
 * handler was mid-`router.replace("/login")` -- and a navigation issued from an
 * unmounted tree is silently dropped. The result was a permanently blank page
 * on a frozen URL: no error, no redirect, recoverable only by a manual reload.
 * Keeping one live component here means there is always a mounted owner for the
 * navigation. Same reason it cannot be an event-listener redirect in
 * lib/auth/provider.tsx: that listener's router dies with the same unmount.
 */
function RedirectToLogin() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}

export function useRepositories(): RepositoryContextValue {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error("useRepositories must be used within a RepositoryProvider");
  }
  return context;
}

export function usePlanRepository(): SupabasePlanRepository {
  return useRepositories().planRepository;
}

export function useExerciseRepository(): SupabaseExerciseRepository {
  return useRepositories().exerciseRepository;
}
