import z from "zod";

export const CompleteWorkoutExerciseSchema = z.object({
  exerciseCompletedId: z.uuid(),
});
