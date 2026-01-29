/**
 * Logger
 *
 * Provides a consistent logging interface across the application.
 * Supports multiple log levels, formatting, and output destinations.
 */

import { ErrorLevel } from '../errors/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { stripAnsi } from './formatting.js';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Minimum log level to display
   */
  level: LogLevel;

  /**
   * Whether to include timestamps in logs
   */
  timestamps: boolean;

  /**
   * Whether to colorize output
   */
  colors: boolean;

  /**
   * Whether to include additional context in logs
   */
  verbose: boolean;

  /**
   * Custom output destination (defaults to console)
   */
  destination?: (message: string, level: LogLevel) => void;

  /**
   * Path to log file (optional)
   */
  logFile?: string;

  /**
   * Whether file logging is enabled
   */
  enableFileLogging: boolean;
}

/**
 * Default logger configuration
 * Note: Default to ERROR level for quiet operation. Set LOG_LEVEL env var for more verbose output.
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.ERROR,
  timestamps: true,
  colors: true,
  verbose: false,
  enableFileLogging: false
};

/**
 * Logger class
 */
export class Logger {
  private config: LoggerConfig;
  private fileStream?: fs.WriteStream;
  private fileWriteEnabled: boolean = false;
  private logFilePath?: string;  // Store the resolved log file path

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Set logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };

    // Initialize file logging if logFile is set
    if (config.logFile) {
      this.initializeFileLogging();
    }
  }
  
  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, context?: any): void {
    this.log(message, LogLevel.DEBUG, context);
  }
  
  /**
   * Log an info message
   */
  info(message: string, context?: any): void {
    this.log(message, LogLevel.INFO, context);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, context?: any): void {
    this.log(message, LogLevel.WARN, context);
  }
  
  /**
   * Log an error message
   */
  error(message: string, context?: any): void {
    this.log(message, LogLevel.ERROR, context);
  }
  
  /**
   * Log a message with level
   */
  private log(message: string, level: LogLevel, context?: any): void {
    // Check if this log level should be displayed
    if (level < this.config.level) {
      return;
    }

    // Format the message (with colors for console)
    const formattedMessage = this.formatMessage(message, level, context);

    // ERROR level: ALWAYS goes to console, regardless of file logging
    if (level === LogLevel.ERROR) {
      this.logToConsole(formattedMessage, level);

      // Also write to file if enabled
      if (this.fileWriteEnabled && this.logFilePath) {
        const cleanMessage = stripAnsi(formattedMessage);
        this.writeToFile(cleanMessage);
      }
      return;
    }

    // Non-ERROR levels: Use custom destination, file, or console
    if (this.config.destination) {
      this.config.destination(formattedMessage, level);
    } else if (this.fileWriteEnabled && this.logFilePath) {
      // Write to file instead of console (keeps console clean)
      const cleanMessage = stripAnsi(formattedMessage);
      this.writeToFile(cleanMessage);
    } else {
      // Fall back to console
      this.logToConsole(formattedMessage, level);
    }
  }
  
  /**
   * Format a log message
   */
  private formatMessage(message: string, level: LogLevel, context?: any): string {
    let result = '';
    
    // Add timestamp if enabled
    if (this.config.timestamps) {
      const timestamp = new Date().toISOString();
      result += `[${timestamp}] `;
    }
    
    // Add log level
    result += `${this.getLevelName(level)}: `;
    
    // Add message
    result += message;
    
    // Add context if verbose and context is provided
    if (this.config.verbose && context) {
      try {
        if (typeof context === 'object') {
          const contextStr = JSON.stringify(context);
          result += ` ${contextStr}`;
        } else {
          result += ` ${context}`;
        }
      } catch (error) {
        result += ' [Context serialization failed]';
      }
    }
    
    return result;
  }
  
  /**
   * Get the name of a log level
   */
  private getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return this.colorize('DEBUG', '\x1b[36m'); // Cyan
      case LogLevel.INFO:
        return this.colorize('INFO', '\x1b[32m');  // Green
      case LogLevel.WARN:
        return this.colorize('WARN', '\x1b[33m');  // Yellow
      case LogLevel.ERROR:
        return this.colorize('ERROR', '\x1b[31m'); // Red
      default:
        return 'UNKNOWN';
    }
  }
  
  /**
   * Colorize a string if colors are enabled
   */
  private colorize(text: string, colorCode: string): string {
    if (!this.config.colors) {
      return text;
    }
    
    return `${colorCode}${text}\x1b[0m`;
  }
  
  /**
   * Log to console
   */
  private logToConsole(message: string, level: LogLevel): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
    }
  }
  
  /**
   * Convert ErrorLevel to LogLevel
   */
  errorLevelToLogLevel(level: ErrorLevel): LogLevel {
    switch (level) {
      case ErrorLevel.DEBUG:
        return LogLevel.DEBUG;
      case ErrorLevel.INFO:
        return LogLevel.INFO;
      case ErrorLevel.WARNING:
        return LogLevel.WARN;
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
      case ErrorLevel.FATAL:
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Initialize file logging
   * Uses synchronous file operations to ensure reliable writes
   */
  private initializeFileLogging(): void {
    if (!this.config.logFile) {
      return;
    }

    try {
      // Validate and normalize path
      const logPath = path.resolve(this.config.logFile);

      // Ensure parent directory exists
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Store the resolved path for synchronous writes
      this.logFilePath = logPath;
      this.fileWriteEnabled = true;

      // Write initialization marker
      this.writeToFile(`\n=== Logger initialized at ${new Date().toISOString()} ===\n`);

    } catch (error: any) {
      this.fileWriteEnabled = false;
      this.logFilePath = undefined;
      console.warn(`[Logger] Could not initialize file logging: ${error.message}`);
    }
  }

  /**
   * Write a message to the log file using synchronous writes
   */
  private writeToFile(message: string): void {
    if (!this.logFilePath || !this.fileWriteEnabled) {
      return;
    }

    try {
      // Use appendFileSync for guaranteed synchronous write to disk
      fs.appendFileSync(this.logFilePath, message + '\n', 'utf8');
    } catch (error: any) {
      this.fileWriteEnabled = false;
      console.warn(`[Logger] File write failed: ${error.message}`);
    }
  }

  /**
   * Close the logger and clean up resources
   * Note: With synchronous writes, no cleanup is needed, but we disable further writes
   */
  public close(): void {
    this.fileWriteEnabled = false;
    this.logFilePath = undefined;
    this.fileStream = undefined;  // Clean up any stream reference
  }
}

// Create singleton logger instance
export const logger = new Logger();

/**
 * Configure logger from environment variables
 * This should be called after environment variables are loaded (e.g., after dotenv.config())
 */
export function configureLoggerFromEnv(): void {
  // Security: A05:2021 - Security Misconfiguration
  // In production, force ERROR level to prevent debug information disclosure
  if (process.env.NODE_ENV === 'production') {
    logger.setLevel(LogLevel.ERROR);
  } else if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
    logger.setLevel(LogLevel.DEBUG);
  } else if (process.env.VERBOSE === 'true') {
    logger.configure({ verbose: true });
  } else if (process.env.LOG_LEVEL) {
    const level = parseInt(process.env.LOG_LEVEL, 10);
    if (!isNaN(level) && level >= LogLevel.DEBUG && level <= LogLevel.SILENT) {
      logger.setLevel(level as LogLevel);
    }
  }

  // Configure file logging
  if (process.env.LOG_FILE && process.env.LOG_FILE.trim() !== '') {
    logger.configure({
      logFile: process.env.LOG_FILE.trim(),
      enableFileLogging: true
    });
  }
}

export default logger; 