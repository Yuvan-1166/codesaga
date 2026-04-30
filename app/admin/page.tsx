import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TaskExecutionManager from './TaskExecutionManager';

export default async function AdminPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get all stacks with their tasks
  const stacks = await prisma.stack.findMany({
    include: {
      Task: {
        orderBy: {
          internalOrder: 'asc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Task Execution Manager
          </h1>
          <p className="text-slate-600">
            Configure how tasks are executed: in the browser or on the server
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Execution Modes
              </h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-purple-600">🌐 Browser:</span>
                  <span>Code runs in the user's browser. Best for simple JavaScript tasks.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">🚀 Server:</span>
                  <span>Code runs on the execution server in Docker containers. Required for Node.js, Python, file system access, etc.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <TaskExecutionManager stacks={stacks} />
      </div>
    </div>
  );
}
