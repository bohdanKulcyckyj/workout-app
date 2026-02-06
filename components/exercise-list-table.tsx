"use client";

import Link from "next/link";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { StandaloneExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface ExerciseListTableProps {
  exercises: StandaloneExercise[];
  onDelete: (id: string) => void;
}

export function ExerciseListTable({
  exercises,
  onDelete,
}: ExerciseListTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<StandaloneExercise | null>(
    null
  );

  return (
    <>
      <Table>
        <TableBody>
          {exercises.map((exercise) => (
            <TableRow key={exercise.id}>
              <TableCell className="pl-0">
                <Link
                  href={`/exercise/${exercise.id}`}
                  className="font-medium hover:text-primary transition-colors block truncate"
                >
                  {exercise.label}
                </Link>
                {exercise.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                    {exercise.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground w-[80px]">
                {exercise.weight !== undefined && `${exercise.weight} lbs`}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground w-[60px]">
                {exercise.reps !== undefined && `${exercise.reps} reps`}
              </TableCell>
              <TableCell className="text-right pr-0 w-[48px]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer"
                    >
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/exercise/${exercise.id}/edit`}
                        className="cursor-pointer"
                      >
                        <Pencil />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget(exercise)}
                      className="cursor-pointer"
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exercise</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.label}&quot;?
              This will also remove it from all workout plans that use it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
