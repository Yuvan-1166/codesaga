/**
 * Module Seeder
 * 
 * Helper functions to seed modules for testing the adaptive learning system
 */

import { prisma } from '@/lib/prisma';
import { ModuleType, DifficultyLevel } from '@prisma/client';

interface ModuleData {
  slug: string;
  title: string;
  description: string;
  moduleType: ModuleType;
  difficultyLevel: DifficultyLevel;
  conceptTags: string[];
  conceptWeights?: Record<string, number>;
  prerequisites?: {
    concepts?: string[];
    modules?: string[];
    minConceptStrength?: number;
  };
  estimatedMinutes: number;
  language?: string;
  executionMode?: string;
  starterCode?: string;
  testCases?: any[];
  assessmentType?: string;
  storyContext?: string;
  successMessage?: string;
}

/**
 * Seed Express.js modules
 */
export async function seedExpressModules(stackId: string) {
  const modules: ModuleData[] = [
    // CORE Module 1: Setup
    {
      slug: 'express-setup',
      title: 'Setting Up Express',
      description: 'Install Express and create your first server',
      moduleType: 'CORE',
      difficultyLevel: 'EASY',
      conceptTags: ['express-basics', 'setup'],
      conceptWeights: { 'express-basics': 1.0, 'setup': 0.5 },
      estimatedMinutes: 10,
      language: 'javascript',
      executionMode: 'server',
      starterCode: `// Create a basic Express server
const express = require('express');
const app = express();

// Your code here

const PORT = 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      testCases: [
        {
          id: 'test-1',
          name: 'Server starts successfully',
          type: 'server_start',
          expectedOutput: 'Server running',
          hidden: false,
          weight: 1,
        },
      ],
      storyContext: 'You need to build an API. First step: get a server running.',
      successMessage: 'Server is up! Time to add some routes.',
    },

    // CORE Module 2: Basic Routing
    {
      slug: 'express-basic-routing',
      title: 'Basic Routing',
      description: 'Create your first GET route',
      moduleType: 'CORE',
      difficultyLevel: 'EASY',
      conceptTags: ['routing', 'express-basics'],
      conceptWeights: { 'routing': 0.8, 'express-basics': 0.2 },
      prerequisites: {
        modules: ['express-setup'],
        minConceptStrength: 0.3,
      },
      estimatedMinutes: 15,
      language: 'javascript',
      executionMode: 'server',
      starterCode: `const express = require('express');
const app = express();

// Create a GET route at /hello that returns "Hello, World!"
// Your code here

const PORT = 3000;
app.listen(PORT);`,
      testCases: [
        {
          id: 'test-1',
          name: 'GET /hello returns Hello, World!',
          type: 'api_call',
          method: 'GET',
          endpoint: '/hello',
          expectedStatus: 200,
          expectedBody: 'Hello, World!',
          hidden: false,
          weight: 1,
        },
      ],
      storyContext: 'Your server is running but it doesn\'t do anything yet. Add a route.',
      successMessage: 'First route working! You can now respond to requests.',
    },

    // PRACTICE Module: Routing Practice
    {
      slug: 'routing-practice',
      title: 'Routing Practice',
      description: 'Practice creating multiple routes',
      moduleType: 'PRACTICE',
      difficultyLevel: 'EASY',
      conceptTags: ['routing'],
      conceptWeights: { 'routing': 1.0 },
      prerequisites: {
        concepts: ['routing'],
        minConceptStrength: 0.3,
      },
      estimatedMinutes: 12,
      language: 'javascript',
      executionMode: 'server',
      storyContext: 'Practice makes perfect. Create a few more routes to build confidence.',
    },

    // CORE Module 3: Route Parameters
    {
      slug: 'route-parameters',
      title: 'Route Parameters',
      description: 'Handle dynamic route parameters',
      moduleType: 'CORE',
      difficultyLevel: 'EASY',
      conceptTags: ['routing', 'parameters'],
      conceptWeights: { 'routing': 0.5, 'parameters': 0.5 },
      prerequisites: {
        concepts: ['routing'],
        modules: ['express-basic-routing'],
        minConceptStrength: 0.5,
      },
      estimatedMinutes: 15,
      language: 'javascript',
      executionMode: 'server',
      storyContext: 'Routes need to be dynamic. Learn to capture URL parameters.',
    },

    // CORE Module 4: Middleware Basics
    {
      slug: 'middleware-basics',
      title: 'Understanding Middleware',
      description: 'Learn how middleware works in Express',
      moduleType: 'CORE',
      difficultyLevel: 'MEDIUM',
      conceptTags: ['middleware', 'express-basics'],
      conceptWeights: { 'middleware': 0.8, 'express-basics': 0.2 },
      prerequisites: {
        concepts: ['routing'],
        minConceptStrength: 0.5,
      },
      estimatedMinutes: 20,
      language: 'javascript',
      executionMode: 'server',
      storyContext: 'Every request needs logging. Time to learn middleware.',
    },

    // REMEDIAL Module: Middleware Simplified
    {
      slug: 'middleware-simplified',
      title: 'Middleware Made Simple',
      description: 'A simpler introduction to middleware',
      moduleType: 'REMEDIAL',
      difficultyLevel: 'EASY',
      conceptTags: ['middleware'],
      conceptWeights: { 'middleware': 1.0 },
      estimatedMinutes: 15,
      language: 'javascript',
      executionMode: 'server',
      storyContext: 'Let\'s break down middleware into smaller pieces.',
    },

    // PRACTICE Module: Middleware Practice
    {
      slug: 'middleware-practice',
      title: 'Middleware Practice',
      description: 'Build custom middleware functions',
      moduleType: 'PRACTICE',
      difficultyLevel: 'MEDIUM',
      conceptTags: ['middleware'],
      conceptWeights: { 'middleware': 1.0 },
      prerequisites: {
        concepts: ['middleware'],
        minConceptStrength: 0.4,
      },
      estimatedMinutes: 18,
      language: 'javascript',
      executionMode: 'server',
      storyContext: 'Practice creating your own middleware.',
    },

    // CORE Module 5: Error Handling
    {
      slug: 'error-handling',
      title: 'Error Handling',
      description: 'Handle errors gracefully',
      moduleType: 'CORE',
      difficultyLevel: 'MEDIUM',
      conceptTags: ['error-handling', 'middleware'],
      conceptWeights: { 'error-handling': 0.7, 'middleware': 0.3 },
      prerequisites: {
        concepts: ['middleware', 'routing'],
        minConceptStrength: 0.5,
      },
      estimatedMinutes: 20,
      language: 'javascript',
      executionMode: 'server',
      storyContext: 'Things break. Learn to handle errors properly.',
    },

    // ASSESSMENT Module: Checkpoint 1
    {
      slug: 'checkpoint-basics',
      title: 'Express Basics Checkpoint',
      description: 'Test your understanding of Express fundamentals',
      moduleType: 'ASSESSMENT',
      difficultyLevel: 'EASY',
      conceptTags: ['express-basics', 'routing', 'middleware'],
      estimatedMinutes: 15,
      assessmentType: 'checkpoint',
      storyContext: 'Time to check your understanding before moving forward.',
    },

    // INTEGRATION Module: Build a Simple API
    {
      slug: 'simple-api',
      title: 'Build a Simple API',
      description: 'Combine routing, middleware, and error handling',
      moduleType: 'INTEGRATION',
      difficultyLevel: 'MEDIUM',
      conceptTags: ['routing', 'middleware', 'error-handling'],
      conceptWeights: { 'routing': 0.4, 'middleware': 0.3, 'error-handling': 0.3 },
      prerequisites: {
        concepts: ['routing', 'middleware', 'error-handling'],
        minConceptStrength: 0.5,
      },
      estimatedMinutes: 30,
      language: 'javascript',
      executionMode: 'server',
      storyContext: 'Put it all together: build a working API with multiple endpoints.',
    },

    // CHALLENGE Module: Advanced Routing
    {
      slug: 'advanced-routing',
      title: 'Advanced Routing Patterns',
      description: 'Master complex routing scenarios',
      moduleType: 'CHALLENGE',
      difficultyLevel: 'HARD',
      conceptTags: ['routing', 'advanced-patterns'],
      conceptWeights: { 'routing': 0.6, 'advanced-patterns': 0.4 },
      prerequisites: {
        concepts: ['routing', 'middleware'],
        minConceptStrength: 0.7,
      },
      estimatedMinutes: 25,
      language: 'javascript',
      executionMode: 'server',
      storyContext: 'Ready for a challenge? Tackle complex routing patterns.',
    },
  ];

  const createdModules = [];

  for (const moduleData of modules) {
    const module = await prisma.module.create({
      data: {
        stackId,
        slug: moduleData.slug,
        title: moduleData.title,
        description: moduleData.description,
        moduleType: moduleData.moduleType,
        difficultyLevel: moduleData.difficultyLevel,
        conceptTags: moduleData.conceptTags,
        conceptWeights: moduleData.conceptWeights || {},
        prerequisites: moduleData.prerequisites || {},
        estimatedMinutes: moduleData.estimatedMinutes,
        language: moduleData.language || 'javascript',
        executionMode: moduleData.executionMode || 'browser',
        starterCode: moduleData.starterCode,
        testCases: moduleData.testCases,
        assessmentType: moduleData.assessmentType,
        storyContext: moduleData.storyContext,
        successMessage: moduleData.successMessage,
        isActive: true,
      },
    });

    createdModules.push(module);
    console.log(`✓ Created module: ${module.title}`);
  }

  return createdModules;
}

/**
 * Get or create Express stack and seed modules
 */
export async function setupExpressStack() {
  // Find or create Express stack
  let stack = await prisma.stack.findUnique({
    where: { slug: 'express' },
  });

  if (!stack) {
    stack = await prisma.stack.create({
      data: {
        name: 'Express.js',
        slug: 'express',
        description: 'Build a REST API for a task management app with authentication and real-time updates',
      },
    });
    console.log('✓ Created Express stack');
  }

  // Check if modules already exist
  const existingModules = await prisma.module.count({
    where: { stackId: stack.id },
  });

  if (existingModules > 0) {
    console.log(`Stack already has ${existingModules} modules`);
    return stack;
  }

  // Seed modules
  await seedExpressModules(stack.id);

  return stack;
}
