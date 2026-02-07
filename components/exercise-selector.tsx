"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { StandaloneExercise } from "@/lib/types";

interface ExerciseSelectorProps {
  exercises: StandaloneExercise[];
  selectedIds: string[];
  onSelect: (exerciseId: string) => void;
  onCreateNew: () => void;
}

export function ExerciseSelector({
  exercises,
  selectedIds,
  onSelect,
  onCreateNew,
}: ExerciseSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Filter out already selected exercises
  const availableExercises = exercises.filter(
    (e) => !selectedIds.includes(e.id)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Add exercise"
          className="w-full justify-between cursor-pointer"
        >
          <span className="text-muted-foreground">Add exercise...</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search exercises..." />
          <CommandList>
            <CommandEmpty>No exercises found.</CommandEmpty>
            {availableExercises.length > 0 && (
              <CommandGroup heading="Exercises">
                {availableExercises.map((exercise) => (
                  <CommandItem
                    key={exercise.id}
                    value={exercise.label}
                    onSelect={() => {
                      onSelect(exercise.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col flex-1">
                      <span>{exercise.label}</span>
                      {(exercise.weight || exercise.reps) && (
                        <span className="text-xs text-muted-foreground">
                          {exercise.weight && `${exercise.weight}kg`}
                          {exercise.weight && exercise.reps && " · "}
                          {exercise.reps && `${exercise.reps} reps`}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onCreateNew();
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create new exercise
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
