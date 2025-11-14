/**
 * Buffer and Memory Limit Constants
 *
 * Centralized buffer size and memory limits to replace hardcoded values.
 * All limits can be overridden via environment variables for flexibility.
 */

/**
 * Get numeric limit from environment variable or use default
 * @param envVar - Environment variable name
 * @param defaultValue - Default value in bytes if env var not set
 * @returns Limit value in bytes
 */
function getEnvBytes(envVar: string, defaultValue: number): number {
  const envValue = process.env[envVar];
  if (envValue) {
    const parsed = parseFloat(envValue);
    if (!isNaN(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }
  return defaultValue;
}

/**
 * Process Execution Buffer Limits
 * Used for child_process.exec maxBuffer option
 * Environment variable overrides: BUFFER_EXEC_*, etc.
 */
export const EXEC_BUFFER_LIMITS = {
  /** Default execution buffer (5MB) - override with BUFFER_EXEC_DEFAULT */
  DEFAULT: getEnvBytes('BUFFER_EXEC_DEFAULT', 5 * 1024 * 1024),

  /** Large execution buffer for search operations (10MB) - override with BUFFER_EXEC_LARGE */
  LARGE: getEnvBytes('BUFFER_EXEC_LARGE', 10 * 1024 * 1024),

  /** Small execution buffer for git operations (1MB) - override with BUFFER_EXEC_SMALL */
  SMALL: getEnvBytes('BUFFER_EXEC_SMALL', 1 * 1024 * 1024)
} as const;

/**
 * File Size Limits
 * Maximum file sizes for various operations
 * Environment variable overrides: BUFFER_FILE_*, etc.
 */
export const FILE_SIZE_LIMITS = {
  /** Maximum file read size (10MB) - override with BUFFER_FILE_READ */
  READ: getEnvBytes('BUFFER_FILE_READ', 10 * 1024 * 1024),

  /** Maximum code analysis file size (1MB) - override with BUFFER_FILE_ANALYSIS */
  ANALYSIS: getEnvBytes('BUFFER_FILE_ANALYSIS', 1 * 1024 * 1024),

  /** Maximum text processing size (5MB) - override with BUFFER_FILE_TEXT */
  TEXT_PROCESSING: getEnvBytes('BUFFER_FILE_TEXT', 5 * 1024 * 1024),

  /** Maximum safe file size for general operations (10MB) - override with BUFFER_FILE_SAFE */
  SAFE: getEnvBytes('BUFFER_FILE_SAFE', 10 * 1024 * 1024),

  /** Maximum safe file size for security checks (100MB) - override with BUFFER_FILE_SAFE_MAX */
  SAFE_MAX: getEnvBytes('BUFFER_FILE_SAFE_MAX', 100 * 1024 * 1024),

  /** Maximum interactive file size (1MB) - override with BUFFER_FILE_INTERACTIVE */
  INTERACTIVE: getEnvBytes('BUFFER_FILE_INTERACTIVE', 1 * 1024 * 1024)
} as const;

/**
 * Stream and Communication Buffer Limits
 * Used for WebSocket, IPC, and other streaming operations
 * Environment variable overrides: BUFFER_STREAM_*, etc.
 */
export const STREAM_BUFFER_LIMITS = {
  /** Maximum WebSocket message size (1MB) - override with BUFFER_STREAM_WEBSOCKET */
  WEBSOCKET_MESSAGE: getEnvBytes('BUFFER_STREAM_WEBSOCKET', 1 * 1024 * 1024),

  /** Maximum tool output size (1MB) - override with BUFFER_STREAM_TOOL_OUTPUT */
  TOOL_OUTPUT: getEnvBytes('BUFFER_STREAM_TOOL_OUTPUT', 1 * 1024 * 1024),

  /** Maximum JSON payload size (1MB) - override with BUFFER_STREAM_JSON */
  JSON_PAYLOAD: getEnvBytes('BUFFER_STREAM_JSON', 1 * 1024 * 1024)
} as const;

/**
 * Chunk Size Limits
 * Used for stream processing and file reading operations
 * Environment variable overrides: BUFFER_CHUNK_*, etc.
 */
export const CHUNK_SIZE_LIMITS = {
  /** Default file read chunk size (64KB) - override with BUFFER_CHUNK_FILE_READ */
  FILE_READ: getEnvBytes('BUFFER_CHUNK_FILE_READ', 64 * 1024),

  /** Large chunk size for bulk operations (256KB) - override with BUFFER_CHUNK_LARGE */
  LARGE: getEnvBytes('BUFFER_CHUNK_LARGE', 256 * 1024),

  /** Small chunk size for memory-constrained operations (16KB) - override with BUFFER_CHUNK_SMALL */
  SMALL: getEnvBytes('BUFFER_CHUNK_SMALL', 16 * 1024)
} as const;

/**
 * Memory Limits
 * Used for in-memory operations and caching
 * Environment variable overrides: BUFFER_MEMORY_*, etc.
 */
export const MEMORY_LIMITS = {
  /** Default memory limit for operations (1024MB) - override with BUFFER_MEMORY_LIMIT */
  DEFAULT: getEnvBytes('BUFFER_MEMORY_LIMIT', 1024 * 1024 * 1024),

  /** Memory warning threshold (512MB) - override with BUFFER_MEMORY_WARNING */
  WARNING_THRESHOLD: getEnvBytes('BUFFER_MEMORY_WARNING', 512 * 1024 * 1024),

  /** Maximum cache size in bytes (100MB) - override with BUFFER_MEMORY_CACHE */
  CACHE_MAX: getEnvBytes('BUFFER_MEMORY_CACHE', 100 * 1024 * 1024)
} as const;

/**
 * Safety Margins
 * Buffer safety factors and overflow protection
 */
export const BUFFER_SAFETY = {
  /** Safety margin multiplier for buffer allocation (1.5x) */
  MARGIN_MULTIPLIER: 1.5,

  /** Minimum buffer size to prevent underflow (1KB) */
  MINIMUM_SIZE: 1024,

  /** Maximum buffer size to prevent OOM (500MB) */
  MAXIMUM_SIZE: 500 * 1024 * 1024
} as const;

/**
 * Helper function to get a buffer limit by category and key
 * @param category - Buffer limit category object
 * @param key - Limit key to retrieve
 * @param fallback - Fallback value if key doesn't exist
 * @returns Buffer limit value in bytes
 */
export function getBufferLimit(
  category: Record<string, number>,
  key: string,
  fallback: number = 0
): number {
  return category[key] ?? fallback;
}

/**
 * Helper function to validate buffer size is within safe limits
 * @param size - Buffer size to validate
 * @param max - Maximum allowed size (defaults to BUFFER_SAFETY.MAXIMUM_SIZE)
 * @returns true if size is safe, false otherwise
 */
export function isBufferSizeSafe(size: number, max: number = BUFFER_SAFETY.MAXIMUM_SIZE): boolean {
  return size >= BUFFER_SAFETY.MINIMUM_SIZE && size <= max;
}

/**
 * Helper function to calculate safe buffer size with margin
 * @param baseSize - Base buffer size needed
 * @returns Safe buffer size with margin applied
 */
export function getSafeBufferSize(baseSize: number): number {
  const sizeWithMargin = Math.ceil(baseSize * BUFFER_SAFETY.MARGIN_MULTIPLIER);
  return Math.min(sizeWithMargin, BUFFER_SAFETY.MAXIMUM_SIZE);
}

/**
 * Convert bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Human-readable string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
