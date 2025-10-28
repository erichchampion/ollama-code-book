/**
 * Tool Name Constants
 *
 * Centralized tool names to prevent typos and enable type-safe tool references.
 */

/**
 * Tool names used throughout the application
 */
export const TOOL_NAMES = {
  /** Execution tool for running shell commands */
  EXECUTION: 'execution',

  /** Filesystem tool for file operations */
  FILESYSTEM: 'filesystem',

  /** Search tool for finding files and content */
  SEARCH: 'search',

  /** Advanced Git tool for version control operations */
  GIT: 'advanced-git',

  /** Advanced code analysis tool */
  CODE_ANALYSIS: 'advanced-code-analysis',

  /** Advanced testing tool */
  TESTING: 'advanced-testing'
} as const;

/**
 * Type representing valid tool names
 */
export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];

/**
 * Check if a string is a valid tool name
 *
 * @param name - The name to check
 * @returns true if the name is a valid tool name
 */
export function isValidToolName(name: string): name is ToolName {
  return Object.values(TOOL_NAMES).includes(name as ToolName);
}
