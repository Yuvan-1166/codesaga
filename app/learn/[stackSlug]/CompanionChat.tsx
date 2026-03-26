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
  };
  onHintUsed: () => void;
  canUseHints: boolean;
  onTaskDescriptionReceived: (description: string) => void;
};

export default function CompanionChat({ taskContext, onHintUsed, canUseHints, onTaskDescriptionReceived }: CompanionChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send initial message when component mounts
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      sendInitialMessage();
    }
  }, [hasInitialized]);

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

  const sendMessage = async (messageContent?: string, hintType?: string) => {
    const content = messageContent || input.trim();
    if (!content && !hintType) return;

    const userMessage: Message = {
      role: 'user',
      content: content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          taskContext,
          hintType,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

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
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">AI Companion</h2>
        <p className="text-sm text-slate-600">Your guide through this journey</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hint Buttons */}
      <div className="p-4 border-t border-slate-200 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleHint('nudge')}
            disabled={!canUseHints || isLoading}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Nudge me
          </button>
          <button
            onClick={() => handleHint('shape')}
            disabled={!canUseHints || isLoading}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Give me the shape
          </button>
          <button
            onClick={() => handleHint('solution')}
            disabled={!canUseHints || isLoading}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Show solution
          </button>
        </div>
        {!canUseHints && (
          <p className="text-xs text-slate-500 text-center">
            Hints available after 3 minutes
          </p>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200">
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
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 text-slate-900 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
