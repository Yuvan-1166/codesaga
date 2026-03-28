import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Get CA certificate from environment variable
const ca = process.env.DATABASE_CA?.replace(/\\n/g, '\n');

// Create a PostgreSQL connection pool with proper SSL configuration
const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ca ? {
    ca, // Use the CA certificate from env
    rejectUnauthorized: true, // Verify the certificate
  } : {
    rejectUnauthorized: false, // Fallback if CA not provided
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;

// Create Prisma adapter with type assertion to handle version mismatch
const adapter = new PrismaPg(pool as any);

// Initialize Prisma Client with the adapter
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
