import type { SupabaseClient } from "@supabase/supabase-js";
import type { StandaloneExercise } from "../../types";
import { toExercise, toExerciseRow, type ExerciseRow } from "../../supabase/mappers";

const COLUMNS = "id, label, description, weight, reps";

export class SupabaseExerciseRepository {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  async getAll(): Promise<StandaloneExercise[]> {
    const { data, error } = await this.supabase
      .from("exercises")
      .select(COLUMNS)
      .order("label");
    if (error) throw error;
    return (data as ExerciseRow[]).map(toExercise);
  }

  async getById(id: string): Promise<StandaloneExercise | null> {
    const { data, error } = await this.supabase
      .from("exercises")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    // 22P02 = the id is not a uuid, so no such row can exist. "Not found",
    // not a failure -- a bookmarked/typo'd url must render Not Found.
    if (error) {
      if (error.code === "22P02") return null;
      throw error;
    }
    return data ? toExercise(data as ExerciseRow) : null;
  }

  async getByIds(ids: string[]): Promise<StandaloneExercise[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from("exercises")
      .select(COLUMNS)
      .in("id", ids);
    if (error) throw error;
    const byId = new Map(
      (data as ExerciseRow[]).map((row) => [row.id, toExercise(row)])
    );
    // Preserve order of IDs
    return ids
      .map((id) => byId.get(id))
      .filter((e): e is StandaloneExercise => e !== undefined);
  }

  async save(exercise: StandaloneExercise): Promise<void> {
    // Single save for create and update -- the form generates the uuid client-side
    const { error } = await this.supabase
      .from("exercises")
      .upsert(toExerciseRow(exercise, this.userId));
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    // plan_exercises is cleaned up by the FK cascade
    const { error } = await this.supabase.from("exercises").delete().eq("id", id);
    if (error) throw error;
  }
}
