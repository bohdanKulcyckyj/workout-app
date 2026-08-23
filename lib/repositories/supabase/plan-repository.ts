import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkoutPlan } from "../../types";
import type { PlanRepository } from "../types";
import { toPlan, toPlanRow, type PlanRow } from "../../supabase/mappers";

const COLUMNS = "id, name, created_at, updated_at, plan_exercises(exercise_id, position)";

export class SupabasePlanRepository implements PlanRepository {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  async getAll(): Promise<WorkoutPlan[]> {
    const { data, error } = await this.supabase
      .from("plans")
      .select(COLUMNS)
      .order("name");
    if (error) throw error;
    return (data as PlanRow[]).map(toPlan);
  }

  async getById(id: string): Promise<WorkoutPlan | null> {
    const { data, error } = await this.supabase
      .from("plans")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    // 22P02 = the id is not a uuid, so no such row can exist. "Not found",
    // not a failure -- a bookmarked/typo'd url must render Not Found.
    if (error) {
      if (error.code === "22P02") return null;
      throw error;
    }
    return data ? toPlan(data as PlanRow) : null;
  }

  async save(plan: WorkoutPlan): Promise<void> {
    const { error: planError } = await this.supabase
      .from("plans")
      .upsert(toPlanRow(plan, this.userId));
    if (planError) throw planError;

    // Reconcile the links: drop the ones that left, upsert the rest with their
    // position so a pure reorder is persisted too.
    // ponytail: two round-trips, not a transaction -- a failure between them
    // leaves stale links. Move to an rpc if that ever bites.
    let removed = this.supabase
      .from("plan_exercises")
      .delete()
      .eq("plan_id", plan.id);
    if (plan.exerciseIds.length > 0) {
      removed = removed.not(
        "exercise_id",
        "in",
        `(${plan.exerciseIds.join(",")})`
      );
    }
    const { error: deleteError } = await removed;
    if (deleteError) throw deleteError;

    if (plan.exerciseIds.length === 0) return;

    const { error: linkError } = await this.supabase
      .from("plan_exercises")
      .upsert(
        plan.exerciseIds.map((exerciseId, position) => ({
          plan_id: plan.id,
          exercise_id: exerciseId,
          position,
        }))
      );
    if (linkError) throw linkError;
  }

  async delete(id: string): Promise<void> {
    // plan_exercises is cleaned up by the FK cascade
    const { error } = await this.supabase.from("plans").delete().eq("id", id);
    if (error) throw error;
  }
}
