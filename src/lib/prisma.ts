import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

// Always attach to global to prevent multiple instances during build & dev
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

export default prisma;
