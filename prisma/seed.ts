import 'dotenv/config'; // Load environment variables
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Debug: Check if DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set!');
  process.exit(1);
}

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL.substring(0, 30) + '...');

// Find the CA certificate - try multiple paths
let ca: string | undefined;
const possiblePaths = [
  join(process.cwd(), 'ca.pem'),
  join(__dirname, '..', 'ca.pem'),
  resolve(process.cwd(), 'ca.pem'),
];

for (const path of possiblePaths) {
  if (existsSync(path)) {
    ca = readFileSync(path).toString();
    console.log(`Using CA certificate from: ${path}`);
    break;
  }
}

if (!ca) {
  console.warn('Warning: ca.pem not found, SSL verification may fail');
}

// Create a PostgreSQL connection pool with proper SSL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ca ? {
    ca,
    rejectUnauthorized: true,
  } : {
    rejectUnauthorized: false, // Fallback if ca.pem not found
  },
});

// Create Prisma adapter with type assertion
const adapter = new PrismaPg(pool as any);

// Initialize Prisma Client with the adapter
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create stacks
  const stacks = [
    {
      name: 'Express.js',
      slug: 'express',
      description: 'Build a REST API for a task management app with authentication and real-time updates',
    },
    {
      name: 'Next.js API Routes',
      slug: 'nextjs-api',
      description: 'Create a full-stack blog platform with server-side rendering and dynamic routes',
    },
    {
      name: 'Prisma',
      slug: 'prisma',
      description: 'Design and build a multi-tenant SaaS database with complex relationships and migrations',
    },
  ];

  const createdStacks: any[] = [];

  for (const stack of stacks) {
    const created = await prisma.stack.upsert({
      where: { slug: stack.slug },
      update: stack,
      create: stack,
    });
    createdStacks.push(created);
    console.log(`✓ Created/updated stack: ${stack.name}`);
  }

  // Create tasks for Express.js stack
  const expressStack = createdStacks.find((s) => s.slug === 'express');
  
  if (expressStack) {
    const expressTasks = [
      {
        stackId: expressStack.id,
        internalOrder: 1,
        conceptTags: ['express-basics', 'routing', 'middleware'],
        difficultyLevel: 'EASY',
        isDetour: false,
      },
      {
        stackId: expressStack.id,
        internalOrder: 2,
        conceptTags: ['error-handling', 'middleware', 'async-await'],
        difficultyLevel: 'MEDIUM',
        isDetour: false,
      },
      {
        stackId: expressStack.id,
        internalOrder: 3,
        conceptTags: ['authentication', 'jwt', 'security'],
        difficultyLevel: 'MEDIUM',
        isDetour: false,
      },
      {
        stackId: expressStack.id,
        internalOrder: 4,
        conceptTags: ['database', 'crud', 'validation'],
        difficultyLevel: 'HARD',
        isDetour: false,
      },
    ];

    for (const task of expressTasks) {
      await prisma.task.upsert({
        where: {
          stackId_internalOrder: {
            stackId: task.stackId,
            internalOrder: task.internalOrder,
          },
        },
        update: task,
        create: task,
      });
    }
    console.log(`✓ Created/updated ${expressTasks.length} tasks for Express.js`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
