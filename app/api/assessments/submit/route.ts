import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {
  evaluateMixedAssessment,
  storeAssessmentResult,
  type QuizQuestion,
  type QuizAnswer,
  type CodingChallenge,
  type CodingChallengeSubmission,
} from '@/lib/adaptive-learning/assessment-evaluator';

/**
 * Submit assessment answers and get results
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      assessmentId,
      quizQuestions,
      quizAnswers,
      codingChallenges,
      codingSubmissions,
    } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (assessment.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already completed
    if (assessment.status === 'COMPLETED') {
      return NextResponse.json({
        error: 'Assessment already completed',
      }, { status: 400 });
    }

    // Evaluate assessment
    const result = evaluateMixedAssessment(
      quizQuestions as QuizQuestion[],
      quizAnswers as QuizAnswer[],
      codingChallenges as CodingChallenge[],
      codingSubmissions as CodingChallengeSubmission[]
    );

    // Update assessment record
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'COMPLETED',
        score: result.overallScore,
        skillLevelAssigned: result.recommendedIntensity,
        completedAt: new Date(),
        adaptivePath: {
          ...(assessment.adaptivePath as any),
          result: {
            overallScore: result.overallScore,
            conceptScores: Object.fromEntries(result.conceptScores),
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            timeSpent: result.timeSpent,
            passed: result.passed,
          },
        },
      },
    });

    // Store individual responses
    const allAnswers = [
      ...quizAnswers.map((a: QuizAnswer) => ({
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assessmentId,
        questionId: a.questionId,
        userId: user.id,
        answer: a.selectedAnswer.toString(),
        isCorrect: false, // Will be updated based on evaluation
        timeSpent: a.timeSpent,
        createdAt: new Date(),
      })),
      ...codingSubmissions.map((s: CodingChallengeSubmission) => ({
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assessmentId,
        questionId: s.challengeId,
        userId: user.id,
        answer: 'code_submitted',
        isCorrect: s.testResults.passed === s.testResults.total,
        timeSpent: s.timeSpent,
        codeSubmitted: s.code,
        testResults: s.testResults,
        createdAt: new Date(),
      })),
    ];

    // Store responses
    for (const response of allAnswers) {
      await prisma.assessmentResponse.create({
        data: response,
      });
    }

    // Update user's skill level if this was initial assessment
    const assessmentType = (assessment.adaptivePath as any)?.type;
    if (assessmentType === 'initial') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          skillLevel: result.recommendedIntensity,
        },
      });
    }

    return NextResponse.json({
      success: true,
      result: {
        overallScore: result.overallScore,
        passed: result.passed,
        recommendedIntensity: result.recommendedIntensity,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        conceptScores: Object.fromEntries(result.conceptScores),
        timeSpent: result.timeSpent,
      },
      assessmentId,
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit assessment' },
      { status: 500 }
    );
  }
}
