"use client";

import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseListTable } from "@/components/exercise-list-table";
import { useExercises } from "@/lib/hooks";

export default function ExerciseListPage() {
  const { exercises, isLoading, deleteExercise } = useExercises();

  function handleDelete(id: string) {
    deleteExercise(id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <Button asChild size="lg">
          <Link href="/exercise/create">
            <Plus className="size-4" />
            New
          </Link>
        </Button>
      </div>

      {exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Dumbbell className="size-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">No exercises yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Create exercises to build your workout library.
          </p>
          <Button asChild size="lg">
            <Link href="/exercise/create">
              <Plus className="size-4" />
              Create your first exercise
            </Link>
          </Button>
        </div>
      ) : (
        <ExerciseListTable exercises={exercises} onDelete={handleDelete} />
      )}
    </div>
  );
}
