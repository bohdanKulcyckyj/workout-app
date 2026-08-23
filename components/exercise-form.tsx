"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StandaloneExercise } from "@/lib/types";

const exerciseFormSchema = z.object({
  label: z.string().min(1, "Exercise name is required"),
  description: z.string().optional(),
  weight: z.number().min(0, "Weight must be 0 or more").optional(),
  reps: z.number().int().min(1, "At least 1 rep required").optional(),
});

type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

interface ExerciseFormProps {
  initialExercise?: StandaloneExercise;
  onSave: (exercise: StandaloneExercise) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ExerciseForm({
  initialExercise,
  onSave,
  onCancel,
  submitLabel = "Save",
}: ExerciseFormProps) {
  const defaultValues: ExerciseFormValues = initialExercise
    ? {
        label: initialExercise.label,
        description: initialExercise.description ?? "",
        weight: initialExercise.weight,
        reps: initialExercise.reps,
      }
    : {
        label: "",
        description: "",
        weight: undefined,
        reps: undefined,
      };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues,
  });

  // async so react-hook-form keeps isSubmitting true until the save lands,
  // and so callers that need the write to have completed can await it.
  async function onSubmit(data: ExerciseFormValues) {
    const exercise: StandaloneExercise = {
      id: initialExercise?.id ?? crypto.randomUUID(),
      label: data.label,
      description: data.description || undefined,
      weight: data.weight,
      reps: data.reps,
    };
    await onSave(exercise);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="exercise-label" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="exercise-label"
          placeholder="e.g. Bench Press, Squat..."
          {...register("label")}
          aria-invalid={!!errors.label}
        />
        {errors.label && (
          <p className="text-sm text-destructive">{errors.label.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="exercise-description" className="text-sm font-medium">
          Description
        </label>
        <Textarea
          id="exercise-description"
          placeholder="Optional notes about this exercise..."
          rows={3}
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="exercise-weight" className="text-sm font-medium">
            Default Weight (kg)
          </label>
          <Input
            id="exercise-weight"
            type="number"
            step="0.5"
            min="0"
            placeholder="0"
            {...register("weight", { valueAsNumber: true })}
            aria-invalid={!!errors.weight}
          />
          {errors.weight && (
            <p className="text-sm text-destructive">{errors.weight.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="exercise-reps" className="text-sm font-medium">
            Default Reps
          </label>
          <Input
            id="exercise-reps"
            type="number"
            min="1"
            placeholder="10"
            {...register("reps", { valueAsNumber: true })}
            aria-invalid={!!errors.reps}
          />
          {errors.reps && (
            <p className="text-sm text-destructive">{errors.reps.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="cursor-pointer flex-1">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
