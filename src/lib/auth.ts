import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { prisma } from "./db.js";
import { env } from "./env.js";

// Configura o Better Auth com o provedor de email e senha habilitado, o adaptador do Prisma para PostgreSQL e o plugin OpenAPI para gerar a documentação da API
export const auth = betterAuth({
  baseURL: env.API_BASE_URL,
  trustedOrigins: [env.WEB_APP_BASE_URL], // Permite apenas solicitações de origens confiáveis
  socialProviders: {
    google: {
      prompt: "select_account", // Sempre solicita ao usuário que selecione uma conta do Google para login
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [openAPI()],
  advanced: {
    crossSubDomainCookies: {
      enabled: true, // Habilita cookies entre subdomínios para permitir autenticação em diferentes partes do aplicativo
    },
  },
});
