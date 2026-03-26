import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const enrollmentId = searchParams.get('enrollmentId');

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
        status: 'ACTIVE',
      },
      include: {
        stack: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Get the current active session
    let session = await prisma.session.findFirst({
      where: {
        enrollmentId: enrollment.id,
        completedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // If no active session, create one
    if (!session) {
      session = await prisma.session.create({
        data: {
          enrollmentId: enrollment.id,
          startedAt: new Date(),
        },
      });
    }

    // Find current active task attempt
    let taskAttempt = await prisma.taskAttempt.findFirst({
      where: {
        userId: user.id,
        sessionId: session.id,
        status: 'IN_PROGRESS',
      },
      include: {
        task: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // If no active task attempt, find the next uncompleted task
    if (!taskAttempt) {
      // Get all completed task IDs for this user in this stack
      const completedTaskIds = await prisma.taskAttempt.findMany({
        where: {
          userId: user.id,
          task: {
            stackId: enrollment.stackId,
          },
          status: 'COMPLETED',
        },
        select: {
          taskId: true,
        },
      });

      const completedIds = completedTaskIds.map((t) => t.taskId);

      // Find the next task (lowest internalOrder not completed, excluding detours for now)
      const nextTask = await prisma.task.findFirst({
        where: {
          stackId: enrollment.stackId,
          isDetour: false,
          id: {
            notIn: completedIds,
          },
        },
        orderBy: {
          internalOrder: 'asc',
        },
      });

      if (!nextTask) {
        return NextResponse.json({
          completed: true,
          message: 'All tasks completed!',
        });
      }

      // Create a new task attempt
      taskAttempt = await prisma.taskAttempt.create({
        data: {
          taskId: nextTask.id,
          sessionId: session.id,
          userId: user.id,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
        include: {
          task: true,
        },
      });
    }

    return NextResponse.json({
      taskAttempt: {
        id: taskAttempt.id,
        taskId: taskAttempt.taskId,
        startedAt: taskAttempt.startedAt,
        hintsUsed: taskAttempt.hintsUsed,
        status: taskAttempt.status,
      },
      task: {
        id: taskAttempt.task.id,
        conceptTags: taskAttempt.task.conceptTags,
        difficultyLevel: taskAttempt.task.difficultyLevel,
      },
      stack: {
        name: enrollment.stack.name,
        slug: enrollment.stack.slug,
      },
    });
  } catch (error) {
    console.error('Error fetching current task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current task' },
      { status: 500 }
    );
  }
}
