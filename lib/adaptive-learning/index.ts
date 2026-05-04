/**
 * Adaptive Learning System - Main Export
 * 
 * Central hub for the performance-based adaptive learning system
 */

// Type exports
export * from './types';

// Performance analysis
export {
  calculatePerformanceScore,
  analyzeConceptTrend,
  detectStruggle,
  updateConceptStrength,
  calculateAverageMetrics,
} from './performance-analyzer';

// Intensity management
export {
  shouldAdjustIntensity,
  getModuleCountRange,
  getIntensityDescription,
  calculateInitialIntensity,
  getIntensityLevel,
  isModuleAppropriateForIntensity,
} from './intensity-manager';

// Prerequisite checking
export {
  checkPrerequisites,
  calculateReadinessScore,
  findPrerequisiteModules,
  parsePrerequisites,
} from './prerequisite-checker';

// Module recommendation
export {
  recommendNextModules,
  findRemedialModules,
  findPracticeModules,
} from './module-recommender';

// Enrollment management
export {
  initializeEnrollment,
  updateAvailableModules,
  updateEnrollmentMetrics,
  addCompletedModule,
  updateEnrollmentIntensity,
  getEnrollmentContext,
  updateAverageMetrics as updateEnrollmentAverageMetrics,
} from './enrollment-manager';

// Progression tracking
export {
  startModuleAttempt,
  completeModuleAttempt,
  updateModuleAttemptProgress,
  skipModuleAttempt,
  getCurrentModuleAttempt,
  getModuleAttemptHistory,
  shouldOfferRemedial,
  recordTriggeredModule,
} from './progression-tracker';
