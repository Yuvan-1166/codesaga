import { currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            {stack.name}
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            {stack.description}
          </p>

          <div className="border-t border-slate-200 pt-8">
            <p className="text-slate-500 italic">
              The learning experience will be built in the next iteration...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
