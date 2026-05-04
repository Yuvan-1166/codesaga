/**
 * Enrollment Manager
 * 
 * Manages enrollment initialization and state updates
 */

import { prisma } from '@/lib/prisma';
import { IntensityLevel } from '@prisma/client';
import { calculateInitialIntensity } from './intensity-manager';

/**
 * Initialize a new enrollment with adaptive learning
 */
export async function initializeEnrollment(
  userId: string,
  stackId: string,
  initialAssessmentScore?: number
): Promise<{
  enrollmentId: string;
  initialIntensity: IntensityLevel;
}> {
  // Determine initial intensity
  const initialIntensity = initialAssessmentScore !== undefined
    ? calculateInitialIntensity(initialAssessmentScore)
    : 'STANDARD';

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      stackId,
      currentIntensity: initialIntensity,
      performanceScore: 0.5, // Start neutral
      consecutiveSuccesses: 0,
      consecutiveStruggles: 0,
      completedModuleIds: [],
      availableModuleIds: [],
      totalHintsUsed: 0,
    },
  });

  // Compute initial available modules
  await updateAvailableModules(enrollment.id);

  return {
    enrollmentId: enrollment.id,
    initialIntensity,
  };
}

/**
 * Update available modules for an enrollment
 */
export async function updateAvailableModules(enrollmentId: string): Promise<string[]> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      Stack: {
        include: {
          Module: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  // Get user's concept strengths
  const conceptProgress = await prisma.conceptProgress.findMany({
    where: {
      userId: enrollment.userId,
      stackId: enrollment.stackId,
    },
  });

  const conceptStrengths = new Map<string, number>(
    conceptProgress.map(cp => [cp.conceptTag, cp.strength])
  );

  // Import recommendation logic
  const { recommendNextModules } = await import('./module-recommender');
  const { parsePrerequisites } = await import('./prerequisite-checker');
  const { isModuleAppropriateForIntensity } = await import('./intensity-manager');

  // Filter modules
  const availableModules = enrollment.Stack.Module.filter(module => {
    // Skip completed
    if (enrollment.completedModuleIds.includes(module.id)) {
      return false;
    }

    // Check intensity appropriateness
    if (!isModuleAppropriateForIntensity(
      module.moduleType,
      module.difficultyLevel,
      enrollment.currentIntensity
    )) {
      return false;
    }

    // Check prerequisites (basic check)
    const prerequisites = parsePrerequisites(module.prerequisites);
    
    // Allow REMEDIAL modules even without prerequisites
    if (module.moduleType === 'REMEDIAL') {
      return true;
    }

    // Check module prerequisites
    if (prerequisites.modules && prerequisites.modules.length > 0) {
      const hasAllModules = prerequisites.modules.every(reqModuleId =>
        enrollment.completedModuleIds.includes(reqModuleId)
      );
      if (!hasAllModules) {
        return false;
      }
    }

    // Check concept prerequisites (basic check)
    if (prerequisites.concepts && prerequisites.concepts.length > 0) {
      const minStrength = prerequisites.minConceptStrength || 0.5;
      const hasAllConcepts = prerequisites.concepts.every(concept => {
        const strength = conceptStrengths.get(concept);
        return strength !== undefined && strength >= (minStrength * 0.8); // 80% threshold for availability
      });
      if (!hasAllConcepts) {
        return false;
      }
    }

    return true;
  });

  const availableModuleIds = availableModules.map(m => m.id);

  // Update enrollment
  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { availableModuleIds },
  });

  return availableModuleIds;
}

/**
 * Update enrollment performance metrics
 */
export async function updateEnrollmentMetrics(
  enrollmentId: string,
  performanceScore: number,
  wasSuccess: boolean
): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  // Update streaks
  let consecutiveSuccesses = enrollment.consecutiveSuccesses;
  let consecutiveStruggles = enrollment.consecutiveStruggles;

  if (wasSuccess) {
    consecutiveSuccesses += 1;
    consecutiveStruggles = 0;
  } else {
    consecutiveStruggles += 1;
    consecutiveSuccesses = 0;
  }

  // Update rolling performance score (exponential moving average)
  const alpha = 0.3; // Weight for new score
  const newPerformanceScore = 
    alpha * performanceScore + (1 - alpha) * enrollment.performanceScore;

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      performanceScore: newPerformanceScore,
      consecutiveSuccesses,
      consecutiveStruggles,
    },
  });
}

/**
 * Add completed module to enrollment
 */
export async function addCompletedModule(
  enrollmentId: string,
  moduleId: string
): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  // Add to completed modules if not already there
  if (!enrollment.completedModuleIds.includes(moduleId)) {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        completedModuleIds: {
          push: moduleId,
        },
      },
    });
  }

  // Update available modules
  await updateAvailableModules(enrollmentId);
}

/**
 * Update enrollment intensity
 */
export async function updateEnrollmentIntensity(
  enrollmentId: string,
  newIntensity: IntensityLevel,
  reason: string
): Promise<void> {
  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      currentIntensity: newIntensity,
      // Reset streaks when intensity changes
      consecutiveSuccesses: 0,
      consecutiveStruggles: 0,
    },
  });

  // Update available modules for new intensity
  await updateAvailableModules(enrollmentId);

  console.log(`Intensity updated for enrollment ${enrollmentId}: ${newIntensity}. Reason: ${reason}`);
}

/**
 * Get enrollment with full context
 */
export async function getEnrollmentContext(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      Stack: true,
      User: true,
    },
  });

  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  // Get concept strengths
  const conceptProgress = await prisma.conceptProgress.findMany({
    where: {
      userId: enrollment.userId,
      stackId: enrollment.stackId,
    },
  });

  const conceptStrengths = new Map<string, number>(
    conceptProgress.map(cp => [cp.conceptTag, cp.strength])
  );

  return {
    enrollment,
    conceptStrengths,
  };
}

/**
 * Calculate and update average metrics
 */
export async function updateAverageMetrics(enrollmentId: string): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      Session: {
        include: {
          ModuleAttempt: {
            where: { status: 'COMPLETED' },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  // Collect all completed module attempts
  const allAttempts = enrollment.Session.flatMap(s => s.ModuleAttempt);

  if (allAttempts.length === 0) {
    return;
  }

  const { calculateAverageMetrics } = await import('./performance-analyzer');

  const metrics = calculateAverageMetrics(
    allAttempts.map(a => ({
      durationSeconds: a.durationSeconds,
      passedTests: a.passedTests,
      totalTests: a.totalTests,
      hintsUsed: a.hintsUsed,
    }))
  );

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      avgCompletionTime: metrics.avgCompletionTime,
      avgTestPassRate: metrics.avgTestPassRate,
      totalHintsUsed: metrics.totalHintsUsed,
    },
  });
}
