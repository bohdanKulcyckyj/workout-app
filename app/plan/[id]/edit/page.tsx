"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { storage } from "@/lib/storage";
import { useLocalStoragePlan } from "@/lib/use-local-storage-plans";
import { Button } from "@/components/ui/button";
import { PlanForm } from "@/components/plan-form";
import type { WorkoutPlan } from "@/lib/types";

export default function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { plan } = useLocalStoragePlan(id);

  if (!plan) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Plan Not Found</h1>
        <p className="text-muted-foreground">
          This workout plan doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to Plans
          </Link>
        </Button>
      </div>
    );
  }

  function handleSave(updatedPlan: WorkoutPlan) {
    storage.savePlan(updatedPlan);
    router.push(`/plan/${updatedPlan.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer"
          onClick={() => router.push(`/plan/${id}`)}
        >
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Edit Plan</h1>
      </div>

      <PlanForm
        initialPlan={plan}
        onSave={handleSave}
        submitLabel="Save Changes"
      />
    </div>
  );
}
