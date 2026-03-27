'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Stack = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

type StackPickerProps = {
  stacks: Stack[];
  activeEnrollmentId?: string;
  completedStackIds?: string[];
};

export default function StackPicker({ stacks, activeEnrollmentId, completedStackIds = [] }: StackPickerProps) {
  const router = useRouter();
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState<string | null>(null);

  const handleEnroll = async (stackId: string) => {
    // If user has active enrollment and trying to enroll in different stack, show warning
    if (activeEnrollmentId && !showWarning) {
      setShowWarning(stackId);
      return;
    }

    setEnrolling(stackId);
    setError(null);
    setShowWarning(null);

    try {
      const response = await fetch('/api/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stackId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enroll');
      }

      // Redirect to learning page
      router.push(`/learn/${data.stackSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll');
      setEnrolling(null);
    }
  };

  const isCompleted = (stackId: string) => completedStackIds.includes(stackId);

  return (
    <div className="animate-slide-up">
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center animate-scale-in flex items-center justify-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {showWarning && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-xl animate-scale-in">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 mb-2">You already have an active stack</h4>
              <p className="text-amber-800 text-sm mb-4">
                Starting a new stack will keep your current progress, but you can only focus on one stack at a time. You can always come back to your current stack later.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleEnroll(showWarning)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                >
                  Continue Anyway
                </button>
                <button
                  onClick={() => setShowWarning(null)}
                  className="px-4 py-2 bg-white text-amber-900 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stacks.map((stack, index) => {
          const completed = isCompleted(stack.id);
          
          return (
            <button
              key={stack.id}
              onClick={() => handleEnroll(stack.id)}
              disabled={enrolling !== null}
              className="card card-hover group relative p-8 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Completion Badge */}
              {completed && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Completed</span>
                </div>
              )}

              {/* Icon */}
              <div className={`w-14 h-14 ${completed ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-purple-500 to-purple-600'} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>

              {/* Content */}
              <h3 className={`text-2xl font-bold mb-3 transition-colors ${completed ? 'text-slate-900 group-hover:text-green-600' : 'text-slate-900 group-hover:text-purple-600'}`}>
                {stack.name}
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                {stack.description}
              </p>

              {/* Arrow indicator */}
              <div className={`flex items-center font-medium group-hover:translate-x-2 transition-transform ${completed ? 'text-green-600' : 'text-purple-600'}`}>
                <span className="text-sm">{completed ? 'Start Again' : 'Start Learning'}</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {enrolling === stack.id && (
                <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="spinner w-10 h-10" />
                    <span className="text-purple-600 font-medium">Starting your journey...</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {stacks.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-slate-600 text-lg">No stacks available yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
