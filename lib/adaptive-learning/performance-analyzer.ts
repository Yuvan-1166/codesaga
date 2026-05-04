/**
 * Performance Analyzer
 * 
 * Analyzes user performance on modules and computes performance scores
 */

import {
  PerformanceMetrics,
  PerformanceScore,
  ConceptAnalysis,
  StruggleDetection,
  PERFORMANCE_WEIGHTS,
} from './types';

/**
 * Calculate overall performance score from metrics
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics, estimatedMinutes: number): PerformanceScore {
  // Speed score: How fast compared to estimated time
  const actualMinutes = metrics.completionTime / 60;
  const speedRatio = estimatedMinutes / actualMinutes;
  const speed = Math.min(1.0, Math.max(0.0, speedRatio));

  // Accuracy score: Test pass rate
  const accuracy = metrics.testPassRate;

  // Independence score: Inverse of hints used (normalized)
  const maxHints = 5; // Assume 5 hints is very dependent
  const independence = Math.max(0.0, 1.0 - (metrics.hintsUsed / maxHints));

  // Bonus for first attempt pass
  const firstAttemptBonus = metrics.firstAttemptPass ? 0.1 : 0.0;

  // Weighted overall score
  const overall = Math.min(1.0,
    (speed * PERFORMANCE_WEIGHTS.speed) +
    (accuracy * PERFORMANCE_WEIGHTS.accuracy) +
    (independence * PERFORMANCE_WEIGHTS.independence) +
    firstAttemptBonus
  );

  return {
    overall,
    speed,
    accuracy,
    independence,
  };
}

/**
 * Analyze concept performance trends
 */
export function analyzeConceptTrend(
  conceptTag: string,
  currentStrength: number,
  recentPerformances: number[]
): ConceptAnalysis {
  if (recentPerformances.length === 0) {
    return {
      conceptTag,
      currentStrength,
      recentPerformance: [],
      trend: 'stable',
      needsReinforcement: currentStrength < 0.5,
    };
  }

  // Calculate trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  
  if (recentPerformances.length >= 2) {
    const recent = recentPerformances.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    
    if (avg > currentStrength + 0.1) {
      trend = 'improving';
    } else if (avg < currentStrength - 0.1) {
      trend = 'declining';
    }
  }

  // Needs reinforcement if:
  // - Current strength is low (< 0.5)
  // - Declining trend
  // - Recent performance below threshold
  const avgRecent = recentPerformances.reduce((a, b) => a + b, 0) / recentPerformances.length;
  const needsReinforcement = 
    currentStrength < 0.5 || 
    trend === 'declining' || 
    avgRecent < 0.4;

  return {
    conceptTag,
    currentStrength,
    recentPerformance: recentPerformances,
    trend,
    needsReinforcement,
  };
}

/**
 * Detect if user is struggling
 */
export function detectStruggle(
  performanceScore: number,
  consecutiveStruggles: number,
  hintsUsed: number,
  timeSpent: number,
  estimatedMinutes: number,
  conceptStrengths: Map<string, number>,
  currentConceptTags: string[]
): StruggleDetection {
  const reasons: string[] = [];
  const suggestedActions: ('remedial' | 'practice' | 'break' | 'intensity_down')[] = [];
  const struggledConcepts: string[] = [];

  // Check performance score
  if (performanceScore < 0.4) {
    reasons.push('Low performance score');
  }

  // Check consecutive struggles
  if (consecutiveStruggles >= 2) {
    reasons.push('Multiple consecutive struggles');
    suggestedActions.push('intensity_down');
  }

  // Check hints usage
  if (hintsUsed >= 3) {
    reasons.push('High hint usage');
    suggestedActions.push('practice');
  }

  // Check time spent
  const actualMinutes = timeSpent / 60;
  if (actualMinutes > estimatedMinutes * 2) {
    reasons.push('Taking significantly longer than expected');
    suggestedActions.push('break');
  }

  // Check concept strengths
  for (const conceptTag of currentConceptTags) {
    const strength = conceptStrengths.get(conceptTag) || 0;
    if (strength < 0.3) {
      struggledConcepts.push(conceptTag);
    }
  }

  if (struggledConcepts.length > 0) {
    reasons.push(`Weak concepts: ${struggledConcepts.join(', ')}`);
    suggestedActions.push('remedial');
  }

  const isStruggling = reasons.length > 0;

  return {
    isStruggling,
    reasons,
    suggestedActions,
    struggledConcepts,
  };
}

/**
 * Update concept strength based on performance
 */
export function updateConceptStrength(
  currentStrength: number,
  performanceScore: number,
  conceptWeight: number = 1.0
): number {
  // Learning rate: how much to adjust strength
  const learningRate = 0.15;
  
  // Weighted performance
  const weightedPerformance = performanceScore * conceptWeight;
  
  // Calculate delta
  const delta = (weightedPerformance - currentStrength) * learningRate;
  
  // Apply delta with bounds
  const newStrength = Math.max(0.0, Math.min(1.0, currentStrength + delta));
  
  return newStrength;
}

/**
 * Calculate average performance metrics
 */
export function calculateAverageMetrics(
  attempts: Array<{
    durationSeconds: number | null;
    passedTests: number;
    totalTests: number;
    hintsUsed: number;
  }>
): {
  avgCompletionTime: number | null;
  avgTestPassRate: number | null;
  totalHintsUsed: number;
} {
  if (attempts.length === 0) {
    return {
      avgCompletionTime: null,
      avgTestPassRate: null,
      totalHintsUsed: 0,
    };
  }

  const validDurations = attempts
    .filter(a => a.durationSeconds !== null)
    .map(a => a.durationSeconds!);

  const avgCompletionTime = validDurations.length > 0
    ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length / 60)
    : null;

  const passRates = attempts
    .filter(a => a.totalTests > 0)
    .map(a => a.passedTests / a.totalTests);

  const avgTestPassRate = passRates.length > 0
    ? passRates.reduce((a, b) => a + b, 0) / passRates.length
    : null;

  const totalHintsUsed = attempts.reduce((sum, a) => sum + a.hintsUsed, 0);

  return {
    avgCompletionTime,
    avgTestPassRate,
    totalHintsUsed,
  };
}
