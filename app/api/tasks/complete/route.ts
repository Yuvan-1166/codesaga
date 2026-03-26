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
      console.error('Task attempt not found:', taskAttemptId);
      return NextResponse.json({ error: 'Task attempt not found' }, { status: 404 });
    }

    // Verify ownership
    if (taskAttempt.userId !== user.id) {
      console.error('Unauthorized access attempt:', { userId: user.id, attemptUserId: taskAttempt.userId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('Completing task attempt:', taskAttemptId);

    // Mark task attempt as completed
    await prisma.taskAttempt.update({
      where: { id: taskAttemptId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    console.log('Task attempt marked as completed');

    // Update concept progress for each concept tag
    const conceptTags = taskAttempt.task.conceptTags;
    const stackId = taskAttempt.task.stackId;

    for (const conceptTag of conceptTags) {
      // Calculate strength increase based on hints used
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

    console.log('Concept progress updated');

    // Generate story log entry
    let storyEntry = 'Completed a task.';
    try {
      console.log('Generating story entry for task:', {
        conceptTags: taskAttempt.task.conceptTags,
        difficultyLevel: taskAttempt.task.difficultyLevel,
        stackName: taskAttempt.task.stack.name,
      });
      
      storyEntry = await generateStoryLogEntry({
        conceptTags: taskAttempt.task.conceptTags,
        difficultyLevel: taskAttempt.task.difficultyLevel,
        stackName: taskAttempt.task.stack.name,
      });
      
      console.log('Story entry generated successfully:', storyEntry);
    } catch (error) {
      console.error('Error generating story entry:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      // Continue with default entry
    }

    // Update enrollment story log
    try {
      const enrollment = taskAttempt.session.enrollment;
      
      // Safely handle storyLog - it might be null, undefined, or a JSON string
      let currentLog: string[] = [];
      if (enrollment.storyLog) {
        if (Array.isArray(enrollment.storyLog)) {
          currentLog = enrollment.storyLog as string[];
        } else if (typeof enrollment.storyLog === 'string') {
          try {
            currentLog = JSON.parse(enrollment.storyLog);
          } catch {
            currentLog = [];
          }
        }
      }
      
      const updatedLog = [...currentLog, storyEntry];

      console.log('Updating story log:', {
        enrollmentId: enrollment.id,
        currentLogLength: currentLog.length,
        newEntry: storyEntry,
      });

      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          storyLog: updatedLog,
        },
      });

      console.log('Story log updated successfully');
    } catch (error) {
      console.error('Error updating story log:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      // Don't fail the entire request if story log update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Task completed successfully',
      storyEntry,
    });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete task' },
      { status: 500 }
    );
  }
}
