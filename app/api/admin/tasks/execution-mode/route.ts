import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can update
    // In production, check if user has admin role

    const { taskId, executionMode } = await req.json();

    if (!taskId || !executionMode) {
      return NextResponse.json(
        { error: 'Task ID and execution mode are required' },
        { status: 400 }
      );
    }

    if (!['browser', 'server'].includes(executionMode)) {
      return NextResponse.json(
        { error: 'Invalid execution mode. Must be "browser" or "server"' },
        { status: 400 }
      );
    }

    // Update task execution mode
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { executionMode },
    });

    return NextResponse.json({
      success: true,
      task: {
        id: updatedTask.id,
        executionMode: updatedTask.executionMode,
      },
    });
  } catch (error) {
    console.error('Error updating execution mode:', error);
    return NextResponse.json(
      { error: 'Failed to update execution mode' },
      { status: 500 }
    );
  }
}
