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
