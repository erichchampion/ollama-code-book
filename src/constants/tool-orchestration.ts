/**
 * Tool Orchestration Constants
 *
 * Centralized configuration for tool calling and orchestration features.
 * Following DRY principles to eliminate hardcoded values.
 */

import { STREAM_BUFFER_LIMITS, FILE_SIZE_LIMITS } from './buffer-limits.js';

/**
 * Default configuration for streaming tool orchestrator
 */
export const TOOL_ORCHESTRATION_DEFAULTS = {
  /** Maximum number of tools that can be called in a single request */
  MAX_TOOLS_PER_REQUEST: 10,

  /** Timeout for individual tool execution (120 seconds / 2 minutes)
   * Increased to allow long-running commands like npm install, create-react-app
   */
  TOOL_TIMEOUT: 120000,

  /** Maximum context size for tool execution (60 seconds) */
  TOOL_CONTEXT_TIMEOUT: 60000,

  /** Timeout for user approval prompts (60 seconds) */
  APPROVAL_PROMPT_TIMEOUT: 60000,

  /** Enable tool calling by default */
  ENABLE_TOOL_CALLING: true,

  /** Skip tools that require approval instead of prompting user */
  SKIP_UNAPPROVED_TOOLS: false,

  /** Categories that require user approval before execution */
  APPROVAL_REQUIRED_CATEGORIES: ['deployment', 'refactoring'] as const
} as const;

/**
 * Tool execution limits and boundaries
 */
export const TOOL_LIMITS = {
  /** Maximum size of tool results cache */
  MAX_TOOL_RESULTS_CACHE: 1000,

  /** Maximum number of retry attempts for failed tool calls */
  MAX_TOOL_RETRIES: 3,

  /** Maximum size of tool output (1MB) */
  MAX_TOOL_OUTPUT_SIZE: STREAM_BUFFER_LIMITS.TOOL_OUTPUT,

  /** Maximum depth for nested tool calls */
  MAX_TOOL_CALL_DEPTH: 5
} as const;

/**
 * Tool performance and monitoring
 */
export const TOOL_MONITORING = {
  /** Enable performance tracking for tool execution */
  ENABLE_PERFORMANCE_TRACKING: true,

  /** Log slow tool executions (threshold in ms) */
  SLOW_TOOL_THRESHOLD: 5000,

  /** Enable detailed tool execution logs */
  ENABLE_DETAILED_LOGGING: false
} as const;

/**
 * Tool execution process management
 */
export const TOOL_EXECUTION_CONSTANTS = {
  /** Grace period before force-killing a process (5 seconds) */
  FORCE_KILL_GRACE_PERIOD: 5000
} as const;

/**
 * Code analysis configuration
 */
export const CODE_ANALYSIS_CONSTANTS = {
  /** Maximum file size for detailed analysis (10KB) */
  MAX_FILE_SIZE_FOR_ANALYSIS: 10000,

  /** Maximum line length before warning (100 chars) */
  MAX_LINE_LENGTH: 100,

  /** Time-to-live for tool results cache (1 hour) */
  TOOL_RESULT_TTL: 60 * 60 * 1000,

  /** Maximum files to analyze for complexity */
  MAX_COMPLEXITY_ANALYSIS_FILES: 20,

  /** Maximum files for dependency analysis */
  MAX_DEPENDENCY_ANALYSIS_FILES: 10,

  /** Maximum files for security analysis */
  MAX_SECURITY_ANALYSIS_FILES: 20
} as const;

/**
 * Streaming and conversation constants
 */
export const STREAMING_CONSTANTS = {
  /** Maximum conversation turns to prevent infinite loops
   * Increased to 20 to allow complex multi-step tasks
   * Smart turn limit (3 consecutive failures) prevents actual infinite loops
   */
  MAX_CONVERSATION_TURNS: 20,

  /**
   * Maximum JSON parse attempts in streaming content per turn.
   *
   * CRITICAL: Prevents infinite loops when parsing malformed JSON during streaming.
   * When streaming responses, we attempt to parse JSON incrementally as chunks arrive.
   * If JSON is malformed or incomplete, parsing will fail repeatedly.
   *
   * Value: 100 attempts per turn
   * - Sufficient for complex nested JSON structures
   * - Low enough to prevent CPU spinning on pathological input
   * - Resets to 0 on successful parse or after warning
   *
   * Warning is logged when limit exceeded, then counter resets to allow
   * processing of subsequent chunks in new turns.
   */
  MAX_STREAMING_PARSE_ATTEMPTS: 100
} as const;

/**
 * File operation constants
 */
export const FILE_OPERATION_CONSTANTS = {
  /** Maximum JSON stringify size (1MB) */
  MAX_JSON_SIZE_BYTES: STREAM_BUFFER_LIMITS.JSON_PAYLOAD,

  /** Maximum file size for safe operations (10MB) */
  MAX_SAFE_FILE_SIZE: FILE_SIZE_LIMITS.SAFE
} as const;
