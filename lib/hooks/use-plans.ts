"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlanRepository } from "../repositories";
import type { WorkoutPlan } from "../types";

// PostgREST errors are plain objects with a `message`, not Error instances,
// so `String(e)` on them yields "[object Object]".
function message(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return String(e);
}

export function usePlans() {
  const repository = usePlanRepository();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Identity of the newest fetch. A response whose token is no longer the
  // current one lost a race (or the component unmounted) and is dropped.
  const latest = useRef<object>({});

  const load = useCallback(async () => {
    const token = (latest.current = {});
    // Deliberately not setting isLoading here. It means "no data yet", not
    // "a request is in flight": a refetch after a write would otherwise swap
    // the page back to its Loading branch and remount the form the user is
    // still filling in, losing their input.
    try {
      const data = await repository.getAll();
      if (token !== latest.current) return;
      setPlans(data);
      setError(null);
    } catch (e) {
      if (token !== latest.current) return;
      setError(message(e));
    } finally {
      if (token === latest.current) setIsLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    // A new repository (sign-in/sign-out) means the current rows belong to
    // someone else, so this genuinely is "no data yet" again.
    setIsLoading(true);
    load();
    // Invalidate whatever is in flight, so a response arriving after unmount
    // does not setState.
    return () => {
      latest.current = {};
    };
  }, [load]);

  const savePlan = useCallback(
    async (plan: WorkoutPlan) => {
      try {
        await repository.save(plan);
      } catch (e) {
        setError(message(e));
        throw e;
      }
      await load();
    },
    [repository, load]
  );

  const deletePlan = useCallback(
    async (id: string) => {
      try {
        await repository.delete(id);
      } catch (e) {
        setError(message(e));
        throw e;
      }
      await load();
    },
    [repository, load]
  );

  return { plans, isLoading, error, refresh: load, savePlan, deletePlan };
}

export function usePlan(id: string) {
  const repository = usePlanRepository();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<object>({});

  const load = useCallback(async () => {
    const token = (latest.current = {});
    // isLoading means "no data yet", not "in flight" -- see usePlans.
    try {
      const data = await repository.getById(id);
      if (token !== latest.current) return;
      setPlan(data);
      setError(null);
    } catch (e) {
      if (token !== latest.current) return;
      setPlan(null);
      setError(message(e));
    } finally {
      if (token === latest.current) setIsLoading(false);
    }
  }, [repository, id]);

  useEffect(() => {
    // A new repository or id means the current value belongs to something
    // else, so this genuinely is "no data yet" again.
    setIsLoading(true);
    load();
    // Invalidate whatever is in flight, so a response arriving after unmount
    // does not setState.
    return () => {
      latest.current = {};
    };
  }, [load]);

  const savePlan = useCallback(
    async (updatedPlan: WorkoutPlan) => {
      try {
        await repository.save(updatedPlan);
      } catch (e) {
        setError(message(e));
        throw e;
      }
      await load();
    },
    [repository, load]
  );

  return { plan, isLoading, error, refresh: load, savePlan };
}
