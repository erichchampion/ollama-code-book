/**
 * Application-level Type Definitions
 *
 * Centralized type definitions for core application interfaces.
 * These types replace the generic 'any' types throughout the codebase.
 */

import { TerminalInterface } from '../terminal/types.js';

/**
 * Application configuration structure
 */
export interface AppConfig {
  // API configuration
  api: {
    baseUrl: string;
    version: string;
    timeout: number;
  };

  // AI configuration
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
    maxHistoryLength: number;
  };

  // Terminal configuration
  terminal: {
    theme: 'dark' | 'light' | 'system';
    useColors: boolean;
    showProgressIndicators: boolean;
    codeHighlighting: boolean;
    maxHeight?: number;
    maxWidth?: number;
  };

  // Telemetry configuration
  telemetry: {
    enabled: boolean;
    submissionInterval: number;
    maxQueueSize: number;
    autoSubmit: boolean;
  };

  // File operation configuration
  fileOps: {
    maxReadSizeBytes: number;
  };

  // Execution configuration
  execution: {
    shell: string;
  };

  // Logger configuration
  logger: {
    level: 'debug' | 'info' | 'warn' | 'error';
    timestamps: boolean;
    colors: boolean;
  };

  // App version
  version: string;
}

/**
 * AI client interface
 */
export interface AIClient {
  /**
   * Send a chat request to the AI
   */
  chat(prompt: string, options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Stream a chat response from the AI
   */
  streamChat(prompt: string, options?: ChatOptions): AsyncIterable<ChatChunk>;

  /**
   * Disconnect from the AI service
   */
  disconnect(): Promise<void>;

  /**
   * Check if the AI service is available
   */
  checkHealth(): Promise<boolean>;
}

/**
 * Chat request options
 */
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  conversationId?: string;
}

/**
 * Chat response from AI
 */
export interface ChatResponse {
  content: string;
  model: string;
  conversationId?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Streaming chat chunk from AI
 */
export interface ChatChunk {
  content: string;
  done: boolean;
  model?: string;
}

/**
 * Codebase analysis service interface
 */
export interface CodebaseAnalysis {
  /**
   * Start background analysis of the codebase
   */
  startBackgroundAnalysis(): void;

  /**
   * Stop background analysis
   */
  stopBackgroundAnalysis(): Promise<void>;

  /**
   * Get analysis results for a file
   */
  getFileAnalysis(filePath: string): Promise<FileAnalysis | null>;

  /**
   * Get overall codebase statistics
   */
  getStatistics(): CodebaseStatistics;
}

/**
 * Analysis results for a single file
 */
export interface FileAnalysis {
  path: string;
  language: string;
  linesOfCode: number;
  complexity?: number;
  dependencies: string[];
  exports: string[];
}

/**
 * Overall codebase statistics
 */
export interface CodebaseStatistics {
  totalFiles: number;
  totalLines: number;
  languages: Record<string, number>;
  lastAnalyzed?: Date;
}

/**
 * File operations service interface
 */
export interface FileOperations {
  /**
   * Read a file
   */
  read(path: string): Promise<string>;

  /**
   * Write to a file
   */
  write(path: string, content: string): Promise<void>;

  /**
   * Delete a file
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * List files in a directory
   */
  list(path: string): Promise<string[]>;
}

/**
 * Execution environment service interface
 */
export interface ExecutionEnvironment {
  /**
   * Execute a shell command
   */
  execute(command: string, options?: ExecutionOptions): Promise<ExecutionResult>;

  /**
   * Execute a shell command and stream output
   */
  executeStream(command: string, options?: ExecutionOptions): AsyncIterable<string>;
}

/**
 * Command execution options
 */
export interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: string;
}

/**
 * Command execution result
 */
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

/**
 * Error handling service interface
 */
export interface ErrorHandler {
  /**
   * Handle a non-fatal error
   */
  handleError(error: unknown): void;

  /**
   * Handle a fatal error (exits the process)
   */
  handleFatalError(error: unknown): never;

  /**
   * Handle unhandled promise rejection
   */
  handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void;

  /**
   * Handle uncaught exception
   */
  handleUncaughtException(error: Error): void;
}

/**
 * Telemetry service interface
 */
export interface Telemetry {
  /**
   * Track an event
   */
  trackEvent(event: string, properties?: Record<string, unknown>): void;

  /**
   * Submit telemetry data
   */
  submitTelemetry(): Promise<void>;

  /**
   * Opt out of telemetry
   */
  optOut(): void;
}

/**
 * Command processor interface
 */
export interface CommandProcessor {
  /**
   * Execute a command with arguments
   */
  executeCommand(commandName: string, args: string[]): Promise<unknown>;

  /**
   * Start the interactive command loop
   */
  startCommandLoop(): Promise<void>;

  /**
   * Register a new command
   */
  registerCommand(command: CommandDef): void;

  /**
   * Get a command by name or alias
   */
  getCommand(nameOrAlias: string): CommandDef | undefined;

  /**
   * List all registered commands
   */
  listCommands(options?: { includeHidden?: boolean }): CommandDef[];

  /**
   * Get available command categories
   */
  getCategories(): string[];

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: string, options?: { includeHidden?: boolean }): CommandDef[];

  /**
   * Generate help text for a command
   */
  generateCommandHelp(command: CommandDef): string;
}

/**
 * Command definition (re-exported from commands module)
 */
export interface CommandDef {
  name: string;
  description: string;
  examples?: string[];
  args?: CommandArgDef[];
  handler: (args: Record<string, unknown>) => Promise<unknown>;
  aliases?: string[];
  category?: string;
  interactive?: boolean;
  hidden?: boolean;
}

/**
 * Command argument definition
 */
export interface CommandArgDef {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  default?: unknown;
  choices?: string[];
  position?: number;
  shortFlag?: string;
  hidden?: boolean;
}

/**
 * Application instance that holds references to all initialized subsystems
 */
export interface AppInstance {
  config: AppConfig;
  terminal: TerminalInterface;
  ai: AIClient;
  codebase: CodebaseAnalysis;
  commands: CommandProcessor;
  fileOps: FileOperations;
  execution: ExecutionEnvironment;
  errors: ErrorHandler;
  telemetry: Telemetry | null;
}

/**
 * Initialization options for the application
 */
export interface InitializationOptions {
  // Configuration file path
  config?: string;

  // Logging options
  verbose?: boolean;
  quiet?: boolean;
  debug?: boolean;

  // API options
  apiUrl?: string;

  // AI options
  model?: string;

  // Other CLI flags
  [key: string]: unknown;
}
