export interface Exercise {
  id: string; // crypto.randomUUID()
  name: string;
  weight: number;
  reps: number;
  done: boolean;
}

export interface WorkoutPlan {
  id: string; // crypto.randomUUID()
  name: string;
  exercises: Exercise[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}
