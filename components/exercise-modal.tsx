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
  onSave: (exercise: StandaloneExercise) => void | Promise<void>;
}

export function ExerciseModal({ open, onOpenChange, onSave }: ExerciseModalProps) {
  async function handleSave(exercise: StandaloneExercise) {
    // Close only once the save has landed -- the caller renders the new
    // exercise from the store, which is a round-trip behind under Supabase.
    await onSave(exercise);
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
