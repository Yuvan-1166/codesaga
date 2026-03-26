import { prisma } from './prisma';
import Groq from 'groq-sdk';

/**
 * Detects if a user is struggling on a task
 * Returns true if any of these conditions are met:
 * - User has been on task for more than 20 minutes
 * - User has used 2 or more hints
 * - User has sent more than 8 messages to companion
 */
export async function detectStruggle(taskAttemptId: string): Promise<boolean> {
  const taskAttempt = await prisma.taskAttempt.findUnique({
    where: { id: taskAttemptId },
  });

  if (!taskAttempt) {
    return false;
  }

  // Check time on task (20 minutes = 1200000 ms)
  const timeOnTask = Date.now() - taskAttempt.startedAt.getTime();
  if (timeOnTask > 20 * 60 * 1000) {
    return true;
  }

  // Check hints used
  if (taskAttempt.hintsUsed >= 2) {
    return true;
  }

  // Check message count
  if (taskAttempt.messageCount > 8) {
    return true;
  }

  return false;
}

/**
 * Finds an appropriate detour task for the given concept tag
 * Returns a detour task that:
 * - Has isDetour = true
 * - Shares at least one concept tag with the current task
 * - Has not been attempted by this user
 */
export async function findDetourTask(
  userId: string,
  stackId: string,
  conceptTags: string[]
): Promise<any | null> {
  // Get all completed task IDs for this user
  const completedAttempts = await prisma.taskAttempt.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    select: {
      taskId: true,
    },
  });

  const completedTaskIds = completedAttempts.map((a) => a.taskId);

  // Find a detour task that overlaps with concept tags
  const detourTask = await prisma.task.findFirst({
    where: {
      stackId,
      isDetour: true,
      id: {
        notIn: completedTaskIds,
      },
      conceptTags: {
        hasSome: conceptTags,
      },
    },
    orderBy: {
      internalOrder: 'asc',
    },
  });

  return detourTask;
}

/**
 * Generates a one-sentence story log entry for a completed task
 * Uses GROQ API to create a narrative summary
 */
export async function generateStoryLogEntry(
  taskContext: {
    conceptTags: string[];
    difficultyLevel: string;
    stackName: string;
  }
): Promise<string> {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set');
      return 'Completed a task.';
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a quest journal writer. Generate ONE sentence in past tense describing what the user just accomplished. 
          
Rules:
- Write as a quest journal entry
- Past tense only
- One sentence maximum
- No technical jargon, use narrative language
- Make it feel like progress in a story
- Focus on what was built or fixed, not what was learned

Example: "Wired up a middleware chain so every request is logged and validated before it hits a route."`,
        },
        {
          role: 'user',
          content: `Generate a story log entry for completing a task with these concepts: ${taskContext.conceptTags.join(', ')}. Stack: ${taskContext.stackName}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    return completion.choices[0]?.message?.content || 'Completed a task.';
  } catch (error) {
    console.error('Error generating story log entry:', error);
    return 'Completed a task.';
  }
}
