/**
 * Progress Utilities
 *
 * Shared utilities for progress tracking and reporting to eliminate
 * duplicate progress handling patterns across services.
 */

import * as vscode from 'vscode';
import { PROGRESS_INTERVALS, STATUS_BAR_CONFIG } from '../config/serviceConstants';
import { formatError } from './errorUtils';

export interface ProgressOptions {
  title: string;
  location?: vscode.ProgressLocation;
  cancellable?: boolean;
  total?: number;
}

export interface ProgressStep {
  message: string;
  increment?: number;
  detail?: string;
}

/**
 * Execute a task with progress tracking
 */
export async function withProgress<T>(
  options: ProgressOptions,
  task: (
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ) => Promise<T>
): Promise<T> {
  const { title, location = vscode.ProgressLocation.Notification, cancellable = true } = options;

  return vscode.window.withProgress(
    {
      location,
      title,
      cancellable
    },
    async (progress, token) => {
      try {
        return await task(progress, token);
      } catch (error) {
        progress.report({ message: `Error: ${formatError(error)}` });
        throw error;
      }
    }
  );
}

/**
 * Create a progress reporter for step-by-step operations
 */
export class StepProgressReporter {
  private currentStep = 0;
  private totalSteps: number;
  private progress: vscode.Progress<{ message?: string; increment?: number }>;

  constructor(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    totalSteps: number
  ) {
    this.progress = progress;
    this.totalSteps = totalSteps;
  }

  /**
   * Report completion of a step
   */
  completeStep(message: string): void {
    this.currentStep++;
    const percentage = (this.currentStep / this.totalSteps) * 100;
    const increment = (1 / this.totalSteps) * 100;

    this.progress.report({
      message: `${message} (${this.currentStep}/${this.totalSteps})`,
      increment
    });
  }

  /**
   * Update current step without completing it
   */
  updateStep(message: string): void {
    this.progress.report({
      message: `${message} (${this.currentStep}/${this.totalSteps})`,
      increment: 0
    });
  }

  /**
   * Set overall progress percentage
   */
  setProgress(percentage: number, message?: string): void {
    this.progress.report({
      message: message || `Progress: ${Math.round(percentage)}%`,
      increment: 0
    });
  }

  /**
   * Get current progress percentage
   */
  getCurrentProgress(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  /**
   * Check if all steps are completed
   */
  isComplete(): boolean {
    return this.currentStep >= this.totalSteps;
  }
}

/**
 * Execute batch operation with progress tracking
 */
export async function executeBatchWithProgress<T, R>(
  items: T[],
  processor: (item: T, index: number, total: number) => Promise<R>,
  options: ProgressOptions & { batchSize?: number }
): Promise<R[]> {
  const { batchSize = 5 } = options;
  const results: R[] = [];

  return withProgress(
    {
      ...options,
      title: options.title || 'Processing batch...'
    },
    async (progress, token) => {
      const totalItems = items.length;
      let processedItems = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        if (token.isCancellationRequested) {
          progress.report({ message: 'Operation cancelled' });
          break;
        }

        const batch = items.slice(i, Math.min(i + batchSize, items.length));
        const batchPromises = batch.map((item, batchIndex) => {
          const absoluteIndex = i + batchIndex;
          return processor(item, absoluteIndex, totalItems);
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        processedItems += batch.length;
        const percentage = (processedItems / totalItems) * 100;

        progress.report({
          message: `Processed ${processedItems}/${totalItems} items`,
          increment: (batch.length / totalItems) * 100
        });
      }

      return results;
    }
  );
}

/**
 * Create a timed progress indicator
 */
export async function createTimedProgress(
  title: string,
  estimatedDuration: number,
  options: {
    location?: vscode.ProgressLocation;
    showPercentage?: boolean;
    updateInterval?: number;
  } = {}
): Promise<void> {
  const {
    location = vscode.ProgressLocation.Notification,
    showPercentage = true,
    updateInterval = PROGRESS_INTERVALS.UPDATE_INTERVAL
  } = options;

  return withProgress(
    { title, location, cancellable: true },
    async (progress, token) => {
      const startTime = Date.now();

      return new Promise<void>((resolve) => {
        const updateProgress = () => {
          if (token.isCancellationRequested) {
            progress.report({ message: 'Operation cancelled' });
            resolve();
            return;
          }

          const elapsed = Date.now() - startTime;
          const percentage = Math.min((elapsed / estimatedDuration) * 100, 95);

          if (elapsed >= estimatedDuration) {
            progress.report({ message: 'Operation completed' });
            resolve();
            return;
          }

          const message = showPercentage
            ? `Processing... (${Math.round(percentage)}%)`
            : 'Processing...';

          progress.report({ message, increment: 0 });

          setTimeout(updateProgress, updateInterval);
        };

        updateProgress();
      });
    }
  );
}

/**
 * Status bar progress indicator
 */
export class StatusBarProgressIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private hideTimeout?: NodeJS.Timeout;

  constructor(priority = STATUS_BAR_CONFIG.PROGRESS_PRIORITY) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      priority
    );
  }

  /**
   * Show progress in status bar
   */
  show(message: string, tooltip?: string): void {
    this.clearHideTimeout();
    this.statusBarItem.text = `$(sync~spin) ${message}`;
    this.statusBarItem.tooltip = tooltip || message;
    this.statusBarItem.show();
  }

  /**
   * Update progress message
   */
  update(message: string, tooltip?: string): void {
    this.statusBarItem.text = `$(sync~spin) ${message}`;
    this.statusBarItem.tooltip = tooltip || message;
  }

  /**
   * Show success message
   */
  showSuccess(message: string, autoHide = true): void {
    this.clearHideTimeout();
    this.statusBarItem.text = `$(check) ${message}`;
    this.statusBarItem.tooltip = message;
    this.statusBarItem.show();

    if (autoHide) {
      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, STATUS_BAR_CONFIG.SUCCESS_MESSAGE_DELAY);
    }
  }

  /**
   * Show error message
   */
  showError(message: string, autoHide = true): void {
    this.clearHideTimeout();
    this.statusBarItem.text = `$(error) ${message}`;
    this.statusBarItem.tooltip = message;
    this.statusBarItem.show();

    if (autoHide) {
      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, STATUS_BAR_CONFIG.ERROR_MESSAGE_DELAY);
    }
  }

  /**
   * Hide status bar item
   */
  hide(): void {
    this.clearHideTimeout();
    this.statusBarItem.hide();
  }

  /**
   * Dispose of status bar item
   */
  dispose(): void {
    this.clearHideTimeout();
    this.statusBarItem.dispose();
  }

  private clearHideTimeout(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }
  }
}

/**
 * Create progress for file operations
 */
export async function withFileProgress<T>(
  files: string[],
  processor: (file: string, progress: StepProgressReporter) => Promise<T>,
  title = 'Processing files'
): Promise<T[]> {
  return withProgress(
    {
      title,
      location: vscode.ProgressLocation.Notification,
      cancellable: true
    },
    async (progress, token) => {
      const stepProgress = new StepProgressReporter(progress, files.length);
      const results: T[] = [];

      for (const file of files) {
        if (token.isCancellationRequested) {
          break;
        }

        try {
          const result = await processor(file, stepProgress);
          results.push(result);
          stepProgress.completeStep(`Processed ${file}`);
        } catch (error) {
          stepProgress.updateStep(`Failed to process ${file}: ${formatError(error)}`);
        }
      }

      return results;
    }
  );
}