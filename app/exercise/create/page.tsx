"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useExercises } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { ExerciseForm } from "@/components/exercise-form";
import { ErrorMessage } from "@/components/error-message";
import type { StandaloneExercise } from "@/lib/types";

export default function CreateExercisePage() {
  const router = useRouter();
  const { saveExercise, error } = useExercises();

  async function handleSave(exercise: StandaloneExercise) {
    try {
      await saveExercise(exercise);
    } catch {
      return; // stay on the form; `error` below says what failed
    }
    router.push("/exercise");
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
        <h1 className="text-2xl font-bold">Create Exercise</h1>
      </div>

      <ErrorMessage error={error} />

      <ExerciseForm
        onSave={handleSave}
        onCancel={() => router.push("/exercise")}
        submitLabel="Create Exercise"
      />
    </div>
  );
}
