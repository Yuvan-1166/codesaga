/**
 * Assessment Evaluator
 * 
 * Evaluates quiz and coding challenge assessments
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// Types
// ============================================================================

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  conceptTags: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  weight: number;
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswer: number;
  timeSpent: number; // seconds
}

export interface CodingChallenge {
  id: string;
  description: string;
  starterCode: string;
  testCases: any[];
  conceptTags: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  weight: number;
}

export interface CodingChallengeSubmission {
  challengeId: string;
  code: string;
  testResults: {
    passed: number;
    total: number;
    results: any[];
  };
  timeSpent: number;
}

export interface AssessmentResult {
  overallScore: number; // 0.0 - 1.0
  conceptScores: Map<string, number>; // Per-concept scores
  passed: boolean;
  recommendedIntensity: 'CASUAL' | 'STANDARD' | 'INTENSIVE';
  strengths: string[]; // Concepts scored > 0.7
  weaknesses: string[]; // Concepts scored < 0.4
  timeSpent: number;
}

// ============================================================================
// Quiz Evaluation
// ============================================================================

/**
 * Evaluate quiz answers
 */
export function evaluateQuiz(
  questions: QuizQuestion[],
  answers: QuizAnswer[]
): AssessmentResult {
  const answerMap = new Map(answers.map(a => [a.questionId, a]));
  const conceptScores = new Map<string, { total: number; earned: number; weight: number }>();
  
  let totalWeight = 0;
  let earnedWeight = 0;
  let totalTime = 0;

  // Evaluate each question
  for (const question of questions) {
    const answer = answerMap.get(question.id);
    
    if (!answer) {
      // No answer provided - count as wrong
      totalWeight += question.weight;
      continue;
    }

    totalTime += answer.timeSpent;
    const isCorrect = answer.selectedAnswer === question.correctAnswer;
    const points = isCorrect ? question.weight : 0;

    totalWeight += question.weight;
    earnedWeight += points;

    // Track per-concept scores
    for (const concept of question.conceptTags) {
      if (!conceptScores.has(concept)) {
        conceptScores.set(concept, { total: 0, earned: 0, weight: 0 });
      }
      const conceptData = conceptScores.get(concept)!;
      conceptData.total += question.weight;
      conceptData.earned += points;
      conceptData.weight += question.weight;
    }
  }

  // Calculate overall score
  const overallScore = totalWeight > 0 ? earnedWeight / totalWeight : 0;

  // Calculate per-concept scores
  const conceptScoreMap = new Map<string, number>();
  for (const [concept, data] of conceptScores.entries()) {
    const score = data.total > 0 ? data.earned / data.total : 0;
    conceptScoreMap.set(concept, score);
  }

  // Identify strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const [concept, score] of conceptScoreMap.entries()) {
    if (score >= 0.7) {
      strengths.push(concept);
    } else if (score < 0.4) {
      weaknesses.push(concept);
    }
  }

  // Determine recommended intensity
  const recommendedIntensity = determineIntensityFromScore(overallScore);

  return {
    overallScore,
    conceptScores: conceptScoreMap,
    passed: overallScore >= 0.6,
    recommendedIntensity,
    strengths,
    weaknesses,
    timeSpent: totalTime,
  };
}

// ============================================================================
// Coding Challenge Evaluation
// ============================================================================

/**
 * Evaluate coding challenge submission
 */
export function evaluateCodingChallenge(
  challenge: CodingChallenge,
  submission: CodingChallengeSubmission
): AssessmentResult {
  const { testResults, timeSpent } = submission;
  
  // Calculate score based on test pass rate
  const passRate = testResults.total > 0 
    ? testResults.passed / testResults.total 
    : 0;

  // Adjust score based on time efficiency
  const expectedTime = 300; // 5 minutes baseline
  const timeEfficiency = Math.min(1.0, expectedTime / Math.max(timeSpent, 1));
  const timeBonus = (timeEfficiency - 0.5) * 0.1; // Up to 0.05 bonus

  const overallScore = Math.min(1.0, Math.max(0.0, passRate + timeBonus));

  // Assign score to all concept tags
  const conceptScores = new Map<string, number>();
  for (const concept of challenge.conceptTags) {
    conceptScores.set(concept, overallScore);
  }

  // Identify strengths and weaknesses
  const strengths = overallScore >= 0.7 ? challenge.conceptTags : [];
  const weaknesses = overallScore < 0.4 ? challenge.conceptTags : [];

  const recommendedIntensity = determineIntensityFromScore(overallScore);

  return {
    overallScore,
    conceptScores,
    passed: overallScore >= 0.6,
    recommendedIntensity,
    strengths,
    weaknesses,
    timeSpent,
  };
}

// ============================================================================
// Combined Assessment Evaluation
// ============================================================================

/**
 * Evaluate a mixed assessment (quiz + coding challenges)
 */
export function evaluateMixedAssessment(
  quizQuestions: QuizQuestion[],
  quizAnswers: QuizAnswer[],
  codingChallenges: CodingChallenge[],
  codingSubmissions: CodingChallengeSubmission[]
): AssessmentResult {
  // Evaluate quiz portion
  const quizResult = quizQuestions.length > 0 
    ? evaluateQuiz(quizQuestions, quizAnswers)
    : null;

  // Evaluate coding challenges
  const codingResults = codingChallenges.map((challenge, index) => {
    const submission = codingSubmissions[index];
    return submission 
      ? evaluateCodingChallenge(challenge, submission)
      : null;
  }).filter(r => r !== null) as AssessmentResult[];

  // Combine results
  if (!quizResult && codingResults.length === 0) {
    throw new Error('No assessment data to evaluate');
  }

  // Weight: 60% quiz, 40% coding (if both present)
  let overallScore = 0;
  let totalTime = 0;
  const conceptScores = new Map<string, number[]>();

  if (quizResult) {
    const quizWeight = codingResults.length > 0 ? 0.6 : 1.0;
    overallScore += quizResult.overallScore * quizWeight;
    totalTime += quizResult.timeSpent;

    // Collect concept scores
    for (const [concept, score] of quizResult.conceptScores.entries()) {
      if (!conceptScores.has(concept)) {
        conceptScores.set(concept, []);
      }
      conceptScores.get(concept)!.push(score);
    }
  }

  if (codingResults.length > 0) {
    const codingWeight = quizResult ? 0.4 : 1.0;
    const avgCodingScore = codingResults.reduce((sum, r) => sum + r.overallScore, 0) / codingResults.length;
    overallScore += avgCodingScore * codingWeight;

    for (const result of codingResults) {
      totalTime += result.timeSpent;
      for (const [concept, score] of result.conceptScores.entries()) {
        if (!conceptScores.has(concept)) {
          conceptScores.set(concept, []);
        }
        conceptScores.get(concept)!.push(score);
      }
    }
  }

  // Average concept scores
  const finalConceptScores = new Map<string, number>();
  for (const [concept, scores] of conceptScores.entries()) {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    finalConceptScores.set(concept, avg);
  }

  // Identify strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const [concept, score] of finalConceptScores.entries()) {
    if (score >= 0.7) {
      strengths.push(concept);
    } else if (score < 0.4) {
      weaknesses.push(concept);
    }
  }

  const recommendedIntensity = determineIntensityFromScore(overallScore);

  return {
    overallScore,
    conceptScores: finalConceptScores,
    passed: overallScore >= 0.6,
    recommendedIntensity,
    strengths,
    weaknesses,
    timeSpent: totalTime,
  };
}

// ============================================================================
// Intensity Determination
// ============================================================================

/**
 * Determine recommended intensity from assessment score
 */
function determineIntensityFromScore(score: number): 'CASUAL' | 'STANDARD' | 'INTENSIVE' {
  if (score >= 0.75) {
    return 'INTENSIVE';
  } else if (score >= 0.45) {
    return 'STANDARD';
  } else {
    return 'CASUAL';
  }
}

// ============================================================================
// Assessment Storage
// ============================================================================

/**
 * Store assessment result in database
 */
export async function storeAssessmentResult(
  userId: string,
  stackId: string,
  result: AssessmentResult,
  assessmentType: 'initial' | 'checkpoint' | 'final'
): Promise<string> {
  const assessment = await prisma.assessment.create({
    data: {
      id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      stackId,
      status: 'COMPLETED',
      score: result.overallScore,
      skillLevelAssigned: result.recommendedIntensity,
      adaptivePath: {
        type: assessmentType,
        conceptScores: Object.fromEntries(result.conceptScores),
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        timeSpent: result.timeSpent,
      },
      completedAt: new Date(),
    },
  });

  return assessment.id;
}

/**
 * Get user's assessment history
 */
export async function getAssessmentHistory(
  userId: string,
  stackId?: string
) {
  const assessments = await prisma.assessment.findMany({
    where: {
      userId,
      ...(stackId && { stackId }),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  return assessments;
}

/**
 * Check if user has completed initial assessment
 */
export async function hasCompletedInitialAssessment(
  userId: string,
  stackId: string
): Promise<boolean> {
  const assessment = await prisma.assessment.findFirst({
    where: {
      userId,
      stackId,
      status: 'COMPLETED',
    },
  });

  return assessment !== null;
}
