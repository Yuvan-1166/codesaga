import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { COMPANION_SYSTEM_PROMPT } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, taskContext, hintType, taskAttemptId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Increment message count for struggle detection (only for regular messages, not hints or checkpoint)
    if (taskAttemptId && !hintType && !taskContext?.checkpointMode) {
      try {
        await prisma.taskAttempt.update({
          where: { id: taskAttemptId },
          data: {
            messageCount: {
              increment: 1,
            },
          },
        });
      } catch (error) {
        console.error('Error updating message count:', error);
      }
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

    // Add checkpoint mode instruction
    if (taskContext?.checkpointMode) {
      systemPrompt += '\n\nThe user has just completed a milestone. Ask them in one warm, conversational sentence to explain what they built in this milestone in their own words. Do not use the words test, quiz, checkpoint, or assessment. Sound like a curious collaborator, not an examiner.';
    }

    // Add returning user instruction
    if (taskContext?.returningUser) {
      systemPrompt += '\n\nThe user has just returned to a task they were working on previously. In one sentence, acknowledge what they were working on (use the task narrative context) and invite them to continue. Do not say "welcome back". Sound natural.';
    }

    // Add detour reframing instruction if needed
    if (taskContext?.detourTriggered) {
      systemPrompt += '\n\nIMPORTANT: A detour has been triggered. Naturally reframe the situation as a plot development. Make it feel like a natural next step. Say something like "Before we wire up the next piece, I want to make sure something is solid..." Never use words like "detour", "prerequisite", "remedial", or "going back". Make it feel like forward progress.';
    }

    // Add stack completion instruction
    if (taskContext?.stackCompleted) {
      systemPrompt += `\n\nThe user has completed the entire ${taskContext.stackName} learning arc. Write one paragraph in warm, past-tense language summarising what they built across all tasks (context: ${taskContext.storyLogEntries?.join('. ') || 'their journey'}). End with a single sentence encouraging them to start a new stack. Do not use the words congratulations or amazing.`;
    }

    try {
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

      // Collect the full response while streaming
      let fullAssistantMessage = '';
      const userMessage = messages[messages.length - 1];

      // Create a readable stream for the response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullAssistantMessage += content;
                controller.enqueue(encoder.encode(content));
              }
            }
            controller.close();

            // Save messages to database after streaming completes
            if (taskAttemptId && userMessage) {
              try {
                // Save user message
                await prisma.companionMessage.create({
                  data: {
                    taskAttemptId,
                    role: 'user',
                    content: userMessage.content,
                  },
                });

                // Save assistant message
                await prisma.companionMessage.create({
                  data: {
                    taskAttemptId,
                    role: 'assistant',
                    content: fullAssistantMessage,
                  },
                });
              } catch (error) {
                console.error('Error saving companion messages:', error);
                // Don't fail the request if message saving fails
              }
            }
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
    } catch (groqError) {
      console.error('GROQ API error:', groqError);
      // Return error indicator for streaming calls
      return NextResponse.json(
        { 
          error: 'AI_UNAVAILABLE',
          message: 'Having a moment — try again.',
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error in companion API:', error);
    return NextResponse.json(
      { error: 'Failed to get companion response' },
      { status: 500 }
    );
  }
}
