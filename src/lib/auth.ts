import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { prisma } from "./db.js";

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
