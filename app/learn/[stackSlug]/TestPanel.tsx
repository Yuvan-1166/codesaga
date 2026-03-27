'use client';

import { useState } from 'react';

type TestResult = {
  testId: string;
  name: string;
  passed: boolean;
  actualOutput?: any;
  expectedOutput?: any;
  error?: string;
  executionTime: number;
  hidden: boolean;
};

type TestPanelProps = {
  results: TestResult[];
  passed: number;
  total: number;
  isRunning: boolean;
  onRunTests: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

export default function TestPanel({
  results,
  passed,
  total,
  isRunning,
  onRunTests,
  onSubmit,
  canSubmit,
}: TestPanelProps) {
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const allPassed = passed === total && total > 0;
  const hasResults = results.length > 0;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-t border-[#3a3a3a]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#3a3a3a]">
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-white font-semibold">Tests</h3>
          {hasResults && (
            <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${
              allPassed
                ? 'bg-green-500/20 text-green-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {passed}/{total} passing
            </span>
          )}
        </div>
        <button
          onClick={onRunTests}
          disabled={isRunning}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed cursor-pointer text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Run Tests</span>
            </>
          )}
        </button>
      </div>

      {/* Test Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {!hasResults ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-slate-400 mb-2">No tests run yet</p>
            <p className="text-slate-500 text-sm">Click "Run Tests" to validate your code</p>
          </div>
        ) : (
          <>
            {results.map((result) => (
              <div
                key={result.testId}
                className={`border rounded-lg p-3 transition-all ${
                  result.passed
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      result.passed ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {result.passed ? (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {result.name}
                      </p>
                      {result.error && (
                        <p className="text-red-300 text-sm mt-1 font-mono">{result.error}</p>
                      )}
                      {!result.passed && !result.error && (
                        <div className="mt-2 space-y-1">
                          <div className="text-sm">
                            <span className="text-slate-400">Expected:</span>
                            <span className="text-slate-300 ml-2 font-mono">
                              {JSON.stringify(result.expectedOutput)}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-slate-400">Got:</span>
                            <span className="text-red-300 ml-2 font-mono">
                              {JSON.stringify(result.actualOutput)}
                            </span>
                          </div>
                        </div>
                      )}
                      <p className="text-slate-500 text-xs mt-1">{result.executionTime.toFixed(0)}ms</p>
                    </div>
                  </div>
                  {!result.passed && (
                    <button
                      onClick={() => setShowDetails(showDetails === result.testId ? null : result.testId)}
                      className="text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Submit Button */}
      {hasResults && (
        <div className="p-4 border-t border-[#3a3a3a] bg-[#1a1a1a]">
          {allPassed ? (
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed cursor-pointer text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Submit Solution</span>
            </button>
          ) : (
            <div className="text-center">
              <p className="text-amber-400 text-sm mb-2">Fix failing tests to submit</p>
              <button
                disabled
                className="w-full px-6 py-3 bg-slate-700 cursor-not-allowed text-slate-400 rounded-lg font-medium"
              >
                Submit Solution
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
