import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskAttemptId, content } = await req.json();

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

    // Verify task attempt belongs to user
    const taskAttempt = await prisma.taskAttempt.findUnique({
      where: { id: taskAttemptId },
      select: { userId: true },
    });

    if (!taskAttempt || taskAttempt.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update editor state
    await prisma.taskAttempt.update({
      where: { id: taskAttemptId },
      data: { editorState: content || null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating editor state:', error);
    return NextResponse.json(
      { error: 'Failed to update editor state' },
      { status: 500 }
    );
  }
}
