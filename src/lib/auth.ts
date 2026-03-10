import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { PrismaClient } from "../generated/prisma/client.js";

// Inicializa o Prisma Client com o adaptador PostgreSQL e a string de conexão do banco de dados
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Configura o Better Auth com o provedor de email e senha habilitado, o adaptador do Prisma para PostgreSQL e o plugin OpenAPI para gerar a documentação da API
export const auth = betterAuth({
  trustedOrigins: ["http://localhost:3000"], // Permite apenas solicitações de origens confiáveis
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [openAPI()],
});
