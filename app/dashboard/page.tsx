import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import StackPicker from './StackPicker';
import Navbar from '../components/Navbar';

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

  // Get active enrollment (don't redirect anymore)
  const activeEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId: dbUser.id,
      status: 'ACTIVE',
    },
    include: {
      Stack: true,
    },
  });

  // Get all enrollments (including completed)
  const allEnrollments = await prisma.enrollment.findMany({
    where: {
      userId: dbUser.id,
    },
    include: {
      Stack: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Get total tasks completed
  const totalTasksCompleted = await prisma.taskAttempt.count({
    where: {
      userId: dbUser.id,
      status: 'COMPLETED',
    },
  });

  // Get tasks completed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tasksCompletedToday = await prisma.taskAttempt.count({
    where: {
      userId: dbUser.id,
      status: 'COMPLETED',
      completedAt: {
        gte: today,
      },
    },
  });

  // Get recent completed tasks (last 5)
  const recentTasks = await prisma.taskAttempt.findMany({
    where: {
      userId: dbUser.id,
      status: 'COMPLETED',
    },
    include: {
      Task: {
        include: {
          Stack: true,
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
    take: 5,
  });

  // Get concept progress count
  const conceptsCount = await prisma.conceptProgress.count({
    where: {
      userId: dbUser.id,
      strength: {
        gte: 0.5, // Only count concepts with decent strength
      },
    },
  });

  // Get active enrollment progress if exists
  let activeProgress = null;
  if (activeEnrollment) {
    const totalTasks = await prisma.task.count({
      where: {
        stackId: activeEnrollment.stackId,
        isDetour: false,
      },
    });

    const completedTasks = await prisma.taskAttempt.count({
      where: {
        userId: dbUser.id,
        status: 'COMPLETED',
        Task: {
          stackId: activeEnrollment.stackId,
          isDetour: false,
        },
      },
    });

    activeProgress = {
      completed: completedTasks,
      total: totalTasks,
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  // Get all available stacks
  const stacks = await prisma.stack.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <Navbar streakDays={dbUser.streakDays} showDashboardLink={false} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 pt-24 p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.firstName || 'Developer'}
          </h1>
          <div className="flex items-center space-x-4 text-slate-600">
            {dbUser.streakDays >= 2 && (
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🔥</span>
                <span className="font-semibold">{dbUser.streakDays}-day streak</span>
              </div>
            )}
            <span className="text-slate-400">•</span>
            <span>{totalTasksCompleted} tasks completed</span>
            {conceptsCount > 0 && (
              <>
                <span className="text-slate-400">•</span>
                <span>{conceptsCount} concepts learned</span>
              </>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Active Learning Card */}
          {activeEnrollment && activeProgress ? (
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-slide-up">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Continue Learning</h2>
                  <p className="text-slate-600">{activeEnrollment.Stack.name}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {activeProgress.completed} of {activeProgress.total} tasks completed
                  </span>
                  <span className="text-sm font-bold text-purple-600">{activeProgress.percentage}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${activeProgress.percentage}%` }}
                  />
                </div>
              </div>

              {/* Story Log Preview */}
              {activeEnrollment.storyLog && (activeEnrollment.storyLog as string[]).length > 0 && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 italic">
                    "{(activeEnrollment.storyLog as string[])[(activeEnrollment.storyLog as string[]).length - 1]}"
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <a
                  href={`/learn/${activeEnrollment.Stack.slug}`}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-center cursor-pointer"
                >
                  Continue Learning →
                </a>
                <a
                  href="/skills"
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium cursor-pointer"
                >
                  View Skills
                </a>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-slide-up">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Start Your Learning Journey</h2>
                <p className="text-slate-600 mb-6">Choose a stack below to begin building real projects</p>
              </div>
            </div>
          )}

          {/* Quick Stats Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Today&apos;s Progress</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Tasks Today</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">{tasksCompletedToday}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Total Tasks</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">{totalTasksCompleted}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Concepts</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">{conceptsCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {recentTasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-slate-700 font-medium">
                        Completed task in {task.Task.Stack.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {task.Task.conceptTags.slice(0, 3).join(', ')}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500">
                    {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Stacks Section */}
        <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {activeEnrollment ? 'Browse Other Stacks' : 'Choose Your Stack'}
            </h2>
            {allEnrollments.length > 0 && (
              <span className="text-sm text-slate-600">
                {allEnrollments.filter(e => e.status === 'COMPLETED').length} completed
              </span>
            )}
          </div>
          <StackPicker 
            stacks={stacks} 
            activeEnrollmentId={activeEnrollment?.id} 
            completedStackIds={allEnrollments.filter(e => e.status === 'COMPLETED').map(e => e.stackId)} 
          />
        </div>
        </div>
      </div>
    </>
  );
}
