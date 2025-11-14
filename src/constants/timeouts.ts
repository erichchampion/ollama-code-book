/**
 * Timeout Constants
 *
 * Centralized timeout values to replace hardcoded values throughout the application.
 * All timeouts can be overridden via environment variables.
 */

/**
 * Get timeout value from environment variable or use default
 * @param envVar - Environment variable name
 * @param defaultValue - Default value if env var not set
 * @returns Timeout value in milliseconds
 */
function getEnvTimeout(envVar: string, defaultValue: number): number {
  const envValue = process.env[envVar];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * WebSocket and IDE Integration timeouts
 * Environment variable overrides: IDE_CLIENT_TIMEOUT, IDE_HEARTBEAT_INTERVAL, etc.
 */
export const IDE_TIMEOUTS = {
  /** Client connection timeout (1 minute) - override with IDE_CLIENT_TIMEOUT */
  CLIENT_TIMEOUT: getEnvTimeout('IDE_CLIENT_TIMEOUT', 60000),

  /** Heartbeat check interval (30 seconds) - override with IDE_HEARTBEAT_INTERVAL */
  HEARTBEAT_INTERVAL: getEnvTimeout('IDE_HEARTBEAT_INTERVAL', 30000),

  /** VS Code connection timeout (10 seconds) - override with IDE_VSCODE_CONNECTION_TIMEOUT */
  VSCODE_CONNECTION_TIMEOUT: getEnvTimeout('IDE_VSCODE_CONNECTION_TIMEOUT', 10000),

  /** Request timeout (30 seconds) - override with IDE_REQUEST_TIMEOUT */
  REQUEST_TIMEOUT: getEnvTimeout('IDE_REQUEST_TIMEOUT', 30000)
} as const;

/**
 * General application timeouts
 * Environment variable overrides: APP_TIMEOUT_SHORT, APP_TIMEOUT_MEDIUM, etc.
 */
export const APP_TIMEOUTS = {
  /** Short operations (5 seconds) - override with APP_TIMEOUT_SHORT */
  SHORT: getEnvTimeout('APP_TIMEOUT_SHORT', 5000),

  /** Medium operations (30 seconds) - override with APP_TIMEOUT_MEDIUM */
  MEDIUM: getEnvTimeout('APP_TIMEOUT_MEDIUM', 30000),

  /** Long operations (2 minutes) - override with APP_TIMEOUT_LONG */
  LONG: getEnvTimeout('APP_TIMEOUT_LONG', 120000),

  /** Very long operations (5 minutes) - override with APP_TIMEOUT_VERY_LONG */
  VERY_LONG: getEnvTimeout('APP_TIMEOUT_VERY_LONG', 300000)
} as const;

/**
 * Cache and memory management timeouts
 * Environment variable overrides: CACHE_DEFAULT_TTL, CACHE_FILE_CACHE_TTL, etc.
 */
export const CACHE_TIMEOUTS = {
  /** Default cache TTL (5 minutes) - override with CACHE_DEFAULT_TTL */
  DEFAULT_TTL: getEnvTimeout('CACHE_DEFAULT_TTL', 300000),

  /** File cache TTL (10 minutes) - override with CACHE_FILE_CACHE_TTL */
  FILE_CACHE_TTL: getEnvTimeout('CACHE_FILE_CACHE_TTL', 600000),

  /** AI response cache TTL (1 hour) - override with CACHE_AI_CACHE_TTL */
  AI_CACHE_TTL: getEnvTimeout('CACHE_AI_CACHE_TTL', 3600000),

  /** Memory warning cooldown (5 minutes) - override with CACHE_WARNING_COOLDOWN */
  WARNING_COOLDOWN: getEnvTimeout('CACHE_WARNING_COOLDOWN', 300000),

  /** Memory cleanup interval (1 minute) - override with CACHE_CLEANUP_INTERVAL */
  CLEANUP_INTERVAL: getEnvTimeout('CACHE_CLEANUP_INTERVAL', 60000)
} as const;

/**
 * Tool and execution timeouts
 * Environment variable overrides: EXEC_DEFAULT_COMMAND, EXEC_GIT_OPERATION, etc.
 */
export const EXECUTION_TIMEOUTS = {
  /** Default command execution (30 seconds) - override with EXEC_DEFAULT_COMMAND */
  DEFAULT_COMMAND: getEnvTimeout('EXEC_DEFAULT_COMMAND', 30000),

  /** Git operations (1 minute) - override with EXEC_GIT_OPERATION */
  GIT_OPERATION: getEnvTimeout('EXEC_GIT_OPERATION', 60000),

  /** Test execution (2 minutes) - override with EXEC_TEST_EXECUTION */
  TEST_EXECUTION: getEnvTimeout('EXEC_TEST_EXECUTION', 120000),

  /** Build operations (5 minutes) - override with EXEC_BUILD_OPERATION */
  BUILD_OPERATION: getEnvTimeout('EXEC_BUILD_OPERATION', 300000)
} as const;

/**
 * Performance monitoring timeouts
 * Environment variable overrides: MONITOR_PERFORMANCE_CHECK, MONITOR_METRICS_INTERVAL, etc.
 */
export const MONITORING_TIMEOUTS = {
  /** Performance check interval (1 minute) - override with MONITOR_PERFORMANCE_CHECK */
  PERFORMANCE_CHECK: getEnvTimeout('MONITOR_PERFORMANCE_CHECK', 60000),

  /** Metrics collection interval (30 seconds) - override with MONITOR_METRICS_INTERVAL */
  METRICS_INTERVAL: getEnvTimeout('MONITOR_METRICS_INTERVAL', 30000),

  /** Health check timeout (10 seconds) - override with MONITOR_HEALTH_CHECK */
  HEALTH_CHECK: getEnvTimeout('MONITOR_HEALTH_CHECK', 10000)
} as const;

/**
 * Get timeout value safely with fallback
 */
export function getTimeout(timeouts: Record<string, number>, key: string, fallback: number = 30000): number {
  return timeouts[key] || fallback;
}