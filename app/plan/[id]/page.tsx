"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Play, ArrowLeft } from "lucide-react";
import { usePlan, useExercises } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { ExerciseTable } from "@/components/exercise-table";
import type { StandaloneExercise } from "@/lib/types";

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { plan, isLoading } = usePlan(id);
  const { getExercisesByIds } = useExercises();
  const [exercises, setExercises] = useState<StandaloneExercise[]>([]);

  useEffect(() => {
    if (plan?.exerciseIds) {
      getExercisesByIds(plan.exerciseIds).then(setExercises);
    }
  }, [plan?.exerciseIds, getExercisesByIds]);

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
        <Button asChild className="cursor-pointer">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to Plans
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold flex-1">{plan.name}</h1>
      </div>

      <div className="flex justify-between gap-3">
        <Button asChild>
          <Link href={`/plan/${id}/workout`}>
            <Play className="size-4" />
            Start
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/plan/${id}/edit`}>
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <ExerciseTable exercises={exercises} />
    </div>
  );
}
