import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";

export const ErrorSchema = z.object({
  error: z.string(),
  code: z.string(), // INVALID_INPUT, INVALID_WEEKDAY, MISSING_FIELD, UNAUTHORIZED, TOKEN_EXPIRED, NOT_FOUND_ERROR, INTERNAL_ERROR, etc.
});

export const WorkoutPlanSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  workoutDays: z.array(
    z.object({
      name: z.string().trim().min(1),
      weekDay: z.enum(WeekDay),
      isRest: z.boolean().default(false),
      coverImageUrl: z.url().optional(),
      estimatedDurationInSeconds: z.number().min(1),
      exercises: z.array(
        z.object({
          // TODO: adicionar um campo para técnicas de treino (ex.: rest-pause, drop-set, etc.)
          order: z.number().min(0),
          name: z.string().trim().min(1),
          sets: z.number().min(1),
          reps: z.number().min(1),
          restTimeInSeconds: z.number().min(0),
        }),
      ),
    }),
  ),
});

export const StartWorkoutSessionResponseSchema = z.object({
  userWorkoutSessionId: z.uuid(),
});

export const UpdateWorkoutSessionRequestSchema = z.object({
  completedAt: z.string().datetime(),
});

export const UpdateWorkoutSessionResponseSchema = z.object({
  id: z.uuid(),
  completedAt: z.string(),
  startedAt: z.string(),
});

export const WorkoutPlanResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  workoutDays: z.array(
    z.object({
      name: z.string(),
      weekDay: z.enum(WeekDay),
      isRest: z.boolean(),
      estimatedDurationInSeconds: z.number(),
      coverImageUrl: z.string().nullable(),
      exercises: z.array(
        z.object({
          order: z.number(),
          name: z.string(),
          sets: z.number(),
          reps: z.number(),
          restTimeInSeconds: z.number(),
        }),
      ),
    }),
  ),
});

export const HomeParamsSchema = z.object({
  date: z.string().date(),
});

export const HomeResponseSchema = z.object({
  activeWorkoutPlanId: z.uuid(),
  todayWorkoutDay: z
    .object({
      workoutPlanId: z.uuid(),
      id: z.uuid(),
      name: z.string(),
      isRest: z.boolean(),
      weekDay: z.enum(WeekDay),
      estimatedDurationInSeconds: z.number(),
      coverImageUrl: z.string().optional(),
      exercisesCount: z.number(),
    })
    .nullable(),
  workoutStreak: z.number(),
  consistencyByDay: z.record(
    z.string(),
    z.object({
      workoutDayCompleted: z.boolean(),
      workoutDayStarted: z.boolean(),
    }),
  ),
});
