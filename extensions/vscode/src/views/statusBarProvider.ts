/**
 * Status Bar Integration Provider
 *
 * Provides AI operation status, connection status, and quick actions
 * in the VS Code status bar with real-time updates and user feedback.
 */

import * as vscode from 'vscode';
import { OllamaCodeClient } from '../client/ollamaCodeClient';
import { Logger } from '../utils/logger';

interface StatusBarState {
  connection: 'connected' | 'disconnected' | 'connecting';
  operation: 'idle' | 'analyzing' | 'generating' | 'refactoring' | 'error';
  operationProgress?: number;
  lastActivity?: Date;
}

export class StatusBarProvider {
  private connectionStatusItem: vscode.StatusBarItem;
  private operationStatusItem: vscode.StatusBarItem;
  private quickActionsItem: vscode.StatusBarItem;
  private progressTimer?: NodeJS.Timeout;
  private currentState: StatusBarState = {
    connection: 'disconnected',
    operation: 'idle'
  };

  constructor(
    private client: OllamaCodeClient,
    private logger: Logger
  ) {
    // Create status bar items
    this.connectionStatusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.operationStatusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );

    this.quickActionsItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      98
    );

    // Set up initial state
    this.setupStatusItems();
    this.startConnectionMonitoring();
  }

  /**
   * Set up initial status bar items
   */
  private setupStatusItems(): void {
    // Connection status item
    this.connectionStatusItem.command = 'ollama-code.toggleConnection';
    this.connectionStatusItem.tooltip = 'Ollama Code Connection Status';

    // Operation status item (hidden by default)
    this.operationStatusItem.command = 'ollama-code.showProgress';
    this.operationStatusItem.tooltip = 'Current AI Operation';

    // Quick actions item
    this.quickActionsItem.text = '$(robot) AI';
    this.quickActionsItem.command = 'ollama-code.showQuickActions';
    this.quickActionsItem.tooltip = 'Ollama Code Quick Actions';
    this.quickActionsItem.show();

    this.updateConnectionStatus();
  }

  /**
   * Start monitoring connection status
   */
  private startConnectionMonitoring(): void {
    // Initial connection check
    this.checkConnection();

    // Periodic connection monitoring
    setInterval(() => {
      this.checkConnection();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check connection status and update UI
   */
  private checkConnection(): void {
    const status = this.client.getConnectionStatus();
    const newConnection = status.connected ? 'connected' : 'disconnected';

    if (newConnection !== this.currentState.connection) {
      this.currentState.connection = newConnection;
      this.currentState.lastActivity = new Date();
      this.updateConnectionStatus();
    }
  }

  /**
   * Update connection status display
   */
  private updateConnectionStatus(): void {
    const { connection } = this.currentState;

    switch (connection) {
      case 'connected':
        this.connectionStatusItem.text = '$(plug) Ollama Connected';
        this.connectionStatusItem.backgroundColor = undefined;
        this.connectionStatusItem.color = undefined;
        this.connectionStatusItem.tooltip = 'Ollama Code is connected and ready';
        break;

      case 'connecting':
        this.connectionStatusItem.text = '$(loading~spin) Connecting...';
        this.connectionStatusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this.connectionStatusItem.tooltip = 'Connecting to Ollama Code server...';
        break;

      case 'disconnected':
      default:
        this.connectionStatusItem.text = '$(plug) Ollama Disconnected';
        this.connectionStatusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        this.connectionStatusItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        this.connectionStatusItem.tooltip = 'Ollama Code is disconnected. Click to reconnect.';
        break;
    }

    this.connectionStatusItem.show();
  }

  /**
   * Show operation in progress
   */
  public showOperation(
    operation: 'analyzing' | 'generating' | 'refactoring',
    message?: string,
    progress?: number
  ): void {
    this.currentState.operation = operation;
    this.currentState.operationProgress = progress;
    this.currentState.lastActivity = new Date();

    let icon: string;
    let text: string;

    switch (operation) {
      case 'analyzing':
        icon = '$(search)';
        text = message || 'Analyzing code...';
        break;
      case 'generating':
        icon = '$(gear)';
        text = message || 'Generating suggestions...';
        break;
      case 'refactoring':
        icon = '$(tools)';
        text = message || 'Refactoring code...';
        break;
    }

    if (progress !== undefined) {
      text += ` (${Math.round(progress)}%)`;
    }

    this.operationStatusItem.text = `${icon} ${text}`;
    this.operationStatusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    this.operationStatusItem.tooltip = `Ollama Code: ${text}`;
    this.operationStatusItem.show();

    // Auto-hide after 10 seconds if no updates
    if (this.progressTimer) {
      clearTimeout(this.progressTimer);
    }

    this.progressTimer = setTimeout(() => {
      if (this.currentState.operation !== 'idle') {
        this.hideOperation();
      }
    }, 10000);
  }

  /**
   * Update operation progress
   */
  public updateProgress(progress: number, message?: string): void {
    if (this.currentState.operation === 'idle') {
      return;
    }

    this.currentState.operationProgress = progress;
    const currentText = this.operationStatusItem.text.split('(')[0].trim();
    this.operationStatusItem.text = `${currentText} (${Math.round(progress)}%)`;

    if (message) {
      this.operationStatusItem.tooltip = `Ollama Code: ${message}`;
    }
  }

  /**
   * Show operation completed successfully
   */
  public showOperationComplete(message: string = 'Operation completed'): void {
    this.operationStatusItem.text = `$(check) ${message}`;
    this.operationStatusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    this.operationStatusItem.tooltip = `Ollama Code: ${message}`;
    this.operationStatusItem.show();

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.hideOperation();
    }, 3000);

    this.currentState.operation = 'idle';
    this.currentState.lastActivity = new Date();
  }

  /**
   * Show operation error
   */
  public showOperationError(error: string): void {
    this.operationStatusItem.text = `$(error) Failed: ${error}`;
    this.operationStatusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.operationStatusItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
    this.operationStatusItem.tooltip = `Ollama Code Error: ${error}`;
    this.operationStatusItem.show();

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideOperation();
    }, 5000);

    this.currentState.operation = 'error';
    this.currentState.lastActivity = new Date();
  }

  /**
   * Hide operation status
   */
  public hideOperation(): void {
    this.operationStatusItem.hide();
    this.currentState.operation = 'idle';
    this.currentState.operationProgress = undefined;

    if (this.progressTimer) {
      clearTimeout(this.progressTimer);
      this.progressTimer = undefined;
    }
  }

  /**
   * Set connection status to connecting
   */
  public setConnecting(): void {
    this.currentState.connection = 'connecting';
    this.updateConnectionStatus();
  }

  /**
   * Update quick actions based on context
   */
  public updateQuickActions(hasActiveFile: boolean, hasSelection: boolean): void {
    let tooltip = 'Ollama Code AI Assistant';

    if (hasActiveFile) {
      tooltip += '\n• Click for quick actions';
      if (hasSelection) {
        tooltip += '\n• Code selected - AI can analyze selection';
      }
    } else {
      tooltip += '\n• Open a file to enable AI features';
    }

    this.quickActionsItem.tooltip = tooltip;

    // Update icon based on status
    const isConnected = this.currentState.connection === 'connected';
    if (!isConnected) {
      this.quickActionsItem.text = '$(robot) AI (Offline)';
      this.quickActionsItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (hasActiveFile) {
      this.quickActionsItem.text = hasSelection ? '$(robot) AI (Selected)' : '$(robot) AI';
      this.quickActionsItem.backgroundColor = undefined;
    } else {
      this.quickActionsItem.text = '$(robot) AI';
      this.quickActionsItem.backgroundColor = undefined;
    }
  }

  /**
   * Show notification in status bar
   */
  public showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    let icon: string;
    let backgroundColor: vscode.ThemeColor | undefined;
    let color: vscode.ThemeColor | undefined;

    switch (type) {
      case 'warning':
        icon = '$(warning)';
        backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      case 'error':
        icon = '$(error)';
        backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        color = new vscode.ThemeColor('statusBarItem.errorForeground');
        break;
      default:
        icon = '$(info)';
        backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    }

    const notificationItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      97
    );

    notificationItem.text = `${icon} ${message}`;
    notificationItem.backgroundColor = backgroundColor;
    notificationItem.color = color;
    notificationItem.tooltip = `Ollama Code: ${message}`;
    notificationItem.show();

    // Auto-hide after 5 seconds
    setTimeout(() => {
      notificationItem.dispose();
    }, 5000);
  }

  /**
   * Get current status for other components
   */
  public getStatus(): StatusBarState {
    return { ...this.currentState };
  }

  /**
   * Setup workspace context tracking for status updates
   */
  public setupContextTracking(): void {
    // Track active editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      const hasActiveFile = !!editor;
      this.updateQuickActions(hasActiveFile, false);
    });

    // Track text selection changes
    vscode.window.onDidChangeTextEditorSelection((event) => {
      const hasSelection = !event.textEditor.selection.isEmpty;
      this.updateQuickActions(true, hasSelection);
    });
  }

  /**
   * Dispose of status bar items
   */
  public dispose(): void {
    this.connectionStatusItem.dispose();
    this.operationStatusItem.dispose();
    this.quickActionsItem.dispose();

    if (this.progressTimer) {
      clearTimeout(this.progressTimer);
    }
  }
}