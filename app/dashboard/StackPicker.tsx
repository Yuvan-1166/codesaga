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
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stacks.map((stack) => (
          <button
            key={stack.id}
            onClick={() => handleEnroll(stack.id)}
            disabled={enrolling !== null}
            className="group relative bg-white p-6 rounded-xl shadow-sm border-2 border-slate-200 hover:border-purple-500 hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-purple-600 transition-colors">
              {stack.name}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {stack.description}
            </p>

            {enrolling === stack.id && (
              <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-purple-600 font-medium">Starting...</span>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {stacks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600">No stacks available yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
