/**
 * Configuration UI Service
 *
 * Provides a comprehensive configuration interface for extension settings
 * with validation, real-time previews, and intelligent recommendations.
 */

import * as vscode from 'vscode';
import { WorkspaceAnalyzer } from './workspaceAnalyzer';
import { NotificationService } from './notificationService';
import { TIMEOUT_CONSTANTS } from '../config/analysisConstants';

export interface ConfigurationGroup {
  id: string;
  title: string;
  description: string;
  settings: ConfigurationSetting[];
}

export interface ConfigurationSetting {
  key: string;
  title: string;
  description: string;
  type: 'boolean' | 'number' | 'string' | 'enum' | 'array';
  default: any;
  options?: string[] | number[];
  validation?: (value: any) => boolean | string;
  onChange?: (value: any) => Promise<void>;
  dependsOn?: string;
  advanced?: boolean;
}

export interface ConfigurationProfile {
  name: string;
  description: string;
  settings: Record<string, any>;
  recommended?: boolean;
}

export class ConfigurationUIService {
  private currentProfile: string | null = null;
  private webviewPanel: vscode.WebviewPanel | null = null;
  private workspaceAnalyzer: WorkspaceAnalyzer;
  private notificationService: NotificationService;

  constructor(
    private context: vscode.ExtensionContext,
    workspaceAnalyzer: WorkspaceAnalyzer,
    notificationService: NotificationService
  ) {
    this.workspaceAnalyzer = workspaceAnalyzer;
    this.notificationService = notificationService;
  }

  /**
   * Show configuration UI
   */
  async showConfigurationUI(): Promise<void> {
    if (this.webviewPanel) {
      this.webviewPanel.reveal();
      return;
    }

    this.webviewPanel = vscode.window.createWebviewPanel(
      'ollama-code-config',
      'Ollama Code Configuration',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    this.webviewPanel.webview.html = await this.generateConfigurationHTML();
    this.setupWebviewMessageHandling();

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = null;
    });

    // Load current configuration
    await this.loadCurrentConfiguration();
  }

  /**
   * Get configuration groups with intelligent recommendations
   */
  private async getConfigurationGroups(): Promise<ConfigurationGroup[]> {
    const workspaceContext = await this.workspaceAnalyzer.analyzeWorkspace();

    if (!workspaceContext) {
      // Return basic configuration without workspace-specific recommendations
      return this.getBasicConfigurationGroups();
    }

    return [
      {
        id: 'connection',
        title: 'Connection Settings',
        description: 'Configure connection to Ollama Code backend',
        settings: [
          {
            key: 'ollama-code.serverPort',
            title: 'Server Port',
            description: 'Port for the Ollama Code integration server',
            type: 'number',
            default: 3002,
            validation: (value: number) => {
              if (value < 1024 || value > 65535) {
                return 'Port must be between 1024 and 65535';
              }
              return true;
            }
          },
          {
            key: 'ollama-code.autoStart',
            title: 'Auto Start Server',
            description: 'Automatically start the integration server when VS Code starts',
            type: 'boolean',
            default: true
          },
          {
            key: 'ollama-code.connectionTimeout',
            title: 'Connection Timeout',
            description: 'Connection timeout in milliseconds',
            type: 'number',
            default: TIMEOUT_CONSTANTS.AI_ANALYSIS_TIMEOUT,
            validation: (value: number) => {
              if (value < 1000 || value > 60000) {
                return 'Timeout must be between 1000ms and 60000ms';
              }
              return true;
            }
          },
          {
            key: 'ollama-code.retryAttempts',
            title: 'Retry Attempts',
            description: 'Number of connection retry attempts',
            type: 'number',
            default: 3,
            advanced: true
          }
        ]
      },
      {
        id: 'features',
        title: 'AI Features',
        description: 'Enable or disable specific AI-powered features',
        settings: [
          {
            key: 'ollama-code.inlineCompletions',
            title: 'Inline Completions',
            description: 'Enable AI-powered inline code completions',
            type: 'boolean',
            default: true
          },
          {
            key: 'ollama-code.codeActions',
            title: 'Code Actions',
            description: 'Enable AI-powered code actions and quick fixes',
            type: 'boolean',
            default: true
          },
          {
            key: 'ollama-code.diagnostics',
            title: 'Code Diagnostics',
            description: 'Enable AI-powered code diagnostics and suggestions',
            type: 'boolean',
            default: true
          },
          {
            key: 'ollama-code.hoverInfo',
            title: 'Hover Information',
            description: 'Enable AI-powered hover information and documentation',
            type: 'boolean',
            default: true,
            advanced: true
          },
          {
            key: 'ollama-code.autoSuggestions',
            title: 'Auto Suggestions',
            description: 'Automatically suggest improvements while typing',
            type: 'boolean',
            default: workspaceContext.projectType === 'large' ? false : true,
            advanced: true
          }
        ]
      },
      {
        id: 'analysis',
        title: 'Code Analysis',
        description: 'Configure AI analysis behavior and context',
        settings: [
          {
            key: 'ollama-code.contextLines',
            title: 'Context Lines',
            description: 'Number of context lines to include around cursor position',
            type: 'number',
            default: 20,
            validation: (value: number) => {
              if (value < 5 || value > 100) {
                return 'Context lines must be between 5 and 100';
              }
              return true;
            }
          },
          {
            key: 'ollama-code.analysisDepth',
            title: 'Analysis Depth',
            description: 'Depth of code analysis for suggestions',
            type: 'enum',
            options: ['surface', 'moderate', 'deep'],
            default: workspaceContext.projectType === 'large' ? 'surface' : 'moderate'
          },
          {
            key: 'ollama-code.includeComments',
            title: 'Include Comments',
            description: 'Include comments in code analysis',
            type: 'boolean',
            default: true,
            advanced: true
          },
          {
            key: 'ollama-code.analyzeImports',
            title: 'Analyze Imports',
            description: 'Include import analysis for better context',
            type: 'boolean',
            default: true,
            advanced: true
          }
        ]
      },
      {
        id: 'ui',
        title: 'User Interface',
        description: 'Customize the extension user interface',
        settings: [
          {
            key: 'ollama-code.showChatView',
            title: 'Show Chat View',
            description: 'Show the AI Chat view in the Explorer panel',
            type: 'boolean',
            default: true
          },
          {
            key: 'ollama-code.showStatusBar',
            title: 'Show Status Bar',
            description: 'Show AI status and progress in the status bar',
            type: 'boolean',
            default: true
          },
          {
            key: 'ollama-code.notificationLevel',
            title: 'Notification Level',
            description: 'Level of notifications to show',
            type: 'enum',
            options: ['minimal', 'standard', 'verbose'],
            default: 'standard'
          },
          {
            key: 'ollama-code.compactMode',
            title: 'Compact Mode',
            description: 'Use compact UI elements to save space',
            type: 'boolean',
            default: false,
            advanced: true
          }
        ]
      },
      {
        id: 'performance',
        title: 'Performance',
        description: 'Optimize extension performance for your workflow',
        settings: [
          {
            key: 'ollama-code.cacheSize',
            title: 'Cache Size (MB)',
            description: 'Maximum cache size for AI responses',
            type: 'number',
            default: workspaceContext.projectType === 'large' ? 100 : 50,
            validation: (value: number) => {
              if (value < 10 || value > 500) {
                return 'Cache size must be between 10MB and 500MB';
              }
              return true;
            },
            advanced: true
          },
          {
            key: 'ollama-code.maxConcurrentRequests',
            title: 'Max Concurrent Requests',
            description: 'Maximum number of concurrent AI requests',
            type: 'number',
            default: 3,
            validation: (value: number) => {
              if (value < 1 || value > 10) {
                return 'Must be between 1 and 10 concurrent requests';
              }
              return true;
            },
            advanced: true
          },
          {
            key: 'ollama-code.throttleDelay',
            title: 'Throttle Delay (ms)',
            description: 'Delay between rapid successive requests',
            type: 'number',
            default: 300,
            advanced: true
          }
        ]
      },
      {
        id: 'logging',
        title: 'Logging & Debugging',
        description: 'Configure logging and debugging options',
        settings: [
          {
            key: 'ollama-code.logLevel',
            title: 'Log Level',
            description: 'Logging level for the extension',
            type: 'enum',
            options: ['debug', 'info', 'warn', 'error'],
            default: 'info'
          },
          {
            key: 'ollama-code.enableTelemetry',
            title: 'Enable Telemetry',
            description: 'Help improve the extension by sending anonymous usage data',
            type: 'boolean',
            default: false,
            advanced: true
          },
          {
            key: 'ollama-code.debugMode',
            title: 'Debug Mode',
            description: 'Enable debug mode for troubleshooting',
            type: 'boolean',
            default: false,
            advanced: true
          }
        ]
      }
    ];
  }

  /**
   * Get configuration profiles based on project type
   */
  private async getConfigurationProfiles(): Promise<ConfigurationProfile[]> {
    const workspaceContext = await this.workspaceAnalyzer.analyzeWorkspace();

    if (!workspaceContext) {
      return this.getBasicConfigurationProfiles();
    }

    const profiles: ConfigurationProfile[] = [
      {
        name: 'Minimal',
        description: 'Lightweight configuration with essential features only',
        recommended: workspaceContext.projectType === 'large',
        settings: {
          'ollama-code.inlineCompletions': true,
          'ollama-code.codeActions': false,
          'ollama-code.diagnostics': false,
          'ollama-code.contextLines': 10,
          'ollama-code.analysisDepth': 'surface',
          'ollama-code.cacheSize': 25,
          'ollama-code.maxConcurrentRequests': 1,
          'ollama-code.notificationLevel': 'minimal'
        }
      },
      {
        name: 'Balanced',
        description: 'Recommended settings for most development workflows',
        recommended: workspaceContext.projectType === 'medium' || !workspaceContext.projectType,
        settings: {
          'ollama-code.inlineCompletions': true,
          'ollama-code.codeActions': true,
          'ollama-code.diagnostics': true,
          'ollama-code.contextLines': 20,
          'ollama-code.analysisDepth': 'moderate',
          'ollama-code.cacheSize': 50,
          'ollama-code.maxConcurrentRequests': 3,
          'ollama-code.notificationLevel': 'standard'
        }
      },
      {
        name: 'Full Featured',
        description: 'All features enabled for comprehensive AI assistance',
        recommended: workspaceContext.projectType === 'small',
        settings: {
          'ollama-code.inlineCompletions': true,
          'ollama-code.codeActions': true,
          'ollama-code.diagnostics': true,
          'ollama-code.hoverInfo': true,
          'ollama-code.autoSuggestions': true,
          'ollama-code.contextLines': 50,
          'ollama-code.analysisDepth': 'deep',
          'ollama-code.includeComments': true,
          'ollama-code.analyzeImports': true,
          'ollama-code.cacheSize': 100,
          'ollama-code.maxConcurrentRequests': 5,
          'ollama-code.notificationLevel': 'verbose'
        }
      },
      {
        name: 'Development',
        description: 'Debug-friendly settings for extension development',
        settings: {
          'ollama-code.logLevel': 'debug',
          'ollama-code.debugMode': true,
          'ollama-code.enableTelemetry': false,
          'ollama-code.retryAttempts': 1,
          'ollama-code.connectionTimeout': 5000
        }
      }
    ];

    // Add language-specific profiles
    if (workspaceContext.language) {
      const languageProfile = this.getLanguageSpecificProfile(workspaceContext.language);
      if (languageProfile) {
        profiles.push(languageProfile);
      }
    }

    return profiles;
  }

  /**
   * Get language-specific configuration profile
   */
  private getLanguageSpecificProfile(language: string): ConfigurationProfile | null {
    const languageProfiles: Record<string, ConfigurationProfile> = {
      typescript: {
        name: 'TypeScript Optimized',
        description: 'Optimized settings for TypeScript development',
        settings: {
          'ollama-code.contextLines': 30,
          'ollama-code.analyzeImports': true,
          'ollama-code.includeComments': true,
          'ollama-code.analysisDepth': 'moderate'
        }
      },
      python: {
        name: 'Python Optimized',
        description: 'Optimized settings for Python development',
        settings: {
          'ollama-code.contextLines': 25,
          'ollama-code.analyzeImports': true,
          'ollama-code.analysisDepth': 'deep'
        }
      },
      javascript: {
        name: 'JavaScript Optimized',
        description: 'Optimized settings for JavaScript development',
        settings: {
          'ollama-code.contextLines': 20,
          'ollama-code.analyzeImports': true,
          'ollama-code.analysisDepth': 'moderate'
        }
      },
      rust: {
        name: 'Rust Optimized',
        description: 'Optimized settings for Rust development',
        settings: {
          'ollama-code.contextLines': 35,
          'ollama-code.analysisDepth': 'deep',
          'ollama-code.includeComments': true
        }
      }
    };

    return languageProfiles[language] || null;
  }

  /**
   * Apply configuration profile
   */
  async applyProfile(profileName: string): Promise<void> {
    const profiles = await this.getConfigurationProfiles();
    const profile = profiles.find(p => p.name === profileName);

    if (!profile) {
      throw new Error(`Profile '${profileName}' not found`);
    }

    const config = vscode.workspace.getConfiguration();

    for (const [key, value] of Object.entries(profile.settings)) {
      await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }

    this.currentProfile = profileName;

    await this.notificationService.showNotification({
      type: 'info',
      message: `Applied configuration profile: ${profileName}`,
      detail: profile.description
    });
  }

  /**
   * Validate configuration settings
   */
  async validateConfiguration(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const groups = await this.getConfigurationGroups();
    const config = vscode.workspace.getConfiguration();

    for (const group of groups) {
      for (const setting of group.settings) {
        const value = config.get(setting.key, setting.default);

        if (setting.validation) {
          const result = setting.validation(value);
          if (result !== true) {
            issues.push(`${setting.title}: ${result}`);
          }
        }

        // Check dependencies
        if (setting.dependsOn) {
          const dependentValue = config.get(setting.dependsOn);
          if (!dependentValue && value) {
            issues.push(`${setting.title} requires ${setting.dependsOn} to be enabled`);
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get intelligent configuration recommendations
   */
  async getConfigurationRecommendations(): Promise<Array<{
    setting: string;
    currentValue: any;
    recommendedValue: any;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  }>> {
    const workspaceContext = await this.workspaceAnalyzer.analyzeWorkspace();
    const config = vscode.workspace.getConfiguration();
    const recommendations: Array<{
      setting: string;
      currentValue: any;
      recommendedValue: any;
      reason: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    if (!workspaceContext) {
      return recommendations; // Return empty recommendations if workspace analysis fails
    }

    // Performance recommendations
    if (workspaceContext.projectType === 'large') {
      const contextLines = config.get('ollama-code.contextLines', 20);
      if (contextLines > 15) {
        recommendations.push({
          setting: 'ollama-code.contextLines',
          currentValue: contextLines,
          recommendedValue: 15,
          reason: 'Large projects benefit from reduced context to improve performance',
          priority: 'high' as const
        });
      }

      const analysisDepth = config.get('ollama-code.analysisDepth', 'moderate') as string;
      if (analysisDepth === 'moderate' || analysisDepth === 'deep') {
        recommendations.push({
          setting: 'ollama-code.analysisDepth',
          currentValue: analysisDepth,
          recommendedValue: 'surface',
          reason: 'Surface analysis reduces processing time for large codebases',
          priority: 'medium' as const
        });
      }
    }

    // Language-specific recommendations
    if (workspaceContext.language === 'typescript' || workspaceContext.language === 'javascript') {
      const analyzeImports = config.get('ollama-code.analyzeImports', true);
      if (!analyzeImports) {
        recommendations.push({
          setting: 'ollama-code.analyzeImports',
          currentValue: false,
          recommendedValue: true,
          reason: 'Import analysis significantly improves suggestions for TypeScript/JavaScript projects',
          priority: 'high' as const
        });
      }
    }

    // Framework-specific recommendations
    if (workspaceContext.framework === 'react' || workspaceContext.framework === 'vue') {
      const contextLines = config.get('ollama-code.contextLines', 20);
      if (contextLines < 25) {
        recommendations.push({
          setting: 'ollama-code.contextLines',
          currentValue: contextLines,
          recommendedValue: 25,
          reason: 'Component-based frameworks benefit from additional context',
          priority: 'medium' as const
        });
      }
    }

    return recommendations;
  }

  /**
   * Export current configuration
   */
  async exportConfiguration(): Promise<string> {
    const groups = await this.getConfigurationGroups();
    const config = vscode.workspace.getConfiguration();
    const exportData: Record<string, any> = {};

    for (const group of groups) {
      for (const setting of group.settings) {
        const value = config.get(setting.key);
        if (value !== undefined && value !== setting.default) {
          exportData[setting.key] = value;
        }
      }
    }

    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: this.currentProfile,
      settings: exportData
    }, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  async importConfiguration(configJson: string): Promise<void> {
    try {
      const importData = JSON.parse(configJson);

      if (!importData.settings) {
        throw new Error('Invalid configuration format');
      }

      const config = vscode.workspace.getConfiguration();

      for (const [key, value] of Object.entries(importData.settings)) {
        await config.update(key, value, vscode.ConfigurationTarget.Workspace);
      }

      if (importData.profile) {
        this.currentProfile = importData.profile;
      }

      await this.notificationService.showNotification({
        type: 'info',
        message: 'Configuration imported successfully',
        detail: `Imported ${Object.keys(importData.settings).length} settings`
      });

    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Setup webview message handling
   */
  private setupWebviewMessageHandling(): void {
    if (!this.webviewPanel) return;

    this.webviewPanel.webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.command) {
          case 'getSetting':
            await this.handleGetSetting(message.key);
            break;
          case 'updateSetting':
            await this.handleUpdateSetting(message.key, message.value);
            break;
          case 'applyProfile':
            await this.applyProfile(message.profile);
            break;
          case 'getRecommendations':
            await this.handleGetRecommendations();
            break;
          case 'validateConfiguration':
            await this.handleValidateConfiguration();
            break;
          case 'exportConfiguration':
            await this.handleExportConfiguration();
            break;
          case 'importConfiguration':
            await this.importConfiguration(message.data);
            break;
        }
      } catch (error) {
        await this.notificationService.showNotification({
          type: 'error',
          message: 'Configuration Error',
          detail: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  /**
   * Handle get setting request
   */
  private async handleGetSetting(key: string): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const value = config.get(key);

    this.webviewPanel?.webview.postMessage({
      command: 'settingValue',
      key,
      value
    });
  }

  /**
   * Handle update setting request
   */
  private async handleUpdateSetting(key: string, value: any): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    await config.update(key, value, vscode.ConfigurationTarget.Workspace);

    this.webviewPanel?.webview.postMessage({
      command: 'settingUpdated',
      key,
      value
    });
  }

  /**
   * Handle get recommendations request
   */
  private async handleGetRecommendations(): Promise<void> {
    const recommendations = await this.getConfigurationRecommendations();

    this.webviewPanel?.webview.postMessage({
      command: 'recommendations',
      data: recommendations
    });
  }

  /**
   * Handle validate configuration request
   */
  private async handleValidateConfiguration(): Promise<void> {
    const result = await this.validateConfiguration();

    this.webviewPanel?.webview.postMessage({
      command: 'validationResult',
      data: result
    });
  }

  /**
   * Handle export configuration request
   */
  private async handleExportConfiguration(): Promise<void> {
    const configData = await this.exportConfiguration();

    this.webviewPanel?.webview.postMessage({
      command: 'exportData',
      data: configData
    });
  }

  /**
   * Load current configuration into UI
   */
  private async loadCurrentConfiguration(): Promise<void> {
    const groups = await this.getConfigurationGroups();
    const profiles = await this.getConfigurationProfiles();

    this.webviewPanel?.webview.postMessage({
      command: 'loadConfiguration',
      groups,
      profiles,
      currentProfile: this.currentProfile
    });
  }

  /**
   * Generate configuration HTML UI
   */
  private async generateConfigurationHTML(): Promise<string> {
    // This would contain the full HTML for the configuration UI
    // For brevity, returning a simplified version
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ollama Code Configuration</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                margin: 0;
                padding: 20px;
            }
            .config-container {
                max-width: 800px;
                margin: 0 auto;
            }
            .profile-section {
                background: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                padding: 16px;
                margin-bottom: 20px;
            }
            .config-group {
                margin-bottom: 24px;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                overflow: hidden;
            }
            .group-header {
                background: var(--vscode-panel-background);
                padding: 12px 16px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .group-title {
                font-size: 16px;
                font-weight: 600;
                margin: 0 0 4px 0;
            }
            .group-description {
                font-size: 13px;
                color: var(--vscode-descriptionForeground);
                margin: 0;
            }
            .setting {
                padding: 12px 16px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .setting:last-child {
                border-bottom: none;
            }
            .setting-title {
                font-weight: 500;
                margin-bottom: 4px;
            }
            .setting-description {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 8px;
            }
            .setting-control {
                margin-top: 8px;
            }
            input, select {
                background: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
                color: var(--vscode-input-foreground);
                padding: 6px 8px;
                border-radius: 2px;
                font-size: 13px;
            }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 6px 12px;
                border-radius: 2px;
                cursor: pointer;
                font-size: 13px;
            }
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .advanced-setting {
                opacity: 0.7;
            }
            .recommendation {
                background: var(--vscode-textBlockQuote-background);
                border-left: 4px solid var(--vscode-textBlockQuote-border);
                padding: 8px 12px;
                margin: 8px 0;
                border-radius: 0 4px 4px 0;
            }
            .profile-card {
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                padding: 12px;
                margin: 8px 0;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .profile-card:hover {
                background: var(--vscode-list-hoverBackground);
            }
            .profile-card.recommended {
                border-color: var(--vscode-button-background);
            }
            .profile-name {
                font-weight: 600;
                margin-bottom: 4px;
            }
            .profile-description {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
            }
        </style>
    </head>
    <body>
        <div class="config-container">
            <h1>Ollama Code Configuration</h1>

            <div class="profile-section">
                <h2>Configuration Profiles</h2>
                <p>Quick setup with recommended settings for your workflow.</p>
                <div id="profiles-container"></div>
            </div>

            <div id="config-groups-container"></div>

            <div class="profile-section">
                <h2>Advanced Actions</h2>
                <button onclick="getRecommendations()">Get Recommendations</button>
                <button onclick="validateConfiguration()">Validate Configuration</button>
                <button onclick="exportConfiguration()">Export Settings</button>
                <button onclick="importConfiguration()">Import Settings</button>
            </div>

            <div id="recommendations-container"></div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let currentGroups = [];
            let currentProfiles = [];

            // Message handling
            window.addEventListener('message', event => {
                const message = event.data;

                switch (message.command) {
                    case 'loadConfiguration':
                        loadConfiguration(message.groups, message.profiles, message.currentProfile);
                        break;
                    case 'recommendations':
                        showRecommendations(message.data);
                        break;
                    case 'validationResult':
                        showValidationResult(message.data);
                        break;
                    case 'exportData':
                        downloadConfiguration(message.data);
                        break;
                }
            });

            function loadConfiguration(groups, profiles, currentProfile) {
                currentGroups = groups;
                currentProfiles = profiles;
                renderProfiles(profiles, currentProfile);
                renderConfigGroups(groups);
            }

            function renderProfiles(profiles, currentProfile) {
                const container = document.getElementById('profiles-container');
                container.innerHTML = profiles.map(profile =>
                    \`<div class="profile-card \${profile.recommended ? 'recommended' : ''}" onclick="applyProfile('\${profile.name}')">
                        <div class="profile-name">\${profile.name} \${profile.recommended ? '(Recommended)' : ''}</div>
                        <div class="profile-description">\${profile.description}</div>
                    </div>\`
                ).join('');
            }

            function renderConfigGroups(groups) {
                const container = document.getElementById('config-groups-container');
                container.innerHTML = groups.map(group =>
                    \`<div class="config-group">
                        <div class="group-header">
                            <h3 class="group-title">\${group.title}</h3>
                            <p class="group-description">\${group.description}</p>
                        </div>
                        \${group.settings.map(setting => renderSetting(setting)).join('')}
                    </div>\`
                ).join('');
            }

            function renderSetting(setting) {
                const control = renderControl(setting);
                return \`<div class="setting \${setting.advanced ? 'advanced-setting' : ''}">
                    <div class="setting-title">\${setting.title}</div>
                    <div class="setting-description">\${setting.description}</div>
                    <div class="setting-control">\${control}</div>
                </div>\`;
            }

            function renderControl(setting) {
                switch (setting.type) {
                    case 'boolean':
                        return \`<input type="checkbox" id="\${setting.key}" onchange="updateSetting('\${setting.key}', this.checked)">\`;
                    case 'number':
                        return \`<input type="number" id="\${setting.key}" onchange="updateSetting('\${setting.key}', parseInt(this.value))">\`;
                    case 'enum':
                        return \`<select id="\${setting.key}" onchange="updateSetting('\${setting.key}', this.value)">
                            \${setting.options.map(opt => \`<option value="\${opt}">\${opt}</option>\`).join('')}
                        </select>\`;
                    default:
                        return \`<input type="text" id="\${setting.key}" onchange="updateSetting('\${setting.key}', this.value)">\`;
                }
            }

            function applyProfile(profileName) {
                vscode.postMessage({ command: 'applyProfile', profile: profileName });
            }

            function updateSetting(key, value) {
                vscode.postMessage({ command: 'updateSetting', key, value });
            }

            function getRecommendations() {
                vscode.postMessage({ command: 'getRecommendations' });
            }

            function validateConfiguration() {
                vscode.postMessage({ command: 'validateConfiguration' });
            }

            function exportConfiguration() {
                vscode.postMessage({ command: 'exportConfiguration' });
            }

            function importConfiguration() {
                // This would open a file dialog or text input for import
                const input = prompt('Paste configuration JSON:');
                if (input) {
                    vscode.postMessage({ command: 'importConfiguration', data: input });
                }
            }

            function showRecommendations(recommendations) {
                const container = document.getElementById('recommendations-container');
                if (recommendations.length === 0) {
                    container.innerHTML = '<p>No recommendations at this time.</p>';
                    return;
                }

                container.innerHTML = \`<h3>Configuration Recommendations</h3>\` +
                    recommendations.map(rec =>
                        \`<div class="recommendation">
                            <strong>\${rec.setting}</strong> (\${rec.priority} priority)<br>
                            Current: \${rec.currentValue} → Recommended: \${rec.recommendedValue}<br>
                            <em>\${rec.reason}</em>
                        </div>\`
                    ).join('');
            }

            function showValidationResult(result) {
                const container = document.getElementById('recommendations-container');
                if (result.valid) {
                    container.innerHTML = '<div class="recommendation" style="border-color: green;">✅ Configuration is valid</div>';
                } else {
                    container.innerHTML = \`<h3>Configuration Issues</h3>\` +
                        result.issues.map(issue =>
                            \`<div class="recommendation" style="border-color: red;">❌ \${issue}</div>\`
                        ).join('');
                }
            }

            function downloadConfiguration(data) {
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ollama-code-config.json';
                a.click();
                URL.revokeObjectURL(url);
            }
        </script>
    </body>
    </html>`;
  }

  /**
   * Get basic configuration groups without workspace analysis
   */
  private getBasicConfigurationGroups(): ConfigurationGroup[] {
    return [
      {
        id: 'connection',
        title: 'Connection Settings',
        description: 'Configure connection to Ollama Code backend',
        settings: [
          {
            key: 'ollama-code.serverPort',
            title: 'Server Port',
            description: 'Port for the Ollama Code integration server',
            type: 'number',
            default: 3002
          },
          {
            key: 'ollama-code.autoStart',
            title: 'Auto Start Server',
            description: 'Automatically start the integration server when VS Code starts',
            type: 'boolean',
            default: true
          }
        ]
      },
      {
        id: 'features',
        title: 'AI Features',
        description: 'Enable or disable specific AI-powered features',
        settings: [
          {
            key: 'ollama-code.inlineCompletions',
            title: 'Inline Completions',
            description: 'Enable AI-powered inline code completions',
            type: 'boolean',
            default: true
          },
          {
            key: 'ollama-code.codeActions',
            title: 'Code Actions',
            description: 'Enable AI-powered code actions and quick fixes',
            type: 'boolean',
            default: true
          }
        ]
      }
    ];
  }

  /**
   * Get basic configuration profiles without workspace analysis
   */
  private getBasicConfigurationProfiles(): ConfigurationProfile[] {
    return [
      {
        name: 'Balanced',
        description: 'Recommended settings for most development workflows',
        recommended: true,
        settings: {
          'ollama-code.inlineCompletions': true,
          'ollama-code.codeActions': true,
          'ollama-code.diagnostics': true,
          'ollama-code.contextLines': 20
        }
      },
      {
        name: 'Minimal',
        description: 'Lightweight configuration with essential features only',
        settings: {
          'ollama-code.inlineCompletions': true,
          'ollama-code.codeActions': false,
          'ollama-code.diagnostics': false,
          'ollama-code.contextLines': 10
        }
      }
    ];
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.webviewPanel) {
      this.webviewPanel.dispose();
    }
  }
}