/**
 * Constants for Interactive Mode
 *
 * Centralizes magic numbers and commonly used values to improve
 * code maintainability and readability.
 */

export const CONSTANTS = {
  // File and project limits
  MAX_FILE_COUNT_ESTIMATE: 1000,
  MAX_FILES_TO_ANALYZE: 5000,
  MAX_FILE_SIZE_BYTES: 1024 * 1024, // 1MB

  // Time intervals and delays
  DEPENDENCY_CHECK_INTERVAL_MS: 100,
  HEALTH_CHECK_INTERVAL_MS: 30000,
  MONITORING_INTERVAL_MS: 5000,
  CLEANUP_DELAY_MS: 500,

  // Performance thresholds
  SLOW_COMPONENT_THRESHOLD_MS: 5000,
  FAST_INITIALIZATION_THRESHOLD_MS: 3000,
  ACCEPTABLE_STARTUP_TIME_MS: 10000,

  // Retry and backoff
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_BASE_DELAY_MS: 1000,
  RETRY_MAX_DELAY_MS: 5000,
  EXPONENTIAL_BACKOFF_FACTOR: 2,

  // Memory and resources
  MEMORY_WARNING_THRESHOLD_MB: 512,
  MEMORY_CRITICAL_THRESHOLD_MB: 1024,
  MAX_CONCURRENT_OPERATIONS: 10,

  // Text and display limits
  MAX_LOG_MESSAGE_LENGTH: 1000,
  MAX_ERROR_CONTEXT_LINES: 5,
  DEFAULT_CONSOLE_WIDTH: 80,

  // Network and I/O
  DEFAULT_PORT: 3000,
  MAX_REQUEST_SIZE_MB: 10,
  CONNECTION_TIMEOUT_MS: 30000,

  // File extensions and patterns
  SUPPORTED_CODE_EXTENSIONS: ['.ts', '.js', '.tsx', '.jsx', '.json', '.md'],
  IGNORED_DIRECTORIES: ['node_modules', '.git', 'dist', 'build', '.next'],

  // Conversion factors
  MS_TO_SECONDS: 1000,
  BYTES_TO_MB: 1024 * 1024,
  MINUTES_TO_MS: 60 * 1000,

  // Default sizes and limits
  DEFAULT_BUFFER_SIZE: 64 * 1024, // 64KB
  MAX_CONTEXT_SIZE: 100000, // characters
  MAX_CONVERSATION_HISTORY: 50, // messages

  // Progress and status
  PROGRESS_UPDATE_INTERVAL_MS: 250,
  STATUS_REFRESH_INTERVAL_MS: 1000,
  SPINNER_UPDATE_INTERVAL_MS: 100,

  // Validation
  MIN_TIMEOUT_MS: 100,
  MAX_TIMEOUT_MS: 300000, // 5 minutes
  MIN_RETRY_COUNT: 0,
  MAX_RETRY_COUNT: 10,
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Exit Codes
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  MISUSE: 2,
  CANNOT_EXECUTE: 126,
  COMMAND_NOT_FOUND: 127,
  INVALID_EXIT_ARGUMENT: 128,
  SIGINT: 130, // Ctrl+C
} as const;

/**
 * Log Levels
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
} as const;

/**
 * Component priorities for initialization order
 */
export const COMPONENT_PRIORITIES = {
  CRITICAL: 0,    // Must be available immediately
  HIGH: 1,        // Needed early in startup
  MEDIUM: 2,      // Needed for normal operation
  LOW: 3,         // Can be deferred
  BACKGROUND: 4,  // Can be initialized in background
} as const;

/**
 * Memory usage categories
 */
export const MEMORY_CATEGORIES = {
  MINIMAL: 'minimal',     // < 100MB
  LIGHT: 'light',         // 100-250MB
  MODERATE: 'moderate',   // 250-500MB
  HEAVY: 'heavy',         // 500-1GB
  EXCESSIVE: 'excessive', // > 1GB
} as const;

/**
 * Performance categories
 */
export const PERFORMANCE_CATEGORIES = {
  EXCELLENT: 'excellent', // < 1s
  GOOD: 'good',          // 1-3s
  ACCEPTABLE: 'acceptable', // 3-10s
  SLOW: 'slow',          // 10-30s
  UNACCEPTABLE: 'unacceptable', // > 30s
} as const;

/**
 * Service name prefixes
 */
export const SERVICE_PREFIXES = {
  COMPONENT: 'component:',
  SHARED: 'shared:',
  SINGLETON: 'singleton:',
  FACTORY: 'factory:',
} as const;

/**
 * Service names for shared services
 */
export const SHARED_SERVICES = {
  PROJECT_CONTEXT: 'shared:projectContext',
  AI_CLIENT: 'shared:aiClient',
  ENHANCED_CLIENT: 'shared:enhancedClient',
} as const;

/**
 * Get memory category based on usage
 */
export function getMemoryCategory(memoryMB: number): string {
  if (memoryMB < 100) return MEMORY_CATEGORIES.MINIMAL;
  if (memoryMB < 250) return MEMORY_CATEGORIES.LIGHT;
  if (memoryMB < 500) return MEMORY_CATEGORIES.MODERATE;
  if (memoryMB < 1024) return MEMORY_CATEGORIES.HEAVY;
  return MEMORY_CATEGORIES.EXCESSIVE;
}

/**
 * Get performance category based on duration
 */
export function getPerformanceCategory(durationMs: number): string {
  if (durationMs < 1000) return PERFORMANCE_CATEGORIES.EXCELLENT;
  if (durationMs < 3000) return PERFORMANCE_CATEGORIES.GOOD;
  if (durationMs < 10000) return PERFORMANCE_CATEGORIES.ACCEPTABLE;
  if (durationMs < 30000) return PERFORMANCE_CATEGORIES.SLOW;
  return PERFORMANCE_CATEGORIES.UNACCEPTABLE;
}

/**
 * Validate timeout value
 */
export function validateTimeout(timeoutMs: number): number {
  return Math.max(
    CONSTANTS.MIN_TIMEOUT_MS,
    Math.min(timeoutMs, CONSTANTS.MAX_TIMEOUT_MS)
  );
}

/**
 * Validate retry count
 */
export function validateRetryCount(retries: number): number {
  return Math.max(
    CONSTANTS.MIN_RETRY_COUNT,
    Math.min(retries, CONSTANTS.MAX_RETRY_COUNT)
  );
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Convert milliseconds to human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}