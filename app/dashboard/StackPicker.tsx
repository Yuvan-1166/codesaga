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
};

export default function StackPicker({ stacks }: StackPickerProps) {
  const router = useRouter();
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async (stackId: string) => {
    setEnrolling(stackId);
    setError(null);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stacks.map((stack, index) => (
          <button
            key={stack.id}
            onClick={() => handleEnroll(stack.id)}
            disabled={enrolling !== null}
            className="card card-hover group relative p-8 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Icon */}
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-purple-600 transition-colors">
              {stack.name}
            </h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              {stack.description}
            </p>

            {/* Arrow indicator */}
            <div className="flex items-center text-purple-600 font-medium group-hover:translate-x-2 transition-transform">
              <span className="text-sm">Start Learning</span>
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
        ))}
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
