/**
 * Prisma Client Singleton
 * 
 * This module exports a single PrismaClient instance shared across the application.
 * This follows Prisma's best practices to avoid connection pool exhaustion and
 * ensures proper connection lifecycle management.
 * 
 * In development, we use globalThis to prevent creating multiple instances during
 * hot-reloads. In production, the singleton pattern ensures one instance per process.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton PrismaClient instance
 * 
 * Configured with:
 * - Query logging in development for debugging
 * - Error logging in all environments
 * - Proper connection pool management
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

// Prevent multiple instances in development (hot-reload protection)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handling
const gracefulShutdown = async () => {
  await prisma.$disconnect();
};

// Handle process termination signals
process.on('beforeExit', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions (ensure cleanup)
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await gracefulShutdown();
  process.exit(1);
});

// Handle unhandled promise rejections (ensure cleanup)
process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled rejection:', reason);
  await gracefulShutdown();
  process.exit(1);
});
