'use client';

import { useState, useEffect, useRef } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type CompanionChatProps = {
  taskContext: {
    stackName: string;
    conceptTags: string[];
    difficultyLevel: string;
    hintsUsed: number;
    timeOnTask: string;
    detourTriggered?: boolean;
    stackCompleted?: boolean;
    storyLogEntries?: string[];
  };
  onHintUsed: () => void;
  canUseHints: boolean;
  onTaskDescriptionReceived: (description: string) => void;
  taskAttemptId: string;
  checkpointPending: boolean;
  onCheckpointCleared: () => void;
  enrollmentId: string;
  stackCompleted?: boolean;
  companionMessages?: Array<{
    role: string;
    content: string;
    createdAt: string;
  }>;
  isReturning?: boolean;
};

export default function CompanionChat({ 
  taskContext, 
  onHintUsed, 
  canUseHints, 
  onTaskDescriptionReceived, 
  taskAttemptId,
  checkpointPending,
  onCheckpointCleared,
  enrollmentId,
  stackCompleted = false,
  companionMessages = [],
  isReturning = false,
}: CompanionChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [checkpointInitiated, setCheckpointInitiated] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with message history or send initial message
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      
      // If we have companion messages (returning user), restore them
      if (companionMessages && companionMessages.length > 0) {
        const restoredMessages = companionMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
        setMessages(restoredMessages);
        
        // Set task description from first assistant message
        const firstAssistant = restoredMessages.find(m => m.role === 'assistant');
        if (firstAssistant) {
          onTaskDescriptionReceived(firstAssistant.content);
        }
        
        // Send returning user message if this is a returning user
        if (isReturning) {
          sendReturningUserMessage();
        }
      } else if (stackCompleted) {
        // Send stack completion message
        sendStackCompletionMessage();
      } else {
        // New user - send initial message
        sendInitialMessage();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initiate checkpoint when checkpointPending becomes true
  useEffect(() => {
    if (checkpointPending && !checkpointInitiated) {
      setCheckpointInitiated(true);
      initiateCheckpoint();
    }
    if (!checkpointPending && checkpointInitiated) {
      setCheckpointInitiated(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpointPending]);

  const sendInitialMessage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Start the task. Set the scene and give me context to begin.',
            },
          ],
          taskContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
          
          setMessages([{ role: 'assistant', content: assistantMessage }]);
        }
        
        // Pass the task description to parent
        onTaskDescriptionReceived(assistantMessage);
      }
    } catch (error) {
      console.error('Error sending initial message:', error);
      const fallbackMessage = 'Welcome! I\'m here to guide you through this task. Let me know when you\'re ready to start.';
      setMessages([
        {
          role: 'assistant',
          content: fallbackMessage,
        },
      ]);
      onTaskDescriptionReceived(fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReturningUserMessage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'I just returned to continue working.',
            },
          ],
          taskContext: {
            ...taskContext,
            returningUser: true,
          },
          taskAttemptId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'AI_UNAVAILABLE') {
          setApiError(true);
          return;
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
        }
        
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (error) {
      console.error('Error sending returning user message:', error);
      // Fail silently for returning user message
    } finally {
      setIsLoading(false);
    }
  };

  const sendStackCompletionMessage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Generate a completion summary.',
            },
          ],
          taskContext,
        }),
      });

      if (!response.ok) {
        // Fail silently - skip completion message
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
        }
        
        setMessages([{ role: 'assistant', content: assistantMessage }]);
      }
    } catch (error) {
      console.error('Error sending completion message:', error);
      // Fail silently
    } finally {
      setIsLoading(false);
    }
  };

  const initiateCheckpoint = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'I just completed a milestone. Ask me to explain what I built.',
            },
          ],
          taskContext: {
            ...taskContext,
            checkpointMode: true,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
        }
        
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (error) {
      console.error('Error initiating checkpoint:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Great work completing those tasks! Can you tell me in your own words what you built?',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckpointResponse = async (explanation: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tasks/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explanation,
          conceptTags: taskContext.conceptTags,
        }),
      });

      if (!response.ok) throw new Error('Failed to evaluate checkpoint');

      const result = await response.json();
      
      // Add the AI's response to messages
      setMessages((prev) => [...prev, { role: 'assistant', content: result.message }]);

      // If passed, advance the checkpoint
      if (result.pass) {
        await fetch('/api/tasks/checkpoint/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentId }),
        });
        
        // Notify parent to clear checkpoint and load next task
        onCheckpointCleared();
      }
    } catch (error) {
      console.error('Error handling checkpoint response:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageContent?: string, hintType?: string) => {
    const content = messageContent || input.trim();
    if (!content && !hintType) return;

    const userMessage: Message = {
      role: 'user',
      content: content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLastUserMessage(content);
    setApiError(false);

    // If in checkpoint mode, handle checkpoint response
    if (checkpointPending) {
      await handleCheckpointResponse(content);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          taskContext,
          hintType,
          taskAttemptId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'AI_UNAVAILABLE') {
          setApiError(true);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        // Add empty assistant message that we'll update
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
          
          // Update the last message
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: assistantMessage,
            };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHint = (type: 'nudge' | 'shape' | 'solution') => {
    onHintUsed();
    
    const hintMessages = {
      nudge: 'Give me a conceptual nudge to help me think through this.',
      shape: 'Show me the structure or shape of the solution.',
      solution: 'Show me a complete solution.',
    };

    sendMessage(hintMessages[type], type);
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3a3a3a] bg-[#252526] px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Companion</h2>
            <p className="text-xs text-slate-400">Your guide through this journey</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className="animate-fade-in"
          >
            <div className="flex items-start space-x-2">
              {message.role === 'assistant' && (
                <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white ml-8'
                      : 'bg-[#2a2a2a] text-slate-300 border border-[#3a3a3a]'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
              {message.role === 'user' && (
                <div className="w-7 h-7 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="animate-fade-in">
            <div className="flex items-start space-x-2">
              <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        {apiError && (
          <div className="animate-fade-in">
            <div className="flex items-start space-x-2">
              <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2">
                <p className="text-sm text-slate-300 mb-2">Having a moment — try again.</p>
                <button
                  onClick={() => {
                    setApiError(false);
                    sendMessage(lastUserMessage);
                  }}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hint Buttons Section */}
      {!checkpointPending && !stackCompleted && (
        <div className="border-t border-[#3a3a3a] bg-[#1e1e1e] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Quick Hints</span>
          {!canUseHints && (
            <div className="flex items-center space-x-1 text-xs text-slate-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Unlocks in 3 min</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleHint('nudge')}
            disabled={!canUseHints || isLoading}
            className="px-3 py-2 text-xs font-medium bg-[#2a2a2a] text-slate-300 rounded hover:bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[#3a3a3a] hover:border-purple-500/50"
          >
            <div className="flex flex-col items-center space-y-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Nudge</span>
            </div>
          </button>
          <button
            onClick={() => handleHint('shape')}
            disabled={!canUseHints || isLoading}
            className="px-3 py-2 text-xs font-medium bg-[#2a2a2a] text-slate-300 rounded hover:bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[#3a3a3a] hover:border-purple-500/50"
          >
            <div className="flex flex-col items-center space-y-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span>Shape</span>
            </div>
          </button>
          <button
            onClick={() => handleHint('solution')}
            disabled={!canUseHints || isLoading}
            className="px-3 py-2 text-xs font-medium bg-[#2a2a2a] text-slate-300 rounded hover:bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[#3a3a3a] hover:border-purple-500/50"
          >
            <div className="flex flex-col items-center space-y-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Solution</span>
            </div>
          </button>
        </div>
      </div>
      )}

      {/* Input Area */}
      <div className="border-t border-[#3a3a3a] bg-[#252526] p-4">
        {checkpointPending && (
          <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-purple-300 font-medium">Milestone Reflection</p>
                <p className="text-xs text-purple-400/80 mt-1">Share what you built to continue</p>
              </div>
            </div>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={checkpointPending ? "Explain what you built..." : "Ask the AI companion for help..."}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <span>Send</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
