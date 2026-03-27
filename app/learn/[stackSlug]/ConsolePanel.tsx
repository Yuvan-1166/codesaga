'use client';

type ConsolePanelProps = {
  output: string[];
  isRunning: boolean;
  onRun: () => void;
  onClear: () => void;
};

export default function ConsolePanel({ output, isRunning, onRun, onClear }: ConsolePanelProps) {
  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-t border-[#3a3a3a]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#3a3a3a]">
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-white font-semibold">Console</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors text-sm cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={onRun}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed cursor-pointer text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
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
                <span>Run Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Console Output */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {output.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-400 mb-2">Console is empty</p>
            <p className="text-slate-500 text-sm">Run your code to see output here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {output.map((line, index) => (
              <div
                key={index}
                className={`${
                  line.startsWith('ERROR:')
                    ? 'text-red-400'
                    : line.startsWith('WARN:')
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}
              >
                <span className="text-slate-500 mr-2">&gt;</span>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
