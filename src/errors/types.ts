/**
 * Error Handling Types
 * 
 * Type definitions for the error handling system.
 */

/**
 * Error severity levels
 */
export enum ErrorLevel {
  /**
   * Debug level for detailed information
   */
  DEBUG = 0,
  
  /**
   * Informational messages
   */
  INFO = 1,
  
  /**
   * Warning messages
   */
  WARNING = 2,
  
  /**
   * Error messages
   */
  ERROR = 3,
  
  /**
   * Critical errors that prevent the application from functioning
   */
  CRITICAL = 4,
  
  /**
   * Fatal errors that cause application termination
   */
  FATAL = 5
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  /**
   * Application-level errors
   */
  APPLICATION = 0,

  /**
   * System-related errors
   */
  SYSTEM = 1,

  /**
   * Network-related errors
   */
  NETWORK = 2,
  
  /**
   * File system-related errors
   */
  FILE_SYSTEM = 3,
  
  /**
   * Command execution-related errors
   */
  COMMAND_EXECUTION = 4,
  
  /**
   * AI service-related errors
   */
  AI_SERVICE = 5,
  
  /**
   * Configuration-related errors
   */
  CONFIGURATION = 6,
  
  /**
   * Resource-related errors
   */
  RESOURCE = 7,
  
  /**
   * Unknown errors
   */
  UNKNOWN = 8,
  
  /**
   * Internal errors
   */
  INTERNAL = 9,
  
  /**
   * Validation errors
   */
  VALIDATION = 10,
  
  /**
   * Initialization errors
   */
  INITIALIZATION = 11,
  
  /**
   * Server errors
   */
  SERVER = 12,
  
  /**
   * API errors
   */
  API = 13,
  
  /**
   * Timeout errors
   */
  TIMEOUT = 14,
  
  /**
   * Rate limit errors
   */
  RATE_LIMIT = 15,
  
  /**
   * Connection errors
   */
  CONNECTION = 16,
  
  
  /**
   * File not found errors
   */
  FILE_NOT_FOUND = 18,
  
  /**
   * File access errors
   */
  FILE_ACCESS = 19,
  
  /**
   * File read errors
   */
  FILE_READ = 20,
  
  /**
   * File write errors
   */
  FILE_WRITE = 21,
  
  /**
   * Command errors
   */
  COMMAND = 22,
  
  /**
   * Command not found errors
   */
  COMMAND_NOT_FOUND = 23
}

/**
 * Error options for error handling
 */
export interface ErrorOptions {
  /**
   * Error level
   */
  level?: ErrorLevel;
  
  /**
   * Error category
   */
  category?: ErrorCategory;
  
  /**
   * Additional context for the error
   */
  context?: Record<string, any>;
  
  /**
   * Whether to report the error to monitoring systems
   */
  report?: boolean;
  
  /**
   * User message to display
   */
  userMessage?: string;
  
  /**
   * Suggested resolution steps
   */
  resolution?: string | string[];
}

/**
 * User error options
 */
export interface UserErrorOptions {
  /**
   * Original error that caused this error
   */
  cause?: unknown;
  
  /**
   * Error category
   */
  category?: ErrorCategory;
  
  /**
   * Error level
   */
  level?: ErrorLevel;
  
  /**
   * Hint on how to resolve the error
   */
  resolution?: string | string[];
  
  /**
   * Additional details about the error
   */
  details?: Record<string, unknown>;

  /**
   * Error context
   */
  context?: Record<string, any>;

  /**
   * Error code
   */
  code?: string;
}

/**
 * Error manager interface
 */
export interface ErrorManager {
  handleError(error: unknown, options?: ErrorOptions): void;
  handleFatalError(error: unknown): never;
  formatError(error: unknown, options?: ErrorOptions): string;
  getErrorCount(category?: ErrorCategory): number;
  clearErrorCount(category?: ErrorCategory): void;
}

/**
 * User error
 */
export class UserError extends Error {
  /**
   * Original error that caused this error
   */
  cause?: unknown;
  
  /**
   * Error category
   */
  category: ErrorCategory;
  
  /**
   * Error level
   */
  level: ErrorLevel;
  
  /**
   * Hint on how to resolve the error
   */
  resolution?: string | string[];
  
  /**
   * Additional details about the error
   */
  details: Record<string, unknown>;

  /**
   * Error context
   */
  context?: Record<string, any>;

  /**
   * Error code
   */
  code?: string;
  
  /**
   * Create a new user error
   */
  constructor(message: string, options: UserErrorOptions = {}) {
    super(message);
    
    this.name = 'UserError';
    this.cause = options.cause;
    this.category = options.category || ErrorCategory.UNKNOWN;
    this.level = options.level || ErrorLevel.ERROR;
    this.resolution = options.resolution;
    this.details = options.details || {};
    this.context = options.context;
    this.code = options.code;
    
    // Capture stack trace
    Error.captureStackTrace?.(this, UserError);
  }
} 