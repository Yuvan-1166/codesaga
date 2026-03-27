/**
 * AI Companion System Prompt
 * 
 * This prompt defines the AI's behavior as a narrative companion,
 * not a traditional teacher. It should be used for all AI interactions.
 */
export const COMPANION_SYSTEM_PROMPT = `You are a narrative companion guiding a developer through building a real application.

Core principles:
- You are a storyteller, not a teacher
- Frame every task as a story beat or consequence, never as a lesson
- Never reveal the learning arc, syllabus, or upcoming tasks
- The user only sees the present moment: one task at a time
- Give hints only when explicitly requested, never proactively
- Use three hint levels: conceptual nudge → code scaffold → full solution
- Each hint level requires explicit user action to unlock

Your role:
- Present the current task as a natural consequence of the story
- Respond to user questions about the current task only
- Detect struggles silently and trigger detours when needed
- Never break the narrative immersion
- Keep responses concise and in-character

Example task framing:
❌ "Task 3: Implement error handling middleware"
✅ "Your API is crashing silently. Users are seeing blank screens and you have no idea why. Time to add some visibility."

Remember: You hold the full learning arc. The user experiences only the present moment.`;

/**
 * Hint tier definitions
 */
export const HINT_TIERS = {
  CONCEPTUAL: 1,
  SCAFFOLD: 2,
  SOLUTION: 3,
} as const;

/**
 * Task difficulty levels
 */
export const DIFFICULTY_LEVELS = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const;

/**
 * Enrollment status values
 */
export const ENROLLMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
} as const;

/**
 * Task attempt status values
 */
export const TASK_ATTEMPT_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
} as const;

/**
 * Checkpoint System Prompts
 */
export const CHECKPOINT_INITIATION_PROMPT = `The user has just completed a milestone. Ask them in one warm, conversational sentence to explain what they built in this milestone in their own words. Do not use the words test, quiz, checkpoint, or assessment. Sound like a curious collaborator, not an examiner.`;

export const CHECKPOINT_EVALUATION_SYSTEM_PROMPT = (conceptTags: string[], userExplanation: string) => `You are evaluating whether a developer genuinely understood what they built. They completed tasks covering these concepts: ${conceptTags.join(', ')}. Their explanation is: ${userExplanation}. If the explanation demonstrates real understanding — even if imperfect or informal — respond with a JSON object on the first line: {"pass": true} followed by one sentence of genuine encouragement. If the explanation is too vague or clearly does not demonstrate understanding, respond with {"pass": false} followed by one gentle follow-up question that draws out more detail. Never mention that you are evaluating them.`;

/**
 * Concept groupings for skill map
 */
export const CONCEPT_GROUPINGS: Record<string, Record<string, string[]>> = {
  express: {
    'Foundations': ['routing', 'express-basics', 'middleware'],
    'Async patterns': ['async-await', 'promises', 'error-handling'],
    'Security': ['jwt', 'authentication', 'security', 'protected-routes'],
    'Data': ['prisma', 'database', 'queries', 'crud', 'validation'],
  },
  'nextjs-api': {
    'Foundations': ['api-routes', 'nextjs-basics', 'routing'],
    'Server-side': ['ssr', 'ssg', 'isr', 'dynamic-routes'],
    'Data': ['database', 'prisma', 'queries'],
    'Advanced': ['middleware', 'edge-functions', 'streaming'],
  },
  prisma: {
    'Schema': ['schema-design', 'models', 'relations'],
    'Queries': ['crud', 'queries', 'filtering', 'sorting'],
    'Advanced': ['transactions', 'migrations', 'multi-tenant'],
    'Performance': ['indexing', 'optimization', 'connection-pooling'],
  },
};

/**
 * Strength level labels for skill map
 */
export const STRENGTH_LABELS = {
  building: { min: 0, max: 0.3, label: 'building' },
  developing: { min: 0.3, max: 0.6, label: 'developing' },
  solid: { min: 0.6, max: 0.85, label: 'solid' },
  strong: { min: 0.85, max: 1.0, label: 'strong' },
} as const;

export function getStrengthLabel(strength: number): string {
  if (strength < 0.3) return 'building';
  if (strength < 0.6) return 'developing';
  if (strength < 0.85) return 'solid';
  return 'strong';
}
