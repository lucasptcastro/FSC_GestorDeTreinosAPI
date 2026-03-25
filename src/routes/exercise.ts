import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { NotFoundError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { CompleteWorkoutExerciseSchema } from "../schemas/exercise.js";
import { ErrorSchema } from "../schemas/index.js";
import { CompleteExercise } from "../usecases/CompleteExercise.js";

export const exerciseRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/complete/:exerciseId",
    schema: {
      operationId: "completeWorkoutExercise",
      tags: ["Workout Exercise"],
      summary: "Complete a workout exercise",
      params: z.object({
        exerciseId: z.uuid(),
      }),
      response: {
        200: CompleteWorkoutExerciseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (
      request: import("fastify").FastifyRequest<{
        Params: { exerciseId: string };
      }>,
      reply,
    ) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          return reply.status(401).send({
            error: "Unauthorized",
            code: "UNAUTHORIZED",
          });
        }

        const completeExercise = new CompleteExercise();
        const result = await completeExercise.execute({
          userId: session.user.id,
          exerciseId: request.params.exerciseId,
        });
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: "NOT_FOUND_ERROR",
          });
        }
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });
};
