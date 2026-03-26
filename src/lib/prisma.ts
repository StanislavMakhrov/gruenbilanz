/**
 * Prisma client singleton for GrünBilanz.
 *
 * Prevents connection pool exhaustion during Next.js hot reloads in development
 * by reusing a single PrismaClient instance stored on the global object.
 * In production a fresh instance is created once at module load time.
 *
 * See: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */
import { PrismaClient } from '@prisma/client';

// Extend the global type to include our Prisma singleton
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Reuse existing instance in dev (hot reload) or create a new one
const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  // Assign to globalThis in non-production to survive hot reloads
  globalThis.__prisma = prisma;
}

export { prisma };
