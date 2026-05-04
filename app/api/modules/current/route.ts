import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCurrentModuleAttempt, startModuleAttempt } from '@/lib/adaptive-learning/progression-tracker';
import { getEnrollmentContext } from '@/lib/adaptive-learning/enrollment-manager';
import { recommendNextModules } from '@/lib/adaptive-learning/module-recommender';
import { shouldOfferRemedial } from '@/lib/adaptive-learning/progression-tracker';

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

    // Get enrollment context
    const { enrollment, conceptStrengths } = await getEnrollmentContext(enrollmentId);

    // Verify ownership
    if (enrollment.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if enrollment is completed
    if (enrollment.status === 'COMPLETED') {
      return NextResponse.json({
        completed: true,
        message: 'Stack completed! 🎉',
        storyLog: enrollment.storyLog,
      });
    }

    // Get or create active session
    let session = await prisma.session.findFirst({
      where: {
        enrollmentId: enrollment.id,
        completedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!session) {
      session = await prisma.session.create({
        data: {
          enrollmentId: enrollment.id,
          startedAt: new Date(),
        },
      });
    }

    // Get current module attempt
    let moduleAttempt = await getCurrentModuleAttempt(user.id, session.id);

    // If no active attempt, recommend next module
    if (!moduleAttempt) {
      // Get available modules
      const availableModules = await prisma.module.findMany({
        where: {
          stackId: enrollment.stackId,
          isActive: true,
          id: {
            in: enrollment.availableModuleIds,
          },
        },
      });

      if (availableModules.length === 0) {
        // Check if all modules are completed
        const totalModules = await prisma.module.count({
          where: {
            stackId: enrollment.stackId,
            isActive: true,
            moduleType: 'CORE',
          },
        });

        if (enrollment.completedModuleIds.length >= totalModules) {
          // Mark enrollment as completed
          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { status: 'COMPLETED' },
          });

          return NextResponse.json({
            completed: true,
            message: 'Stack completed! 🎉',
            storyLog: enrollment.storyLog,
          });
        }

        return NextResponse.json({
          error: 'No available modules. Please contact support.',
        }, { status: 500 });
      }

      // Get recommendations
      const recommendations = recommendNextModules(
        {
          userId: user.id,
          stackId: enrollment.stackId,
          enrollmentId: enrollment.id,
          currentIntensity: enrollment.currentIntensity,
          performanceScore: enrollment.performanceScore,
          conceptStrengths,
          completedModuleIds: enrollment.completedModuleIds,
          consecutiveSuccesses: enrollment.consecutiveSuccesses,
          consecutiveStruggles: enrollment.consecutiveStruggles,
        },
        availableModules.map(m => ({
          id: m.id,
          slug: m.slug,
          title: m.title,
          moduleType: m.moduleType,
          difficultyLevel: m.difficultyLevel,
          conceptTags: m.conceptTags,
          prerequisites: m.prerequisites,
          estimatedMinutes: m.estimatedMinutes,
        })),
        5
      );

      if (recommendations.length === 0) {
        return NextResponse.json({
          error: 'No suitable modules found',
        }, { status: 500 });
      }

      // Start the top recommended module
      const topRecommendation = recommendations[0];
      const nextModule = availableModules.find(m => m.id === topRecommendation.moduleId);

      if (!nextModule) {
        return NextResponse.json({
          error: 'Module not found',
        }, { status: 404 });
      }

      // Create module attempt
      const attemptId = await startModuleAttempt(user.id, nextModule.id, session.id);

      moduleAttempt = await prisma.moduleAttempt.findUnique({
        where: { id: attemptId },
        include: {
          Module: true,
        },
      });
    }

    if (!moduleAttempt) {
      return NextResponse.json({
        error: 'Failed to create module attempt',
      }, { status: 500 });
    }

    // Get companion messages
    const companionMessages = await prisma.companionMessage.findMany({
      where: {
        moduleAttemptId: moduleAttempt.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 20,
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    const isReturning = companionMessages.length > 0;

    return NextResponse.json({
      moduleAttempt: {
        id: moduleAttempt.id,
        moduleId: moduleAttempt.moduleId,
        startedAt: moduleAttempt.startedAt,
        hintsUsed: moduleAttempt.hintsUsed,
        status: moduleAttempt.status,
        messageCount: moduleAttempt.messageCount,
        editorState: moduleAttempt.editorState,
        testResults: moduleAttempt.testResults,
        passedTests: moduleAttempt.passedTests,
        totalTests: moduleAttempt.totalTests,
        wasRemedial: moduleAttempt.wasRemedial,
        wasChallenge: moduleAttempt.wasChallenge,
      },
      module: {
        id: moduleAttempt.Module.id,
        slug: moduleAttempt.Module.slug,
        title: moduleAttempt.Module.title,
        description: moduleAttempt.Module.description,
        moduleType: moduleAttempt.Module.moduleType,
        difficultyLevel: moduleAttempt.Module.difficultyLevel,
        conceptTags: moduleAttempt.Module.conceptTags,
        estimatedMinutes: moduleAttempt.Module.estimatedMinutes,
        language: moduleAttempt.Module.language,
        executionMode: moduleAttempt.Module.executionMode,
        starterCode: moduleAttempt.Module.starterCode,
        testCases: moduleAttempt.Module.testCases,
        storyContext: moduleAttempt.Module.storyContext,
      },
      stack: {
        name: enrollment.Stack.name,
        slug: enrollment.Stack.slug,
      },
      enrollment: {
        currentIntensity: enrollment.currentIntensity,
        performanceScore: enrollment.performanceScore,
        consecutiveSuccesses: enrollment.consecutiveSuccesses,
        consecutiveStruggles: enrollment.consecutiveStruggles,
        completedCount: enrollment.completedModuleIds.length,
      },
      storyLog: (enrollment.storyLog as string[])?.slice(-4) || [],
      companionMessages,
      isReturning,
    });
  } catch (error) {
    console.error('Error fetching current module:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current module' },
      { status: 500 }
    );
  }
}
