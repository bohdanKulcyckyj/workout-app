import { z } from "zod";

// Standalone exercise entity - stored independently and referenced by plans
export const standaloneExerciseSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  description: z.string().optional(),
  weight: z.number().optional(),
  reps: z.number().optional(),
});

// Legacy inline exercise schema - kept for workout tracking (has done flag)
// and for migration from old plan format
export const legacyExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number(),
  reps: z.number(),
  done: z.boolean(),
});

// Legacy workout plan schema - used during migration period
export const legacyWorkoutPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  exercises: z.array(legacyExerciseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// New workout plan schema - references exercise IDs instead of inline exercises
export const workoutPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  exerciseIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Schema that accepts both old and new format during migration
export const flexibleWorkoutPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  exercises: z.array(legacyExerciseSchema).optional(),
  exerciseIds: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workoutPlansSchema = z.array(flexibleWorkoutPlanSchema);
export const standaloneExercisesSchema = z.array(standaloneExerciseSchema);

export type StandaloneExercise = z.infer<typeof standaloneExerciseSchema>;
export type LegacyExercise = z.infer<typeof legacyExerciseSchema>;
export type LegacyWorkoutPlan = z.infer<typeof legacyWorkoutPlanSchema>;
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;
export type FlexibleWorkoutPlan = z.infer<typeof flexibleWorkoutPlanSchema>;
