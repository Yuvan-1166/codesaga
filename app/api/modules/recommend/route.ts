import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getEnrollmentContext } from '@/lib/adaptive-learning/enrollment-manager';
import { recommendNextModules, findRemedialModules, findPracticeModules } from '@/lib/adaptive-learning/module-recommender';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const enrollmentId = searchParams.get('enrollmentId');
    const type = searchParams.get('type') || 'all'; // all, remedial, practice
    const limit = parseInt(searchParams.get('limit') || '5');

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

    const moduleCandidates = availableModules.map(m => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      moduleType: m.moduleType,
      difficultyLevel: m.difficultyLevel,
      conceptTags: m.conceptTags,
      prerequisites: m.prerequisites,
      estimatedMinutes: m.estimatedMinutes,
    }));

    let recommendations;

    if (type === 'remedial') {
      // Get weak concepts
      const weakConcepts = Array.from(conceptStrengths.entries())
        .filter(([_, strength]) => strength < 0.4)
        .map(([concept, _]) => concept);

      recommendations = findRemedialModules(
        weakConcepts,
        moduleCandidates,
        enrollment.completedModuleIds
      );
    } else if (type === 'practice') {
      // Get concepts that need practice (0.4 - 0.6 strength)
      const practiceConcepts = Array.from(conceptStrengths.entries())
        .filter(([_, strength]) => strength >= 0.4 && strength < 0.6)
        .map(([concept, _]) => concept);

      recommendations = findPracticeModules(
        practiceConcepts,
        moduleCandidates,
        enrollment.completedModuleIds
      );
    } else {
      // Get all recommendations
      recommendations = recommendNextModules(
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
        moduleCandidates,
        limit
      );
    }

    // Enrich recommendations with full module data
    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const module = await prisma.module.findUnique({
          where: { id: rec.moduleId },
        });

        return {
          ...rec,
          module: module ? {
            id: module.id,
            slug: module.slug,
            title: module.title,
            description: module.description,
            moduleType: module.moduleType,
            difficultyLevel: module.difficultyLevel,
            conceptTags: module.conceptTags,
            estimatedMinutes: module.estimatedMinutes,
          } : null,
        };
      })
    );

    return NextResponse.json({
      recommendations: enrichedRecommendations,
      enrollment: {
        currentIntensity: enrollment.currentIntensity,
        performanceScore: enrollment.performanceScore,
        consecutiveSuccesses: enrollment.consecutiveSuccesses,
        consecutiveStruggles: enrollment.consecutiveStruggles,
        completedCount: enrollment.completedModuleIds.length,
      },
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
