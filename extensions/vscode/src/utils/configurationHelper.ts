/**
 * Configuration Helper Utilities
 *
 * Shared utilities for accessing and managing VS Code configuration
 * to eliminate duplicate configuration access patterns.
 */

import * as vscode from 'vscode';
import { DEFAULT_CONFIGURATION } from '../config/serviceConstants';

export class ConfigurationHelper {
  private static readonly CONFIG_SECTION = 'ollama-code';

  /**
   * Get configuration value with type safety and defaults
   */
  static get<T>(key: keyof typeof DEFAULT_CONFIGURATION): T {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    const defaultValue = DEFAULT_CONFIGURATION[key] as T;
    return config.get<T>(key, defaultValue);
  }

  /**
   * Get configuration value with custom default
   */
  static getWithDefault<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get<T>(key, defaultValue);
  }

  /**
   * Set configuration value
   */
  static async set<T>(
    key: keyof typeof DEFAULT_CONFIGURATION,
    value: T,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    await config.update(key, value, target);
  }

  /**
   * Get all configuration values as a typed object
   */
  static getAll(): typeof DEFAULT_CONFIGURATION {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    return {
      serverPort: config.get('serverPort', DEFAULT_CONFIGURATION.serverPort),
      autoStart: config.get('autoStart', DEFAULT_CONFIGURATION.autoStart),
      showChatView: config.get('showChatView', DEFAULT_CONFIGURATION.showChatView),
      inlineCompletions: config.get('inlineCompletions', DEFAULT_CONFIGURATION.inlineCompletions),
      codeActions: config.get('codeActions', DEFAULT_CONFIGURATION.codeActions),
      diagnostics: config.get('diagnostics', DEFAULT_CONFIGURATION.diagnostics),
      contextLines: config.get('contextLines', DEFAULT_CONFIGURATION.contextLines),
      connectionTimeout: config.get('connectionTimeout', DEFAULT_CONFIGURATION.connectionTimeout),
      logLevel: config.get('logLevel', DEFAULT_CONFIGURATION.logLevel),
      showStatusBar: config.get('showStatusBar', DEFAULT_CONFIGURATION.showStatusBar),
      notificationLevel: config.get('notificationLevel', DEFAULT_CONFIGURATION.notificationLevel),
      compactMode: config.get('compactMode', DEFAULT_CONFIGURATION.compactMode),
      cacheSize: config.get('cacheSize', DEFAULT_CONFIGURATION.cacheSize),
      maxConcurrentRequests: config.get('maxConcurrentRequests', DEFAULT_CONFIGURATION.maxConcurrentRequests),
      throttleDelay: config.get('throttleDelay', DEFAULT_CONFIGURATION.throttleDelay),
      enableTelemetry: config.get('enableTelemetry', DEFAULT_CONFIGURATION.enableTelemetry),
      debugMode: config.get('debugMode', DEFAULT_CONFIGURATION.debugMode),
      retryAttempts: config.get('retryAttempts', DEFAULT_CONFIGURATION.retryAttempts),
    };
  }

  /**
   * Reset configuration to defaults
   */
  static async resetToDefaults(
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    for (const [key, value] of Object.entries(DEFAULT_CONFIGURATION)) {
      await config.update(key, value, target);
    }
  }

  /**
   * Check if configuration value exists
   */
  static has(key: string): boolean {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    const inspect = config.inspect(key);
    return inspect !== undefined &&
           (inspect.workspaceValue !== undefined ||
            inspect.globalValue !== undefined ||
            inspect.defaultValue !== undefined);
  }

  /**
   * Get configuration inspection details
   */
  static inspect(key: keyof typeof DEFAULT_CONFIGURATION) {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.inspect(key);
  }

  /**
   * Watch for configuration changes
   */
  static onDidChangeConfiguration(
    listener: (event: vscode.ConfigurationChangeEvent) => void,
    thisArg?: any,
    disposables?: vscode.Disposable[]
  ): vscode.Disposable {
    const disposable = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration(this.CONFIG_SECTION)) {
          listener(event);
        }
      },
      thisArg
    );

    if (disposables) {
      disposables.push(disposable);
    }

    return disposable;
  }

  /**
   * Validate configuration values
   */
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getAll();

    // Validate server port
    if (config.serverPort < 1024 || config.serverPort > 65535) {
      errors.push(`Invalid serverPort: ${config.serverPort}. Must be between 1024 and 65535.`);
    }

    // Validate connection timeout
    if (config.connectionTimeout < 1000 || config.connectionTimeout > 60000) {
      errors.push(`Invalid connectionTimeout: ${config.connectionTimeout}. Must be between 1000 and 60000.`);
    }

    // Validate context lines
    if (config.contextLines < 5 || config.contextLines > 100) {
      errors.push(`Invalid contextLines: ${config.contextLines}. Must be between 5 and 100.`);
    }

    // Validate cache size
    if (config.cacheSize < 10 || config.cacheSize > 500) {
      errors.push(`Invalid cacheSize: ${config.cacheSize}. Must be between 10 and 500.`);
    }

    // Validate concurrent requests
    if (config.maxConcurrentRequests < 1 || config.maxConcurrentRequests > 10) {
      errors.push(`Invalid maxConcurrentRequests: ${config.maxConcurrentRequests}. Must be between 1 and 10.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}