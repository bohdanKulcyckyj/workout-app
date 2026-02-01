"use client";

import { use, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { storage } from "@/lib/storage";
import { useLocalStoragePlan } from "@/lib/use-local-storage-plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Exercise } from "@/lib/types";

interface WorkoutFormValues {
  exercises: Exercise[];
}

export default function WorkoutModePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { plan } = useLocalStoragePlan(id);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { register, control, getValues, setValue, watch, reset } =
    useForm<WorkoutFormValues>({
      defaultValues: {
        exercises: plan?.exercises ?? [],
      },
    });

  useEffect(() => {
    if (plan) {
      reset({ exercises: plan.exercises });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id]);

  const { fields } = useFieldArray({
    control,
    name: "exercises",
  });

  const watchedExercises = watch("exercises");

  const persistToStorage = useCallback(() => {
    if (!plan) return;
    const current = getValues();
    const now = new Date().toISOString();
    storage.savePlan({
      ...plan,
      exercises: current.exercises,
      updatedAt: now,
    });
  }, [plan, getValues]);

  function handleEndWorkout() {
    const exercises = getValues("exercises");
    const allDone = exercises.every((e) => e.done);

    if (allDone) {
      finishWorkout();
    } else {
      setShowConfirmDialog(true);
    }
  }

  function finishWorkout() {
    if (!plan) return;
    const exercises = getValues("exercises");
    const now = new Date().toISOString();
    storage.savePlan({
      ...plan,
      exercises: exercises.map((e) => ({ ...e, done: false })),
      updatedAt: now,
    });
    router.push("/");
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

  const completedCount = watchedExercises?.filter((e) => e.done).length ?? 0;
  const totalCount = fields.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          onClick={() => router.push(`/plan/${id}`)}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold flex-1">{plan.name}</h1>
      </div>

      <div className="text-sm text-muted-foreground">
        {completedCount} / {totalCount} exercises done
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] pl-0">Done</TableHead>
            <TableHead>Exercise</TableHead>
            <TableHead className="w-[80px]">Weight</TableHead>
            <TableHead className="w-[60px] pr-0">Reps</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => {
            const isDone = watchedExercises?.[index]?.done ?? false;
            return (
              <TableRow
                key={field.id}
                className={isDone ? "opacity-50" : ""}
              >
                <TableCell className="pl-0">
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={(checked) => {
                      setValue(`exercises.${index}.done`, checked === true);
                      persistToStorage();
                    }}
                    aria-label={`Mark ${field.name} as done`}
                  />
                </TableCell>
                <TableCell
                  className={isDone ? "line-through text-muted-foreground" : "font-medium"}
                >
                  {field.name}
                </TableCell>
                <TableCell className="px-1">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    className="h-8 text-sm text-right"
                    {...register(`exercises.${index}.weight`, {
                      valueAsNumber: true,
                      onBlur: () => persistToStorage(),
                    })}
                  />
                </TableCell>
                <TableCell className="pr-0 pl-1">
                  <Input
                    type="number"
                    min="1"
                    className="h-8 text-sm text-right"
                    {...register(`exercises.${index}.reps`, {
                      valueAsNumber: true,
                      onBlur: () => persistToStorage(),
                    })}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Button onClick={handleEndWorkout} className="w-full" size="lg">
        End Workout
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End workout early?</DialogTitle>
            <DialogDescription>
              You haven&apos;t completed all exercises. End workout anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={finishWorkout}>End Workout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
