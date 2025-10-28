/**
 * Console Capture Utility
 *
 * Provides thread-safe console output capturing for command execution
 * and other scenarios where console output needs to be intercepted.
 */

import { logger } from './logger.js';

export interface ConsoleCaptureOptions {
  includeStderr?: boolean;
  maxOutputSize?: number;
  timeout?: number;
}

/**
 * Thread-safe console output capture utility
 */
export class ConsoleCapture {
  private originalLog: typeof console.log;
  private originalError: typeof console.error;
  private originalWarn: typeof console.warn;
  private originalInfo: typeof console.info;
  private output: string = '';
  private errorOutput: string = '';
  private isCapturing = false;
  private options: ConsoleCaptureOptions;
  private startTime: number = 0;

  constructor(options: ConsoleCaptureOptions = {}) {
    this.options = {
      includeStderr: false,
      maxOutputSize: 1024 * 1024, // 1MB default
      timeout: 30000, // 30 seconds default
      ...options
    };

    // Store original console methods
    this.originalLog = console.log;
    this.originalError = console.error;
    this.originalWarn = console.warn;
    this.originalInfo = console.info;
  }

  /**
   * Start capturing console output
   */
  start(): void {
    if (this.isCapturing) {
      logger.warn('Console capture already active');
      return;
    }

    this.isCapturing = true;
    this.output = '';
    this.errorOutput = '';
    this.startTime = Date.now();

    // Override console methods
    console.log = (...args) => {
      this.appendOutput(args.join(' ') + '\n');
    };

    console.info = (...args) => {
      this.appendOutput('[INFO] ' + args.join(' ') + '\n');
    };

    if (this.options.includeStderr) {
      console.error = (...args) => {
        this.appendErrorOutput('[ERROR] ' + args.join(' ') + '\n');
      };

      console.warn = (...args) => {
        this.appendErrorOutput('[WARN] ' + args.join(' ') + '\n');
      };
    }
  }

  /**
   * Stop capturing and return captured output
   */
  stop(): { output: string; errorOutput: string; duration: number } {
    if (!this.isCapturing) {
      logger.warn('Console capture not active');
      return { output: '', errorOutput: '', duration: 0 };
    }

    // Restore original console methods
    console.log = this.originalLog;
    console.error = this.originalError;
    console.warn = this.originalWarn;
    console.info = this.originalInfo;

    this.isCapturing = false;
    const duration = Date.now() - this.startTime;

    return {
      output: this.output,
      errorOutput: this.errorOutput,
      duration
    };
  }

  /**
   * Get current captured output without stopping capture
   */
  getCurrentOutput(): { output: string; errorOutput: string } {
    return {
      output: this.output,
      errorOutput: this.errorOutput
    };
  }

  /**
   * Check if capture is active
   */
  isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Clear captured output without stopping capture
   */
  clear(): void {
    this.output = '';
    this.errorOutput = '';
  }

  /**
   * Safely append to output with size limits
   */
  private appendOutput(text: string): void {
    if (!this.isCapturing) return;

    // Check timeout
    if (this.options.timeout && (Date.now() - this.startTime) > this.options.timeout) {
      this.appendOutput('\n[TIMEOUT] Console capture timed out\n');
      this.stop();
      return;
    }

    // Check size limits
    if (this.options.maxOutputSize && this.output.length + text.length > this.options.maxOutputSize) {
      const truncateMsg = '\n[TRUNCATED] Output too large, truncating...\n';
      this.output = this.output.substring(0, this.options.maxOutputSize - truncateMsg.length) + truncateMsg;
      return;
    }

    this.output += text;
  }

  /**
   * Safely append to error output with size limits
   */
  private appendErrorOutput(text: string): void {
    if (!this.isCapturing) return;

    // Check size limits
    if (this.options.maxOutputSize && this.errorOutput.length + text.length > this.options.maxOutputSize) {
      const truncateMsg = '\n[TRUNCATED] Error output too large, truncating...\n';
      this.errorOutput = this.errorOutput.substring(0, this.options.maxOutputSize - truncateMsg.length) + truncateMsg;
      return;
    }

    this.errorOutput += text;
  }
}

/**
 * Convenience function to capture console output during async operation
 */
export async function captureConsoleOutput<T>(
  operation: () => Promise<T>,
  options: ConsoleCaptureOptions = {}
): Promise<{ result: T; output: string; errorOutput: string; duration: number }> {
  const capture = new ConsoleCapture(options);

  capture.start();

  try {
    const result = await operation();
    const { output, errorOutput, duration } = capture.stop();

    return { result, output, errorOutput, duration };
  } catch (error) {
    const { output, errorOutput, duration } = capture.stop();
    throw { error, output, errorOutput, duration };
  }
}

/**
 * Convenience function to capture console output during sync operation
 */
export function captureConsoleOutputSync<T>(
  operation: () => T,
  options: ConsoleCaptureOptions = {}
): { result: T; output: string; errorOutput: string; duration: number } {
  const capture = new ConsoleCapture(options);

  capture.start();

  try {
    const result = operation();
    const { output, errorOutput, duration } = capture.stop();

    return { result, output, errorOutput, duration };
  } catch (error) {
    const { output, errorOutput, duration } = capture.stop();
    throw { error, output, errorOutput, duration };
  }
}