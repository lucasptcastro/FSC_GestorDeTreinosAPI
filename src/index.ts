import "dotenv/config";

import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

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

// Registra o plugin do Swagger UI para servir a documentação interativa do Swagger na rota "/docs"
await app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
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

// Inicia o servidor Fastify na porta especificada na variável de ambiente PORT ou na porta 8081 por padrão
app.listen({ port: Number(process.env.PORT) || 8081 }, function (err) {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
