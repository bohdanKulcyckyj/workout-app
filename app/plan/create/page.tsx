"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePlans, useExercises } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { PlanForm } from "@/components/plan-form";
import { ErrorMessage } from "@/components/error-message";
import type { WorkoutPlan, StandaloneExercise } from "@/lib/types";

export default function CreatePlanPage() {
  const router = useRouter();
  const { savePlan, error } = usePlans();
  const {
    exercises,
    isLoading: exercisesLoading,
    error: exercisesError,
    saveExercise,
  } = useExercises();

  async function handleSave(plan: WorkoutPlan) {
    try {
      await savePlan(plan);
    } catch {
      return; // stay on the form; `error` below says what failed
    }
    router.push(`/plan/${plan.id}`);
  }

  async function handleExerciseCreate(exercise: StandaloneExercise) {
    await saveExercise(exercise);
  }

  // The dropdown is populated from `exercises` -- mounting the form before it
  // arrives shows an empty picker.
  if (exercisesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Create New Plan</h1>
      </div>

      <ErrorMessage error={error ?? exercisesError} />

      <PlanForm
        allExercises={exercises}
        onSave={handleSave}
        onExerciseCreate={handleExerciseCreate}
        submitLabel="Create"
      />
    </div>
  );
}
