"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Exercise } from "@/lib/types";

interface ExerciseTableProps {
  exercises: Exercise[];
}

export function ExerciseTable({ exercises }: ExerciseTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-0">Exercise</TableHead>
          <TableHead className="w-[72px] text-right">Weight</TableHead>
          <TableHead className="w-[72px] text-right pr-0">Reps</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exercises.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground py-8 pl-0">
              No exercises yet.
            </TableCell>
          </TableRow>
        ) : (
          exercises.map((exercise) => (
            <TableRow key={exercise.id}>
              <TableCell className="pl-0 font-medium max-w-0 truncate">{exercise.name}</TableCell>
              <TableCell className="text-right">{exercise.weight} kg</TableCell>
              <TableCell className="text-right pr-0">{exercise.reps}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
