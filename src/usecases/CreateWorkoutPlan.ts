import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

// Data Transfer Object (DTO) - é uma estrutura de dados que define os campos necessários para criar um plano de treino, como nome, descrição, duração, etc. Ele é usado para garantir que os dados recebidos sejam válidos e completos antes de serem processados pela lógica de negócios.
interface InputDto {
  userId: string;
  name: string;
  workoutDays: Array<{
    name: string;
    weekDay: WeekDay;
    isRest: boolean;
    coverImageUrl?: string;
    estimatedDurationInSeconds: number;
    exercises: Array<{
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

interface OutputDto {
  id: string;
  name: string;
  workoutDays: Array<{
    name: string;
    weekDay: WeekDay;
    isRest: boolean;
    estimatedDurationInSeconds: number;
    coverImageUrl: string | null;
    exercises: Array<{
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

export class CreateWorkoutPlan {
  async execute(dto: InputDto): Promise<OutputDto> {
    const existingWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
    });

    // Conceito de Transaction - Atomicidade
    // a transaction funciona assim: se ocorrer algum erro durante a criação do novo plano, a requisição (transaction) é revertida e o plano antigo permanece ativo. Isso garante a operação de criar (create) só vai acontecer se a operação de atualizar (update) do plano antigo for bem-sucedida, ou seja, se o plano antigo for desativado com sucesso. Se ocorrer algum erro durante a atualização do plano antigo, a requisição (transação) é revertida e o novo plano não é criado, mantendo o estado do banco de dados consistente. Se não houver um plano de treino ativo para o usuário, a transação simplesmente cria o novo plano sem tentar desativar nenhum plano antigo, garantindo que o processo seja eficiente e livre de erros desnecessários.
    return prisma.$transaction(async (tx) => {
      // se o usuário já tiver um plano de treino ativo, desativa ele antes de criar o novo plano. Isso garante que o usuário tenha apenas um plano de treino ativo por vez
      if (existingWorkoutPlan) {
        await tx.workoutPlan.update({
          where: { id: existingWorkoutPlan.id },
          data: { isActive: false },
        });
      }

      const workoutPlan = await tx.workoutPlan.create({
        data: {
          // caso queira que o ID seja gerado pelo usecase basta usar `id: crypto.randomUUID()`
          name: dto.name,
          userId: dto.userId,
          isActive: true,
          workoutDays: {
            // para cada dia de treino, cria um registro na tabela workoutDayss e uma relação com os exercícios desse dia
            create: dto.workoutDays.map((workoutDay) => ({
              name: workoutDay.name,
              weekDay: workoutDay.weekDay,
              isRest: workoutDay.isRest,
              coverImageUrl: workoutDay.coverImageUrl,
              estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
              exercises: {
                create: workoutDay.exercises.map((exercise) => ({
                  order: exercise.order,
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restTimeInSeconds: exercise.restTimeInSeconds,
                })),
              },
            })),
          },
        },
      });

      const result = await tx.workoutPlan.findUnique({
        where: { id: workoutPlan.id },
        include: {
          workoutDays: {
            include: {
              exercises: true,
            },
          },
        },
      });

      if (!result) {
        throw new NotFoundError("Workout plan not found");
      }

      return result;
    });
  }
}
