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
        Task: {
          include: {
            Stack: true,
          },
        },
        Session: {
          include: {
            Enrollment: true,
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
    const conceptTags = taskAttempt.Task.conceptTags;
    const stackId = taskAttempt.Task.stackId;

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

    // Check if milestone is complete and set checkpointPending
    let checkpointPending = false;
    if (!taskAttempt.Task.isDetour) {
      const currentMilestoneGroup = taskAttempt.Task.milestoneGroup;
      
      // Get all non-detour tasks in this milestone group
      const milestoneGroupTasks = await prisma.task.findMany({
        where: {
          stackId: stackId,
          milestoneGroup: currentMilestoneGroup,
          isDetour: false,
        },
        select: { id: true },
      });

      const milestoneTaskIds = milestoneGroupTasks.map(t => t.id);

      // Check if all tasks in this milestone group are completed
      const completedMilestoneTasks = await prisma.taskAttempt.findMany({
        where: {
          userId: user.id,
          taskId: { in: milestoneTaskIds },
          status: 'COMPLETED',
        },
        select: { taskId: true },
      });

      const completedTaskIds = new Set(completedMilestoneTasks.map(t => t.taskId));
      const allMilestoneTasksComplete = milestoneTaskIds.every(id => completedTaskIds.has(id));

      if (allMilestoneTasksComplete) {
        // Set checkpointPending on the enrollment
        await prisma.enrollment.update({
          where: { id: taskAttempt.Session.Enrollment.id },
          data: { checkpointPending: true },
        });
        checkpointPending = true;
        console.log('Milestone complete - checkpoint pending');
      }
    }

    // Generate story log entry
    let storyEntry = 'Completed a task.';
    try {
      console.log('Generating story entry for task:', {
        conceptTags: taskAttempt.Task.conceptTags,
        difficultyLevel: taskAttempt.Task.difficultyLevel,
        stackName: taskAttempt.Task.Stack.name,
      });
      
      storyEntry = await generateStoryLogEntry({
        conceptTags: taskAttempt.Task.conceptTags,
        difficultyLevel: taskAttempt.Task.difficultyLevel,
        stackName: taskAttempt.Task.Stack.name,
      });
      
      console.log('Story entry generated successfully:', storyEntry);
    } catch (error) {
      console.error('Error generating story entry:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      // Continue with default entry
    }

    // Update enrollment story log
    try {
      const enrollment = taskAttempt.Session.Enrollment;
      
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

    // Update streak tracking
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Reset to start of day in UTC

      const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
      if (lastActive) {
        lastActive.setUTCHours(0, 0, 0, 0);
      }

      let newStreakDays = user.streakDays || 0;

      if (!lastActive || lastActive < today) {
        // Calculate days difference
        const daysDiff = lastActive 
          ? Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysDiff === 1) {
          // Yesterday - increment streak
          newStreakDays += 1;
        } else if (daysDiff > 1 || !lastActive) {
          // More than 1 day ago or never active - reset streak
          newStreakDays = 1;
        }
        // If daysDiff === 0, it's today - don't change streak

        await prisma.user.update({
          where: { id: user.id },
          data: {
            streakDays: newStreakDays,
            lastActiveDate: today,
          },
        });

        console.log('Streak updated:', { newStreakDays, lastActive, today });
      }
    } catch (error) {
      console.error('Error updating streak:', error);
      // Don't fail the request if streak update fails
    }

    // Check for stack completion
    let stackCompleted = false;
    if (!taskAttempt.Task.isDetour && !checkpointPending) {
      try {
        // Get all non-detour tasks in this stack
        const allStackTasks = await prisma.task.findMany({
          where: {
            stackId: taskAttempt.Task.stackId,
            isDetour: false,
          },
          select: { id: true },
        });

        const allTaskIds = allStackTasks.map(t => t.id);

        // Check if all are completed
        const completedStackTasks = await prisma.taskAttempt.findMany({
          where: {
            userId: user.id,
            taskId: { in: allTaskIds },
            status: 'COMPLETED',
          },
          select: { taskId: true },
        });

        const completedIds = new Set(completedStackTasks.map(t => t.taskId));
        const allTasksComplete = allTaskIds.every(id => completedIds.has(id));

        if (allTasksComplete) {
          // Mark enrollment as completed
          await prisma.enrollment.update({
            where: { id: taskAttempt.Session.Enrollment.id },
            data: { status: 'COMPLETED' },
          });
          stackCompleted = true;
          console.log('Stack completed!');
        }
      } catch (error) {
        console.error('Error checking stack completion:', error);
        // Don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Task completed successfully',
      storyEntry,
      checkpointPending,
      stackCompleted,
    });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete task' },
      { status: 500 }
    );
  }
}
