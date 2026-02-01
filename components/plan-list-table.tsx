"use client";

import Link from "next/link";
import { Play, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { WorkoutPlan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
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
                  className="font-medium hover:text-primary transition-colors"
                >
                  {plan.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan.exercises.length} exercise{plan.exercises.length !== 1 ? "s" : ""}
                </p>
              </TableCell>
              <TableCell className="text-right pr-0 w-[100px]">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="default"
                    size="icon-sm"
                    asChild
                    className="min-w-[32px] min-h-[32px]"
                  >
                    <Link href={`/plan/${plan.id}/workout`}>
                      <Play className="size-4" />
                      <span className="sr-only">Start workout</span>
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="min-w-[32px] min-h-[32px]"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/plan/${plan.id}/edit`}>
                          <Pencil />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(plan)}
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
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
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
