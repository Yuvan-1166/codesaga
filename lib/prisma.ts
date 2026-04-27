import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Create a PostgreSQL connection pool with SSL but without certificate verification
// This is needed for managed databases like Aiven that use self-signed certificates
if (!globalForPrisma.pool) {
  // Remove sslmode from connection string and set SSL config explicitly
  const connectionString = process.env.DATABASE_URL?.replace(/[?&]sslmode=[^&]*/g, '');
  
  globalForPrisma.pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Accept self-signed certificates
    },
  });
}

const pool = globalForPrisma.pool;

// Initialize Prisma Client with the adapter
if (!globalForPrisma.prisma) {
  // Create Prisma adapter with type assertion to handle version mismatch
  const adapter = new PrismaPg(pool as any);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;
