'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import CompanionChat from './CompanionChat';
import Navbar from '../../components/Navbar';
import TestPanel from './TestPanel';
import ConsolePanel from './ConsolePanel';
import { executeBrowserCode, runBrowserTests } from '@/lib/execution/browser-executor';
import type { TestCase } from '@/lib/execution/browser-executor';

type LearningInterfaceProps = {
  enrollmentId: string;
  stackName: string;
  stackSlug: string;
  streakDays: number;
};

type TaskData = {
  taskAttempt: {
    id: string;
    taskId: string;
    startedAt: string;
    hintsUsed: number;
    status: string;
    messageCount: number;
    wasDetour: boolean;
    editorState?: string | null;
  };
  task: {
    id: string;
    conceptTags: string[];
    difficultyLevel: string;
    isDetour: boolean;
  };
  stack: {
    name: string;
    slug: string;
  };
  storyLog: string[];
  detourTriggered?: boolean;
  checkpointPending?: boolean;
  companionMessages?: Array<{
    role: string;
    content: string;
    createdAt: string;
  }>;
  isReturning?: boolean;
  stackCompleted?: boolean;
};

export default function LearningInterface({
  enrollmentId,
  stackName,
  stackSlug,
  streakDays,
}: LearningInterfaceProps) {
  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [canUseHints, setCanUseHints] = useState(false);
  const [timeOnTask, setTimeOnTask] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [code, setCode] = useState('// Your code will appear here\n// Start writing your solution\n\nfunction example() {\n  console.log(\'Hello, CodeSaga!\');\n}\n');
  const [taskDescription, setTaskDescription] = useState<string>('Loading task description...');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [checkpointPending, setCheckpointPending] = useState(false);
  const [stackCompleted, setStackCompleted] = useState(false);
  const [editorSaveTimeout, setEditorSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testsPassed, setTestsPassed] = useState(0);
  const [testsTotal, setTestsTotal] = useState(0);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'tests'>('console');
  const [hasTestCases, setHasTestCases] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  // Auto-save editor state (debounced)
  const saveEditorState = async (content: string, taskAttemptId: string) => {
    try {
      await fetch('/api/tasks/editor-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskAttemptId,
          content,
        }),
      });
    } catch (error) {
      console.error('Error saving editor state:', error);
      // Fail silently
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || '');
    
    // Debounce save - wait 2 seconds after user stops typing
    if (editorSaveTimeout) {
      clearTimeout(editorSaveTimeout);
    }
    
    if (taskData) {
      const timeout = setTimeout(() => {
        saveEditorState(value || '', taskData.taskAttempt.id);
      }, 2000);
      setEditorSaveTimeout(timeout);
    }
  };

  // Fetch current task
  useEffect(() => {
    fetchCurrentTask();
  }, [enrollmentId]);

  // Timer for hints and time tracking
  useEffect(() => {
    if (!taskData) return;

    const interval = setInterval(() => {
      setTimeOnTask((prev) => prev + 1);
      
      // Enable hints after 3 minutes (180 seconds)
      if (timeOnTask >= 180 && !canUseHints) {
        setCanUseHints(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [taskData, timeOnTask, canUseHints]);

  const fetchCurrentTask = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/current?enrollmentId=${enrollmentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch current task');
      }

      const data = await response.json();
      
      if (data.completed) {
        setError('All tasks completed! 🎉');
        return;
      }

      // Check for stack completion
      if (data.stackCompleted) {
        setStackCompleted(true);
        setTaskData(data);
        return;
      }

      setTaskData(data);
      setHintsUsed(data.taskAttempt.hintsUsed);
      setCheckpointPending(data.checkpointPending || false);
      
      // Set test cases if available
      if (data.testCases && Array.isArray(data.testCases) && data.testCases.length > 0) {
        setHasTestCases(true);
        setTestCases(data.testCases);
      } else {
        setHasTestCases(false);
        setTestCases([]);
      }
      
      // Restore test results if available
      if (data.taskAttempt.testResults) {
        setTestResults(data.taskAttempt.testResults);
        setTestsPassed(data.taskAttempt.passedTests || 0);
        setTestsTotal(data.taskAttempt.totalTests || 0);
      } else {
        setTestResults([]);
        setTestsPassed(0);
        setTestsTotal(0);
      }
      
      // Restore editor state if it exists
      if (data.taskAttempt.editorState) {
        setCode(data.taskAttempt.editorState);
      } else if (data.starterCode) {
        setCode(data.starterCode);
      } else {
        // Reset to default if no saved state
        setCode('// Your code will appear here\n// Start writing your solution\n\nfunction example() {\n  console.log(\'Hello, CodeSaga!\');\n}\n');
      }
    } catch (err) {
      console.error('Error fetching task:', err);
      setError('Failed to load task. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCode = async () => {
    setIsRunningCode(true);
    setConsoleOutput([]);
    setActiveTab('console');

    try {
      // Execute in browser
      const result = await executeBrowserCode(code, 5000);
      
      if (result.success) {
        setConsoleOutput([
          ...result.consoleOutput,
          result.output !== undefined ? `=> ${JSON.stringify(result.output)}` : '',
        ].filter(Boolean));
      } else {
        setConsoleOutput([
          ...result.consoleOutput,
          `ERROR: ${result.error}`,
        ]);
      }
    } catch (error) {
      setConsoleOutput([`ERROR: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleRunTests = async () => {
    if (!taskData || !hasTestCases) return;

    setIsRunningTests(true);
    setActiveTab('tests');

    try {
      // Run tests in browser
      const result = await runBrowserTests(code, testCases);
      
      setTestResults(result.results);
      setTestsPassed(result.passed);
      setTestsTotal(result.total);

      // Update task attempt with results
      await fetch('/api/tasks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          taskAttemptId: taskData.taskAttempt.id,
        }),
      });
    } catch (error) {
      console.error('Error running tests:', error);
      setConsoleOutput([`ERROR: ${error instanceof Error ? error.message : String(error)}`]);
      setActiveTab('console');
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleSubmit = async () => {
    if (!taskData) return;

    // If task has test cases, validate first
    if (hasTestCases) {
      if (testsPassed !== testsTotal) {
        alert('All tests must pass before submitting');
        return;
      }

      // Submit code with validation
      setIsCompleting(true);
      try {
        const submitResponse = await fetch('/api/tasks/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            taskAttemptId: taskData.taskAttempt.id,
            testResults: { results: testResults, passed: testsPassed, total: testsTotal },
          }),
        });

        if (!submitResponse.ok) {
          const errorData = await submitResponse.json();
          throw new Error(errorData.error || 'Failed to submit code');
        }

        const submitResult = await submitResponse.json();
        
        if (!submitResult.canComplete) {
          alert(submitResult.message);
          setIsCompleting(false);
          return;
        }
      } catch (err) {
        console.error('Error submitting code:', err);
        alert(`Error: ${err instanceof Error ? err.message : 'Failed to submit'}`);
        setIsCompleting(false);
        return;
      }
    }

    // Complete the task
    try {
      const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskAttemptId: taskData.taskAttempt.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete task');
      }

      const result = await response.json();
      console.log('Task completed:', result);

      // Check for stack completion
      if (result.stackCompleted) {
        setStackCompleted(true);
        await fetchCurrentTask();
        return;
      }

      // Check if checkpoint is pending
      if (result.checkpointPending) {
        setCheckpointPending(true);
        return;
      }

      // Fetch next task
      await fetchCurrentTask();
      
      // Reset state
      setTimeOnTask(0);
      setCanUseHints(false);
      setTestResults([]);
      setTestsPassed(0);
      setTestsTotal(0);
      setConsoleOutput([]);
    } catch (err) {
      console.error('Error completing task:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
      alert(`Error: ${errorMessage}. Please try again or refresh the page.`);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleHintUsed = async () => {
    if (!taskData) return;

    const newHintsUsed = hintsUsed + 1;
    setHintsUsed(newHintsUsed);

    // Update the task attempt in the background
    try {
      await fetch('/api/tasks/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskAttemptId: taskData.taskAttempt.id,
        }),
      });
    } catch (err) {
      console.error('Error updating hints:', err);
    }
  };

  const handleCheckpointCleared = async () => {
    setCheckpointPending(false);
    // Fetch next task after checkpoint is cleared
    await fetchCurrentTask();
    // Reset state
    setTimeOnTask(0);
    setCanUseHints(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50">
        <div className="text-center animate-fade-in">
          <div className="spinner w-16 h-16 mx-auto mb-6" />
          <p className="text-slate-600 text-lg font-medium">Loading your task...</p>
          <p className="text-slate-500 text-sm mt-2">Preparing your learning environment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 text-xl font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!taskData) {
    return null;
  }

  // Stack completion state
  if (stackCompleted) {
    return (
      <>
        <Navbar streakDays={streakDays} />
        <div className="h-screen flex flex-col bg-[#1a1a1a] pt-16">
          <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Stack Complete</h1>
                <p className="text-purple-300">{stackName}</p>
              </div>
              
              <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-6 mb-6">
                <CompanionChat
                  taskContext={{
                    stackName,
                    conceptTags: [],
                    difficultyLevel: 'EASY',
                    hintsUsed: 0,
                    timeOnTask: '0:00',
                    stackCompleted: true,
                    storyLogEntries: taskData.storyLog,
                  }}
                  onHintUsed={() => {}}
                  canUseHints={false}
                  onTaskDescriptionReceived={() => {}}
                  taskAttemptId=""
                  checkpointPending={false}
                  onCheckpointCleared={() => {}}
                  enrollmentId={enrollmentId}
                  stackCompleted={true}
                />
              </div>

              <div className="text-center">
                <a
                  href="/dashboard"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <span>Choose another stack</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          </div>
        </div>
      </>
    );
  }

  const taskContext = {
    stackName,
    conceptTags: taskData.task.conceptTags,
    difficultyLevel: taskData.task.difficultyLevel,
    hintsUsed,
    timeOnTask: formatTime(timeOnTask),
    detourTriggered: taskData.detourTriggered,
  };

  return (
    <>
      <Navbar streakDays={streakDays} />
      <div className="h-screen flex flex-col bg-[#1a1a1a] pt-16">
      {/* Drawable Sidebar - Journey */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-b from-[#1e1e2e] to-[#181825] border-r border-purple-500/30 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div>
                <h2 className="text-lg font-semibold text-white">Your Journey</h2>
                {streakDays >= 2 && (
                  <p className="text-xs text-purple-400">{streakDays}-day streak</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 hover:bg-purple-500/20 rounded transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-slate-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Story Log Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {taskData?.storyLog && taskData.storyLog.length > 0 ? (
              <div className="space-y-4">
                {taskData.storyLog.map((entry, index) => (
                  <div key={index} className="group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="w-2 h-2 bg-purple-500 rounded-full group-hover:scale-150 transition-transform" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                          {entry}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-6 pt-4 border-t border-purple-500/30">
                  <div className="flex items-start space-x-3 text-slate-500">
                    <svg className="w-4 h-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-sm italic">Something is waiting after this...</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-slate-500 text-sm">Your story begins here...</p>
                <p className="text-slate-600 text-xs mt-2">Complete tasks to build your journey</p>
              </div>
            )}
          </div>

          {/* Sidebar Footer - Skill Map Link */}
          <div className="border-t border-purple-500/30 p-4">
            <a
              href="/skills"
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 rounded-lg transition-colors group cursor-pointer"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium">View your skill map</span>
            </a>
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Top Navigation Bar */}
      <div className="bg-[#282828] border-b border-[#3a3a3a] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Journey Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-[#3a3a3a] rounded transition-colors group cursor-pointer"
            title="Open Journey"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm">{stackName}</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className={`px-2 py-1 rounded ${
              taskData.task.difficultyLevel === 'EASY' ? 'bg-green-500/20 text-green-400' :
              taskData.task.difficultyLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {taskData.task.difficultyLevel}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-400">{formatTime(timeOnTask)}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-400">{hintsUsed} hints used</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasTestCases && (
            <div className="flex items-center space-x-2 mr-2">
              <span className="text-xs text-slate-400">Tests:</span>
              <span className={`text-xs font-medium ${
                testsPassed === testsTotal && testsTotal > 0
                  ? 'text-green-400'
                  : 'text-amber-400'
              }`}>
                {testsPassed}/{testsTotal}
              </span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={isCompleting || checkpointPending || (hasTestCases && testsPassed !== testsTotal)}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1"
          >
            {isCompleting ? (
              <>
                <div className="spinner w-3 h-3" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Submit Solution</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Task Description */}
        <div className="w-[380px] flex-shrink-0 flex flex-col bg-[#1a1a1a] border-r border-[#3a3a3a]">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">Current Task</h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {taskDescription}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Concepts
              </h3>
              <div className="flex flex-wrap gap-2">
                {taskData.task.conceptTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Code Editor + Bottom Panel */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          {/* Editor Header */}
          <div className="flex items-center justify-between border-b border-[#3a3a3a] bg-[#252526] px-4 py-2">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-sm text-slate-300">solution.js</span>
            </div>
            <select className="bg-[#3a3a3a] text-slate-300 text-xs px-2 py-1 rounded border border-[#4a4a4a] focus:outline-none focus:border-purple-500">
              <option>JavaScript</option>
              <option>TypeScript</option>
              <option>Python</option>
            </select>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                readOnly: false,
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'off',
                formatOnPaste: true,
                formatOnType: true,
                fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                fontLigatures: true,
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: 'all',
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* Bottom Panel - Console/Tests */}
          <div className="h-80 border-t border-[#3a3a3a]">
            {/* Tab Switcher */}
            <div className="flex items-center border-b border-[#3a3a3a] bg-[#252526]">
              <button
                onClick={() => setActiveTab('console')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'console'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-slate-300'
                }`}
              >
                Console
              </button>
              {hasTestCases && (
                <button
                  onClick={() => setActiveTab('tests')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                    activeTab === 'tests'
                      ? 'text-purple-400 border-purple-400'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  Tests {testResults.length > 0 && `(${testsPassed}/${testsTotal})`}
                </button>
              )}
            </div>

            {/* Panel Content */}
            <div className="h-[calc(100%-41px)]">
              {activeTab === 'console' ? (
                <ConsolePanel
                  output={consoleOutput}
                  isRunning={isRunningCode}
                  onRun={handleRunCode}
                  onClear={() => setConsoleOutput([])}
                />
              ) : (
                <TestPanel
                  results={testResults}
                  passed={testsPassed}
                  total={testsTotal}
                  isRunning={isRunningTests}
                  onRunTests={handleRunTests}
                  onSubmit={handleSubmit}
                  canSubmit={!isCompleting && !checkpointPending}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - AI Companion */}
        <div className="w-[420px] flex-shrink-0 border-l border-[#3a3a3a]">
          <CompanionChat
            taskContext={taskContext}
            onHintUsed={handleHintUsed}
            canUseHints={canUseHints}
            onTaskDescriptionReceived={setTaskDescription}
            taskAttemptId={taskData.taskAttempt.id}
            checkpointPending={checkpointPending}
            onCheckpointCleared={handleCheckpointCleared}
            enrollmentId={enrollmentId}
            companionMessages={taskData.companionMessages}
            isReturning={taskData.isReturning}
          />
        </div>
      </div>
      </div>
    </>
  );
}
