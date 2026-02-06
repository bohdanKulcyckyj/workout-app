"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
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
import type { WorkoutPlan } from "@/lib/types";

const planFormSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  exercises: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Exercise name is required"),
        weight: z.number().min(0, "Weight must be 0 or more"),
        reps: z.number().int().min(1, "At least 1 rep required"),
        done: z.boolean(),
      })
    )
    .min(1, "At least one exercise is required"),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

interface PlanFormProps {
  initialPlan?: WorkoutPlan;
  onSave: (plan: WorkoutPlan) => void;
  submitLabel?: string;
}

export function PlanForm({ initialPlan, onSave, submitLabel = "Save" }: PlanFormProps) {
  const defaultValues: PlanFormValues = initialPlan
    ? { name: initialPlan.name, exercises: initialPlan.exercises }
    : {
        name: "",
        exercises: [
          { id: crypto.randomUUID(), name: "", weight: 0, reps: 10, done: false },
        ],
      };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "exercises",
  });

  function onSubmit(data: PlanFormValues) {
    const now = new Date().toISOString();
    const plan: WorkoutPlan = {
      id: initialPlan?.id ?? crypto.randomUUID(),
      name: data.name,
      exercises: data.exercises,
      createdAt: initialPlan?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(plan);
  }

  return (
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Exercises</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              append({
                id: crypto.randomUUID(),
                name: "",
                weight: 0,
                reps: 10,
                done: false,
              })
            }
          >
            <Plus className="size-4" />
            Add Exercise
          </Button>
        </div>

        {errors.exercises?.root && (
          <p className="text-sm text-destructive">{errors.exercises.root.message}</p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-0">Name</TableHead>
              <TableHead className="w-[72px]">Weight</TableHead>
              <TableHead className="w-[72px]">Reps</TableHead>
              <TableHead className="w-[44px] pr-0"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell className="pl-0 pr-1 py-2 align-middle">
                  <Input
                    placeholder="Exercise name"
                    className="h-8 text-sm block w-full"
                    {...register(`exercises.${index}.name`)}
                    aria-invalid={!!errors.exercises?.[index]?.name}
                  />
                </TableCell>
                <TableCell className="px-1 py-2 align-middle">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    className="h-8 text-sm text-right block w-full"
                    {...register(`exercises.${index}.weight`, { valueAsNumber: true })}
                    aria-invalid={!!errors.exercises?.[index]?.weight}
                  />
                </TableCell>
                <TableCell className="px-1 py-2 align-middle">
                  <Input
                    type="number"
                    min="1"
                    className="h-8 text-sm text-right block w-full"
                    {...register(`exercises.${index}.reps`, { valueAsNumber: true })}
                    aria-invalid={!!errors.exercises?.[index]?.reps}
                  />
                </TableCell>
                <TableCell className="pr-0 pl-1 py-2 align-middle">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      remove(index);
                      if (fields.length === 1) {
                        append({
                          id: crypto.randomUUID(),
                          name: "",
                          weight: 0,
                          reps: 10,
                          done: false,
                        });
                      }
                    }}
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
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="cursor-pointer flex-1">
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer flex-1"
          onClick={() => reset(defaultValues)}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}
