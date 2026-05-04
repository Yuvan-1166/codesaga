import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { updateModuleAttemptProgress } from '@/lib/adaptive-learning/progression-tracker';

/**
 * Update module attempt progress (autosave)
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      moduleAttemptId,
      editorState,
      hintsUsed,
      messageCount,
      testResults,
      passedTests,
      totalTests,
    } = body;

    if (!moduleAttemptId) {
      return NextResponse.json(
        { error: 'Module attempt ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify ownership
    const attempt = await prisma.moduleAttempt.findUnique({
      where: { id: moduleAttemptId },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: 'Module attempt not found' },
        { status: 404 }
      );
    }

    if (attempt.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update progress
    await updateModuleAttemptProgress(
      moduleAttemptId,
      editorState,
      hintsUsed,
      messageCount,
      testResults,
      passedTests,
      totalTests
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating module progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
