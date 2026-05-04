/**
 * Assessment Generator
 * 
 * Generates adaptive assessments based on stack and user level
 */

import { prisma } from '@/lib/prisma';
import type { QuizQuestion, CodingChallenge } from './assessment-evaluator';

// ============================================================================
// Assessment Generation
// ============================================================================

/**
 * Generate an initial placement assessment
 */
export async function generateInitialAssessment(
  stackSlug: string
): Promise<{
  quizQuestions: QuizQuestion[];
  codingChallenges: CodingChallenge[];
}> {
  // Get assessment questions for this stack
  const questions = await prisma.assessmentQuestion.findMany({
    where: {
      stackSlug,
      questionType: 'MULTIPLE_CHOICE',
    },
    orderBy: {
      difficulty: 'asc',
    },
    take: 10, // 10 quiz questions
  });

  const quizQuestions: QuizQuestion[] = questions.map(q => ({
    id: q.id,
    question: q.questionText,
    options: (q.options as string[]) || [],
    correctAnswer: parseInt(q.correctAnswer),
    conceptTags: q.conceptTags,
    difficulty: q.difficulty,
    weight: q.weight,
  }));

  // Get coding challenges
  const challenges = await prisma.assessmentQuestion.findMany({
    where: {
      stackSlug,
      questionType: 'CODING_CHALLENGE',
    },
    orderBy: {
      difficulty: 'asc',
    },
    take: 2, // 2 coding challenges
  });

  const codingChallenges: CodingChallenge[] = challenges.map(c => ({
    id: c.id,
    description: c.questionText,
    starterCode: c.starterCode || '',
    testCases: (c.testCases as any[]) || [],
    conceptTags: c.conceptTags,
    difficulty: c.difficulty,
    weight: c.weight,
  }));

  return {
    quizQuestions,
    codingChallenges,
  };
}

/**
 * Generate a checkpoint assessment for specific concepts
 */
export async function generateCheckpointAssessment(
  stackSlug: string,
  conceptTags: string[],
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'
): Promise<{
  quizQuestions: QuizQuestion[];
  codingChallenges: CodingChallenge[];
}> {
  // Get questions that cover these concepts
  const questions = await prisma.assessmentQuestion.findMany({
    where: {
      stackSlug,
      questionType: 'MULTIPLE_CHOICE',
      difficulty,
      conceptTags: {
        hasSome: conceptTags,
      },
    },
    take: 5,
  });

  const quizQuestions: QuizQuestion[] = questions.map(q => ({
    id: q.id,
    question: q.questionText,
    options: (q.options as string[]) || [],
    correctAnswer: parseInt(q.correctAnswer),
    conceptTags: q.conceptTags,
    difficulty: q.difficulty,
    weight: q.weight,
  }));

  // Get one coding challenge
  const challenges = await prisma.assessmentQuestion.findMany({
    where: {
      stackSlug,
      questionType: 'CODING_CHALLENGE',
      difficulty,
      conceptTags: {
        hasSome: conceptTags,
      },
    },
    take: 1,
  });

  const codingChallenges: CodingChallenge[] = challenges.map(c => ({
    id: c.id,
    description: c.questionText,
    starterCode: c.starterCode || '',
    testCases: (c.testCases as any[]) || [],
    conceptTags: c.conceptTags,
    difficulty: c.difficulty,
    weight: c.weight,
  }));

  return {
    quizQuestions,
    codingChallenges,
  };
}

/**
 * Generate adaptive assessment based on user's weak concepts
 */
export async function generateAdaptiveAssessment(
  stackSlug: string,
  weakConcepts: string[],
  userPerformanceLevel: number // 0.0 - 1.0
): Promise<{
  quizQuestions: QuizQuestion[];
  codingChallenges: CodingChallenge[];
}> {
  // Determine difficulty based on performance
  let difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  if (userPerformanceLevel < 0.4) {
    difficulty = 'EASY';
  } else if (userPerformanceLevel < 0.7) {
    difficulty = 'MEDIUM';
  } else {
    difficulty = 'HARD';
  }

  // Focus on weak concepts
  const questions = await prisma.assessmentQuestion.findMany({
    where: {
      stackSlug,
      questionType: 'MULTIPLE_CHOICE',
      difficulty,
      conceptTags: {
        hasSome: weakConcepts,
      },
    },
    take: 8,
  });

  const quizQuestions: QuizQuestion[] = questions.map(q => ({
    id: q.id,
    question: q.questionText,
    options: (q.options as string[]) || [],
    correctAnswer: parseInt(q.correctAnswer),
    conceptTags: q.conceptTags,
    difficulty: q.difficulty,
    weight: q.weight,
  }));

  // Get coding challenge for weak concepts
  const challenges = await prisma.assessmentQuestion.findMany({
    where: {
      stackSlug,
      questionType: 'CODING_CHALLENGE',
      difficulty,
      conceptTags: {
        hasSome: weakConcepts,
      },
    },
    take: 1,
  });

  const codingChallenges: CodingChallenge[] = challenges.map(c => ({
    id: c.id,
    description: c.questionText,
    starterCode: c.starterCode || '',
    testCases: (c.testCases as any[]) || [],
    conceptTags: c.conceptTags,
    difficulty: c.difficulty,
    weight: c.weight,
  }));

  return {
    quizQuestions,
    codingChallenges,
  };
}

// ============================================================================
// Assessment Question Seeding
// ============================================================================

/**
 * Seed Express.js assessment questions
 */
export async function seedExpressAssessmentQuestions() {
  const questions = [
    // Multiple Choice Questions
    {
      id: 'express_q1',
      stackSlug: 'express',
      questionType: 'MULTIPLE_CHOICE' as const,
      questionText: 'What is Express.js?',
      options: [
        'A database management system',
        'A web application framework for Node.js',
        'A front-end JavaScript library',
        'A CSS preprocessor',
      ],
      correctAnswer: '1',
      conceptTags: ['express-basics'],
      difficulty: 'EASY' as const,
      weight: 1.0,
    },
    {
      id: 'express_q2',
      stackSlug: 'express',
      questionType: 'MULTIPLE_CHOICE' as const,
      questionText: 'Which method is used to define a GET route in Express?',
      options: [
        'app.route()',
        'app.get()',
        'app.request()',
        'app.fetch()',
      ],
      correctAnswer: '1',
      conceptTags: ['routing'],
      difficulty: 'EASY' as const,
      weight: 1.0,
    },
    {
      id: 'express_q3',
      stackSlug: 'express',
      questionType: 'MULTIPLE_CHOICE' as const,
      questionText: 'What is middleware in Express?',
      options: [
        'A database connector',
        'Functions that have access to request and response objects',
        'A template engine',
        'A routing algorithm',
      ],
      correctAnswer: '1',
      conceptTags: ['middleware'],
      difficulty: 'MEDIUM' as const,
      weight: 1.0,
    },
    {
      id: 'express_q4',
      stackSlug: 'express',
      questionType: 'MULTIPLE_CHOICE' as const,
      questionText: 'How do you access route parameters in Express?',
      options: [
        'req.query',
        'req.body',
        'req.params',
        'req.headers',
      ],
      correctAnswer: '2',
      conceptTags: ['routing', 'parameters'],
      difficulty: 'EASY' as const,
      weight: 1.0,
    },
    {
      id: 'express_q5',
      stackSlug: 'express',
      questionType: 'MULTIPLE_CHOICE' as const,
      questionText: 'What does next() do in Express middleware?',
      options: [
        'Ends the request-response cycle',
        'Passes control to the next middleware function',
        'Sends a response to the client',
        'Restarts the server',
      ],
      correctAnswer: '1',
      conceptTags: ['middleware'],
      difficulty: 'MEDIUM' as const,
      weight: 1.0,
    },
    {
      id: 'express_q6',
      stackSlug: 'express',
      questionType: 'MULTIPLE_CHOICE' as const,
      questionText: 'Which middleware is used to parse JSON request bodies?',
      options: [
        'express.urlencoded()',
        'express.json()',
        'express.static()',
        'express.router()',
      ],
      correctAnswer: '1',
      conceptTags: ['middleware', 'express-basics'],
      difficulty: 'EASY' as const,
      weight: 1.0,
    },
    {
      id: 'express_q7',
      stackSlug: 'express',
      questionType: 'MULTIPLE_CHOICE' as const,
      questionText: 'How do you handle errors in Express?',
      options: [
        'Using try-catch blocks only',
        'Using error-handling middleware with 4 parameters',
        'Errors are handled automatically',
        'Using the error() method',
      ],
      correctAnswer: '1',
      conceptTags: ['error-handling', 'middleware'],
      difficulty: 'MEDIUM' as const,
      weight: 1.0,
    },
    {
      id: 'express_q8',
      stackSlug: 'express',
      questionType: 'MULTIPLE_CHOICE' as const,
      questionText: 'What is the purpose of app.use() in Express?',
      options: [
        'To start the server',
        'To mount middleware functions',
        'To define routes',
        'To close connections',
      ],
      correctAnswer: '1',
      conceptTags: ['middleware', 'express-basics'],
      difficulty: 'EASY' as const,
      weight: 1.0,
    },

    // Coding Challenges
    {
      id: 'express_c1',
      stackSlug: 'express',
      questionType: 'CODING_CHALLENGE' as const,
      questionText: 'Create an Express server with a GET route at /hello that returns "Hello, World!"',
      starterCode: `const express = require('express');
const app = express();

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
        },
      ],
      correctAnswer: 'See test cases',
      conceptTags: ['express-basics', 'routing'],
      difficulty: 'EASY' as const,
      weight: 2.0,
      language: 'javascript',
    },
    {
      id: 'express_c2',
      stackSlug: 'express',
      questionType: 'CODING_CHALLENGE' as const,
      questionText: 'Create a middleware that logs the request method and URL, then create a GET route at /api/users',
      starterCode: `const express = require('express');
const app = express();

// Your middleware here

// Your route here

const PORT = 3000;
app.listen(PORT);`,
      testCases: [
        {
          id: 'test-1',
          name: 'Middleware logs requests',
          type: 'api_call',
          method: 'GET',
          endpoint: '/api/users',
          expectedStatus: 200,
        },
      ],
      correctAnswer: 'See test cases',
      conceptTags: ['middleware', 'routing'],
      difficulty: 'MEDIUM' as const,
      weight: 2.0,
      language: 'javascript',
    },
  ];

  for (const question of questions) {
    await prisma.assessmentQuestion.upsert({
      where: { id: question.id },
      update: question,
      create: question,
    });
  }

  console.log(`✓ Seeded ${questions.length} assessment questions for Express`);
}
