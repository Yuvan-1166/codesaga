'use client';

import { useState } from 'react';

type Task = {
  id: string;
  internalOrder: number;
  conceptTags: string[];
  difficultyLevel: string;
  executionMode: string;
  language: string;
  isDetour: boolean;
};

type Stack = {
  id: string;
  name: string;
  slug: string;
  Task: Task[];
};

type Props = {
  stacks: Stack[];
};

export default function TaskExecutionManager({ stacks }: Props) {
  const [selectedStack, setSelectedStack] = useState<string>(stacks[0]?.id || '');
  const [tasks, setTasks] = useState<Task[]>(stacks[0]?.Task || []);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStackChange = (stackId: string) => {
    setSelectedStack(stackId);
    const stack = stacks.find(s => s.id === stackId);
    setTasks(stack?.Task || []);
  };

  const handleExecutionModeChange = async (taskId: string, newMode: string) => {
    setUpdating(taskId);

    try {
      const response = await fetch('/api/admin/tasks/execution-mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, executionMode: newMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to update execution mode');
      }

      // Update local state
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, executionMode: newMode } : task
      ));
    } catch (error) {
      console.error('Error updating execution mode:', error);
      alert('Failed to update execution mode');
    } finally {
      setUpdating(null);
    }
  };

  const currentStack = stacks.find(s => s.id === selectedStack);
  const browserCount = tasks.filter(t => t.executionMode === 'browser').length;
  const serverCount = tasks.filter(t => t.executionMode === 'server').length;

  return (
    <div className="space-y-6">
      {/* Stack Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Stack
        </label>
        <select
          value={selectedStack}
          onChange={(e) => handleStackChange(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {stacks.map(stack => (
            <option key={stack.id} value={stack.id}>
              {stack.name} ({stack.Task.length} tasks)
            </option>
          ))}
        </select>

        {currentStack && (
          <div className="mt-4 flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-slate-600">Browser: {browserCount}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-slate-600">Server: {serverCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Concepts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Execution Mode
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    #{task.internalOrder}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex flex-wrap gap-1">
                      {task.conceptTags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {task.conceptTags.length > 2 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                          +{task.conceptTags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      task.difficultyLevel === 'EASY' ? 'bg-green-100 text-green-800' :
                      task.difficultyLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {task.difficultyLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {task.language}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.isDetour ? (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                        Detour
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                        Main
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={task.executionMode}
                      onChange={(e) => handleExecutionModeChange(task.id, e.target.value)}
                      disabled={updating === task.id}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                        task.executionMode === 'server'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      } ${updating === task.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <option value="browser">🌐 Browser</option>
                      <option value="server">🚀 Server</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-600">No tasks found for this stack</p>
          </div>
        )}
      </div>
    </div>
  );
}
