"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExerciseSelector } from "@/components/exercise-selector";
import { ExerciseModal } from "@/components/exercise-modal";
import type { WorkoutPlan, StandaloneExercise } from "@/lib/types";

const planFormSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

interface PlanFormProps {
  initialPlan?: WorkoutPlan;
  allExercises: StandaloneExercise[];
  onSave: (plan: WorkoutPlan, exerciseIds: string[]) => void | Promise<void>;
  onExerciseCreate: (exercise: StandaloneExercise) => void | Promise<void>;
  submitLabel?: string;
}

export function PlanForm({
  initialPlan,
  allExercises,
  onSave,
  onExerciseCreate,
  submitLabel = "Save",
}: PlanFormProps) {
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(
    initialPlan?.exerciseIds ?? []
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  const defaultValues: PlanFormValues = {
    name: initialPlan?.name ?? "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues,
  });

  // Get the selected exercises in order, using allExercises as source of truth
  const selectedExercises = selectedExerciseIds
    .map((id) => allExercises.find((e) => e.id === id))
    .filter((e): e is StandaloneExercise => e !== undefined);

  function handleAddExercise(exerciseId: string) {
    setSelectedExerciseIds((prev) => [...prev, exerciseId]);
  }

  function handleRemoveExercise(exerciseId: string) {
    setSelectedExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
  }

  async function handleCreateExercise(exercise: StandaloneExercise) {
    // Await the save: the row below renders by looking the id up in
    // `allExercises`, so adding it before the store has the exercise renders
    // nothing. Free under localStorage, a round-trip under Supabase.
    await onExerciseCreate(exercise);
    setSelectedExerciseIds((prev) => [...prev, exercise.id]);
  }

  async function onSubmit(data: PlanFormValues) {
    const now = new Date().toISOString();

    const plan: WorkoutPlan = {
      id: initialPlan?.id ?? crypto.randomUUID(),
      name: data.name,
      exerciseIds: selectedExerciseIds,
      createdAt: initialPlan?.createdAt ?? now,
      updatedAt: now,
    };

    await onSave(plan, selectedExerciseIds);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="plan-name" className="text-sm font-medium">
            Plan Name
          </label>
          <Input
            id="plan-name"
            placeholder="e.g. Push Day, Leg Day..."
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">Exercises</h2>

          {selectedExercises.length > 0 && (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-0">Exercise</TableHead>
                  <TableHead className="w-[72px] text-right">Weight</TableHead>
                  <TableHead className="w-[72px] text-right">Reps</TableHead>
                  <TableHead className="w-[44px] pr-0"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="pl-0 font-medium max-w-0 truncate">
                      {exercise.label}
                    </TableCell>
                    <TableCell className="text-right">
                      {exercise.weight ?? "-"} kg
                    </TableCell>
                    <TableCell className="text-right">
                      {exercise.reps ?? "-"}
                    </TableCell>
                    <TableCell className="pr-0 pl-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveExercise(exercise.id)}
                        className="text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <X className="size-4" />
                        <span className="sr-only">Remove exercise</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {selectedExercises.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
              No exercises added yet. Use the dropdown below to add exercises.
            </p>
          )}

          <ExerciseSelector
            exercises={allExercises}
            selectedIds={selectedExerciseIds}
            onSelect={handleAddExercise}
            onCreateNew={() => setShowCreateModal(true)}
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            className="cursor-pointer flex-1"
            disabled={selectedExerciseIds.length === 0}
          >
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer flex-1"
            onClick={() => {
              reset(defaultValues);
              setSelectedExerciseIds(initialPlan?.exerciseIds ?? []);
            }}
          >
            Reset
          </Button>
        </div>
      </form>

      <ExerciseModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSave={handleCreateExercise}
      />
    </>
  );
}
