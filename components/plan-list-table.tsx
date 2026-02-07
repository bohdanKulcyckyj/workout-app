"use client";

import Link from "next/link";
import { Play, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { WorkoutPlan } from "@/lib/types";
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

interface PlanListTableProps {
  plans: WorkoutPlan[];
  onDelete: (id: string) => void;
}

export function PlanListTable({ plans, onDelete }: PlanListTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlan | null>(null);

  return (
    <>
      <Table>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="pl-0">
                <Link
                  href={`/plan/${plan.id}`}
                  className="font-medium hover:text-primary transition-colors block truncate"
                >
                  {plan.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan.exerciseIds.length} exercise
                  {plan.exerciseIds.length !== 1 ? "s" : ""}
                </p>
              </TableCell>
              <TableCell className="text-right pr-0 w-[120px]">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="default"
                    size="icon"
                    asChild
                  >
                    <Link href={`/plan/${plan.id}/workout`}>
                      <Play className="size-4" />
                      <span className="sr-only">Start</span>
                    </Link>
                  </Button>
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
                          href={`/plan/${plan.id}/edit`}
                          className="cursor-pointer"
                        >
                          <Pencil />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(plan)}
                        className="cursor-pointer"
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This action cannot be undone.
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
