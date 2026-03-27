import { currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LearningInterface from './LearningInterface';

type PageProps = {
  params: Promise<{
    stackSlug: string;
  }>;
};

export default async function LearnPage({ params }: PageProps) {
  const { stackSlug } = await params;
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
  });

  if (!dbUser) {
    redirect('/dashboard');
  }

  // Get the stack
  const stack = await prisma.stack.findUnique({
    where: { slug: stackSlug },
  });

  if (!stack) {
    notFound();
  }

  // Verify user has an active enrollment for this stack
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: dbUser.id,
      stackId: stack.id,
      status: 'ACTIVE',
    },
  });

  if (!enrollment) {
    // User doesn't have enrollment for this stack, redirect to dashboard
    redirect('/dashboard');
  }

  return (
    <LearningInterface
      enrollmentId={enrollment.id}
      stackName={stack.name}
      stackSlug={stack.slug}
      streakDays={dbUser.streakDays}
    />
  );
}
