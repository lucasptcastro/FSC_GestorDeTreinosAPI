import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

// Data Transfer Object
interface InputDto {
  userId: string;
  exerciseId: string;
}

interface OutputDto {
  exerciseCompletedId: string;
}

export class CompleteExercise {
  async execute(dto: InputDto): Promise<OutputDto> {
    // Transaction - Atomicidade
    return prisma.$transaction(async (tx) => {
      const exercise = await tx.workoutExercise.findUnique({
        where: { id: dto.exerciseId },
      });

      if (!exercise) {
        throw new NotFoundError("Exercise not found");
      }

      const workoutDay = await tx.workoutDay.findUnique({
        where: { id: exercise.workoutDayId },
      });

      const workoutPlan = await tx.workoutPlan.findUnique({
        where: { id: workoutDay?.workoutPlanId },
      });

      if (workoutPlan?.userId !== dto.userId) {
        throw new NotFoundError("Exercise not found for this user");
      }

      const existingCompletedExercise =
        await tx.completedWorkoutExercises.findFirst({
          where: {
            workoutExerciseId: dto.exerciseId,
            userId: dto.userId,
          },
        });

      if (existingCompletedExercise) {
        throw new NotFoundError("Exercise already completed");
      }

      const exerciseCompleted = await tx.completedWorkoutExercises.create({
        data: {
          workoutExerciseId: dto.exerciseId,
          userId: dto.userId,
        },
      });

      return {
        exerciseCompletedId: exerciseCompleted.id,
      };
    });
  }
}
