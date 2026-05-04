/**
 * Prerequisite Checker
 * 
 * Validates if a user meets the prerequisites for a module
 */

import { ModulePrerequisites } from './types';

/**
 * Check if user meets module prerequisites
 */
export function checkPrerequisites(
  prerequisites: ModulePrerequisites,
  userConceptStrengths: Map<string, number>,
  completedModuleIds: string[]
): {
  met: boolean;
  missingConcepts: string[];
  missingModules: string[];
  weakConcepts: Array<{ concept: string; currentStrength: number; requiredStrength: number }>;
} {
  const missingConcepts: string[] = [];
  const missingModules: string[] = [];
  const weakConcepts: Array<{ concept: string; currentStrength: number; requiredStrength: number }> = [];

  // Check concept prerequisites
  if (prerequisites.concepts && prerequisites.concepts.length > 0) {
    const minStrength = prerequisites.minConceptStrength || 0.5;

    for (const concept of prerequisites.concepts) {
      const strength = userConceptStrengths.get(concept);

      if (strength === undefined) {
        missingConcepts.push(concept);
      } else if (strength < minStrength) {
        weakConcepts.push({
          concept,
          currentStrength: strength,
          requiredStrength: minStrength,
        });
      }
    }
  }

  // Check module prerequisites
  if (prerequisites.modules && prerequisites.modules.length > 0) {
    for (const moduleId of prerequisites.modules) {
      if (!completedModuleIds.includes(moduleId)) {
        missingModules.push(moduleId);
      }
    }
  }

  const met = missingConcepts.length === 0 && missingModules.length === 0 && weakConcepts.length === 0;

  return {
    met,
    missingConcepts,
    missingModules,
    weakConcepts,
  };
}

/**
 * Get readiness score for a module (0.0 - 1.0)
 */
export function calculateReadinessScore(
  prerequisites: ModulePrerequisites,
  userConceptStrengths: Map<string, number>,
  completedModuleIds: string[]
): number {
  if (!prerequisites.concepts || prerequisites.concepts.length === 0) {
    // No concept prerequisites, check only modules
    if (!prerequisites.modules || prerequisites.modules.length === 0) {
      return 1.0; // No prerequisites at all
    }

    const completedCount = prerequisites.modules.filter(m => completedModuleIds.includes(m)).length;
    return completedCount / prerequisites.modules.length;
  }

  const minStrength = prerequisites.minConceptStrength || 0.5;
  let totalReadiness = 0;

  for (const concept of prerequisites.concepts) {
    const strength = userConceptStrengths.get(concept) || 0;
    const readiness = Math.min(1.0, strength / minStrength);
    totalReadiness += readiness;
  }

  const conceptReadiness = totalReadiness / prerequisites.concepts.length;

  // Factor in module prerequisites
  if (prerequisites.modules && prerequisites.modules.length > 0) {
    const completedCount = prerequisites.modules.filter(m => completedModuleIds.includes(m)).length;
    const moduleReadiness = completedCount / prerequisites.modules.length;
    return (conceptReadiness + moduleReadiness) / 2;
  }

  return conceptReadiness;
}

/**
 * Find modules that would help meet prerequisites
 */
export function findPrerequisiteModules(
  missingConcepts: string[],
  allModules: Array<{
    id: string;
    conceptTags: string[];
    moduleType: string;
  }>
): string[] {
  const helpfulModuleIds: string[] = [];

  for (const module of allModules) {
    // Check if this module teaches any missing concepts
    const teachesMissingConcept = module.conceptTags.some(tag => missingConcepts.includes(tag));

    if (teachesMissingConcept) {
      // Prioritize PRACTICE and REMEDIAL modules for prerequisites
      if (module.moduleType === 'PRACTICE' || module.moduleType === 'REMEDIAL') {
        helpfulModuleIds.unshift(module.id);
      } else {
        helpfulModuleIds.push(module.id);
      }
    }
  }

  return helpfulModuleIds;
}

/**
 * Parse prerequisites from JSON
 */
export function parsePrerequisites(prerequisitesJson: any): ModulePrerequisites {
  if (!prerequisitesJson || typeof prerequisitesJson !== 'object') {
    return {};
  }

  return {
    concepts: Array.isArray(prerequisitesJson.concepts) ? prerequisitesJson.concepts : undefined,
    modules: Array.isArray(prerequisitesJson.modules) ? prerequisitesJson.modules : undefined,
    minConceptStrength: typeof prerequisitesJson.minConceptStrength === 'number'
      ? prerequisitesJson.minConceptStrength
      : undefined,
  };
}
