import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

// O código a seguir basicamente faz um cache da instância do Prisma Client para evitar criar múltiplas conexões ao banco de dados durante o desenvolvimento, especialmente com hot reloads. Ele verifica se já existe uma instância global do Prisma Client e a reutiliza, ou cria uma nova se não existir. A string de conexão é obtida da variável de ambiente DATABASE_URL, que deve estar configurada corretamente para conectar ao banco de dados PostgreSQL.

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({
  connectionString,
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
