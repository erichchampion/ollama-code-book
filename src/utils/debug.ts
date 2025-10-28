/**
 * Debug mode utilities
 */

/**
 * Check if debug mode is enabled
 *
 * Debug mode is enabled when LOG_LEVEL is 'debug' or '0'
 *
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === '0';
}
