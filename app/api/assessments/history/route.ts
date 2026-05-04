import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Get user's assessment history
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stackId = searchParams.get('stackId');

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get assessments
    const assessments = await prisma.assessment.findMany({
      where: {
        userId: user.id,
        ...(stackId && { stackId }),
      },
      include: {
        Stack: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({
      assessments: assessments.map(a => ({
        id: a.id,
        stackId: a.stackId,
        stackName: a.Stack.name,
        stackSlug: a.Stack.slug,
        status: a.status,
        score: a.score,
        skillLevelAssigned: a.skillLevelAssigned,
        createdAt: a.createdAt,
        completedAt: a.completedAt,
        adaptivePath: a.adaptivePath,
      })),
    });
  } catch (error) {
    console.error('Error fetching assessment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment history' },
      { status: 500 }
    );
  }
}
