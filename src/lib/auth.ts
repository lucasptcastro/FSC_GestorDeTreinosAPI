import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { prisma } from "./db.js";

// Configura o Better Auth com o provedor de email e senha habilitado, o adaptador do Prisma para PostgreSQL e o plugin OpenAPI para gerar a documentação da API
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: ["http://localhost:3000"], // Permite apenas solicitações de origens confiáveis
  socialProviders: {
    google: {
      prompt: "select_account", // Sempre solicita ao usuário que selecione uma conta do Google para login
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [openAPI()],
});
