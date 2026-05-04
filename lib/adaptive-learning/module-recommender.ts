/**
 * Module Recommender
 * 
 * Recommends next modules based on user performance and learning path
 */

import { ModuleType, DifficultyLevel } from '@prisma/client';
import {
  RecommendationContext,
  LearningPathNode,
  ModulePrerequisites,
  MODULE_TYPE_PRIORITY,
} from './types';
import { checkPrerequisites, calculateReadinessScore, parsePrerequisites } from './prerequisite-checker';
import { isModuleAppropriateForIntensity } from './intensity-manager';

interface ModuleCandidate {
  id: string;
  slug: string;
  title: string;
  moduleType: ModuleType;
  difficultyLevel: DifficultyLevel;
  conceptTags: string[];
  prerequisites: any;
  estimatedMinutes: number;
}

/**
 * Recommend next modules for the user
 */
export function recommendNextModules(
  context: RecommendationContext,
  availableModules: ModuleCandidate[],
  maxRecommendations: number = 5
): LearningPathNode[] {
  const recommendations: Array<LearningPathNode & { score: number }> = [];

  for (const module of availableModules) {
    // Skip if already completed
    if (context.completedModuleIds.includes(module.id)) {
      continue;
    }

    // Check if appropriate for intensity
    if (!isModuleAppropriateForIntensity(module.moduleType, module.difficultyLevel, context.currentIntensity)) {
      continue;
    }

    // Parse prerequisites
    const prerequisites = parsePrerequisites(module.prerequisites);

    // Check prerequisites
    const prereqCheck = checkPrerequisites(
      prerequisites,
      context.conceptStrengths,
      context.completedModuleIds
    );

    // Skip if prerequisites not met (unless it's a REMEDIAL module)
    if (!prereqCheck.met && module.moduleType !== 'REMEDIAL') {
      continue;
    }

    // Calculate recommendation score
    const score = calculateRecommendationScore(
      module,
      context,
      prerequisites,
      prereqCheck.met
    );

    // Generate reason
    const reason = generateRecommendationReason(module, context, prereqCheck.met);

    recommendations.push({
      moduleId: module.id,
      reason,
      priority: score,
      estimatedMinutes: module.estimatedMinutes,
      score,
    });
  }

  // Sort by score (descending) and return top N
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.slice(0, maxRecommendations).map(({ score, ...node }) => node);
}

/**
 * Calculate recommendation score for a module
 */
function calculateRecommendationScore(
  module: ModuleCandidate,
  context: RecommendationContext,
  prerequisites: ModulePrerequisites,
  prerequisitesMet: boolean
): number {
  let score = 0;

  // Base score from module type priority
  score += MODULE_TYPE_PRIORITY[module.moduleType];

  // Boost REMEDIAL modules if struggling
  if (module.moduleType === 'REMEDIAL' && context.consecutiveStruggles >= 2) {
    score += 50;
  }

  // Boost PRACTICE modules if performance is moderate
  if (module.moduleType === 'PRACTICE' && context.performanceScore >= 0.4 && context.performanceScore < 0.7) {
    score += 30;
  }

  // Boost CHALLENGE modules if performing well
  if (module.moduleType === 'CHALLENGE' && context.performanceScore >= 0.75) {
    score += 40;
  }

  // Boost ASSESSMENT modules periodically (every 5-10 modules)
  if (module.moduleType === 'ASSESSMENT') {
    const modulesSinceLastAssessment = context.completedModuleIds.length % 10;
    if (modulesSinceLastAssessment >= 5) {
      score += 60;
    }
  }

  // Readiness score (how prepared the user is)
  const readiness = calculateReadinessScore(
    prerequisites,
    context.conceptStrengths,
    context.completedModuleIds
  );
  score += readiness * 30;

  // Penalty if prerequisites not met (unless REMEDIAL)
  if (!prerequisitesMet && module.moduleType !== 'REMEDIAL') {
    score -= 100;
  }

  // Boost modules that teach weak concepts
  const weakConcepts = Array.from(context.conceptStrengths.entries())
    .filter(([_, strength]) => strength < 0.4)
    .map(([concept, _]) => concept);

  const teachesWeakConcept = module.conceptTags.some(tag => weakConcepts.includes(tag));
  if (teachesWeakConcept) {
    score += 40;
  }

  // Difficulty alignment with performance
  const difficultyScore = calculateDifficultyAlignment(
    module.difficultyLevel,
    context.performanceScore
  );
  score += difficultyScore;

  return Math.max(0, score);
}

/**
 * Calculate how well difficulty aligns with performance
 */
function calculateDifficultyAlignment(
  difficulty: DifficultyLevel,
  performanceScore: number
): number {
  // High performance -> prefer harder modules
  if (performanceScore >= 0.75) {
    if (difficulty === 'HARD') return 20;
    if (difficulty === 'MEDIUM') return 10;
    return 0;
  }

  // Moderate performance -> prefer medium modules
  if (performanceScore >= 0.5) {
    if (difficulty === 'MEDIUM') return 20;
    if (difficulty === 'EASY') return 10;
    return 0;
  }

  // Low performance -> prefer easy modules
  if (difficulty === 'EASY') return 20;
  if (difficulty === 'MEDIUM') return 5;
  return -10;
}

/**
 * Generate human-readable reason for recommendation
 */
function generateRecommendationReason(
  module: ModuleCandidate,
  context: RecommendationContext,
  prerequisitesMet: boolean
): string {
  // REMEDIAL modules
  if (module.moduleType === 'REMEDIAL') {
    return 'Reinforcement module to strengthen fundamentals';
  }

  // ASSESSMENT modules
  if (module.moduleType === 'ASSESSMENT') {
    return 'Check your understanding before moving forward';
  }

  // CHALLENGE modules
  if (module.moduleType === 'CHALLENGE') {
    if (context.performanceScore >= 0.75) {
      return 'You\'re ready for a challenge!';
    }
    return 'Optional challenge to test your skills';
  }

  // PRACTICE modules
  if (module.moduleType === 'PRACTICE') {
    const weakConcepts = module.conceptTags.filter(tag => {
      const strength = context.conceptStrengths.get(tag);
      return strength !== undefined && strength < 0.5;
    });

    if (weakConcepts.length > 0) {
      return `Practice ${weakConcepts[0]} to build confidence`;
    }
    return 'Practice to reinforce what you\'ve learned';
  }

  // INTEGRATION modules
  if (module.moduleType === 'INTEGRATION') {
    return 'Combine multiple concepts in a real scenario';
  }

  // CORE modules (default)
  if (!prerequisitesMet) {
    return 'Complete prerequisites first';
  }

  return 'Next step in your learning path';
}

/**
 * Find remedial modules for struggling concepts
 */
export function findRemedialModules(
  struggledConcepts: string[],
  availableModules: ModuleCandidate[],
  completedModuleIds: string[]
): LearningPathNode[] {
  const remedialModules: LearningPathNode[] = [];

  for (const module of availableModules) {
    if (completedModuleIds.includes(module.id)) {
      continue;
    }

    if (module.moduleType !== 'REMEDIAL' && module.moduleType !== 'PRACTICE') {
      continue;
    }

    // Check if module teaches struggled concepts
    const teachesStruggledConcept = module.conceptTags.some(tag =>
      struggledConcepts.includes(tag)
    );

    if (teachesStruggledConcept) {
      remedialModules.push({
        moduleId: module.id,
        reason: `Reinforce ${struggledConcepts.find(c => module.conceptTags.includes(c))}`,
        priority: 100,
        estimatedMinutes: module.estimatedMinutes,
      });
    }
  }

  return remedialModules;
}

/**
 * Find practice modules for specific concepts
 */
export function findPracticeModules(
  conceptTags: string[],
  availableModules: ModuleCandidate[],
  completedModuleIds: string[]
): LearningPathNode[] {
  const practiceModules: LearningPathNode[] = [];

  for (const module of availableModules) {
    if (completedModuleIds.includes(module.id)) {
      continue;
    }

    if (module.moduleType !== 'PRACTICE') {
      continue;
    }

    // Check if module practices the concepts
    const practicesConcept = module.conceptTags.some(tag => conceptTags.includes(tag));

    if (practicesConcept) {
      practiceModules.push({
        moduleId: module.id,
        reason: 'Additional practice',
        priority: 80,
        estimatedMinutes: module.estimatedMinutes,
      });
    }
  }

  return practiceModules;
}
