# Gestor de Treinos — API

API do projeto **Gestor de Treinos** (bootcamp), responsável por:

- Autenticação (email/senha e Google OAuth) e sessões
- Persistência dos dados (PostgreSQL)
- Cadastro de **Planos de Treino** (Workout Plans) com **Dias de Treino** e **Exercícios**
- **Gerenciamento de Sessões de Treino** (início/conclusão)
- **Dashboard** com dados do dia atual e streak semanal
- **Estatísticas** de treino com consistência, taxa de conclusão e tempo total
- **Dados do Usuário** (peso, altura, idade, % de gordura)
- **Personal Trainer Virtual** com IA (GPT-4o-mini) via streaming
- Exposição de documentação OpenAPI (Swagger + Scalar)

Este README foi escrito para servir como referência: quando você voltar aqui no futuro, deve conseguir entender **como o projeto está organizado, como roda localmente e quais regras de negócio existem**.

---

## Stack e tecnologias

- **Node.js**: `24.x` (ver `engines` no `package.json`)
- **TypeScript** (target `es2024`, `moduleResolution: nodenext`)
- **Fastify** como servidor HTTP
- **Zod** + **fastify-type-provider-zod** para validação/serialização tipada
- **Swagger/OpenAPI** via `@fastify/swagger`
- **Scalar API Reference** (`@scalar/fastify-api-reference`) para UI de documentação (`/docs`)
- **Prisma ORM** + **@prisma/adapter-pg** para PostgreSQL
- **PostgreSQL** via Docker Compose
- **Better Auth** para autenticação (email/senha + Google OAuth) com adaptador Prisma
- **Vercel AI SDK** (`ai` + `@ai-sdk/openai`) para integração com GPT-4o-mini
- **Day.js** para manipulação de datas
- **ESLint + Prettier** (config flat)

---

## Observações

- Não utilizar try catch dentro de um usecase. O usecase apenas lança a exceção, mas o tratamento deve ser feito na rota do controller

---

## Estrutura de pastas

Visão geral (arquivos principais):

```
.
├─ Dockerfile
├─ docker-compose.yml
├─ prisma/
│  └─ schema.prisma
├─ prisma.config.ts
├─ src/
│  ├─ index.ts
│  ├─ errors/
│  │  └─ index.ts
│  ├─ lib/
│  │  ├─ auth.ts
│  │  └─ db.ts
│  ├─ generated/
│  │  └─ prisma/         # Prisma Client gerado (output configurado no schema.prisma)
│  ├─ routes/
│  │  ├─ ai.ts
│  │  ├─ home.ts
│  │  ├─ me.ts
│  │  ├─ stats.ts
│  │  └─ workout-plan.ts
│  ├─ schemas/
│  │  └─ index.ts
│  └─ usecases/
│     ├─ CreateWorkoutPlan.ts
│     ├─ GetHomeData.ts
│     ├─ GetStats.ts
│     ├─ GetUserTrainData.ts
│     ├─ GetWorkoutDay.ts
│     ├─ GetWorkoutPlan.ts
│     ├─ ListWorkoutPlans.ts
│     ├─ StartWorkoutSession.ts
│     ├─ UpdateWorkoutSession.ts
│     └─ UpsertUserTrainData.ts
└─ readme.md
```

### `src/index.ts`

Entry-point do servidor. Responsabilidades:

- Inicializa o Fastify
- Configura validação/serialização usando Zod
- Registra Swagger/OpenAPI
- Registra CORS (origens confiáveis e `credentials: true`)
- Registra o Scalar em `/docs`
- Registra rotas: `/workout-plans`, `/home`, `/stats`, `/ai`, `/me`, `/swagger.json`, `/` e proxy de auth em `/api/auth/*`

### `src/lib/db.ts`

Cria e exporta a instância do Prisma Client.

- Usa `@prisma/adapter-pg` com a `DATABASE_URL`
- Faz cache em `globalThis` em ambiente de desenvolvimento para evitar múltiplas conexões durante hot reload

### `src/lib/auth.ts`

Configura o Better Auth:

- Email/senha habilitado
- Login social com Google (`socialProviders.google`)
- Adaptador Prisma (PostgreSQL)
- Plugin `openAPI()` para expor schema OpenAPI de auth

### `src/generated/prisma/*`

Código **gerado automaticamente** pelo Prisma Client. Não editar manualmente.

### `src/usecases/`

Use cases (camada de regra de negócio):

| Use Case               | Descrição                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `CreateWorkoutPlan`    | Cria um plano de treino (desativa o plano ativo anterior)                              |
| `ListWorkoutPlans`     | Lista planos de treino do usuário (filtro opcional por `active`)                       |
| `GetWorkoutPlan`       | Busca um plano de treino por ID                                                        |
| `GetWorkoutDay`        | Busca um dia de treino com exercícios e sessões                                        |
| `StartWorkoutSession`  | Inicia uma sessão de treino para um dia específico                                     |
| `UpdateWorkoutSession` | Atualiza uma sessão (marca como concluída com `completedAt`)                           |
| `GetHomeData`          | Retorna dados do dashboard: treino do dia, streak e consistência semanal               |
| `GetStats`             | Calcula estatísticas em um intervalo de datas (streak, taxa de conclusão, tempo total) |
| `GetUserTrainData`     | Busca dados físicos do usuário (peso, altura, idade, % gordura)                        |
| `UpsertUserTrainData`  | Cria ou atualiza dados físicos do usuário                                              |

### `src/errors/index.ts`

Classes de erro customizadas:

- `NotFoundError` — recurso não encontrado (HTTP 404)
- `WorkoutPlanNotActiveError` — tentativa de iniciar sessão em plano inativo (HTTP 422)
- `ConflictError` — sessão já existe para o dia (HTTP 409)

---

## Como rodar localmente

### Pré-requisitos

- Node.js `24.x`
- Docker (ex.: Docker Desktop) para subir o PostgreSQL

> Dica: este projeto já fixa a versão do Node no `package.json` via `engines`. Se quiser forçar em ambientes que respeitam o npm, adicione `engine-strict=true` em um `.npmrc`.

### 1) Subir banco de dados (PostgreSQL)

O banco local roda via Docker Compose:

```bash
docker compose up -d
```

Config padrão (ver `docker-compose.yml`):

- Porta do host: `5433` (mapeada para `5432` no container)
- DB: `bootcamp-treinos-api`
- User: `postgres`
- Password: `password`

### 2) Variáveis de ambiente

Crie seu `.env` a partir do exemplo:

```bash
cp .env.example .env
```

No Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Variáveis usadas:

- `PORT` (default do código: `8081`)
- `DATABASE_URL` (PostgreSQL)
- `BETTER_AUTH_SECRET` (segredo para assinar tokens/cookies; preencha com um valor forte)
- `BETTER_AUTH_URL` (base URL da API, ex.: `http://localhost:8081`)
- `GOOGLE_CLIENT_ID` (Client ID do Google OAuth)
- `GOOGLE_CLIENT_SECRET` (Client Secret do Google OAuth)
- `OPENAI_API_KEY` (chave da API OpenAI, usada pelo Vercel AI SDK para o personal trainer virtual)

### 3) Instalar dependências

```bash
npm install
```

### 4) Prisma (gerar client e criar tabelas)

Este repositório ainda não possui pasta de migrations versionada. Em um ambiente novo, você normalmente vai:

1. Gerar o Prisma Client
2. Criar uma migration inicial e aplicar no banco

Exemplo:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Nota: o `schema.prisma` não define `url = env("DATABASE_URL")`. A URL do datasource é lida do `.env` via configuração em `prisma.config.ts`.

### 5) Rodar o servidor

```bash
npm run dev
```

Servidor sobe por padrão em `http://localhost:8081`.

---

## Docker (imagem de produção)

O projeto possui um `Dockerfile` com **multi-stage build** para gerar uma imagem de produção otimizada.

### Estágios do build

| Estágio        | Descrição                                                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **base**       | Imagem `node:24-slim`. Define o diretório de trabalho e copia `package.json`, `package-lock.json` e a pasta `prisma/`.                                            |
| **deps**       | Instala **todas** as dependências (`npm ci`), incluindo as de desenvolvimento.                                                                                    |
| **build**      | Copia o código-fonte, executa `npm run build` (compila TypeScript para `dist/`) e copia `src/generated` para `dist/generated` (Prisma Client gerado).             |
| **production** | Instala apenas dependências de produção (`npm ci --omit=dev --ignore-scripts`), copia o `dist/` do estágio de build e inicia o servidor com `node dist/index.js`. |

### Construir a imagem

```bash
docker build -t gestao-treinos-api .
```

### Rodar o container

```bash
docker run -d \
  --name gestao-treinos-api \
  -p 8081:8081 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5433/bootcamp-treinos-api" \
  -e BETTER_AUTH_SECRET="seu-segredo" \
  -e BETTER_AUTH_URL="http://localhost:8081" \
  -e OPENAI_API_KEY="sk-..." \
  gestao-treinos-api
```

> **Nota:** Use `host.docker.internal` para acessar o PostgreSQL rodando no host (via `docker compose up -d`). Em Linux sem Docker Desktop, pode ser necessário usar `--network host` ou o IP do host.

### Pré-requisitos para o build

- O `package-lock.json` deve existir (o `npm ci` exige).
- O Prisma Client deve ter sido gerado previamente (`src/generated/prisma/`), pois o estágio de build copia essa pasta para `dist/generated`.

---

## Scripts (package.json)

- `npm run dev`: sobe a API em modo watch usando `tsx --watch src/index.ts`
- `npm run auth:generate`: executa `better-auth generate` (útil para gerar artefatos/integrações do Better Auth, dependendo do fluxo adotado)

---

## Documentação da API

- **Scalar UI**: `GET /docs`
- **OpenAPI da API (Swagger JSON)**: `GET /swagger.json`
- **OpenAPI do Better Auth**: `GET /api/auth/open-api/generate-schema`

O `/docs` é configurado para listar as duas fontes:

- Bootcamp Treinos API (Swagger)
- Auth API (Better Auth)

---

## Rotas (visão atual)

### `GET /`

Endpoint simples de health/hello-world.

Resposta:

```json
{ "message": "Hello World" }
```

### `GET /workout-plans`

Lista planos de treino do usuário autenticado.

- Requer autenticação.
- Query params: `active` (opcional) — `"true"` ou `"false"` para filtrar por status.
- Respostas:
  - `200` → array de planos de treino com dias e exercícios
  - `401` / `500`
- Implementação: `src/routes/workout-plan.ts` → `ListWorkoutPlans`

### `POST /workout-plans`

Cria um plano de treino.

- Requer autenticação.
- Respostas: `201` / `400` / `401` / `404` / `500`

Payload (formato):

```json
{
  "name": "Treino ABC",
  "workoutDays": [
    {
      "name": "Treino A",
      "weekDay": "MONDAY",
      "isRest": false,
      "estimatedDurationInSeconds": 3600,
      "coverImageUrl": "https://...",
      "exercises": [
        {
          "order": 0,
          "name": "Supino reto",
          "sets": 4,
          "reps": 10,
          "restTimeInSeconds": 90
        }
      ]
    }
  ]
}
```

Enum `WeekDay`: `SUNDAY`, `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`

- Implementação: `src/routes/workout-plan.ts` → `CreateWorkoutPlan`

### `GET /workout-plans/:id`

Busca um plano de treino por ID.

- Requer autenticação.
- Respostas: `200` (plano com dias e exercícios) / `401` / `404` / `500`
- Implementação: `src/routes/workout-plan.ts` → `GetWorkoutPlan`

### `GET /workout-plans/:workoutPlanId/days/:workoutDayId`

Busca um dia de treino com exercícios e sessões.

- Requer autenticação.
- Respostas: `200` / `401` / `404` / `500`
- Implementação: `src/routes/workout-plan.ts` → `GetWorkoutDay`

### `POST /workout-plans/:workoutPlanId/days/:workoutDayId/sessions`

Inicia uma sessão de treino.

- Requer autenticação.
- Respostas:
  - `201` → `{ userWorkoutSessionId: string }`
  - `401` / `404` / `409` (sessão já existe) / `422` (plano inativo) / `500`
- Implementação: `src/routes/workout-plan.ts` → `StartWorkoutSession`

### `PATCH /workout-plans/:workoutPlanId/days/:workoutDayId/sessions/:workoutSessionId`

Atualiza uma sessão de treino (marca como concluída).

- Requer autenticação.
- Body: `{ "completedAt": "2025-03-20T10:30:00Z" }`
- Respostas:
  - `200` → `{ id, completedAt, startedAt }`
  - `401` / `404` / `500`
- Implementação: `src/routes/workout-plan.ts` → `UpdateWorkoutSession`

### `GET /home/:date`

Retorna dados do dashboard para uma data específica (formato `YYYY-MM-DD`).

- Requer autenticação.
- Respostas:
  - `200` → dados do dia atual: treino do dia (`todayWorkoutDay`), ID do plano ativo, streak semanal, consistência diária, contagem de sessões por dia
  - `401` / `404` / `500`
- Implementação: `src/routes/home.ts` → `GetHomeData`

### `GET /me`

Busca dados físicos do usuário autenticado (peso, altura, idade, % de gordura).

- Requer autenticação.
- Respostas: `200` (dados ou `null` se não cadastrado) / `401` / `500`
- Implementação: `src/routes/me.ts` → `GetUserTrainData`

### `PUT /me`

Cria ou atualiza dados físicos do usuário.

- Requer autenticação.
- Body: `{ weightInGrams, heightInCentimeters, age, bodyFatPercentage }`
- Respostas: `200` / `401` / `500`
- Implementação: `src/routes/me.ts` → `UpsertUserTrainData`

### `GET /stats`

Retorna estatísticas de treino para um intervalo de datas.

- Requer autenticação.
- Query params: `from` e `to` (formato `YYYY-MM-DD`)
- Respostas:
  - `200` → `{ workoutStreak, consistencyByDay, completedWorkoutsCount, conclusionRate, totalTimeInSeconds }`
  - `401` / `404` / `500`
- Implementação: `src/routes/stats.ts` → `GetStats`

### `POST /ai`

Chat com o personal trainer virtual (IA).

- Requer autenticação.
- Body: `{ messages: UIMessage[] }` (formato Vercel AI SDK)
- Resposta: stream de texto (GPT-4o-mini)
- A IA possui ferramentas (tools) para:
  - Buscar dados físicos do usuário (`getUserTrainData`)
  - Atualizar dados físicos do usuário (`updateUserTrainData`)
  - Listar planos de treino (`getWorkoutPlans`)
  - Criar plano de treino completo de 7 dias (`createWorkoutPlan`)
- Implementação: `src/routes/ai.ts`

### `GET|POST /api/auth/*`

Proxy para o Better Auth.

- O Fastify converte a requisição em uma `Request` compatível com Fetch API e delega para `auth.handler(req)`.
- A resposta (status/headers/body) é repassada ao cliente.
- CORS permite origem `http://localhost:3000` com `credentials: true`.

---

## Regras de negócio (domínio)

### Entidades (modelo de dados)

Modelos principais no Prisma:

- `User`
- `WorkoutPlan`
- `WorkoutDay`
- `WorkoutExercise`
- `WorkoutSession`

E modelos de autenticação (Better Auth via Prisma):

- `Account`
- `Session`
- `Verification`

### Regra: somente um plano ativo por usuário

Implementada no use case `CreateWorkoutPlan.execute()`:

- Ao criar um novo plano para um `userId`, o sistema procura um plano ativo (`isActive: true`).
- Se existir, ele é desativado (`isActive: false`).
- Em seguida, cria o novo `WorkoutPlan` com `isActive: true`.

### Dados físicos do usuário

O modelo `User` possui campos opcionais para dados físicos:

- `weightInGrams` — peso em gramas (ex: 70kg = 70000)
- `heightInCentimeters` — altura em centímetros
- `age` — idade
- `bodyFatPercentage` — percentual de gordura corporal (0 a 100, onde 100 = 100%)

Gerenciados via `GET /me` e `PUT /me`.

### Dias de treino

Cada `WorkoutPlan` possui vários `WorkoutDay`:

- `weekDay` é obrigatório e vem do enum `WeekDay`
- `isRest` indica dia de descanso
- `estimatedDurationInSeconds` é obrigatório (mínimo 1 na validação do endpoint)
- `coverImageUrl` (opcional) — URL de imagem de capa do dia

### Sessões de treino

Cada `WorkoutDay` pode ter várias `WorkoutSession`, para registrar execuções reais do treino:

- `startedAt`: início do treino
- `completedAt`: fim do treino (opcional)

Regras:

- Só é possível iniciar uma sessão se o plano estiver ativo (`isActive: true`). Caso contrário, lança `WorkoutPlanNotActiveError` (422).
- Não é permitido criar sessão duplicada para o mesmo dia. Caso já exista, lança `ConflictError` (409).

### Streak de treinos

O sistema calcula o streak (sequência consecutiva) de treinos do usuário:

- Determina quais dias são de treino vs descanso no plano ativo
- Percorre retroativamente até 365 dias a partir da data atual
- Conta dias consecutivos em que o treino foi realizado (ou era dia de descanso)
- Para de contar ao encontrar o primeiro dia de treino não realizado
- Utilizado nos endpoints `/home/:date` e `/stats`

### Estatísticas

O endpoint `/stats` calcula métricas em um intervalo de datas:

- `workoutStreak` — sequência de dias consecutivos com treinos realizados
- `consistencyByDay` — mapa de data → `{ workoutDayCompleted, workoutDayStarted }`
- `completedWorkoutsCount` — total de sessões concluídas no período
- `conclusionRate` — porcentagem de sessões concluídas (0 a 1)
- `totalTimeInSeconds` — soma do tempo das sessões concluídas

### Personal Trainer Virtual (IA)

O endpoint `POST /ai` expõe um chat com IA via streaming:

- Modelo: GPT-4o-mini (via Vercel AI SDK + `@ai-sdk/openai`)
- A IA assume o papel de personal trainer virtual com tom amigável e motivador
- Possui acesso a ferramentas para consultar e alterar dados do usuário e criar/listar planos de treino
- Segue princípios de treino (splits Full Body, ABC, Upper/Lower, PPLUL, PPL 2x) para montar planos de 7 dias

### Exercícios

Cada `WorkoutDay` possui vários `WorkoutExercise`:

- `order`: ordenação dentro do dia
- `sets`, `reps`: devem ser >= 1
- `restTimeInSeconds`: >= 0

---

## Validação e contratos

- A API usa Zod para validar inputs e tipar respostas.
- O `fastify-type-provider-zod` integra Zod ao Fastify:
  - `setValidatorCompiler(validatorCompiler)`
  - `setSerializerCompiler(serializerCompiler)`
- O Swagger usa `jsonSchemaTransform` para transformar os schemas do Zod em JSON Schema/OpenAPI.

---

## Troubleshooting rápido

- Erro de conexão com banco: confira `DATABASE_URL` e se o `docker compose up -d` está rodando.
- CORS/cookies não funcionando: confirme se a origem é `http://localhost:3000` e se o client está enviando `credentials`.
- Porta em uso: mude `PORT` no `.env`.
