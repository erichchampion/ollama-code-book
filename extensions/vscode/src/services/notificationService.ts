/**
 * Notification Service
 *
 * Provides notification system for AI insights and recommendations
 * with progress indicators for long-running operations.
 */

import * as vscode from 'vscode';
import { TIMEOUT_CONSTANTS } from '../config/analysisConstants';
import { UI_TIMEOUTS, PROGRESS_INTERVALS } from '../config/serviceConstants';
import { formatError } from '../utils/errorUtils';

export interface NotificationOptions {
  type: 'info' | 'warning' | 'error' | 'progress';
  message: string;
  detail?: string;
  actions?: NotificationAction[];
  timeout?: number;
  showProgress?: boolean;
  cancellable?: boolean;
}

export interface NotificationAction {
  title: string;
  action: () => void | Promise<void>;
  isCloseAction?: boolean;
}

export interface ProgressOptions {
  title: string;
  detail?: string;
  cancellable?: boolean;
  location?: vscode.ProgressLocation;
}

export class NotificationService {
  private activeProgressItems = new Map<string, vscode.Progress<{ message?: string; increment?: number }>>();
  private progressTokens = new Map<string, vscode.CancellationToken>();

  /**
   * Show notification with AI insights and recommendations
   */
  async showNotification(options: NotificationOptions): Promise<string | undefined> {
    const { type, message, detail, actions, timeout } = options;

    try {
      switch (type) {
        case 'info':
          return await this.showInfoNotification(message, detail, actions, timeout);
        case 'warning':
          return await this.showWarningNotification(message, detail, actions, timeout);
        case 'error':
          return await this.showErrorNotification(message, detail, actions);
        case 'progress':
          return await this.showProgressNotification(message, detail, options.showProgress);
        default:
          return await this.showInfoNotification(message, detail, actions, timeout);
      }
    } catch (error) {
      console.error('Failed to show notification:', formatError(error));
      return undefined;
    }
  }

  /**
   * Show progress indicator for long-running operations
   */
  async showProgress<T>(
    options: ProgressOptions,
    task: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Promise<T>
  ): Promise<T> {
    const { title, detail, cancellable = true, location = vscode.ProgressLocation.Notification } = options;

    return vscode.window.withProgress(
      {
        location,
        title,
        cancellable
      },
      async (progress, token) => {
        const progressId = `progress_${Date.now()}`;
        this.activeProgressItems.set(progressId, progress);
        this.progressTokens.set(progressId, token);

        try {
          if (detail) {
            progress.report({ message: detail });
          }

          const result = await task(progress, token);
          return result;
        } finally {
          this.activeProgressItems.delete(progressId);
          this.progressTokens.delete(progressId);
        }
      }
    );
  }

  /**
   * Update progress for an active operation
   */
  updateProgress(progressId: string, message: string, increment?: number): void {
    const progress = this.activeProgressItems.get(progressId);
    if (progress) {
      progress.report({ message, increment });
    }
  }

  /**
   * Show AI insight notification
   */
  async showAIInsight(
    title: string,
    insight: string,
    severity: 'info' | 'suggestion' | 'warning' | 'critical' = 'info'
  ): Promise<void> {
    const icon = this.getInsightIcon(severity);
    const message = `${icon} ${title}`;

    const actions: NotificationAction[] = [
      {
        title: 'Learn More',
        action: () => this.showInsightDetail(title, insight)
      }
    ];

    if (severity === 'critical') {
      await this.showErrorNotification(message, insight, actions);
    } else if (severity === 'warning') {
      await this.showWarningNotification(message, insight, actions);
    } else {
      await this.showInfoNotification(message, insight, actions);
    }
  }

  /**
   * Show code improvement suggestion
   */
  async showCodeSuggestion(
    suggestion: string,
    codeExample?: string,
    applyAction?: () => Promise<void>
  ): Promise<void> {
    const actions: NotificationAction[] = [];

    if (applyAction) {
      actions.push({
        title: 'Apply Suggestion',
        action: applyAction
      });
    }

    actions.push({
      title: 'Show Example',
      action: () => this.showCodeExample(suggestion, codeExample || 'No example available')
    });

    await this.showInfoNotification(
      `💡 AI Suggestion: ${suggestion}`,
      'Click "Show Example" to see the recommended implementation.',
      actions
    );
  }

  /**
   * Show analysis progress for multiple files
   */
  async showAnalysisProgress(
    files: string[],
    analyzer: (file: string) => Promise<void>
  ): Promise<void> {
    await this.showProgress(
      {
        title: 'Analyzing Code',
        detail: `Processing ${files.length} files...`,
        cancellable: true,
        location: vscode.ProgressLocation.Notification
      },
      async (progress, token) => {
        const totalFiles = files.length;
        let processedFiles = 0;

        for (const file of files) {
          if (token.isCancellationRequested) {
            break;
          }

          progress.report({
            message: `Analyzing ${file}...`,
            increment: (1 / totalFiles) * 100
          });

          try {
            await analyzer(file);
          } catch (error) {
            console.error(`Failed to analyze ${file}:`, formatError(error));
          }

          processedFiles++;

          progress.report({
            message: `Processed ${processedFiles}/${totalFiles} files`,
            increment: 0
          });
        }

        if (token.isCancellationRequested) {
          progress.report({ message: 'Analysis cancelled' });
        } else {
          progress.report({ message: 'Analysis complete!' });
        }
      }
    );
  }

  /**
   * Show workspace indexing progress
   */
  async showIndexingProgress(
    totalFiles: number,
    onProgress: (current: number, total: number) => void
  ): Promise<void> {
    await this.showProgress(
      {
        title: 'Indexing Workspace',
        detail: 'Building code intelligence index...',
        cancellable: false,
        location: vscode.ProgressLocation.Window
      },
      async (progress, token) => {
        let processedFiles = 0;

        // Simulate indexing process
        const updateProgress = () => {
          processedFiles++;
          const percentage = (processedFiles / totalFiles) * 100;

          progress.report({
            message: `Indexed ${processedFiles}/${totalFiles} files (${Math.round(percentage)}%)`,
            increment: (1 / totalFiles) * 100
          });

          onProgress(processedFiles, totalFiles);

          if (processedFiles < totalFiles) {
            setTimeout(updateProgress, PROGRESS_INTERVALS.INDEXING_SIMULATION);
          }
        };

        updateProgress();

        // Wait for completion
        return new Promise(resolve => {
          const checkCompletion = () => {
            if (processedFiles >= totalFiles) {
              progress.report({ message: 'Indexing complete!' });
              resolve(undefined);
            } else {
              setTimeout(checkCompletion, PROGRESS_INTERVALS.COMPLETION_CHECK);
            }
          };
          checkCompletion();
        });
      }
    );
  }

  /**
   * Show AI operation status
   */
  async showAIOperationStatus(
    operation: string,
    estimatedTime?: number
  ): Promise<void> {
    const timeout = estimatedTime || TIMEOUT_CONSTANTS.AI_ANALYSIS_TIMEOUT;

    await this.showProgress(
      {
        title: `AI ${operation}`,
        detail: 'Processing your request...',
        cancellable: true
      },
      async (progress, token) => {
        const startTime = Date.now();
        const updateInterval = PROGRESS_INTERVALS.UPDATE_INTERVAL;

        return new Promise((resolve) => {
          const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const percentage = Math.min((elapsed / timeout) * 100, 95);

            if (token.isCancellationRequested) {
              progress.report({ message: 'Operation cancelled' });
              resolve(undefined);
              return;
            }

            if (elapsed >= timeout) {
              progress.report({ message: 'Operation completed' });
              resolve(undefined);
              return;
            }

            progress.report({
              message: `Processing... (${Math.round(percentage)}%)`,
              increment: 0
            });

            setTimeout(updateProgress, updateInterval);
          };

          updateProgress();
        });
      }
    );
  }

  /**
   * Show configuration recommendation
   */
  async showConfigRecommendation(
    setting: string,
    currentValue: any,
    recommendedValue: any,
    reason: string
  ): Promise<void> {
    const actions: NotificationAction[] = [
      {
        title: 'Apply Recommendation',
        action: async () => {
          try {
            await vscode.workspace.getConfiguration().update(
              setting,
              recommendedValue,
              vscode.ConfigurationTarget.Workspace
            );
            this.showNotification({
              type: 'info',
              message: '✅ Configuration updated successfully!'
            });
          } catch (error) {
            this.showNotification({
              type: 'error',
              message: `Failed to update configuration: ${formatError(error)}`
            });
          }
        }
      },
      {
        title: 'Learn More',
        action: () => this.showConfigurationHelp(setting, reason)
      }
    ];

    await this.showInfoNotification(
      `⚙️ Configuration Recommendation`,
      `Consider changing "${setting}" from "${currentValue}" to "${recommendedValue}". ${reason}`,
      actions
    );
  }

  /**
   * Private helper methods
   */

  private async showInfoNotification(
    message: string,
    detail?: string,
    actions?: NotificationAction[],
    timeout?: number
  ): Promise<string | undefined> {
    const actionItems = actions?.map(a => a.title) || [];
    const result = await vscode.window.showInformationMessage(
      message,
      { detail, modal: false },
      ...actionItems
    );

    if (result && actions) {
      const action = actions.find(a => a.title === result);
      if (action) {
        await action.action();
      }
    }

    if (timeout) {
      setTimeout(() => {
        // Auto-dismiss would be handled by VS Code
      }, timeout);
    }

    return result;
  }

  private async showWarningNotification(
    message: string,
    detail?: string,
    actions?: NotificationAction[],
    timeout?: number
  ): Promise<string | undefined> {
    const actionItems = actions?.map(a => a.title) || [];
    const result = await vscode.window.showWarningMessage(
      message,
      { detail, modal: false },
      ...actionItems
    );

    if (result && actions) {
      const action = actions.find(a => a.title === result);
      if (action) {
        await action.action();
      }
    }

    return result;
  }

  private async showErrorNotification(
    message: string,
    detail?: string,
    actions?: NotificationAction[]
  ): Promise<string | undefined> {
    const actionItems = actions?.map(a => a.title) || [];
    const result = await vscode.window.showErrorMessage(
      message,
      { detail, modal: false },
      ...actionItems
    );

    if (result && actions) {
      const action = actions.find(a => a.title === result);
      if (action) {
        await action.action();
      }
    }

    return result;
  }

  private async showProgressNotification(
    message: string,
    detail?: string,
    showProgress?: boolean
  ): Promise<string | undefined> {
    if (showProgress) {
      return vscode.window.showInformationMessage(`⏳ ${message}`, detail || '');
    } else {
      return vscode.window.showInformationMessage(message);
    }
  }

  private getInsightIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'suggestion': return '💡';
      default: return 'ℹ️';
    }
  }

  private async showInsightDetail(title: string, insight: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      content: `# AI Insight: ${title}\n\n${insight}`,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(document);
  }

  private async showCodeExample(suggestion: string, example: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      content: `// AI Suggestion: ${suggestion}\n\n${example}`,
      language: 'javascript'
    });
    await vscode.window.showTextDocument(document);
  }

  private async showConfigurationHelp(setting: string, reason: string): Promise<void> {
    const content = `# Configuration Help\n\n## Setting: ${setting}\n\n### Recommendation Reason:\n${reason}\n\n### How to change this setting:\n1. Open VS Code Settings (Ctrl+,)\n2. Search for "${setting}"\n3. Update the value as recommended\n\nOr you can update it programmatically in your settings.json file.`;

    const document = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(document);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.activeProgressItems.clear();
    this.progressTokens.clear();
  }
}