/**
 * Intensity Manager
 * 
 * Manages dynamic intensity level adjustments based on user performance
 */

import { IntensityLevel } from '@prisma/client';
import { IntensityAdjustment, INTENSITY_THRESHOLDS } from './types';

/**
 * Determine if intensity should be adjusted
 */
export function shouldAdjustIntensity(
  currentIntensity: IntensityLevel,
  performanceScore: number,
  consecutiveSuccesses: number,
  consecutiveStruggles: number
): IntensityAdjustment | null {
  // Check for level up
  if (
    currentIntensity !== 'INTENSIVE' &&
    consecutiveSuccesses >= INTENSITY_THRESHOLDS.LEVEL_UP.consecutiveSuccesses &&
    performanceScore >= INTENSITY_THRESHOLDS.LEVEL_UP.minPerformanceScore
  ) {
    const to = currentIntensity === 'CASUAL' ? 'STANDARD' : 'INTENSIVE';
    return {
      from: currentIntensity,
      to,
      reason: `Excellent performance! ${consecutiveSuccesses} consecutive successes with ${(performanceScore * 100).toFixed(0)}% score.`,
      triggeredBy: 'success_streak',
    };
  }

  // Check for level down
  if (
    currentIntensity !== 'CASUAL' &&
    consecutiveStruggles >= INTENSITY_THRESHOLDS.LEVEL_DOWN.consecutiveStruggles &&
    performanceScore <= INTENSITY_THRESHOLDS.LEVEL_DOWN.maxPerformanceScore
  ) {
    const to = currentIntensity === 'INTENSIVE' ? 'STANDARD' : 'CASUAL';
    return {
      from: currentIntensity,
      to,
      reason: `Let's slow down and reinforce fundamentals. ${consecutiveStruggles} struggles detected.`,
      triggeredBy: 'struggle_streak',
    };
  }

  return null;
}

/**
 * Get module count range for intensity level
 */
export function getModuleCountRange(intensity: IntensityLevel): { min: number; max: number } {
  switch (intensity) {
    case 'CASUAL':
      return { min: 30, max: 50 };
    case 'STANDARD':
      return { min: 60, max: 80 };
    case 'INTENSIVE':
      return { min: 100, max: 150 };
  }
}

/**
 * Get description for intensity level
 */
export function getIntensityDescription(intensity: IntensityLevel): string {
  switch (intensity) {
    case 'CASUAL':
      return 'Focus on core concepts with more scaffolding and practice';
    case 'STANDARD':
      return 'Balanced depth and breadth with moderate challenges';
    case 'INTENSIVE':
      return 'Deep expertise with advanced patterns and complex challenges';
  }
}

/**
 * Calculate recommended intensity based on initial assessment
 */
export function calculateInitialIntensity(assessmentScore: number): IntensityLevel {
  if (assessmentScore >= 0.7) {
    return 'INTENSIVE';
  } else if (assessmentScore >= 0.4) {
    return 'STANDARD';
  } else {
    return 'CASUAL';
  }
}

/**
 * Get intensity level numeric value (for comparisons)
 */
export function getIntensityLevel(intensity: IntensityLevel): number {
  switch (intensity) {
    case 'CASUAL':
      return 1;
    case 'STANDARD':
      return 2;
    case 'INTENSIVE':
      return 3;
  }
}

/**
 * Check if module is appropriate for intensity level
 */
export function isModuleAppropriateForIntensity(
  moduleType: string,
  moduleDifficulty: string,
  userIntensity: IntensityLevel
): boolean {
  const intensityLevel = getIntensityLevel(userIntensity);

  // CASUAL: Only CORE, PRACTICE, REMEDIAL, ASSESSMENT
  if (intensityLevel === 1) {
    if (moduleType === 'CHALLENGE') return false;
    if (moduleDifficulty === 'HARD') return false;
  }

  // STANDARD: All except some CHALLENGE
  if (intensityLevel === 2) {
    if (moduleType === 'CHALLENGE' && moduleDifficulty === 'HARD') return false;
  }

  // INTENSIVE: All modules
  return true;
}
