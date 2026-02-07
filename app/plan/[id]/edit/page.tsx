"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePlan, useExercises } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { PlanForm } from "@/components/plan-form";
import type { WorkoutPlan, StandaloneExercise } from "@/lib/types";

export default function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { plan, isLoading, savePlan } = usePlan(id);
  const { exercises, saveExercise } = useExercises();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Plan Not Found</h1>
        <p className="text-muted-foreground">
          This workout plan doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to Plans
          </Link>
        </Button>
      </div>
    );
  }

  async function handleSave(updatedPlan: WorkoutPlan) {
    await savePlan(updatedPlan);
    router.push(`/plan/${updatedPlan.id}`);
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
          onClick={() => router.push(`/plan/${id}`)}
        >
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Edit Plan</h1>
      </div>

      <PlanForm
        initialPlan={plan}
        allExercises={exercises}
        onSave={handleSave}
        onExerciseCreate={handleExerciseCreate}
        submitLabel="Save Changes"
      />
    </div>
  );
}
