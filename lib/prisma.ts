import { PrismaClient } from '@prisma/client';

// ─── Prisma Singleton ─────────────────────────────────────────────────────────
// Next.js hot-reloads in development, which would otherwise create a new
// PrismaClient on every reload, exhausting the connection pool.
// This pattern caches the client on the global object in development only.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
