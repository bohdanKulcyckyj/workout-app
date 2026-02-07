"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useExercise, usePlans } from "@/lib/hooks";
import { useExercises } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { exercise, isLoading } = useExercise(id);
  const { deleteExercise } = useExercises();
  const { plans } = usePlans();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Find plans that use this exercise
  const plansUsingExercise = plans.filter((plan) =>
    plan.exerciseIds.includes(id)
  );

  function handleDelete() {
    deleteExercise(id);
    router.push("/exercise");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Exercise Not Found</h1>
        <p className="text-muted-foreground">
          This exercise doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild className="cursor-pointer">
          <Link href="/exercise">
            <ArrowLeft className="size-4" />
            Back to Exercises
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          className="cursor-pointer"
          variant="ghost"
          size="icon"
          onClick={() => router.push("/exercise")}
        >
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold flex-1">{exercise.label}</h1>
      </div>

      <div className="space-y-4">
        {exercise.description && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">
              Description
            </h2>
            <p className="text-sm">{exercise.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">
              Default Weight
            </h2>
            <p className="text-sm">
              {exercise.weight !== undefined ? `${exercise.weight} kg` : "—"}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">
              Default Reps
            </h2>
            <p className="text-sm">
              {exercise.reps !== undefined ? exercise.reps : "—"}
            </p>
          </div>
        </div>

        {plansUsingExercise.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Used in Plans
            </h2>
            <ul className="space-y-1">
              {plansUsingExercise.map((plan) => (
                <li key={plan.id}>
                  <Link
                    href={`/plan/${plan.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {plan.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button asChild className="flex-1">
          <Link href={`/exercise/${id}/edit`}>
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
        <Button
          variant="destructive"
          className="cursor-pointer flex-1"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exercise</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{exercise.label}&quot;?
              {plansUsingExercise.length > 0 && (
                <>
                  {" "}
                  This will remove it from {plansUsingExercise.length} workout
                  plan{plansUsingExercise.length !== 1 ? "s" : ""}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
