/**
 * Progress Indicator Service
 *
 * Provides enhanced progress indicators for long-running operations
 * with real-time updates, cancellation support, and intelligent UI feedback.
 */

import * as vscode from 'vscode';
import { NotificationService } from './notificationService';
import { TIMEOUT_CONSTANTS } from '../config/analysisConstants';
import { STATUS_BAR_CONFIG, PROGRESS_INTERVALS, UI_TIMEOUTS } from '../config/serviceConstants';
import { formatError, createError } from '../utils/errorUtils';

export interface ProgressTask<T = any> {
  id: string;
  title: string;
  description?: string;
  estimatedDuration?: number;
  cancellable?: boolean;
  showInStatusBar?: boolean;
  showAsNotification?: boolean;
  priority: 'low' | 'medium' | 'high';
  operation: (
    progress: ProgressReporter,
    token: vscode.CancellationToken
  ) => Promise<T>;
}

export interface ProgressStep {
  message: string;
  increment?: number;
  detail?: string;
}

export interface ProgressReporter {
  report(step: ProgressStep): void;
  setProgress(percentage: number, message?: string): void;
  addStep(message: string): void;
  completeStep(message?: string): void;
  setError(error: string): void;
  setWarning(warning: string): void;
}

export interface ActiveProgress {
  task: ProgressTask;
  progress: vscode.Progress<{ message?: string; increment?: number }>;
  token: vscode.CancellationToken;
  startTime: Date;
  currentProgress: number;
  steps: string[];
  completedSteps: number;
  statusBarItem?: vscode.StatusBarItem;
}

export class ProgressIndicatorService {
  private activeProgressTasks = new Map<string, ActiveProgress>();
  private notificationService: NotificationService;
  private statusBarItems = new Map<string, vscode.StatusBarItem>();

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  /**
   * Execute a task with comprehensive progress tracking
   */
  async executeWithProgress<T>(task: ProgressTask<T>): Promise<T> {
    const progressId = task.id;

    // Check if task is already running
    if (this.activeProgressTasks.has(progressId)) {
      throw createError(`Progress task '${progressId}' is already running`);
    }

    const location = this.getProgressLocation(task);

    return vscode.window.withProgress(
      {
        location,
        title: task.title,
        cancellable: task.cancellable ?? true
      },
      async (progress, token) => {
        const activeProgress: ActiveProgress = {
          task,
          progress,
          token,
          startTime: new Date(),
          currentProgress: 0,
          steps: [],
          completedSteps: 0
        };

        this.activeProgressTasks.set(progressId, activeProgress);

        // Set up status bar if requested
        if (task.showInStatusBar) {
          this.setupStatusBarProgress(progressId, activeProgress);
        }

        // Create progress reporter
        const reporter = this.createProgressReporter(progressId);

        try {
          // Initial progress report
          progress.report({
            message: task.description || 'Starting...',
            increment: 0
          });

          // Execute the task
          const result = await task.operation(reporter, token);

          // Mark as completed
          await this.completeProgress(progressId, 'Completed successfully');

          return result;

        } catch (error) {
          await this.errorProgress(progressId, error instanceof Error ? error.message : String(error));
          throw error;
        } finally {
          this.cleanupProgress(progressId);
        }
      }
    );
  }

  /**
   * Execute multiple tasks with combined progress tracking
   */
  async executeMultipleWithProgress<T>(
    tasks: ProgressTask<T>[],
    options: {
      title: string;
      description?: string;
      sequential?: boolean;
      failFast?: boolean;
    }
  ): Promise<T[]> {
    const { title, description, sequential = false, failFast = true } = options;

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
      },
      async (progress, token) => {
        const totalTasks = tasks.length;
        let completedTasks = 0;
        const results: T[] = [];
        const errors: Error[] = [];

        progress.report({
          message: description || `Processing ${totalTasks} tasks...`,
          increment: 0
        });

        if (sequential) {
          // Execute tasks sequentially
          for (let i = 0; i < tasks.length; i++) {
            if (token.isCancellationRequested) {
              break;
            }

            const task = tasks[i];

            try {
              progress.report({
                message: `Executing: ${task.title} (${i + 1}/${totalTasks})`,
                increment: 0
              });

              const result = await this.executeTaskInternal(task, token);
              results.push(result);
              completedTasks++;

              progress.report({
                message: `Completed: ${task.title}`,
                increment: (1 / totalTasks) * 100
              });

            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              errors.push(err);

              if (failFast) {
                throw err;
              }

              progress.report({
                message: `Failed: ${task.title} - ${err.message}`,
                increment: (1 / totalTasks) * 100
              });
            }
          }
        } else {
          // Execute tasks in parallel
          const promises = tasks.map(async (task, index) => {
            try {
              const result = await this.executeTaskInternal(task, token);
              completedTasks++;

              progress.report({
                message: `Completed: ${task.title} (${completedTasks}/${totalTasks})`,
                increment: (1 / totalTasks) * 100
              });

              return { success: true, result, index } as const;
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              errors.push(err);

              progress.report({
                message: `Failed: ${task.title} - ${err.message}`,
                increment: (1 / totalTasks) * 100
              });

              return { success: false, error: err, index } as const;
            }
          });

          const outcomes = await Promise.all(promises);

          // Process results in order
          for (const outcome of outcomes.sort((a, b) => a.index - b.index)) {
            if (outcome.success && 'result' in outcome) {
              results.push(outcome.result);
            } else if (failFast && 'error' in outcome) {
              throw outcome.error;
            }
          }
        }

        if (token.isCancellationRequested) {
          progress.report({ message: 'Operation cancelled' });
          throw new Error('Operation was cancelled');
        }

        if (errors.length > 0 && !failFast) {
          progress.report({
            message: `Completed with ${errors.length} errors`
          });

          // Show error summary
          await this.notificationService.showNotification({
            type: 'warning',
            message: `${title} completed with errors`,
            detail: `${completedTasks}/${totalTasks} tasks completed successfully`,
            actions: [{
              title: 'View Errors',
              action: () => this.showErrorSummary(title, errors)
            }]
          });
        } else {
          progress.report({ message: 'All tasks completed successfully' });
        }

        return results;
      }
    );
  }

  /**
   * Show progress for file analysis operations
   */
  async showFileAnalysisProgress(
    files: string[],
    analyzer: (file: string, reporter: ProgressReporter) => Promise<void>,
    options: {
      title?: string;
      batchSize?: number;
      showFileNames?: boolean;
    } = {}
  ): Promise<void> {
    const {
      title = 'Analyzing Files',
      batchSize = 5,
      showFileNames = true
    } = options;

    await this.executeWithProgress({
      id: `file-analysis-${Date.now()}`,
      title,
      description: `Processing ${files.length} files...`,
      cancellable: true,
      showInStatusBar: true,
      priority: 'medium',
      operation: async (reporter, token) => {
        const totalFiles = files.length;
        let processedFiles = 0;

        // Process files in batches to avoid overwhelming the system
        for (let i = 0; i < files.length; i += batchSize) {
          if (token.isCancellationRequested) {
            break;
          }

          const batch = files.slice(i, Math.min(i + batchSize, files.length));

          // Process batch in parallel
          await Promise.all(batch.map(async (file) => {
            if (token.isCancellationRequested) {
              return;
            }

            try {
              const fileName = showFileNames ? file.split('/').pop() || file : 'file';
              reporter.addStep(`Analyzing ${fileName}...`);

              await analyzer(file, reporter);

              processedFiles++;
              const percentage = (processedFiles / totalFiles) * 100;

              reporter.setProgress(
                percentage,
                `Processed ${processedFiles}/${totalFiles} files`
              );

            } catch (error) {
              reporter.setWarning(`Failed to analyze ${file}: ${error instanceof Error ? error.message : String(error)}`);
              processedFiles++;
            }
          }));
        }

        if (token.isCancellationRequested) {
          reporter.setWarning('Analysis cancelled by user');
        } else {
          reporter.setProgress(100, 'Analysis complete');
        }
      }
    });
  }

  /**
   * Show progress for AI model operations
   */
  async showAIOperationProgress<T>(
    operation: string,
    task: () => Promise<T>,
    options: {
      estimatedTime?: number;
      showTokens?: boolean;
      model?: string;
    } = {}
  ): Promise<T> {
    const { estimatedTime, showTokens = false, model } = options;

    return this.executeWithProgress({
      id: `ai-operation-${Date.now()}`,
      title: `AI ${operation}`,
      description: model ? `Using ${model}` : 'Processing request...',
      estimatedDuration: estimatedTime || TIMEOUT_CONSTANTS.AI_ANALYSIS_TIMEOUT,
      cancellable: false, // AI operations typically can't be cancelled mid-stream
      showInStatusBar: true,
      priority: 'high',
      operation: async (reporter, token) => {
        const startTime = Date.now();
        let tokens = 0;

        // Simulate periodic updates for AI operations
        const updateInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const estimatedTotal = estimatedTime || TIMEOUT_CONSTANTS.AI_ANALYSIS_TIMEOUT;
          const progress = Math.min((elapsed / estimatedTotal) * 90, 90); // Max 90% until complete

          let message = `${operation}...`;
          if (showTokens && tokens > 0) {
            message += ` (${tokens} tokens)`;
          }

          reporter.setProgress(progress, message);
        }, PROGRESS_INTERVALS.UPDATE_INTERVAL);

        try {
          const result = await task();
          clearInterval(updateInterval);

          reporter.setProgress(100, `${operation} completed`);
          return result;

        } catch (error) {
          clearInterval(updateInterval);
          throw error;
        }
      }
    });
  }

  /**
   * Get active progress tasks
   */
  getActiveProgressTasks(): Map<string, ActiveProgress> {
    return new Map(this.activeProgressTasks);
  }

  /**
   * Cancel a specific progress task
   */
  cancelProgressTask(progressId: string): boolean {
    const activeProgress = this.activeProgressTasks.get(progressId);
    if (!activeProgress) {
      return false;
    }

    // We can't directly cancel the token, but we can remove our tracking
    this.cleanupProgress(progressId);
    return true;
  }

  /**
   * Cancel all active progress tasks
   */
  cancelAllProgressTasks(): void {
    const activeIds = Array.from(this.activeProgressTasks.keys());
    activeIds.forEach(id => this.cancelProgressTask(id));
  }

  /**
   * Private helper methods
   */

  private getProgressLocation(task: ProgressTask): vscode.ProgressLocation {
    if (task.showAsNotification) {
      return vscode.ProgressLocation.Notification;
    }

    switch (task.priority) {
      case 'high':
        return vscode.ProgressLocation.Notification;
      case 'medium':
        return vscode.ProgressLocation.Window;
      case 'low':
      default:
        return vscode.ProgressLocation.Window;
    }
  }

  private setupStatusBarProgress(progressId: string, activeProgress: ActiveProgress): void {
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      95
    );

    statusBarItem.text = `$(loading~spin) ${activeProgress.task.title}`;
    statusBarItem.tooltip = activeProgress.task.description || 'Operation in progress...';
    statusBarItem.command = 'ollama-code.showProgress';
    statusBarItem.show();

    this.statusBarItems.set(progressId, statusBarItem);
    activeProgress.statusBarItem = statusBarItem;
  }

  private createProgressReporter(progressId: string): ProgressReporter {
    const activeProgress = this.activeProgressTasks.get(progressId);
    if (!activeProgress) {
      throw new Error(`No active progress found for ID: ${progressId}`);
    }

    return {
      report: (step: ProgressStep) => {
        activeProgress.progress.report({
          message: step.message,
          increment: step.increment || 0
        });

        if (step.increment) {
          activeProgress.currentProgress += step.increment;
        }

        // Update status bar
        if (activeProgress.statusBarItem) {
          activeProgress.statusBarItem.text = `$(loading~spin) ${step.message}`;
          if (step.detail) {
            activeProgress.statusBarItem.tooltip = step.detail;
          }
        }
      },

      setProgress: (percentage: number, message?: string) => {
        const increment = percentage - activeProgress.currentProgress;
        activeProgress.currentProgress = percentage;

        activeProgress.progress.report({
          message: message || `${Math.round(percentage)}% complete`,
          increment: increment > 0 ? increment : 0
        });

        // Update status bar
        if (activeProgress.statusBarItem) {
          activeProgress.statusBarItem.text = `$(loading~spin) ${Math.round(percentage)}%`;
          if (message) {
            activeProgress.statusBarItem.tooltip = message;
          }
        }
      },

      addStep: (message: string) => {
        activeProgress.steps.push(message);
        activeProgress.progress.report({ message, increment: 0 });
      },

      completeStep: (message?: string) => {
        activeProgress.completedSteps++;
        const stepProgress = (activeProgress.completedSteps / activeProgress.steps.length) * 100;

        activeProgress.currentProgress = stepProgress;
        activeProgress.progress.report({
          message: message || `Completed step ${activeProgress.completedSteps}/${activeProgress.steps.length}`,
          increment: 0
        });

        // Update status bar if available
        if (activeProgress.statusBarItem) {
          activeProgress.statusBarItem.text = `$(loading~spin) ${Math.round(stepProgress)}%`;
          if (message) {
            activeProgress.statusBarItem.tooltip = message;
          }
        }
      },

      setError: (error: string) => {
        activeProgress.progress.report({
          message: `Error: ${error}`,
          increment: 0
        });

        if (activeProgress.statusBarItem) {
          activeProgress.statusBarItem.text = `$(error) Error`;
          activeProgress.statusBarItem.tooltip = error;
        }
      },

      setWarning: (warning: string) => {
        activeProgress.progress.report({
          message: `Warning: ${warning}`,
          increment: 0
        });

        if (activeProgress.statusBarItem) {
          activeProgress.statusBarItem.text = `$(warning) Warning`;
          activeProgress.statusBarItem.tooltip = warning;
        }
      }
    };
  }

  private async executeTaskInternal<T>(
    task: ProgressTask<T>,
    parentToken: vscode.CancellationToken
  ): Promise<T> {
    const reporter = {
      report: () => {},
      setProgress: () => {},
      addStep: () => {},
      completeStep: () => {},
      setError: () => {},
      setWarning: () => {}
    };

    return task.operation(reporter, parentToken);
  }

  private async completeProgress(progressId: string, message: string): Promise<void> {
    const activeProgress = this.activeProgressTasks.get(progressId);
    if (!activeProgress) return;

    activeProgress.progress.report({
      message,
      increment: 100 - activeProgress.currentProgress
    });

    if (activeProgress.statusBarItem) {
      activeProgress.statusBarItem.text = `$(check) ${message}`;
      activeProgress.statusBarItem.tooltip = `${activeProgress.task.title} completed successfully`;

      // Auto-hide after success message delay
      setTimeout(() => {
        activeProgress.statusBarItem?.dispose();
      }, STATUS_BAR_CONFIG.SUCCESS_MESSAGE_DELAY);
    }
  }

  private async errorProgress(progressId: string, error: string): Promise<void> {
    const activeProgress = this.activeProgressTasks.get(progressId);
    if (!activeProgress) return;

    activeProgress.progress.report({
      message: `Error: ${error}`,
      increment: 0
    });

    if (activeProgress.statusBarItem) {
      activeProgress.statusBarItem.text = `$(error) Failed`;
      activeProgress.statusBarItem.tooltip = error;

      // Auto-hide after error message delay
      setTimeout(() => {
        activeProgress.statusBarItem?.dispose();
      }, STATUS_BAR_CONFIG.ERROR_MESSAGE_DELAY);
    }
  }

  private cleanupProgress(progressId: string): void {
    const activeProgress = this.activeProgressTasks.get(progressId);
    if (activeProgress?.statusBarItem) {
      this.statusBarItems.delete(progressId);
      activeProgress.statusBarItem.dispose();
    }

    this.activeProgressTasks.delete(progressId);
  }

  private async showErrorSummary(title: string, errors: Error[]): Promise<void> {
    const errorText = errors.map((error, index) =>
      `${index + 1}. ${formatError(error)}`
    ).join('\n');

    const document = await vscode.workspace.openTextDocument({
      content: `# ${title} - Error Summary\n\nThe following errors occurred during execution:\n\n${errorText}`,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(document);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.cancelAllProgressTasks();

    // Dispose all status bar items
    this.statusBarItems.forEach(item => item.dispose());
    this.statusBarItems.clear();
  }
}