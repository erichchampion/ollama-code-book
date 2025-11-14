/**
 * Simple spinner utility for showing progress during long operations
 */

import { STREAMING_DEFAULTS } from '../constants/streaming.js';

export class Spinner {
  private frames = ['-', '\\', '|', '/', '-', '\\', '|', '/'];
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private text: string;
  private isSpinning = false;

  constructor(text = 'Processing...') {
    this.text = text;
  }

  /**
   * Start the spinner animation
   */
  start(): void {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.currentFrame = 0;

    // Only show spinner in interactive terminals
    if (!process.stdout.isTTY) {
      process.stdout.write(`${this.text}\n`);
      return;
    }

    // Hide cursor
    process.stdout.write('\x1B[?25l');

    this.interval = setInterval(() => {
      this.render();
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, STREAMING_DEFAULTS.SPINNER_UPDATE_INTERVAL);

    // Initial render
    this.render();
  }

  /**
   * Stop the spinner and clean up
   */
  stop(): void {
    if (!this.isSpinning) return;

    this.isSpinning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (process.stdout.isTTY) {
      // Clear the spinner line
      process.stdout.write('\r\x1B[K');
      // Show cursor
      process.stdout.write('\x1B[?25h');
    }
  }

  /**
   * Update the spinner text
   */
  setText(text: string): void {
    this.text = text;
    if (this.isSpinning && process.stdout.isTTY) {
      this.render();
    }
  }

  /**
   * Render the current frame
   */
  private render(): void {
    if (!process.stdout.isTTY) return;

    const frame = this.frames[this.currentFrame];
    const output = `\r${frame} ${this.text}`;
    process.stdout.write(output);
  }

  /**
   * Stop and show success message
   */
  succeed(message?: string): void {
    this.stop();
    if (message && process.stdout.isTTY) {
      process.stdout.write(`✓ ${message}\n`);
    }
  }

  /**
   * Stop and show error message
   */
  fail(message?: string): void {
    this.stop();
    if (message && process.stdout.isTTY) {
      process.stdout.write(`✗ ${message}\n`);
    }
  }
}

/**
 * Create and start a spinner with the given text
 */
export function createSpinner(text = 'Processing...'): Spinner {
  const spinner = new Spinner(text);
  return spinner;
}

/**
 * Options for withSpinner wrapper
 */
export interface WithSpinnerOptions {
  /** Message to show on success (false to show no message, undefined for default) */
  successMessage?: string | false;
  /** Message to show on failure (false to show no message, undefined for default) */
  failureMessage?: string | false;
}

/**
 * Run a function with a spinner
 *
 * Consolidated wrapper that eliminates the common spinner try-catch pattern.
 * Handles spinner lifecycle automatically with custom success/failure messages.
 *
 * @param text - Initial spinner text
 * @param fn - Async function to execute
 * @param options - Optional success/failure messages
 * @returns The result of the function
 * @throws Re-throws any error from the function after showing failure message
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await withSpinner('Loading...', async () => {
 *   return await fetchData();
 * });
 *
 * // With custom messages
 * const commits = await withSpinner(
 *   'Fetching commits...',
 *   async () => getCommits(),
 *   {
 *     successMessage: 'Recent commits fetched',
 *     failureMessage: 'Failed to fetch commits'
 *   }
 * );
 *
 * // Silent success (no message on success)
 * await withSpinner('Processing...', processData, {
 *   successMessage: false,
 *   failureMessage: 'Processing failed'
 * });
 * ```
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  options: WithSpinnerOptions = {}
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();

  try {
    const result = await fn();

    // Handle success message
    if (options.successMessage === false) {
      // Silent success - just stop spinner
      spinner.stop();
    } else if (options.successMessage) {
      // Custom success message
      spinner.succeed(options.successMessage);
    } else {
      // Default behavior - stop without message
      spinner.succeed();
    }

    return result;
  } catch (error) {
    // Handle failure message
    if (options.failureMessage === false) {
      // Silent failure - just stop spinner
      spinner.stop();
    } else if (options.failureMessage) {
      // Custom failure message
      spinner.fail(options.failureMessage);
    } else {
      // Default behavior - stop without message
      spinner.fail();
    }

    throw error;
  }
}