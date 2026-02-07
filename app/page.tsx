"use client";

import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanListTable } from "@/components/plan-list-table";
import { usePlans } from "@/lib/hooks";

export default function HomePage() {
  const { plans, isLoading, deletePlan } = usePlans();

  function handleDelete(id: string) {
    deletePlan(id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workout Plans</h1>
        <Button asChild size="lg">
          <Link href="/plan/create">
            <Plus className="size-4" />
            New
          </Link>
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Dumbbell className="size-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">No workout plans yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first plan to get started.
          </p>
          <Button asChild size="lg">
            <Link href="/plan/create">
              <Plus className="size-4" />
              Create your first plan
            </Link>
          </Button>
        </div>
      ) : (
        <PlanListTable plans={plans} onDelete={handleDelete} />
      )}
    </div>
  );
}
