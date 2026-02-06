"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import confetti from "canvas-confetti";
import { ArrowLeft } from "lucide-react";
import { usePlan, useExercises } from "@/lib/hooks";
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

// Workout exercise: standalone exercise data + session-only tracking
interface WorkoutExercise {
  id: string;
  label: string;
  weight: number;
  reps: number;
  done: boolean;
}

interface WorkoutFormValues {
  exercises: WorkoutExercise[];
}

export default function WorkoutModePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { plan, isLoading } = usePlan(id);
  const { getExercisesByIds } = useExercises();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [exitDestination, setExitDestination] = useState<string>("/");
  const [exercisesLoaded, setExercisesLoaded] = useState(false);

  const { register, control, getValues, setValue, watch, reset } =
    useForm<WorkoutFormValues>({
      defaultValues: {
        exercises: [],
      },
    });

  // Load exercises from standalone storage and initialize workout state
  useEffect(() => {
    if (plan?.exerciseIds && !exercisesLoaded) {
      getExercisesByIds(plan.exerciseIds).then((standaloneExercises) => {
        const workoutExercises: WorkoutExercise[] = standaloneExercises.map(
          (e) => ({
            id: e.id,
            label: e.label,
            weight: e.weight ?? 0,
            reps: e.reps ?? 0,
            done: false,
          })
        );
        reset({ exercises: workoutExercises });
        setExercisesLoaded(true);
      });
    }
  }, [plan?.exerciseIds, getExercisesByIds, reset, exercisesLoaded]);

  const { fields } = useFieldArray({
    control,
    name: "exercises",
  });

  const watchedExercises = watch("exercises");
  const hasCelebratedRef = useRef(false);

  const fireCelebration = useCallback(() => {
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  function handleExit(destination: string) {
    const exercises = getValues("exercises");
    const allDone = exercises.every((e) => e.done);

    if (allDone) {
      // All done, just navigate
      router.push(destination);
    } else {
      setExitDestination(destination);
      setShowConfirmDialog(true);
    }
  }

  function finishWorkout(destination?: string) {
    // Session state is discarded, just navigate away
    router.push(destination ?? exitDestination);
  }

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

  const completedCount = watchedExercises?.filter((e) => e.done).length ?? 0;
  const totalCount = fields.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer"
          onClick={() => handleExit(`/plan/${id}`)}
        >
          <ArrowLeft className="size-5" />
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
            <TableHead className="w-[48px] pl-0">Done</TableHead>
            <TableHead>Exercise</TableHead>
            <TableHead className="w-[72px]">Weight</TableHead>
            <TableHead className="w-[72px] pr-0">Reps</TableHead>
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

                      const exercises = getValues("exercises");
                      const allDone = exercises.every((e) => e.done);
                      if (allDone && !hasCelebratedRef.current) {
                        hasCelebratedRef.current = true;
                        fireCelebration();
                      } else if (!allDone) {
                        hasCelebratedRef.current = false;
                      }
                    }}
                    aria-label={`Mark ${field.label} as done`}
                  />
                </TableCell>
                <TableCell
                  className={`max-w-0 truncate ${isDone ? "line-through text-muted-foreground" : "font-medium"}`}
                >
                  {field.label}
                </TableCell>
                <TableCell className="px-1">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    className="h-8 text-sm text-right"
                    {...register(`exercises.${index}.weight`, {
                      valueAsNumber: true,
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
                    })}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Button onClick={() => handleExit("/")} className="w-full cursor-pointer" size="lg">
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
            <Button onClick={() => finishWorkout()}>End Workout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
