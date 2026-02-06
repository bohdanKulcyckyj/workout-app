"use client";

import { use, useState, useEffect } from "react";
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
  const { saveExercise, getExercisesByIds } = useExercises();
  const [initialExercises, setInitialExercises] = useState<StandaloneExercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);

  useEffect(() => {
    if (plan?.exerciseIds) {
      getExercisesByIds(plan.exerciseIds).then((exercises) => {
        setInitialExercises(exercises);
        setExercisesLoading(false);
      });
    } else if (!isLoading) {
      setExercisesLoading(false);
    }
  }, [plan?.exerciseIds, getExercisesByIds, isLoading]);

  if (isLoading || exercisesLoading) {
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

  async function handleSave(updatedPlan: WorkoutPlan, exercises: StandaloneExercise[]) {
    // Save all exercises first
    for (const exercise of exercises) {
      await saveExercise(exercise);
    }
    // Then save the plan
    await savePlan(updatedPlan);
    router.push(`/plan/${updatedPlan.id}`);
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
        initialExercises={initialExercises}
        onSave={handleSave}
        submitLabel="Save Changes"
      />
    </div>
  );
}
