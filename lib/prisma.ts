import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Read the CA certificate for Aiven
const ca = readFileSync(join(process.cwd(), 'ca.pem')).toString();

// Create a PostgreSQL connection pool with proper SSL configuration
const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca, // Use the CA certificate
    rejectUnauthorized: true, // Verify the certificate
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;

// Create Prisma adapter with type assertion to handle version mismatch
const adapter = new PrismaPg(pool as any);

// Initialize Prisma Client with the adapter
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
