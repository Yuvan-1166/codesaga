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

    // Get test cases from task
    const testCases = taskAttempt.Task.testCases as TestCase[] | null;

    if (!testCases || testCases.length === 0) {
      return NextResponse.json({
        message: 'No test cases defined for this task',
        results: [],
        passed: 0,
        total: 0,
      });
    }

    // Run tests based on execution mode
    let testResults;
    if (taskAttempt.Task.executionMode === 'server') {
      testResults = await runServerTests(code, testCases);
    } else {
      // For browser mode, return test cases and let client handle execution
      return NextResponse.json({
        mode: 'browser',
        testCases: testCases.filter(tc => !tc.hidden), // Don't send hidden tests to client
        message: 'Execute tests in browser',
      });
    }

    // Update task attempt with test results
    await prisma.taskAttempt.update({
      where: { id: taskAttemptId },
      data: {
        testResults: testResults.results,
        passedTests: testResults.passed,
        totalTests: testResults.total,
      },
    });

    // Filter hidden test results (only show if all tests passed)
    const visibleResults = testResults.passed === testResults.total
      ? testResults.results
      : testResults.results.filter(r => !r.hidden);

    return NextResponse.json({
      mode: 'server',
      results: visibleResults,
      passed: testResults.passed,
      total: testResults.total,
      allPassed: testResults.passed === testResults.total,
    });
  } catch (error) {
    console.error('Error running tests:', error);
    return NextResponse.json(
      { error: 'Failed to run tests' },
      { status: 500 }
    );
  }
}
