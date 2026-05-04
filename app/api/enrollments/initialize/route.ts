import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { initializeEnrollment } from '@/lib/adaptive-learning/enrollment-manager';

/**
 * Initialize a new enrollment with adaptive learning
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { stackId, initialAssessmentScore } = body;

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

    // Check if enrollment already exists
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_stackId: {
          userId: user.id,
          stackId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json({
        enrollmentId: existingEnrollment.id,
        initialIntensity: existingEnrollment.currentIntensity,
        alreadyExists: true,
      });
    }

    // Verify stack exists
    const stack = await prisma.stack.findUnique({
      where: { id: stackId },
    });

    if (!stack) {
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 });
    }

    // Initialize enrollment
    const result = await initializeEnrollment(
      user.id,
      stackId,
      initialAssessmentScore
    );

    return NextResponse.json({
      enrollmentId: result.enrollmentId,
      initialIntensity: result.initialIntensity,
      alreadyExists: false,
      stack: {
        id: stack.id,
        name: stack.name,
        slug: stack.slug,
        description: stack.description,
      },
    });
  } catch (error) {
    console.error('Error initializing enrollment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize enrollment' },
      { status: 500 }
    );
  }
}
