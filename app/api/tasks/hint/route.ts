import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskAttemptId } = await req.json();

    if (!taskAttemptId) {
      return NextResponse.json({ error: 'Task attempt ID is required' }, { status: 400 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the task attempt
    const taskAttempt = await prisma.taskAttempt.findUnique({
      where: { id: taskAttemptId },
    });

    if (!taskAttempt) {
      return NextResponse.json({ error: 'Task attempt not found' }, { status: 404 });
    }

    // Verify ownership
    if (taskAttempt.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Increment hints used
    const updated = await prisma.taskAttempt.update({
      where: { id: taskAttemptId },
      data: {
        hintsUsed: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      hintsUsed: updated.hintsUsed,
    });
  } catch (error) {
    console.error('Error updating hints:', error);
    return NextResponse.json(
      { error: 'Failed to update hints' },
      { status: 500 }
    );
  }
}
