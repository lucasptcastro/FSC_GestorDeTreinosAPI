import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

import { auth } from "./lib/auth.js";
import { aiRoutes } from "./routes/ai.js";
import { homeRoutes } from "./routes/home.js";
import { meRoutes } from "./routes/me.js";
import { statsRoutes } from "./routes/stats.js";
import { workoutPlanRoutes } from "./routes/workout-plan.js";

const app = Fastify({
  logger: true,
});

// Adiciona os compilers para validação e serialização usando Zod
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Registra o plugin do Swagger com a configuração do OpenAPI e a transformação do JSON Schema usando Zod
await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Bootcamp Treinos API",
      description: "API para o bootcamp de treinos",
      version: "1.0.0",
    },
    servers: [
      {
        description: "Localhost",
        url: "http://localhost:8081",
      },
    ],
  },
  transform: jsonSchemaTransform,
});

// Registra o plugin do Swagger UI para servir a documentação interativa da API
await app.register(fastifyCors, {
  origin: ["http://localhost:3000"], // Permite apenas solicitações de origens confiáveis
  credentials: true, // Permite o envio de cookies e credenciais de autenticação
});

// Registra o plugin do Scalar para servir a documentação interativa da API
await app.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [
      {
        title: "Bootcamp Treinos API",
        slug: "bootcamp-treinos-api",
        url: "/swagger.json", // URL para o arquivo de especificação OpenAPI gerado pelo fastifySwagger
      },
      {
        title: "Auth API",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema", // URL para o endpoint que gera a especificação OpenAPI do Better Auth
      },
    ],
  },
});

// Rotas
await app.register(workoutPlanRoutes, { prefix: "/workout-plans" });
await app.register(homeRoutes, { prefix: "/home" });
await app.register(statsRoutes, { prefix: "/stats" });
await app.register(aiRoutes, { prefix: "/ai" });
await app.register(meRoutes, { prefix: "/me" });

// Define a rota GET "/swagger.json" para retornar a especificação OpenAPI gerada pelo fastifySwagger, escondendo esta rota da documentação do Swagger UI para evitar confusão com o endpoint de autenticação do Better Auth
app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true, // Esconde esta rota da documentação do Swagger UI
  },
  handler: async () => {
    return app.swagger(); // Retorna a especificação OpenAPI gerada pelo fastifySwagger
  },
});

// Define a rota GET "/" com um schema de resposta usando Zod e a descrição para o Swagger
app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "Hello World",
    tags: ["Hello World"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: () => {
    return {
      message: "Hello World",
    };
  },
});

// Define uma rota para lidar com autenticação em "/api/auth/*" que aceita métodos GET e POST, processa a requisição usando o handler de autenticação e encaminha a resposta para o cliente, incluindo tratamento de erros.
app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  schema: {
    hide: true, // Esconde esta rota da documentação do Swagger UI para evitar confusão com o endpoint de autenticação do Better Auth
  },
  async handler(request, reply) {
    try {
      // Constrói a URL completa da requisição usando o caminho e os headers do Fastify
      const url = new URL(request.url, `http://${request.headers.host}`);

      // Converte os headers do Fastify para um objeto Headers padrão
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });

      // Cria uma requisição compatível com a Fetch API
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });

      // Processa a requisição de autenticação
      const response = await auth.handler(req);

      // Encaminha a resposta para o cliente
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      app.log.error(error);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

// Inicia o servidor Fastify na porta especificada na variável de ambiente PORT ou na porta 8081 por padrão
app.listen({ port: Number(process.env.PORT) || 8081 }, function (err) {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
