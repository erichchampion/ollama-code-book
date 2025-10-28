/**
 * Timeout Constants
 *
 * Centralized timeout values to replace hardcoded values throughout the application
 */

/**
 * WebSocket and IDE Integration timeouts
 */
export const IDE_TIMEOUTS = {
  /** Client connection timeout (1 minute) */
  CLIENT_TIMEOUT: 60000,

  /** Heartbeat check interval (30 seconds) */
  HEARTBEAT_INTERVAL: 30000,

  /** VS Code connection timeout (10 seconds) */
  VSCODE_CONNECTION_TIMEOUT: 10000,

  /** Request timeout (30 seconds) */
  REQUEST_TIMEOUT: 30000
} as const;

/**
 * General application timeouts
 */
export const APP_TIMEOUTS = {
  /** Short operations (5 seconds) */
  SHORT: 5000,

  /** Medium operations (30 seconds) */
  MEDIUM: 30000,

  /** Long operations (2 minutes) */
  LONG: 120000,

  /** Very long operations (5 minutes) */
  VERY_LONG: 300000
} as const;

/**
 * Cache and memory management timeouts
 */
export const CACHE_TIMEOUTS = {
  /** Default cache TTL (5 minutes) */
  DEFAULT_TTL: 300000,

  /** File cache TTL (10 minutes) */
  FILE_CACHE_TTL: 600000,

  /** AI response cache TTL (1 hour) */
  AI_CACHE_TTL: 3600000,

  /** Memory warning cooldown (5 minutes) */
  WARNING_COOLDOWN: 300000,

  /** Memory cleanup interval (1 minute) */
  CLEANUP_INTERVAL: 60000
} as const;

/**
 * Tool and execution timeouts
 */
export const EXECUTION_TIMEOUTS = {
  /** Default command execution (30 seconds) */
  DEFAULT_COMMAND: 30000,

  /** Git operations (1 minute) */
  GIT_OPERATION: 60000,

  /** Test execution (2 minutes) */
  TEST_EXECUTION: 120000,

  /** Build operations (5 minutes) */
  BUILD_OPERATION: 300000
} as const;

/**
 * Performance monitoring timeouts
 */
export const MONITORING_TIMEOUTS = {
  /** Performance check interval (1 minute) */
  PERFORMANCE_CHECK: 60000,

  /** Metrics collection interval (30 seconds) */
  METRICS_INTERVAL: 30000,

  /** Health check timeout (10 seconds) */
  HEALTH_CHECK: 10000
} as const;

/**
 * Get timeout value safely with fallback
 */
export function getTimeout(timeouts: Record<string, number>, key: string, fallback: number = 30000): number {
  return timeouts[key] || fallback;
}