/**
 * ID Generation Utilities
 *
 * Secure and reliable ID generation functions to replace
 * unsafe Math.random() based implementations.
 */

import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a cryptographically secure random ID
 */
export function generateSecureId(prefix: string = 'id', length: number = 16): string {
  const randomPart = randomBytes(Math.ceil(length / 2)).toString('hex').substring(0, length);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

/**
 * Generate an operation ID for streaming operations
 */
export function generateOperationId(): string {
  return generateSecureId('op', 9);
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return generateSecureId('session', 12);
}

/**
 * Generate a unique task ID
 */
export function generateTaskId(): string {
  return generateSecureId('task', 8);
}

/**
 * Generate a client ID for WebSocket connections (replaces duplicate implementations)
 */
export function generateClientId(): string {
  return generateSecureId('client', 9);
}

/**
 * Generate a telemetry client ID (anonymous UUID)
 */
export function generateTelemetryClientId(): string {
  return uuidv4();
}

/**
 * Generate a request ID for tracking requests
 */
export function generateRequestId(): string {
  return generateSecureId('req', 8);
}

/**
 * VCS-specific ID generators (replaces deprecated substr() calls)
 */

/**
 * Generate a review ID for pull request reviews
 */
export function generateReviewId(): string {
  return generateSecureId('review', 9);
}

/**
 * Generate a finding ID for review findings
 */
export function generateFindingId(): string {
  return generateSecureId('finding', 9);
}

/**
 * Generate a regression analysis ID
 */
export function generateRegressionId(): string {
  return generateSecureId('regression', 9);
}

/**
 * Generate a quality snapshot ID
 */
export function generateSnapshotId(): string {
  return generateSecureId('snapshot', 9);
}