"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExerciseForm } from "@/components/exercise-form";
import type { StandaloneExercise } from "@/lib/types";

interface ExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (exercise: StandaloneExercise) => void;
}

export function ExerciseModal({ open, onOpenChange, onSave }: ExerciseModalProps) {
  function handleSave(exercise: StandaloneExercise) {
    onSave(exercise);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Exercise</DialogTitle>
        </DialogHeader>
        <ExerciseForm
          onSave={handleSave}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create"
        />
      </DialogContent>
    </Dialog>
  );
}
