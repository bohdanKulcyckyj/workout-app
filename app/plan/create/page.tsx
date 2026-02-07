"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePlans, useExercises } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { PlanForm } from "@/components/plan-form";
import type { WorkoutPlan, StandaloneExercise } from "@/lib/types";

export default function CreatePlanPage() {
  const router = useRouter();
  const { savePlan } = usePlans();
  const { exercises, saveExercise } = useExercises();

  async function handleSave(plan: WorkoutPlan) {
    await savePlan(plan);
    router.push(`/plan/${plan.id}`);
  }

  async function handleExerciseCreate(exercise: StandaloneExercise) {
    await saveExercise(exercise);
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

      <PlanForm
        allExercises={exercises}
        onSave={handleSave}
        onExerciseCreate={handleExerciseCreate}
        submitLabel="Create"
      />
    </div>
  );
}
