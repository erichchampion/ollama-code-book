/**
 * Tool parameter definition using JSON Schema
 */
export interface ToolParameters {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
    required?: boolean;
  }>;
  required?: string[];
}

/**
 * Tool execution context
 * Provides tools with access to system services
 */
export interface ToolContext {
  // Working directory
  workingDirectory: string;

  // Logger for tool output
  logger: Logger;

  // Access to other tools (for composition)
  toolRegistry: ToolRegistry;

  // User preferences
  preferences: UserPreferences;

  // Cancellation token
  cancellationToken?: CancellationToken;
}

/**
 * Base tool interface
 * All tools must implement this
 */
export interface Tool {
  /**
   * Unique tool identifier
   * Example: 'read_file', 'git_commit', 'search_code'
   */
  readonly name: string;

  /**
   * Description for AI model
   * Should explain what the tool does and when to use it
   */
  readonly description: string;

  /**
   * Parameter schema (JSON Schema format)
   * Used for validation and AI parameter generation
   */
  readonly parameters: ToolParameters;

  /**
   * Tools this tool depends on
   * Example: 'write_file' might depend on 'read_file'
   */
  readonly dependencies?: string[];

  /**
   * Whether this tool requires user approval
   * True for destructive operations (write, delete, commit, etc.)
   */
  readonly requiresApproval?: boolean;

  /**
   * Whether results should be cached
   * True for read-only, deterministic operations
   */
  readonly cacheable?: boolean;

  /**
   * Maximum execution time in milliseconds
   * Tool will be cancelled if it exceeds this
   */
  readonly timeoutMs?: number;

  /**
   * Whether this tool can be retried on failure
   */
  readonly retryable?: boolean;

  /**
   * Execute the tool
   *
   * @param params - Validated parameters
   * @param context - Execution context
   * @returns Tool result
   */
  execute(params: any, context: ToolContext): Promise<ToolResult>;

  /**
   * Validate parameters before execution
   * Optional: If not provided, uses JSON Schema validation
   *
   * @param params - Parameters to validate
   * @returns Validation result
   */
  validate?(params: any): ValidationResult;

  /**
   * Estimate cost/complexity of execution
   * Used for routing and optimization decisions
   *
   * @param params - Tool parameters
   * @returns Estimated cost (arbitrary units)
   */
  estimateCost?(params: any): number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  // ID of the tool call that produced this result
  callId: string;

  // Tool name
  toolName: string;

  // Success/failure status
  success: boolean;

  // Result data (if successful)
  data?: any;

  // Error information (if failed)
  error?: ToolError;

  // Execution metadata
  metadata: ToolMetadata;
}

/**
 * Tool error information
 */
export interface ToolError {
  // Human-readable error message
  message: string;

  // Error code for programmatic handling
  code?: string;

  // Whether the error is recoverable via retry
  recoverable: boolean;

  // Suggested fix or workaround
  suggestion?: string;

  // Stack trace (in development mode)
  stack?: string;
}

/**
 * Tool execution metadata
 */
export interface ToolMetadata {
  // Execution duration in milliseconds
  durationMs: number;

  // Whether result was served from cache
  cached: boolean;

  // Number of retry attempts
  retriesAttempted?: number;

  // Timestamp of execution
  timestamp: Date;

  // Whether user approval was required and granted
  approvalGranted?: boolean;

  // Additional tool-specific metadata
  [key: string]: any;
}