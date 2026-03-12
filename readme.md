# Gestor de Treinos — API

API do projeto **Gestor de Treinos** (bootcamp), responsável por:

- Autenticação (email/senha) e sessões
- Persistência dos dados (PostgreSQL)
- Cadastro de **Planos de Treino** (Workout Plans) com **Dias de Treino** e **Exercícios**
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
- **Better Auth** para autenticação (email/senha) com adaptador Prisma
- **ESLint + Prettier** (config flat)

---

## Observações

- Não utilizar try catch dentro de um usecase. O usecase apenas lança a exceção, mas o tratamento deve ser feito na rota do controller

---

## Estrutura de pastas

Visão geral (arquivos principais):

```
.
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
│  │  └─ workout-plan.ts
│  ├─ schemas/
│  │  └─ index.ts
│  └─ usecases/
│     └─ CreateWorkoutPlan.ts
└─ readme.md
```

### `src/index.ts`

Entry-point do servidor. Responsabilidades:

- Inicializa o Fastify
- Configura validação/serialização usando Zod
- Registra Swagger/OpenAPI
- Registra CORS (origens confiáveis e `credentials: true`)
- Registra o Scalar em `/docs`
- Define rotas (ex.: `/`, `/swagger.json`, `/workout-plans` e proxy de auth em `/api/auth/*`)

### `src/lib/db.ts`

Cria e exporta a instância do Prisma Client.

- Usa `@prisma/adapter-pg` com a `DATABASE_URL`
- Faz cache em `globalThis` em ambiente de desenvolvimento para evitar múltiplas conexões durante hot reload

### `src/lib/auth.ts`

Configura o Better Auth:

- Email/senha habilitado
- Adaptador Prisma (PostgreSQL)
- Plugin `openAPI()` para expor schema OpenAPI de auth

### `src/generated/prisma/*`

Código **gerado automaticamente** pelo Prisma Client. Não editar manualmente.

### `src/usecases/CreateWorkoutPlan.ts`

Use case (camada de regra de negócio) para criar um plano de treino.

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

### `POST /workout-plans`

Endpoint para criação de plano de treino.

- Validação de entrada feita com Zod
- Requer autenticação (sessão do Better Auth). Se não houver sessão, retorna `401`.
- Respostas:
  - `201` → retorna o plano criado (formato do `WorkoutPlanSchema`)
  - `400` → `{ error: string, code: string }` (validação/contrato)
  - `401` → `{ error: string, code: string }` (não autenticado)
  - `404` → `{ error: string, code: string }` (caso raro: plano não encontrado após criação)
  - `500` → `{ error: string, code: string }`

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

Resposta `201` (formato):

```json
{
  "id": "0d6d9a1f-4f87-4c72-8ea1-8c2f1a1b3e2c",
  "name": "Treino ABC",
  "workoutDays": [
    {
      "name": "Treino A",
      "weekDay": "MONDAY",
      "isRest": false,
      "estimatedDurationInSeconds": 3600,
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

Enum `WeekDay`:

- `SUNDAY`, `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`

Implementação:

- Rota: `src/routes/workout-plan.ts`
- Use case: `src/usecases/CreateWorkoutPlan.ts`
- Para identificar o usuário, a rota usa `auth.api.getSession()` do Better Auth (com headers da requisição).

### `GET|POST /api/auth/*`

Proxy para o Better Auth.

- O Fastify converte a requisição em uma `Request` compatível com Fetch API e delega para `auth.handler(req)`.
- A resposta (status/headers/body) é repassada ao cliente.

Observações importantes:

- CORS está configurado para permitir origem `http://localhost:3000` com `credentials: true`.
- Isso é relevante caso o Better Auth use cookies/sessões.

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

### Dias de treino

Cada `WorkoutPlan` possui vários `WorkoutDay`:

- `weekDay` é obrigatório e vem do enum `WeekDay`
- `isRest` indica dia de descanso
- `estimatedDurationInSeconds` é obrigatório (mínimo 1 na validação do endpoint)

### Sessões de treino

Cada `WorkoutDay` pode ter várias `WorkoutSession`, para registrar execuções reais do treino:

- `startedAt`: início do treino
- `completedAt`: fim do treino (opcional)

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
