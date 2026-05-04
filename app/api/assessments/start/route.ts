import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { 
  generateInitialAssessment, 
  generateCheckpointAssessment,
  generateAdaptiveAssessment 
} from '@/lib/adaptive-learning/assessment-generator';
import { hasCompletedInitialAssessment } from '@/lib/adaptive-learning/assessment-evaluator';

/**
 * Start a new assessment
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { stackId, assessmentType, conceptTags, performanceLevel } = body;

    if (!stackId) {
      return NextResponse.json(
        { error: 'Stack ID is required' },
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

    // Get stack
    const stack = await prisma.stack.findUnique({
      where: { id: stackId },
    });

    if (!stack) {
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 });
    }

    // Check if initial assessment already completed
    if (assessmentType === 'initial') {
      const hasCompleted = await hasCompletedInitialAssessment(user.id, stackId);
      if (hasCompleted) {
        return NextResponse.json({
          error: 'Initial assessment already completed',
          alreadyCompleted: true,
        }, { status: 400 });
      }
    }

    // Generate assessment based on type
    let assessment;
    
    switch (assessmentType) {
      case 'initial':
        assessment = await generateInitialAssessment(stack.slug);
        break;
      
      case 'checkpoint':
        if (!conceptTags || conceptTags.length === 0) {
          return NextResponse.json({
            error: 'Concept tags required for checkpoint assessment',
          }, { status: 400 });
        }
        assessment = await generateCheckpointAssessment(stack.slug, conceptTags);
        break;
      
      case 'adaptive':
        if (!conceptTags || performanceLevel === undefined) {
          return NextResponse.json({
            error: 'Concept tags and performance level required for adaptive assessment',
          }, { status: 400 });
        }
        assessment = await generateAdaptiveAssessment(
          stack.slug,
          conceptTags,
          performanceLevel
        );
        break;
      
      default:
        return NextResponse.json({
          error: 'Invalid assessment type. Use: initial, checkpoint, or adaptive',
        }, { status: 400 });
    }

    // Create assessment record
    const assessmentRecord = await prisma.assessment.create({
      data: {
        id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        stackId,
        status: 'IN_PROGRESS',
        adaptivePath: {
          type: assessmentType,
          startedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      assessmentId: assessmentRecord.id,
      assessmentType,
      quizQuestions: assessment.quizQuestions,
      codingChallenges: assessment.codingChallenges,
      totalQuestions: assessment.quizQuestions.length + assessment.codingChallenges.length,
      stack: {
        id: stack.id,
        name: stack.name,
        slug: stack.slug,
      },
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start assessment' },
      { status: 500 }
    );
  }
}
