# Instruções do repositório para o Copilot

Este arquivo orienta o Copilot ao trabalhar com o codigo deste repositorio.

## Visao Geral

API de treinos construida com Fastify 5, TypeScript, Prisma 7 e Better-Auth. Roda em Node.js 24.x com npm.

## Comandos

```bash
# Iniciar servidor de desenvolvimento (hot-reload na porta 8081)
npm run dev

# Iniciar PostgreSQL
docker-compose up -d

# Migrations do Prisma
npx prisma migrate dev
npx prisma generate

# Lint
npx eslint .

# Formatacao
npx prettier --write .
```

Nao ha script de build ou teste configurado ainda. TypeScript compila para `./dist` via `tsc`.

## Arquitetura

### Padrao em camadas: Routes → Use Cases → Prisma

- **Routes** (`src/routes/`) — Handlers de rotas Fastify. Veja a seção **Rotas de API** para regras detalhadas.
- **Use Cases** (`src/usecases/`) — Classes de lógica de negócio. Veja a seção **Use Cases** para regras detalhadas.
- **Schemas** (`src/schemas/`) — Schemas Zod compartilhados entre rotas e OpenAPI docs. Definem validação de entrada e formato de resposta.
- **Errors** (`src/errors/`) — Classes de erro customizadas (ex: `NotFoundError`) lançadas nos use cases e tratadas nas rotas.

### Autenticacao

Better-Auth com adaptador Prisma (`src/lib/auth.ts`). Rotas de auth em `/api/auth/*`. Autenticacao baseada em sessao — rotas extraem a sessao do usuario via `auth.api.getSession()`.

### Banco de Dados

PostgreSQL 16 via Docker. Prisma client inicializado em `src/lib/db.ts`. Tipos gerados em `src/generated/prisma/` (gitignored). Schema em `prisma/schema.prisma`.

### Documentacao da API

Swagger JSON em `/swagger.json`, Scalar UI em `/docs`. Endpoints de auth sao mesclados no spec OpenAPI via plugin do Better-Auth.

## Git

- **SEMPRE** use [Conventional Commits](https://www.conventionalcommits.org/) para mensagens de commit. Exemplo: `feat: add start workout session endpoint`, `fix: workout plan validation`, `docs: update architecture rules`.
- **SEMPRE** escreva mensagens de commit em inglês. **NUNCA** use português em mensagens de commit.
- **NUNCA** faça commit sem a permissão explícita do usuário. Sempre aguarde o usuário pedir para commitar.

## Rotas de API

- **SEMPRE** siga os princípios do REST para criar rotas. Exemplo: `GET /workout-plans`, `GET /workout-plans/:id/days`.
- **SEMPRE** crie os arquivos das rotas em @src/routes.
- **SEMPRE** use `fastify-type-provider-zod` para definir os schemas de request e response de uma rota.
- **SEMPRE** use Zod v4, **NUNCA** use o Zod v3. Use o padrão `z.interface()`, **NUNCA** use `z.object()`.
- **SEMPRE** crie os schemas das operações de criação e atualização dentro de @src/schemas/index.ts.
- **SEMPRE** use `z.enum(WeekDay)` importado de `../generated/prisma/enums.js` para tipar campos de dia da semana nos schemas. **NUNCA** use `z.string()` para representar WeekDay.
- **SEMPRE** use o @src/schemas/index.ts para tipar respostas de erro.
- Uma rota **NUNCA** deve conter regras de negócio, apenas validações de dados (com o Zod) e de autenticação (se necessário).
- Quando uma rota precisar ser protegida (acessível apenas por usuários autenticados), **SEMPRE** use o `auth.api.getSession` (@src/lib/auth.ts) para recuperar a sessão do usuário.
- Uma rota deve **SEMPRE** instanciar e chamar um use case.
- **SEMPRE** trate os erros lançados pelo use case.
- **SEMPRE** inclua `tags` e `summary` no schema da rota para documentação no Swagger/OpenAPI.

### Exemplo:

```ts
import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { NotFoundError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { ErrorSchema, WorkoutPlanSchema } from "../schemas/index.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";

export const workoutPlanRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "Create a workout plan",
      body: WorkoutPlanSchema.omit({ id: true }),
      response: {
        201: WorkoutPlanSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
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
        const createWorkoutPlan = new CreateWorkoutPlan();
        const result = await createWorkoutPlan.execute({
          userId: session.user.id,
          name: request.body.name,
          workoutDays: request.body.workoutDays,
        });
        return reply.status(201).send(result);
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
```

## Use Cases

- Todas as regras de negócio devem estar concentradas dentro de um use case.
- Todos os use cases devem ser criados em @src/usecases.
- Todos os use cases devem ser classes, com um método `execute`.
- Todos os use cases devem ser nomeados com verbos.
- Quando um use case receber um parâmetro, ele deve **SEMPRE** ser um DTO (`InputDto`), que é uma interface definida no mesmo arquivo.
- O retorno de um use case deve **SEMPRE** ser tipado com uma interface `OutputDto`, definida no mesmo arquivo. O use case deve mapear o resultado do banco para o `OutputDto`, **NUNCA** retornando o model do Prisma diretamente. Isso garante desacoplamento entre a camada de negócio e o banco de dados.
- Ao precisar interagir com o banco de dados, um use case deve **SEMPRE** chamar o Prisma diretamente, e não um repository.
- **NUNCA** lide com erros nos use cases. Quem lida com os erros (com try, catch) é sempre a rota @src/routes.
- Caso um use case lance uma exceção, deve ser **SEMPRE** lançado um erro customizado. Esses erros ficam em @src/errors/index.ts. Caso um erro necessário não exista, crie-o.

### Exemplo:

```ts
import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

// Data Transfer Object
interface InputDto {
  userId: string;
  name: string;
  workoutDays: Array<{
    name: string;
    weekDay: WeekDay;
    isRest: boolean;
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
        isActive: true,
      },
    });
    // Transaction - Atomicidade
    return prisma.$transaction(async (tx) => {
      if (existingWorkoutPlan) {
        await tx.workoutPlan.update({
          where: { id: existingWorkoutPlan.id },
          data: { isActive: false },
        });
      }
      const workoutPlan = await tx.workoutPlan.create({
        data: {
          id: crypto.randomUUID(),
          name: dto.name,
          userId: dto.userId,
          isActive: true,
          workoutDays: {
            create: dto.workoutDays.map((workoutDay) => ({
              name: workoutDay.name,
              weekDay: workoutDay.weekDay,
              isRest: workoutDay.isRest,
              estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
              exercises: {
                create: workoutDay.exercises.map((exercise) => ({
                  name: exercise.name,
                  order: exercise.order,
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
      return {
        id: result.id,
        name: result.name,
        workoutDays: result.workoutDays.map((day) => ({
          name: day.name,
          weekDay: day.weekDay,
          isRest: day.isRest,
          estimatedDurationInSeconds: day.estimatedDurationInSeconds,
          exercises: day.exercises.map((exercise) => ({
            order: exercise.order,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            restTimeInSeconds: exercise.restTimeInSeconds,
          })),
        })),
      };
    });
  }
}
```

## Convencoes

- **TypeScript strict** com target ES2024 e module resolution `nodenext`
- **ESLint** com typescript-eslint, integracao com prettier e `simple-import-sort` (imports devem ser ordenados)
- **CORS** permite `http://localhost:3000` com credentials
- Variaveis de ambiente: `PORT`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- **Datas**: **SEMPRE** use `dayjs` com o plugin `utc` para manipular e formatar datas. **NUNCA** use `new Date().toISOString().split("T")[0]` ou manipulação manual de strings de data. Importe como `import dayjs from "dayjs"` e `import utc from "dayjs/plugin/utc.js"`, e inicialize com `dayjs.extend(utc)`.
