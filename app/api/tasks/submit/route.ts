import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { runServerTests } from '@/lib/execution/server-executor';
import type { TestCase } from '@/lib/execution/browser-executor';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, taskAttemptId, testResults: clientTestResults } = await req.json();

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

    // Get task attempt with task details
    const taskAttempt = await prisma.taskAttempt.findUnique({
      where: { id: taskAttemptId },
      include: {
        Task: true,
      },
    });

    if (!taskAttempt || taskAttempt.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get test cases
    const testCases = taskAttempt.Task.testCases as TestCase[] | null;

    // If no test cases, allow submission (backward compatibility)
    if (!testCases || testCases.length === 0) {
      await prisma.taskAttempt.update({
        where: { id: taskAttemptId },
        data: {
          codeSubmitted: code,
        },
      });

      return NextResponse.json({
        validated: true,
        message: 'No tests required for this task',
        canComplete: true,
      });
    }

    // Validate tests on server (security - don't trust client)
    let testResults;
    if (taskAttempt.Task.executionMode === 'server') {
      testResults = await runServerTests(code, testCases);
    } else {
      // For browser mode, we need to re-validate on server
      // For now, trust client results but add server validation later
      if (!clientTestResults) {
        return NextResponse.json(
          { error: 'Test results required for browser mode' },
          { status: 400 }
        );
      }
      testResults = clientTestResults;
    }

    const allPassed = testResults.passed === testResults.total;

    // Update task attempt
    await prisma.taskAttempt.update({
      where: { id: taskAttemptId },
      data: {
        codeSubmitted: code,
        testResults: testResults.results,
        passedTests: testResults.passed,
        totalTests: testResults.total,
      },
    });

    if (!allPassed) {
      return NextResponse.json({
        validated: false,
        message: `${testResults.passed} of ${testResults.total} tests passed`,
        canComplete: false,
        results: testResults.results.filter((r: any) => !r.hidden),
        passed: testResults.passed,
        total: testResults.total,
      });
    }

    return NextResponse.json({
      validated: true,
      message: 'All tests passed!',
      canComplete: true,
      results: testResults.results,
      passed: testResults.passed,
      total: testResults.total,
    });
  } catch (error) {
    console.error('Error submitting code:', error);
    return NextResponse.json(
      { error: 'Failed to submit code' },
      { status: 500 }
    );
  }
}
