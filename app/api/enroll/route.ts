import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stackId } = await req.json();

    if (!stackId) {
      return NextResponse.json({ error: 'Stack ID is required' }, { status: 400 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has an active enrollment
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'You already have an active enrollment' },
        { status: 400 }
      );
    }

    // Get the stack
    const stack = await prisma.stack.findUnique({
      where: { id: stackId },
    });

    if (!stack) {
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 });
    }

    // Create enrollment and first session in a transaction
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        stackId: stack.id,
        status: 'ACTIVE',
        sessions: {
          create: {
            startedAt: new Date(),
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      stackSlug: stack.slug,
      enrollmentId: enrollment.id,
    });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    );
  }
}
