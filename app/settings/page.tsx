import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Navbar from '../components/Navbar';
import { UserProfile } from '@clerk/nextjs';

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!dbUser) {
    redirect('/dashboard');
  }

  // Get user stats
  const totalTasks = await prisma.taskAttempt.count({
    where: {
      userId: dbUser.id,
      status: 'COMPLETED',
    },
  });

  const totalEnrollments = await prisma.enrollment.count({
    where: {
      userId: dbUser.id,
    },
  });

  const completedStacks = await prisma.enrollment.count({
    where: {
      userId: dbUser.id,
      status: 'COMPLETED',
    },
  });

  return (
    <>
      <Navbar streakDays={dbUser.streakDays} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 pt-24 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Settings</h1>
            <p className="text-slate-600">Manage your account and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stats Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Account Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Tasks Completed</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{totalTasks}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Stacks Started</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{totalEnrollments}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Stacks Completed</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{completedStacks}</span>
                  </div>

                  {dbUser.streakDays >= 2 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🔥</span>
                        </div>
                        <span className="text-slate-700">Current Streak</span>
                      </div>
                      <span className="text-2xl font-bold text-slate-900">{dbUser.streakDays}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Account Info</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="text-slate-900 font-medium">
                      {user?.firstName} {user?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="text-slate-900 font-medium">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Member Since</p>
                    <p className="text-slate-900 font-medium">
                      {dbUser.createdAt ? new Date(dbUser.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <a
                    href="/dashboard"
                    className="flex items-center space-x-3 px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Dashboard</span>
                  </a>
                  <a
                    href="/skills"
                    className="flex items-center space-x-3 px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>My Skills</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Main Content - Clerk User Profile */}
            <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <UserProfile
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'shadow-none border-0',
                      navbar: 'hidden',
                      pageScrollBox: 'p-6',
                      page: 'p-0',
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
