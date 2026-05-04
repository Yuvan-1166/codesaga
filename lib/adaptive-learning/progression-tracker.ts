/**
 * Progression Tracker
 * 
 * Tracks user progression through modules and updates performance
 */

import { prisma } from '@/lib/prisma';
import { ModuleAttemptStatus } from '@prisma/client';
import {
  calculatePerformanceScore,
  updateConceptStrength,
  detectStruggle,
} from './performance-analyzer';
import { shouldAdjustIntensity } from './intensity-manager';
import {
  updateEnrollmentMetrics,
  addCompletedModule,
  updateEnrollmentIntensity,
  updateAverageMetrics,
} from './enrollment-manager';
import { parsePrerequisites } from './prerequisite-checker';

/**
 * Start a new module attempt
 */
export async function startModuleAttempt(
  userId: string,
  moduleId: string,
  sessionId: string
): Promise<string> {
  // Check if there's already an in-progress attempt
  const existingAttempt = await prisma.moduleAttempt.findFirst({
    where: {
      userId,
      moduleId,
      sessionId,
      status: 'IN_PROGRESS',
    },
  });

  if (existingAttempt) {
    return existingAttempt.id;
  }

  // Create new attempt
  const attempt = await prisma.moduleAttempt.create({
    data: {
      userId,
      moduleId,
      sessionId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  return attempt.id;
}

/**
 * Complete a module attempt and update all metrics
 */
export async function completeModuleAttempt(
  attemptId: string,
  codeSubmitted?: string,
  testResults?: any
): Promise<{
  success: boolean;
  performanceScore: number;
  intensityChanged: boolean;
  newIntensity?: string;
  struggledConcepts: string[];
  masteredConcepts: string[];
  nextModuleRecommendations?: any[];
}> {
  // Get the attempt with related data
  const attempt = await prisma.moduleAttempt.findUnique({
    where: { id: attemptId },
    include: {
      Module: true,
      Session: {
        include: {
          Enrollment: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new Error('Module attempt not found');
  }

  if (attempt.status === 'COMPLETED') {
    throw new Error('Module attempt already completed');
  }

  const module = attempt.Module;
  const enrollment = attempt.Session.Enrollment;

  // Calculate duration
  const durationSeconds = Math.floor(
    (Date.now() - attempt.startedAt.getTime()) / 1000
  );

  // Calculate performance score
  const performanceMetrics = {
    completionTime: durationSeconds,
    testPassRate: attempt.totalTests > 0 ? attempt.passedTests / attempt.totalTests : 1.0,
    hintsUsed: attempt.hintsUsed,
    firstAttemptPass: attempt.passedTests === attempt.totalTests && attempt.hintsUsed === 0,
    messageCount: attempt.messageCount,
  };

  const performanceScoreData = calculatePerformanceScore(
    performanceMetrics,
    module.estimatedMinutes
  );

  // Get user's concept strengths
  const conceptProgress = await prisma.conceptProgress.findMany({
    where: {
      userId: attempt.userId,
      stackId: module.stackId,
    },
  });

  const conceptStrengths = new Map<string, number>(
    conceptProgress.map(cp => [cp.conceptTag, cp.strength])
  );

  // Detect struggles
  const struggleDetection = detectStruggle(
    performanceScoreData.overall,
    enrollment.consecutiveStruggles,
    attempt.hintsUsed,
    durationSeconds,
    module.estimatedMinutes,
    conceptStrengths,
    module.conceptTags
  );

  // Update concept strengths
  const conceptWeights = (module.conceptWeights as Record<string, number>) || {};
  const struggledConcepts: string[] = [];
  const masteredConcepts: string[] = [];

  for (const conceptTag of module.conceptTags) {
    const currentStrength = conceptStrengths.get(conceptTag) || 0;
    const weight = conceptWeights[conceptTag] || 1.0;
    
    const newStrength = updateConceptStrength(
      currentStrength,
      performanceScoreData.overall,
      weight
    );

    // Update in database
    await prisma.conceptProgress.upsert({
      where: {
        userId_stackId_conceptTag: {
          userId: attempt.userId,
          stackId: module.stackId,
          conceptTag,
        },
      },
      update: {
        strength: newStrength,
      },
      create: {
        userId: attempt.userId,
        stackId: module.stackId,
        conceptTag,
        strength: newStrength,
      },
    });

    // Categorize concepts
    if (newStrength < 0.4) {
      struggledConcepts.push(conceptTag);
    } else if (newStrength >= 0.7) {
      masteredConcepts.push(conceptTag);
    }
  }

  // Update module attempt
  await prisma.moduleAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      durationSeconds,
      codeSubmitted,
      testResults,
      performanceScore: performanceScoreData.overall,
      struggledConcepts,
      masteredConcepts,
    },
  });

  // Determine if this was a success
  const wasSuccess = performanceScoreData.overall >= 0.6;

  // Update enrollment metrics
  await updateEnrollmentMetrics(
    enrollment.id,
    performanceScoreData.overall,
    wasSuccess
  );

  // Add to completed modules
  await addCompletedModule(enrollment.id, module.id);

  // Update average metrics
  await updateAverageMetrics(enrollment.id);

  // Check for intensity adjustment
  const updatedEnrollment = await prisma.enrollment.findUnique({
    where: { id: enrollment.id },
  });

  let intensityChanged = false;
  let newIntensity: string | undefined;

  if (updatedEnrollment) {
    const intensityAdjustment = shouldAdjustIntensity(
      updatedEnrollment.currentIntensity,
      updatedEnrollment.performanceScore,
      updatedEnrollment.consecutiveSuccesses,
      updatedEnrollment.consecutiveStruggles
    );

    if (intensityAdjustment) {
      await updateEnrollmentIntensity(
        enrollment.id,
        intensityAdjustment.to,
        intensityAdjustment.reason
      );
      intensityChanged = true;
      newIntensity = intensityAdjustment.to;
    }
  }

  return {
    success: true,
    performanceScore: performanceScoreData.overall,
    intensityChanged,
    newIntensity,
    struggledConcepts,
    masteredConcepts,
  };
}

/**
 * Update module attempt progress (for autosave)
 */
export async function updateModuleAttemptProgress(
  attemptId: string,
  editorState?: string,
  hintsUsed?: number,
  messageCount?: number,
  testResults?: any,
  passedTests?: number,
  totalTests?: number
): Promise<void> {
  const updateData: any = {};

  if (editorState !== undefined) updateData.editorState = editorState;
  if (hintsUsed !== undefined) updateData.hintsUsed = hintsUsed;
  if (messageCount !== undefined) updateData.messageCount = messageCount;
  if (testResults !== undefined) updateData.testResults = testResults;
  if (passedTests !== undefined) updateData.passedTests = passedTests;
  if (totalTests !== undefined) updateData.totalTests = totalTests;

  if (Object.keys(updateData).length > 0) {
    await prisma.moduleAttempt.update({
      where: { id: attemptId },
      data: updateData,
    });
  }
}

/**
 * Skip a module attempt
 */
export async function skipModuleAttempt(
  attemptId: string,
  reason?: string
): Promise<void> {
  await prisma.moduleAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'SKIPPED',
      completedAt: new Date(),
    },
  });

  console.log(`Module attempt ${attemptId} skipped. Reason: ${reason || 'User choice'}`);
}

/**
 * Get current module attempt for a session
 */
export async function getCurrentModuleAttempt(
  userId: string,
  sessionId: string
) {
  const attempt = await prisma.moduleAttempt.findFirst({
    where: {
      userId,
      sessionId,
      status: 'IN_PROGRESS',
    },
    include: {
      Module: true,
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  return attempt;
}

/**
 * Get module attempt history for a user
 */
export async function getModuleAttemptHistory(
  userId: string,
  moduleId: string
) {
  const attempts = await prisma.moduleAttempt.findMany({
    where: {
      userId,
      moduleId,
    },
    orderBy: {
      startedAt: 'desc',
    },
    take: 10,
  });

  return attempts;
}

/**
 * Check if user should be offered a remedial module
 */
export async function shouldOfferRemedial(
  userId: string,
  enrollmentId: string,
  struggledConcepts: string[]
): Promise<{
  shouldOffer: boolean;
  remedialModuleId?: string;
  reason?: string;
}> {
  if (struggledConcepts.length === 0) {
    return { shouldOffer: false };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    return { shouldOffer: false };
  }

  // Offer remedial if struggling for 2+ consecutive modules
  if (enrollment.consecutiveStruggles >= 2) {
    // Find a remedial module for the struggled concepts
    const remedialModule = await prisma.module.findFirst({
      where: {
        stackId: enrollment.stackId,
        moduleType: 'REMEDIAL',
        isActive: true,
        conceptTags: {
          hasSome: struggledConcepts,
        },
        id: {
          notIn: enrollment.completedModuleIds,
        },
      },
    });

    if (remedialModule) {
      return {
        shouldOffer: true,
        remedialModuleId: remedialModule.id,
        reason: `Let's reinforce ${struggledConcepts[0]} with a simpler exercise`,
      };
    }
  }

  return { shouldOffer: false };
}

/**
 * Record that a module was triggered by another module (for remedial tracking)
 */
export async function recordTriggeredModule(
  attemptId: string,
  triggeredByModuleId: string,
  wasRemedial: boolean = false
): Promise<void> {
  await prisma.moduleAttempt.update({
    where: { id: attemptId },
    data: {
      triggeredByModule: triggeredByModuleId,
      wasRemedial,
    },
  });
}
