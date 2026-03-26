'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import CompanionChat from './CompanionChat';

type LearningInterfaceProps = {
  enrollmentId: string;
  stackName: string;
  stackSlug: string;
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
};

export default function LearningInterface({
  enrollmentId,
  stackName,
  stackSlug,
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

      setTaskData(data);
      setHintsUsed(data.taskAttempt.hintsUsed);
    } catch (err) {
      console.error('Error fetching task:', err);
      setError('Failed to load task. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!taskData) return;

    setIsCompleting(true);
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

      // Fetch next task
      await fetchCurrentTask();
      
      // Reset state
      setTimeOnTask(0);
      setCanUseHints(false);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your task...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!taskData) {
    return null;
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
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{stackName}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-slate-600">
                Time: {formatTime(timeOnTask)}
              </span>
              <span className="text-sm text-slate-600">
                Hints: {hintsUsed}
              </span>
              <span className="text-sm text-slate-600">
                Difficulty: {taskData.task.difficultyLevel}
              </span>
            </div>
          </div>
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isCompleting ? 'Completing...' : 'Mark as Complete'}
          </button>
        </div>
      </div>

      {/* Split Panel Layout with Story Log Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Story Log Sidebar */}
        <div className="w-64 bg-slate-800 text-slate-200 p-4 overflow-y-auto flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Your Journey
          </h3>
          <div className="space-y-3">
            {taskData.storyLog && taskData.storyLog.length > 0 ? (
              <>
                {taskData.storyLog.slice(-4).map((entry, index) => (
                  <div key={index} className="text-sm text-slate-300 leading-relaxed border-l-2 border-purple-500 pl-3">
                    {entry}
                  </div>
                ))}
                <div className="text-sm text-slate-500 italic pt-2 border-t border-slate-700">
                  Something is waiting after this.
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 italic">
                Your story begins here...
              </div>
            )}
          </div>
        </div>

        {/* Left Panel - Working Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Task Description */}
          <div className="bg-white border-b border-slate-200 p-6">
            <div className="max-w-4xl">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Current Task
              </h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {taskDescription}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {taskData.task.conceptTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 overflow-hidden bg-slate-900">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                readOnly: false,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
        </div>

        {/* Right Panel - AI Companion */}
        <div className="w-96 flex-shrink-0">
          <CompanionChat
            taskContext={taskContext}
            onHintUsed={handleHintUsed}
            canUseHints={canUseHints}
            onTaskDescriptionReceived={setTaskDescription}
            taskAttemptId={taskData.taskAttempt.id}
          />
        </div>
      </div>
    </div>
  );
}
