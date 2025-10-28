/**
 * Component Status Constants
 *
 * Centralized constants for component status values to eliminate
 * hardcoded strings and ensure consistency across the codebase.
 */

export const COMPONENT_STATUSES = {
  NOT_LOADED: 'not-loaded',
  LOADING: 'loading',
  READY: 'ready',
  FAILED: 'failed',
  DEGRADED: 'degraded'
} as const;

export type ComponentStatusValue = typeof COMPONENT_STATUSES[keyof typeof COMPONENT_STATUSES];

export const COMPONENT_STATUS_VALUES = Object.values(COMPONENT_STATUSES);

/**
 * Component status configuration
 */
export const COMPONENT_STATUS_CONFIG = {
  DEGRADATION_THRESHOLD: 3, // Number of failures before marking as degraded
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  HEALTH_CHECK_DELAY: 5000, // 5 seconds initial delay
  SYSTEM_HEALTH_THRESHOLD: 0.8 // 80% components ready for healthy status
} as const;

/**
 * Default component memory estimates (in MB)
 * These can be overridden by configuration
 */
export const DEFAULT_COMPONENT_MEMORY = {
  aiClient: 20,
  enhancedClient: 50,
  projectContext: 30,
  intentAnalyzer: 15,
  taskPlanner: 25,
  conversationManager: 10,
  advancedContextManager: 40,
  queryDecompositionEngine: 35,
  codeKnowledgeGraph: 60,
  multiStepQueryProcessor: 20,
  naturalLanguageRouter: 15
} as const;

export const DEFAULT_FALLBACK_MEMORY = 10; // MB