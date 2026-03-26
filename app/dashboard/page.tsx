import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import StackPicker from './StackPicker';

export default async function DashboardPage() {
  // Use auth() first to check authentication
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // Get user details
  let user;
  try {
    user = await currentUser();
  } catch (error) {
    console.error('Clerk API error:', error);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Authentication error. Please check your Clerk configuration.</p>
          <p className="text-slate-600 text-sm">Check that CLERK_SECRET_KEY is set correctly.</p>
        </div>
      </div>
    );
  }

  // Get user from database
  let dbUser;
  try {
    dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    console.log('Database user lookup:', dbUser ? 'Found' : 'Not found', 'for clerkId:', userId);
  } catch (error) {
    console.error('Database error:', error);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Database connection error</p>
          <p className="text-slate-600 text-sm">Please check your database configuration.</p>
        </div>
      </div>
    );
  }

  if (!dbUser) {
    // User not synced yet - create them now
    console.log('User not found in database, creating...');
    try {
      dbUser = await prisma.user.create({
        data: {
          clerkId: userId,
        },
      });
      console.log('User created successfully:', dbUser.id);
    } catch (error) {
      console.error('Error creating user:', error);
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600 mb-4">Setting up your account...</p>
            <p className="text-slate-500 text-sm">If this persists, please refresh the page.</p>
          </div>
        </div>
      );
    }
  }

  // Check for active enrollment
  const activeEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId: dbUser.id,
      status: 'ACTIVE',
    },
    include: {
      stack: true,
    },
  });

  // If user has active enrollment, redirect to learning page
  if (activeEnrollment) {
    redirect(`/learn/${activeEnrollment.stack.slug}`);
  }

  // Get all available stacks
  const stacks = await prisma.stack.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Welcome, {user?.firstName || 'Developer'}
          </h1>
          <p className="text-lg text-slate-600">
            Choose a tech stack to begin your learning journey
          </p>
        </div>

        <StackPicker stacks={stacks} />
      </div>
    </div>
  );
}
