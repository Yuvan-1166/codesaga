import 'dotenv/config'; // Load environment variables
import { PrismaClient, DifficultyLevel } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Debug: Check if DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set!');
  process.exit(1);
}

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL.substring(0, 30) + '...');

// Get CA certificate from environment variable
const ca = process.env.DATABASE_CA?.replace(/\\n/g, '\n');

if (!ca) {
  console.warn('Warning: DATABASE_CA not set, SSL verification may fail');
} else {
  console.log('Using CA certificate from DATABASE_CA environment variable');
}

// Create a PostgreSQL connection pool with proper SSL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ca ? {
    ca,
    rejectUnauthorized: true,
  } : {
    rejectUnauthorized: false, // Fallback if CA not provided
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
        difficultyLevel: DifficultyLevel.EASY,
        isDetour: false,
        milestoneGroup: 1,
        starterCode: '// Write a function that returns the sum of two numbers\nfunction sum(a, b) {\n  // Your code here\n}\n',
        testCases: [
          {
            id: 'test-1',
            name: 'Sum of positive numbers',
            input: { a: 2, b: 3 },
            expectedOutput: 5,
            hidden: false,
            weight: 1,
          },
          {
            id: 'test-2',
            name: 'Sum with negative numbers',
            input: { a: -5, b: 10 },
            expectedOutput: 5,
            hidden: false,
            weight: 1,
          },
          {
            id: 'test-3',
            name: 'Sum of zeros',
            input: { a: 0, b: 0 },
            expectedOutput: 0,
            hidden: true,
            weight: 1,
          },
        ],
        language: 'javascript',
        executionMode: 'browser',
      },
      {
        stackId: expressStack.id,
        internalOrder: 2,
        conceptTags: ['error-handling', 'middleware', 'async-await'],
        difficultyLevel: DifficultyLevel.MEDIUM,
        isDetour: false,
        milestoneGroup: 1,
        starterCode: '// Write a function that filters even numbers from an array\nfunction filterEven(numbers) {\n  // Your code here\n}\n',
        testCases: [
          {
            id: 'test-1',
            name: 'Filter even numbers',
            input: [1, 2, 3, 4, 5, 6],
            expectedOutput: [2, 4, 6],
            hidden: false,
            weight: 1,
          },
          {
            id: 'test-2',
            name: 'Empty array',
            input: [],
            expectedOutput: [],
            hidden: false,
            weight: 1,
          },
        ],
        language: 'javascript',
        executionMode: 'browser',
      },
      {
        stackId: expressStack.id,
        internalOrder: 3,
        conceptTags: ['authentication', 'jwt', 'security'],
        difficultyLevel: DifficultyLevel.MEDIUM,
        isDetour: false,
        milestoneGroup: 2,
      },
      {
        stackId: expressStack.id,
        internalOrder: 4,
        conceptTags: ['database', 'crud', 'validation'],
        difficultyLevel: DifficultyLevel.HARD,
        isDetour: false,
        milestoneGroup: 2,
      },
      // Detour tasks - inherit milestoneGroup from the tasks they support
      {
        stackId: expressStack.id,
        internalOrder: 101,
        conceptTags: ['middleware', 'express-basics'],
        difficultyLevel: DifficultyLevel.EASY,
        isDetour: true,
        milestoneGroup: 1,
      },
      {
        stackId: expressStack.id,
        internalOrder: 102,
        conceptTags: ['error-handling', 'async-await'],
        difficultyLevel: DifficultyLevel.EASY,
        isDetour: true,
        milestoneGroup: 1,
      },
      {
        stackId: expressStack.id,
        internalOrder: 103,
        conceptTags: ['authentication', 'security'],
        difficultyLevel: DifficultyLevel.MEDIUM,
        isDetour: true,
        milestoneGroup: 2,
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
    console.log(`✓ Created/updated ${expressTasks.length} tasks for Express.js (including ${expressTasks.filter(t => t.isDetour).length} detours)`);
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
