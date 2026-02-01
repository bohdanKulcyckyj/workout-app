import { z } from "zod";

export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number(),
  reps: z.number(),
  done: z.boolean(),
});

export const workoutPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  exercises: z.array(exerciseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workoutPlansSchema = z.array(workoutPlanSchema);

export type Exercise = z.infer<typeof exerciseSchema>;
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;
