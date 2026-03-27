import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CONCEPT_GROUPINGS, getStrengthLabel } from '@/lib/constants';
import Link from 'next/link';
import Navbar from '../components/Navbar';

export default async function SkillsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    redirect('/sign-in');
  }

  // Get active enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: user.id,
      status: 'ACTIVE',
    },
    include: {
      Stack: true,
    },
  });

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">No Active Stack</h1>
          <p className="text-slate-600 mb-6">You need to enroll in a stack first.</p>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Get all concept progress for this user and stack
  const conceptProgress = await prisma.conceptProgress.findMany({
    where: {
      userId: user.id,
      stackId: enrollment.stackId,
    },
    orderBy: {
      strength: 'desc',
    },
  });

  // Get completed tasks count
  const completedTasksCount = await prisma.taskAttempt.count({
    where: {
      userId: user.id,
      status: 'COMPLETED',
      Task: {
        stackId: enrollment.stackId,
        isDetour: false,
      },
    },
  });

  // Group concepts by theme
  const stackSlug = enrollment.Stack.slug;
  const groupings = CONCEPT_GROUPINGS[stackSlug] || {};
  
  const groupedConcepts: Record<string, Array<{ tag: string; strength: number }>> = {};
  
  // Initialize groups
  Object.keys(groupings).forEach((groupName) => {
    groupedConcepts[groupName] = [];
  });

  // Assign concepts to groups
  conceptProgress.forEach((cp) => {
    for (const [groupName, tags] of Object.entries(groupings)) {
      if (tags.includes(cp.conceptTag)) {
        groupedConcepts[groupName].push({
          tag: cp.conceptTag,
          strength: cp.strength,
        });
        break;
      }
    }
  });

  return (
    <>
      <Navbar streakDays={user.streakDays} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 pt-24">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/learn/${enrollment.Stack.slug}`}
            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to learning</span>
          </Link>
          
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Your Skill Map</h1>
          <div className="flex items-center space-x-3 text-slate-600">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-semibold text-slate-800">{enrollment.Stack.name}</span>
            </div>
            <span className="text-slate-400">•</span>
            <span>{completedTasksCount} tasks completed</span>
          </div>
        </div>

        {/* Concept Groups */}
        {conceptProgress.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No skills tracked yet</h2>
            <p className="text-slate-500">Complete tasks to start building your skill map</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedConcepts).map(([groupName, concepts]) => {
              if (concepts.length === 0) return null;

              return (
                <div key={groupName} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">{groupName}</h2>
                  <div className="space-y-3">
                    {concepts.map((concept) => {
                      const strengthLabel = getStrengthLabel(concept.strength);
                      const strengthPercent = Math.round(concept.strength * 100);
                      
                      return (
                        <div key={concept.tag} className="group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-slate-700 group-hover:text-purple-600 transition-colors">
                              {concept.tag}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-500">{strengthPercent}%</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                strengthLabel === 'building' ? 'bg-slate-100 text-slate-600' :
                                strengthLabel === 'developing' ? 'bg-blue-100 text-blue-700' :
                                strengthLabel === 'solid' ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {strengthLabel}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                strengthLabel === 'building' ? 'bg-slate-400' :
                                strengthLabel === 'developing' ? 'bg-blue-500' :
                                strengthLabel === 'solid' ? 'bg-green-500' :
                                'bg-purple-600'
                              }`}
                              style={{ width: `${strengthPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
