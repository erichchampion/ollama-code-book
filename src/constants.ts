/**
 * Application Constants
 *
 * Centralized location for all hardcoded values used throughout the application.
 * This helps maintain consistency and makes configuration changes easier.
 */

import { FILE_SIZE_LIMITS } from './constants/buffer-limits.js';

// =============================================================================
// NETWORK & API CONSTANTS
// =============================================================================

/** Default Ollama server base URL */
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/** Default Ollama server port */
export const DEFAULT_OLLAMA_PORT = 11434;

// =============================================================================
// LLAMA.CPP CONSTANTS
// =============================================================================

/** Default llama.cpp server URL */
export const DEFAULT_LLAMACPP_URL = 'http://localhost:8080';

/** Default llama.cpp server port */
export const DEFAULT_LLAMACPP_PORT = 8080;

/** Default llama.cpp context size */
export const DEFAULT_LLAMACPP_CONTEXT_SIZE = 4096;

/** Default llama.cpp GPU layers (-1 = auto/all) */
export const DEFAULT_LLAMACPP_GPU_LAYERS = -1;

/** Default llama.cpp model startup timeout (60 seconds for large models) */
export const LLAMACPP_MODEL_STARTUP_TIMEOUT = 60000;

/** Default API version */
export const DEFAULT_API_VERSION = 'v1';

/** User agent string for HTTP requests */
export const USER_AGENT = 'ollama-code-cli';

// =============================================================================
// AI MODEL CONSTANTS
// =============================================================================

/** Default AI model for code generation and assistance */
// For testing with Claude (Anthropic API), use one of:
// - 'claude-3-5-sonnet-20241022' (recommended for code)
// - 'claude-3-5-haiku-20241022' (faster, cheaper)
// For local Ollama: 'qwen2.5-coder:latest'
export const DEFAULT_MODEL = 'qwen2.5-coder:latest';

/** Default temperature for AI responses (0.0 - 1.0) */
export const DEFAULT_TEMPERATURE = 0.7;

/** Default top-p value for AI responses */
export const DEFAULT_TOP_P = 0.9;

/** Default top-k value for AI responses */
export const DEFAULT_TOP_K = 40;

/** Default repeat penalty for AI responses */
export const DEFAULT_REPEAT_PENALTY = 1.1;

// =============================================================================
// TIMEOUT CONSTANTS
// =============================================================================

/**
 * Timeout Constants
 *
 * Centralized timeout configuration following DRY principles.
 * All timeout values are in milliseconds.
 */

import { APP_TIMEOUTS, IDE_TIMEOUTS, MONITORING_TIMEOUTS } from './constants/timeouts.js';

/** Default timeout for AI completion requests (5 minutes) */
export const AI_COMPLETION_TIMEOUT = APP_TIMEOUTS.VERY_LONG;

/** Default timeout for API requests (1 minute) */
export const API_REQUEST_TIMEOUT = IDE_TIMEOUTS.CLIENT_TIMEOUT;

/** Default timeout for code analysis operations (30 seconds) */
export const CODE_ANALYSIS_TIMEOUT = APP_TIMEOUTS.MEDIUM;

/** Default timeout for file operations (10 seconds) */
export const FILE_OPERATION_TIMEOUT = 10000; // Not perfectly matched in timeouts.ts, keeping explicit for now or use VSCODE_CONNECTION_TIMEOUT

/** Default timeout for server health checks (5 seconds) */
export const SERVER_HEALTH_TIMEOUT = APP_TIMEOUTS.SHORT;

/** Default server startup timeout (30 seconds) */
export const SERVER_STARTUP_TIMEOUT = APP_TIMEOUTS.MEDIUM;

/**
 * AI Operation Timeouts
 * These are used for AI-powered analysis operations that may take longer
 */

/** Timeout for AI intent analysis and classification (30 seconds) */
export const AI_INTENT_ANALYSIS_TIMEOUT = APP_TIMEOUTS.MEDIUM;

/** Timeout for AI entity extraction (30 seconds) */
export const AI_ENTITY_EXTRACTION_TIMEOUT = APP_TIMEOUTS.MEDIUM;

/** Timeout for interactive mode request processing (uses AI_COMPLETION_TIMEOUT) */
export const INTERACTIVE_REQUEST_TIMEOUT = AI_COMPLETION_TIMEOUT;

/** Default health check interval (2 seconds) */
export const HEALTH_CHECK_INTERVAL = 2000;

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

/** Default maximum number of retries for failed requests */
export const DEFAULT_MAX_RETRIES = 3;

/** Default initial delay between retries (1 second) */
export const DEFAULT_INITIAL_RETRY_DELAY = 1000;

/** Default maximum delay between retries (5 seconds) */
export const DEFAULT_MAX_RETRY_DELAY = 5000;

// =============================================================================
// FILE SIZE LIMITS
// =============================================================================

/** Maximum file size for reading operations (10MB) */
export const MAX_FILE_READ_SIZE = FILE_SIZE_LIMITS.READ;

/** Maximum file size for code analysis (1MB) */
export const MAX_CODE_ANALYSIS_FILE_SIZE = FILE_SIZE_LIMITS.ANALYSIS;

/** Maximum file size for text processing (5MB) */
export const MAX_TEXT_PROCESSING_SIZE = FILE_SIZE_LIMITS.TEXT_PROCESSING;

// =============================================================================
// TELEMETRY CONSTANTS
// =============================================================================

/** Default telemetry submission interval (30 minutes) */
export const TELEMETRY_SUBMISSION_INTERVAL = 30 * 60 * 1000;

/** Default maximum telemetry queue size */
export const TELEMETRY_MAX_QUEUE_SIZE = 100;

// =============================================================================
// TERMINAL/CLI CONSTANTS
// =============================================================================

/** Default help output width */
export const HELP_OUTPUT_WIDTH = 100;

/** Default tab width for code formatting */
export const DEFAULT_TAB_WIDTH = 2;

/** Default index depth for code analysis */
export const DEFAULT_INDEX_DEPTH = 3;

/** Maximum history length for chat/conversation */
export const MAX_HISTORY_LENGTH = 20;

/** Maximum tokens for AI responses */
export const MAX_AI_TOKENS = 4096;

// =============================================================================
// ERROR MESSAGES
// =============================================================================

/** Common help command suggestion */
export const HELP_COMMAND_SUGGESTION = 'Use "ollama-code help" to see available commands.';

/** Interactive mode help text */
export const INTERACTIVE_MODE_HELP = 'Type "help" for available commands, "exit" to quit.';

/** Welcome message for interactive terminal */
export const TERMINAL_WELCOME_MESSAGE = 'Welcome! Type /help to see available commands.';

// =============================================================================
// FILE PATTERNS
// =============================================================================

/** Default file patterns to exclude from code analysis */
export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/vendor/**',
  '.DS_Store',
  '**/*.log',
  '**/*.lock',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '.env*',
  '**/*.map'
] as const;

/** Default file patterns to include in code analysis */
export const DEFAULT_INCLUDE_PATTERNS = ['**/*'] as const;

// =============================================================================
// CONFIGURATION PATHS
// =============================================================================

/** Configuration file names to search for */
export const CONFIG_FILE_NAMES = [
  '.ollama-code.json',
  '.ollama-code.js',
  'config.json'
] as const;

// =============================================================================
// LOG LEVELS
// =============================================================================

/** Available log levels */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;

// =============================================================================
// EXIT COMMANDS
// =============================================================================

/** Commands that exit interactive mode */
export const EXIT_COMMANDS = ['exit', 'quit', 'q', '.exit'] as const;

// =============================================================================
// AI PROCESSING LIMITS
// =============================================================================

/** Maximum number of files to analyze for project context */
export const MAX_FILES_FOR_ANALYSIS = 50;

/** Maximum number of files to include in context */
export const MAX_FILES_LIMIT = 10;

/** Maximum conversation history items to keep */
export const MAX_CONVERSATION_HISTORY = 5;

/** Maximum number of file watchers to maintain */
export const MAX_FILE_WATCHERS = 10;

/** Maximum number of relevant files to include in AI context */
export const MAX_RELEVANT_FILES = 5;

/** Maximum AI conversation history length */
export const MAX_AI_CONVERSATION_HISTORY = 20;

/** Maximum search results to return */
export const MAX_SEARCH_RESULTS = 100;

// =============================================================================
// APPLICATION INFO
// =============================================================================

/** Application name */
export const APP_NAME = 'ollama-code';

/** CLI command name */
export const CLI_COMMAND = 'ollama-code';

/** Default shell for command execution */
export const DEFAULT_SHELL = process.env.SHELL || 'bash';

// =============================================================================
// SAFETY & SECURITY CONSTANTS
// =============================================================================

/**
 * Environment variable to control safety mode in interactive sessions
 * Set to 'false' to disable safety features
 * @default true (safety enabled)
 */
export const SAFETY_MODE_ENV_VAR = 'OLLAMA_SAFETY_MODE';

/** Default safety mode settings for interactive mode */
export const SAFETY_MODE_DEFAULTS = {
  /** Always confirm high-risk operations in safety mode */
  confirmHighRisk: true,
  /** Never auto-approve operations in safety mode */
  autoApprove: false
} as const;