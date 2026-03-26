import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateStoryLogEntry } from '@/lib/detour-system';

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

    // Get the task attempt with task details
    const taskAttempt = await prisma.taskAttempt.findUnique({
      where: { id: taskAttemptId },
      include: {
        task: {
          include: {
            stack: true,
          },
        },
        session: {
          include: {
            enrollment: true,
          },
        },
      },
    });

    if (!taskAttempt) {
      return NextResponse.json({ error: 'Task attempt not found' }, { status: 404 });
    }

    // Verify ownership
    if (taskAttempt.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Mark task attempt as completed
    await prisma.taskAttempt.update({
      where: { id: taskAttemptId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Update concept progress for each concept tag
    const conceptTags = taskAttempt.task.conceptTags;
    const stackId = taskAttempt.task.stackId;

    for (const conceptTag of conceptTags) {
      // Calculate strength increase based on hints used
      // 0 hints = +0.3, 1 hint = +0.2, 2 hints = +0.15, 3+ hints = +0.1
      let strengthIncrease = 0.1;
      if (taskAttempt.hintsUsed === 0) strengthIncrease = 0.3;
      else if (taskAttempt.hintsUsed === 1) strengthIncrease = 0.2;
      else if (taskAttempt.hintsUsed === 2) strengthIncrease = 0.15;

      // Upsert concept progress
      const existing = await prisma.conceptProgress.findUnique({
        where: {
          userId_stackId_conceptTag: {
            userId: user.id,
            stackId: stackId,
            conceptTag: conceptTag,
          },
        },
      });

      const newStrength = Math.min(1.0, (existing?.strength || 0) + strengthIncrease);

      await prisma.conceptProgress.upsert({
        where: {
          userId_stackId_conceptTag: {
            userId: user.id,
            stackId: stackId,
            conceptTag: conceptTag,
          },
        },
        update: {
          strength: newStrength,
        },
        create: {
          userId: user.id,
          stackId: stackId,
          conceptTag: conceptTag,
          strength: newStrength,
        },
      });
    }

    // Generate story log entry
    const storyEntry = await generateStoryLogEntry({
      conceptTags: taskAttempt.task.conceptTags,
      difficultyLevel: taskAttempt.task.difficultyLevel,
      stackName: taskAttempt.task.stack.name,
    });

    // Update enrollment story log
    const enrollment = taskAttempt.session.enrollment;
    const currentLog = (enrollment.storyLog as string[]) || [];
    const updatedLog = [...currentLog, storyEntry];

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        storyLog: updatedLog,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Task completed successfully',
      storyEntry,
    });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    );
  }
}
