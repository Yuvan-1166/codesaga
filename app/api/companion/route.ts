import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { COMPANION_SYSTEM_PROMPT } from '@/lib/constants';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, taskContext, hintType } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Build the system prompt with task context
    let systemPrompt = COMPANION_SYSTEM_PROMPT;

    if (taskContext) {
      systemPrompt += `\n\nCurrent Task Context:
- Stack: ${taskContext.stackName}
- Concept Tags: ${taskContext.conceptTags?.join(', ') || 'None'}
- Difficulty: ${taskContext.difficultyLevel || 'Unknown'}
- Hints Used: ${taskContext.hintsUsed || 0}
- Time on Task: ${taskContext.timeOnTask || 'Just started'}`;
    }

    // Add hint-specific instructions
    if (hintType === 'nudge') {
      systemPrompt += '\n\nThe user has requested a conceptual nudge. Give them a hint about the concept or approach, but NO code. Help them think through the problem.';
    } else if (hintType === 'shape') {
      systemPrompt += '\n\nThe user has requested the code shape/structure. Show them function signatures, class structures, or the overall pattern, but do NOT implement the logic.';
    } else if (hintType === 'solution') {
      systemPrompt += '\n\nThe user has requested a complete solution. Provide one working implementation, then ask them to explain it back to you in their own words to ensure understanding.';
    }

    // Create the chat completion with streaming
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Error in companion API:', error);
    return NextResponse.json(
      { error: 'Failed to get companion response' },
      { status: 500 }
    );
  }
}
