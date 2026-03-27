import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enrollmentId } = await req.json();

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify enrollment belongs to user
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        userId: user.id,
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Clear checkpointPending
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { checkpointPending: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Checkpoint cleared',
    });
  } catch (error) {
    console.error('Error advancing checkpoint:', error);
    return NextResponse.json(
      { error: 'Failed to advance checkpoint' },
      { status: 500 }
    );
  }
}
