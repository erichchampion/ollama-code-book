/**
 * Text Utilities
 *
 * Centralized text manipulation functions to eliminate duplicate
 * string truncation patterns throughout the codebase.
 */

/**
 * Standard preview lengths used across the application
 */
export const TEXT_PREVIEW_LENGTHS = {
  /** Very short preview (50 characters) */
  SHORT: 50,

  /** Medium preview (100 characters) */
  MEDIUM: 100,

  /** Long preview (200 characters) */
  LONG: 200,

  /** Extra long preview (500 characters) */
  EXTRA_LONG: 500
} as const;

/**
 * Truncate text to a maximum length
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - String to append when truncated (default: '...')
 * @returns Truncated text with ellipsis if needed
 *
 * @example
 * ```typescript
 * truncateText('Hello World', 5) // 'Hello...'
 * truncateText('Hi', 5) // 'Hi'
 * truncateText('Hello World', 5, '…') // 'Hello…'
 * ```
 */
export function truncateText(
  text: string,
  maxLength: number = TEXT_PREVIEW_LENGTHS.MEDIUM,
  ellipsis: string = '...'
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + ellipsis;
}

/**
 * Truncate text for logging (medium length, 100 chars)
 *
 * @param text - The text to truncate
 * @returns Truncated text suitable for log messages
 *
 * @example
 * ```typescript
 * logger.debug('Processing input', { input: truncateForLog(userInput) });
 * ```
 */
export function truncateForLog(text: string): string {
  return truncateText(text, TEXT_PREVIEW_LENGTHS.MEDIUM);
}

/**
 * Truncate text for preview (short length, 50 chars)
 *
 * @param text - The text to truncate
 * @returns Truncated text suitable for UI previews
 *
 * @example
 * ```typescript
 * console.log(`File: ${truncateForPreview(filename)}`);
 * ```
 */
export function truncateForPreview(text: string): string {
  return truncateText(text, TEXT_PREVIEW_LENGTHS.SHORT);
}

/**
 * Truncate text for extended context (long length, 200 chars)
 *
 * @param text - The text to truncate
 * @returns Truncated text suitable for extended context
 */
export function truncateForContext(text: string): string {
  return truncateText(text, TEXT_PREVIEW_LENGTHS.LONG);
}

/**
 * Truncate text for detailed output (extra long, 500 chars)
 *
 * @param text - The text to truncate
 * @returns Truncated text suitable for detailed output
 */
export function truncateForDetails(text: string): string {
  return truncateText(text, TEXT_PREVIEW_LENGTHS.EXTRA_LONG);
}

/**
 * Safely truncate text that might be null or undefined
 *
 * @param text - The text to truncate (nullable)
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - String to append when truncated
 * @returns Truncated text or empty string if null/undefined
 */
export function safeTruncate(
  text: string | null | undefined,
  maxLength: number = TEXT_PREVIEW_LENGTHS.MEDIUM,
  ellipsis: string = '...'
): string {
  if (!text) {
    return '';
  }
  return truncateText(text, maxLength, ellipsis);
}

/**
 * Truncate text and ensure it doesn't break mid-word
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - String to append when truncated
 * @returns Truncated text at word boundary
 *
 * @example
 * ```typescript
 * truncateAtWord('Hello World Program', 12) // 'Hello World...'
 * // Instead of 'Hello World ...' (mid-word break)
 * ```
 */
export function truncateAtWord(
  text: string,
  maxLength: number = TEXT_PREVIEW_LENGTHS.MEDIUM,
  ellipsis: string = '...'
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + ellipsis;
  }

  return truncated + ellipsis;
}
