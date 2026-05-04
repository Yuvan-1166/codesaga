/**
 * Adaptive Learning System - Type Definitions
 * 
 * Core types for the performance-based adaptive learning system
 */

import { ModuleType, DifficultyLevel, IntensityLevel, ModuleAttemptStatus } from '@prisma/client';

// ============================================================================
// Module Prerequisites
// ============================================================================

export interface ModulePrerequisites {
  concepts?: string[];           // Required concept tags
  modules?: string[];            // Required module IDs
  minConceptStrength?: number;   // Minimum strength for concepts (0.0 - 1.0)
}

// ============================================================================
// Concept Weights
// ============================================================================

export interface ConceptWeights {
  [conceptTag: string]: number;  // Weight of each concept (0.0 - 1.0)
}

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetrics {
  completionTime: number;         // Seconds taken
  testPassRate: number;           // 0.0 - 1.0
  hintsUsed: number;
  firstAttemptPass: boolean;
  messageCount: number;
}

export interface PerformanceScore {
  overall: number;                // 0.0 - 1.0
  speed: number;                  // 0.0 - 1.0
  accuracy: number;               // 0.0 - 1.0
  independence: number;           // 0.0 - 1.0 (inverse of hints)
}

// ============================================================================
// Learning Path
// ============================================================================

export interface LearningPathNode {
  moduleId: string;
  reason: string;                 // Why this module was recommended
  priority: number;               // Higher = more important
  estimatedMinutes: number;
}

export interface IntensityAdjustment {
  from: IntensityLevel;
  to: IntensityLevel;
  reason: string;
  triggeredBy: 'success_streak' | 'struggle_streak' | 'performance_score';
}

// ============================================================================
// Module Recommendation Context
// ============================================================================

export interface RecommendationContext {
  userId: string;
  stackId: string;
  enrollmentId: string;
  currentIntensity: IntensityLevel;
  performanceScore: number;
  conceptStrengths: Map<string, number>;
  completedModuleIds: string[];
  consecutiveSuccesses: number;
  consecutiveStruggles: number;
}

// ============================================================================
// Assessment Data
// ============================================================================

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;          // Index of correct option
  conceptTags: string[];
}

export interface ChallengeData {
  description: string;
  requirements: string[];
  testCases: any[];
}

export interface AssessmentResult {
  score: number;                  // 0.0 - 1.0
  conceptScores: Map<string, number>;
  timeSpent: number;
  passed: boolean;
}

// ============================================================================
// Module Filters
// ============================================================================

export interface ModuleFilters {
  stackId: string;
  moduleTypes?: ModuleType[];
  difficultyLevels?: DifficultyLevel[];
  intensityLevels?: IntensityLevel[];
  isActive?: boolean;
  excludeModuleIds?: string[];
}

// ============================================================================
// Performance Analysis
// ============================================================================

export interface ConceptAnalysis {
  conceptTag: string;
  currentStrength: number;
  recentPerformance: number[];    // Last N attempts
  trend: 'improving' | 'stable' | 'declining';
  needsReinforcement: boolean;
}

export interface StruggleDetection {
  isStruggling: boolean;
  reasons: string[];
  suggestedActions: ('remedial' | 'practice' | 'break' | 'intensity_down')[];
  struggledConcepts: string[];
}

// ============================================================================
// Intensity Thresholds
// ============================================================================

export const INTENSITY_THRESHOLDS = {
  LEVEL_UP: {
    consecutiveSuccesses: 5,
    minPerformanceScore: 0.75,
  },
  LEVEL_DOWN: {
    consecutiveStruggles: 3,
    maxPerformanceScore: 0.35,
  },
} as const;

// ============================================================================
// Performance Score Weights
// ============================================================================

export const PERFORMANCE_WEIGHTS = {
  speed: 0.25,
  accuracy: 0.40,
  independence: 0.35,
} as const;

// ============================================================================
// Module Type Priorities (for recommendation)
// ============================================================================

export const MODULE_TYPE_PRIORITY: Record<ModuleType, number> = {
  CORE: 100,
  INTEGRATION: 80,
  PRACTICE: 60,
  ASSESSMENT: 70,
  CHALLENGE: 40,
  REMEDIAL: 90,
};
