import { z } from "zod";

// Standalone exercise entity - stored independently and referenced by plans
export const standaloneExerciseSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  description: z.string().optional(),
  weight: z.number().optional(),
  reps: z.number().optional(),
});

// Workout plan schema - references exercise IDs
export const workoutPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  exerciseIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workoutPlansSchema = z.array(workoutPlanSchema);
export const standaloneExercisesSchema = z.array(standaloneExerciseSchema);

export type StandaloneExercise = z.infer<typeof standaloneExerciseSchema>;
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;
