import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { completeModuleAttempt, shouldOfferRemedial } from '@/lib/adaptive-learning/progression-tracker';
import { generateStoryLogEntry } from '@/lib/detour-system';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { moduleAttemptId, codeSubmitted, testResults } = body;

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

    // Get module attempt
    const attempt = await prisma.moduleAttempt.findUnique({
      where: { id: moduleAttemptId },
      include: {
        Module: {
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

    if (!attempt) {
      return NextResponse.json(
        { error: 'Module attempt not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (attempt.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if tests passed (if module has tests)
    const testCases = attempt.Module.testCases;
    if (testCases && Array.isArray(testCases) && testCases.length > 0) {
      if (attempt.passedTests !== attempt.totalTests) {
        return NextResponse.json({
          error: 'All tests must pass before completing the module',
          passed: attempt.passedTests,
          total: attempt.totalTests,
        }, { status: 400 });
      }
    }

    // Complete the module attempt
    const result = await completeModuleAttempt(
      moduleAttemptId,
      codeSubmitted,
      testResults
    );

    // Generate story log entry
    let storyEntry = 'Completed a module.';
    try {
      storyEntry = await generateStoryLogEntry({
        conceptTags: attempt.Module.conceptTags,
        difficultyLevel: attempt.Module.difficultyLevel,
        stackName: attempt.Module.Stack.name,
      });
    } catch (error) {
      console.error('Error generating story entry:', error);
    }

    // Update enrollment story log
    const enrollment = attempt.Session.Enrollment;
    const currentLog = (enrollment.storyLog as string[]) || [];
    const updatedLog = [...currentLog, storyEntry];

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        storyLog: updatedLog,
      },
    });

    // Update streak tracking
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
      if (lastActive) {
        lastActive.setUTCHours(0, 0, 0, 0);
      }

      let newStreakDays = user.streakDays || 0;

      if (!lastActive || lastActive < today) {
        const daysDiff = lastActive
          ? Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysDiff === 1) {
          newStreakDays += 1;
        } else if (daysDiff > 1 || !lastActive) {
          newStreakDays = 1;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            streakDays: newStreakDays,
            lastActiveDate: today,
          },
        });
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }

    // Check if remedial module should be offered
    const remedialCheck = await shouldOfferRemedial(
      user.id,
      enrollment.id,
      result.struggledConcepts
    );

    return NextResponse.json({
      success: true,
      performanceScore: result.performanceScore,
      intensityChanged: result.intensityChanged,
      newIntensity: result.newIntensity,
      struggledConcepts: result.struggledConcepts,
      masteredConcepts: result.masteredConcepts,
      storyEntry,
      remedialOffer: remedialCheck.shouldOffer ? {
        moduleId: remedialCheck.remedialModuleId,
        reason: remedialCheck.reason,
      } : null,
    });
  } catch (error) {
    console.error('Error completing module:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete module' },
      { status: 500 }
    );
  }
}
