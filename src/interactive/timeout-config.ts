/**
 * Centralized Timeout Configuration
 *
 * Eliminates hardcoded timeout values throughout the codebase
 * and provides a single source of truth for all timeout settings.
 */

import { ComponentType } from './component-factory.js';

export const TIMEOUT_CONFIG = {
  // Service Registry Timeouts
  DEFAULT_SERVICE: 10000,           // 10 seconds
  SERVICE_RETRY_DELAY_BASE: 1000,   // 1 second base for exponential backoff
  SERVICE_RETRY_DELAY_MAX: 5000,    // 5 seconds max delay

  // Component-specific Timeouts
  AI_CLIENT: 5000,                  // 5 seconds
  ENHANCED_CLIENT: 10000,           // 10 seconds
  PROJECT_CONTEXT: 1000,            // 1 second (lightweight)
  INTENT_ANALYZER: 8000,            // 8 seconds (depends on aiClient)
  CONVERSATION_MANAGER: 1000,       // 1 second (no async init)
  TASK_PLANNER: 12000,              // 12 seconds (depends on enhancedClient + projectContext)
  ADVANCED_CONTEXT_MANAGER: 15000,  // 15 seconds
  QUERY_DECOMPOSITION_ENGINE: 10000, // 10 seconds
  CODE_KNOWLEDGE_GRAPH: 25000,      // 25 seconds
  MULTI_STEP_QUERY_PROCESSOR: 5000, // 5 seconds
  NATURAL_LANGUAGE_ROUTER: 15000,   // 15 seconds (depends on aiClient + enhancedClient + projectContext)

  // Interactive Mode Timeouts
  COMPONENT_LOADING: 30000,         // 30 seconds for essential components
  ROUTING_TIMEOUT: 15000,           // 15 seconds for routing
  PLAN_EXECUTION: 60000,            // 60 seconds for plan execution
  USER_INPUT: 300000,               // 5 minutes for user input
  BACKGROUND_CLEANUP: 5000,         // 5 seconds for cleanup
  AI_STREAMING: 120000,             // 2 minutes for AI streaming responses

  // Dependency Resolution
  DEPENDENCY_CHECK_INTERVAL: 100,   // 100ms between dependency checks
  DEPENDENCY_WAIT_DEFAULT: 10000,   // 10 seconds default dependency wait

  // UI Delays
  INITIALIZATION_DELAY: 100,        // 100ms for initialization delays

  // Health Checks
  HEALTH_CHECK_INTERVAL: 30000,     // 30 seconds between health checks
  HEALTH_CHECK_TIMEOUT: 5000,       // 5 seconds per health check

  // Performance Monitoring
  MONITORING_INTERVAL: 5000,        // 5 seconds between performance samples
  SLOW_COMPONENT_THRESHOLD: 5000,   // 5 seconds to consider component slow

  // Retry Configuration
  DEFAULT_RETRIES: 2,               // 2 retries by default
  MAX_RETRIES: 5,                   // Maximum retries allowed
} as const;

/**
 * Dynamic timeout mapping based on component name patterns
 */
const COMPONENT_TIMEOUT_MAP = new Map<string, keyof typeof TIMEOUT_CONFIG>([
  // Direct mappings
  ['aiClient', 'AI_CLIENT'],
  ['enhancedClient', 'ENHANCED_CLIENT'],
  ['projectContext', 'PROJECT_CONTEXT'],
  ['intentAnalyzer', 'INTENT_ANALYZER'],
  ['conversationManager', 'CONVERSATION_MANAGER'],
  ['taskPlanner', 'TASK_PLANNER'],
  ['advancedContextManager', 'ADVANCED_CONTEXT_MANAGER'],
  ['queryDecompositionEngine', 'QUERY_DECOMPOSITION_ENGINE'],
  ['codeKnowledgeGraph', 'CODE_KNOWLEDGE_GRAPH'],
  ['multiStepQueryProcessor', 'MULTI_STEP_QUERY_PROCESSOR'],
  ['naturalLanguageRouter', 'NATURAL_LANGUAGE_ROUTER'],
]);

/**
 * Get timeout for a specific component type
 */
export function getComponentTimeout(component: ComponentType): number {
  const timeoutKey = COMPONENT_TIMEOUT_MAP.get(component);
  if (timeoutKey && timeoutKey in TIMEOUT_CONFIG) {
    return TIMEOUT_CONFIG[timeoutKey] as number;
  }
  return TIMEOUT_CONFIG.DEFAULT_SERVICE;
}

/**
 * Calculate exponential backoff delay for retries
 */
export function getRetryDelay(attempt: number): number {
  return Math.min(
    TIMEOUT_CONFIG.SERVICE_RETRY_DELAY_BASE * Math.pow(2, attempt),
    TIMEOUT_CONFIG.SERVICE_RETRY_DELAY_MAX
  );
}

/**
 * Create a timeout promise that can be cancelled
 */
export function createCancellableTimeout(
  timeoutMs: number,
  errorMessage: string
): { promise: Promise<never>; cancel: () => void } {
  let timeoutHandle: NodeJS.Timeout;

  const promise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  const cancel = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  };

  return { promise, cancel };
}