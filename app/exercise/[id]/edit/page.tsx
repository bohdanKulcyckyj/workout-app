"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useExercise } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { ExerciseForm } from "@/components/exercise-form";
import type { StandaloneExercise } from "@/lib/types";

export default function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { exercise, isLoading, saveExercise } = useExercise(id);

  async function handleSave(updatedExercise: StandaloneExercise) {
    await saveExercise(updatedExercise);
    router.push(`/exercise/${id}`);
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
          onClick={() => router.push(`/exercise/${id}`)}
        >
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Edit Exercise</h1>
      </div>

      <ExerciseForm
        initialExercise={exercise}
        onSave={handleSave}
        onCancel={() => router.push(`/exercise/${id}`)}
        submitLabel="Save Changes"
      />
    </div>
  );
}
