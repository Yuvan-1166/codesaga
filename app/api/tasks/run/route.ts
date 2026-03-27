import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { executeServerCode } from '@/lib/execution/server-executor';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, taskAttemptId } = await req.json();

    if (!code || !taskAttemptId) {
      return NextResponse.json({ error: 'Code and task attempt ID are required' }, { status: 400 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify task attempt ownership
    const taskAttempt = await prisma.taskAttempt.findUnique({
      where: { id: taskAttemptId },
      include: {
        Task: true,
      },
    });

    if (!taskAttempt || taskAttempt.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Execute code based on execution mode
    let result;
    if (taskAttempt.Task.executionMode === 'server') {
      result = await executeServerCode(code, 5000);
    } else {
      // For browser mode, return success and let client handle execution
      return NextResponse.json({
        mode: 'browser',
        message: 'Execute in browser',
      });
    }

    return NextResponse.json({
      mode: 'server',
      success: result.success,
      output: result.output,
      error: result.error,
      consoleOutput: result.consoleOutput,
      executionTime: result.executionTime,
    });
  } catch (error) {
    console.error('Error running code:', error);
    return NextResponse.json(
      { error: 'Failed to execute code' },
      { status: 500 }
    );
  }
}
