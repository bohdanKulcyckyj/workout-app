"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Play, ArrowLeft } from "lucide-react";
import { storage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { ExerciseTable } from "@/components/exercise-table";

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const plan = storage.getPlan(id);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold flex-1">{plan.name}</h1>
      </div>

      <div className="flex gap-3">
        <Button asChild className="flex-1">
          <Link href={`/plan/${id}/workout`}>
            <Play className="size-4" />
            Start Workout
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/plan/${id}/edit`}>
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <ExerciseTable exercises={plan.exercises} />
    </div>
  );
}
