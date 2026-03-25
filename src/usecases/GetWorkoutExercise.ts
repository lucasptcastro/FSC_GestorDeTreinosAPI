import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

export interface GetWorkoutExerciseInputDto {
  id: string;
}

export interface GetWorkoutExerciseOutputDto {
  id: string;
  name: string;
  order: number;
  workoutDayId: string;
  sets: number;
  reps: number;
  restTimeInSeconds: number;
  observation?: string | null;
  trainingTechnique?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class GetWorkoutExercise {
  async execute({
    id,
  }: GetWorkoutExerciseInputDto): Promise<GetWorkoutExerciseOutputDto> {
    const exercise = await prisma.workoutExercise.findUnique({
      where: { id },
    });
    if (!exercise) {
      throw new NotFoundError("Workout exercise not found");
    }
    return {
      id: exercise.id,
      name: exercise.name,
      order: exercise.order,
      workoutDayId: exercise.workoutDayId,
      sets: exercise.sets,
      reps: exercise.reps,
      restTimeInSeconds: exercise.restTimeInSeconds,
      observation: exercise.observation,
      trainingTechnique: exercise.trainingTechnique ?? null,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    };
  }
}
