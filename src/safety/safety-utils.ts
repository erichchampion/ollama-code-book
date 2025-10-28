/**
 * Safety System Utilities
 *
 * Common utility functions used across safety components to eliminate DRY violations
 * and provide consistent behavior.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import {
  SECURITY_PATTERNS,
  FILE_SIZE_THRESHOLDS,
  FILE_CATEGORIES
} from './safety-constants.js';

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file statistics safely
 */
export async function getFileStats(filePath: string): Promise<{
  exists: boolean;
  size?: number;
  lastModified?: Date;
  isDirectory?: boolean;
} | null> {
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      return { exists: false };
    }

    const stats = await fs.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      lastModified: stats.mtime,
      isDirectory: stats.isDirectory(),
    };
  } catch (error) {
    logger.warn(`Failed to get stats for ${filePath}:`, error);
    return null;
  }
}

/**
 * Check if file is a system file based on path patterns
 */
export function isSystemFile(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  return SECURITY_PATTERNS.SYSTEM_FILES.some(pattern => pattern.test(normalizedPath));
}

/**
 * Check if file is a configuration file
 */
export function isConfigFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();

  // Check by extension and filename patterns
  return SECURITY_PATTERNS.CONFIG_FILES.some(pattern => pattern.test(fileName)) ||
         FILE_CATEGORIES.CONFIG.includes(extension as any);
}

/**
 * Check if file is a security-related file (keys, certificates, etc.)
 */
export function isSecurityFile(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  const fullPath = filePath.toLowerCase();

  return SECURITY_PATTERNS.SECURITY_FILES.some(pattern =>
    pattern.test(fileName) || pattern.test(fullPath)
  );
}

/**
 * Categorize file size
 */
export function categorizeFileSize(sizeBytes: number): 'small' | 'medium' | 'large' | 'huge' {
  if (sizeBytes <= FILE_SIZE_THRESHOLDS.SMALL_FILE) return 'small';
  if (sizeBytes <= FILE_SIZE_THRESHOLDS.MEDIUM_FILE) return 'medium';
  if (sizeBytes <= FILE_SIZE_THRESHOLDS.LARGE_FILE) return 'large';
  return 'huge';
}

/**
 * Get file category based on extension
 */
export function getFileCategory(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  if (FILE_CATEGORIES.SOURCE_CODE.includes(extension as any)) return 'source_code';
  if (FILE_CATEGORIES.CONFIG.includes(extension as any)) return 'config';
  if (FILE_CATEGORIES.DOCS.includes(extension as any)) return 'docs';
  if (FILE_CATEGORIES.ASSETS.includes(extension as any)) return 'assets';
  if (FILE_CATEGORIES.DATA.includes(extension as any)) return 'data';

  return 'other';
}

/**
 * Validate file path for safety operations
 */
export function validateFilePath(filePath: string): {
  valid: boolean;
  reason?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // Check for potentially dangerous paths
  if (isSystemFile(filePath)) {
    return {
      valid: false,
      reason: 'System file modifications are not allowed for safety reasons',
    };
  }

  // Check for security files
  if (isSecurityFile(filePath)) {
    warnings.push('This appears to be a security-related file - proceed with extreme caution');
  }

  // Check for config files
  if (isConfigFile(filePath)) {
    warnings.push('This is a configuration file - changes may affect application behavior');
  }

  // Check for absolute vs relative paths
  if (path.isAbsolute(filePath)) {
    warnings.push('Using absolute path - ensure this is intended');
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Generate a unique operation ID
 */
export function generateOperationId(prefix: string = 'op'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Safe error message extraction
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Create backup filename with timestamp
 */
export function createBackupFilename(originalPath: string, timestamp?: Date): string {
  const ext = path.extname(originalPath);
  const name = path.basename(originalPath, ext);
  const dir = path.dirname(originalPath);

  const backupTimestamp = (timestamp || new Date()).toISOString()
    .replace(/[:.]/g, '-')
    .replace(/T/, '_')
    .split('.')[0]; // Remove milliseconds

  return path.join(dir, `${name}.backup.${backupTimestamp}${ext}`);
}

/**
 * Sanitize file path for logging (remove sensitive info)
 */
export function sanitizePathForLogging(filePath: string): string {
  // Replace home directory with ~
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir && filePath.startsWith(homeDir)) {
    return filePath.replace(homeDir, '~');
  }

  // Remove any potential secrets from path
  return filePath.replace(/([?&](?:token|key|password|secret)=)[^&\s]*/gi, '$1***');
}

/**
 * Check if operation should be auto-approved based on file characteristics
 */
export function shouldAutoApprove(filePath: string, operationType: string): boolean {
  // Never auto-approve system or security files
  if (isSystemFile(filePath) || isSecurityFile(filePath)) {
    return false;
  }

  // Never auto-approve deletions
  if (operationType === 'delete') {
    return false;
  }

  // Auto-approve creation of documentation files
  const category = getFileCategory(filePath);
  if (category === 'docs' && operationType === 'create') {
    return true;
  }

  return false;
}

/**
 * Parse operation type from command or description
 */
export function parseOperationType(input: string): 'create' | 'modify' | 'delete' | 'move' | 'copy' | 'unknown' {
  const lower = input.toLowerCase();

  if (lower.includes('create') || lower.includes('new') || lower.includes('add')) {
    return 'create';
  }
  if (lower.includes('delete') || lower.includes('remove') || lower.includes('rm')) {
    return 'delete';
  }
  if (lower.includes('move') || lower.includes('mv') || lower.includes('rename')) {
    return 'move';
  }
  if (lower.includes('copy') || lower.includes('cp') || lower.includes('duplicate')) {
    return 'copy';
  }
  if (lower.includes('edit') || lower.includes('modify') || lower.includes('update') || lower.includes('change')) {
    return 'modify';
  }

  return 'unknown';
}

/**
 * Estimate operation complexity based on targets and type
 */
export function estimateOperationComplexity(targets: string[], operationType: string): {
  complexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
  factors: string[];
  estimatedTimeMinutes: number;
} {
  const factors: string[] = [];
  let complexityScore = 0;

  // File count factor
  if (targets.length > 10) {
    complexityScore += 2;
    factors.push(`${targets.length} files involved`);
  } else if (targets.length > 5) {
    complexityScore += 1;
    factors.push(`${targets.length} files involved`);
  }

  // Operation type factor
  if (operationType === 'delete') {
    complexityScore += 2;
    factors.push('Deletion operation (high risk)');
  } else if (operationType === 'move') {
    complexityScore += 1;
    factors.push('Move operation (moderate risk)');
  }

  // File type analysis
  const hasSystemFiles = targets.some(isSystemFile);
  const hasConfigFiles = targets.some(isConfigFile);
  const hasSecurityFiles = targets.some(isSecurityFile);

  if (hasSystemFiles) {
    complexityScore += 3;
    factors.push('System files involved');
  }
  if (hasSecurityFiles) {
    complexityScore += 2;
    factors.push('Security files involved');
  }
  if (hasConfigFiles) {
    complexityScore += 1;
    factors.push('Configuration files involved');
  }

  // Determine complexity level
  let complexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
  if (complexityScore >= 6) complexity = 'very-complex';
  else if (complexityScore >= 4) complexity = 'complex';
  else if (complexityScore >= 2) complexity = 'moderate';
  else complexity = 'simple';

  // Estimate time (rough approximation)
  const baseTimeMinutes = {
    'simple': 1,
    'moderate': 3,
    'complex': 10,
    'very-complex': 30,
  }[complexity];

  const timeMultiplier = Math.min(targets.length / 5, 3); // Max 3x multiplier
  const estimatedTimeMinutes = Math.ceil(baseTimeMinutes * timeMultiplier);

  return {
    complexity,
    factors,
    estimatedTimeMinutes,
  };
}