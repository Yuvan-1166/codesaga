import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center space-y-8 px-4">
        <h1 className="text-6xl font-bold text-white mb-4">
          CodeSaga
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Learn tech stacks by building real applications, one story-driven task at a time.
        </p>
        
        <div className="pt-4">
          {!userId ? (
            <Link
              href="/sign-in"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          ) : (
            <Link 
              href="/dashboard"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
