/**
 * Ollama Code VS Code Extension
 *
 * Main extension entry point that provides AI-powered development assistance
 * through integration with the Ollama Code CLI backend.
 */

import * as vscode from 'vscode';
import { OllamaCodeClient } from './client/ollamaCodeClient';
import { CommandHandler } from './commands/commandHandler';
import { InlineCompletionProvider } from './providers/inlineCompletionProvider';
import { CodeActionProvider } from './providers/codeActionProvider';
import { HoverProvider } from './providers/hoverProvider';
import { DiagnosticProvider } from './providers/diagnosticProvider';
import { CodeLensProvider } from './providers/codeLensProvider';
import { DocumentSymbolProvider } from './providers/documentSymbolProvider';
import { ChatViewProvider } from './views/chatViewProvider';
import { StatusBarProvider } from './views/statusBarProvider';
import { WorkspaceAnalyzer } from './services/workspaceAnalyzer';
import { NotificationService } from './services/notificationService';
import { ConfigurationUIService } from './services/configurationUIService';
import { ProgressIndicatorService } from './services/progressIndicatorService';
import { Logger } from './utils/logger';
import { ERROR_MESSAGES } from './config/serviceConstants';
import { formatError } from './utils/errorUtils';
import { ConfigurationHelper } from './utils/configurationHelper';

let client: OllamaCodeClient;
let logger: Logger;
let diagnosticProvider: DiagnosticProvider;
let statusBarProvider: StatusBarProvider;
let workspaceAnalyzer: WorkspaceAnalyzer;
let notificationService: NotificationService;
let configurationUIService: ConfigurationUIService;
let progressIndicatorService: ProgressIndicatorService;

/**
 * Extension activation function
 */
export async function activate(context: vscode.ExtensionContext) {
  logger = new Logger('Ollama Code');
  logger.info('Activating Ollama Code extension...');

  try {
    // Initialize the client using ConfigurationHelper
    client = new OllamaCodeClient({
      port: ConfigurationHelper.get<number>('serverPort'),
      autoStart: ConfigurationHelper.get<boolean>('autoStart'),
      connectionTimeout: ConfigurationHelper.get<number>('connectionTimeout'),
      logLevel: ConfigurationHelper.get<string>('logLevel')
    });

    // Initialize services
    await initializeServices(context);

    // Initialize providers
    await initializeProviders(context);

    // Register commands
    registerCommands(context);

    // Set up event listeners
    setupEventListeners(context);

    // Attempt connection if auto-start is enabled
    if (ConfigurationHelper.get<boolean>('autoStart')) {
      await client.connect();
      vscode.commands.executeCommand('setContext', 'ollama-code.connected', true);
    }

    logger.info('Ollama Code extension activated successfully');
    vscode.window.showInformationMessage('Ollama Code extension activated');

  } catch (error) {
    logger.error('Failed to activate extension:', error);
    vscode.window.showErrorMessage(`Failed to activate Ollama Code: ${formatError(error)}`);
    throw error;
  }
}

/**
 * Extension deactivation function
 */
export async function deactivate() {
  logger?.info('Deactivating Ollama Code extension...');

  try {
    // Disconnect client
    if (client) {
      await client.disconnect();
    }

    // Dispose providers
    if (diagnosticProvider) {
      diagnosticProvider.dispose();
    }

    // Dispose services
    if (statusBarProvider) {
      statusBarProvider.dispose();
    }

    if (workspaceAnalyzer) {
      workspaceAnalyzer.dispose();
    }

    if (notificationService) {
      notificationService.dispose();
    }

    if (configurationUIService) {
      configurationUIService.dispose();
    }

    if (progressIndicatorService) {
      progressIndicatorService.dispose();
    }

    logger?.info('Ollama Code extension deactivated');

  } catch (error) {
    logger?.error('Error during deactivation:', error);
  }
}

/**
 * Initialize core services
 */
async function initializeServices(context: vscode.ExtensionContext) {
  // Initialize workspace analyzer
  workspaceAnalyzer = new WorkspaceAnalyzer();
  context.subscriptions.push(workspaceAnalyzer);
  logger.info('Workspace analyzer initialized');

  // Initialize notification service
  notificationService = new NotificationService();
  context.subscriptions.push(notificationService);
  logger.info('Notification service initialized');

  // Initialize progress indicator service
  progressIndicatorService = new ProgressIndicatorService(notificationService);
  context.subscriptions.push(progressIndicatorService);
  logger.info('Progress indicator service initialized');

  // Initialize configuration UI service
  configurationUIService = new ConfigurationUIService(
    context,
    workspaceAnalyzer,
    notificationService
  );
  context.subscriptions.push(configurationUIService);
  logger.info('Configuration UI service initialized');

  // Initialize status bar provider
  statusBarProvider = new StatusBarProvider(client, logger);
  context.subscriptions.push(statusBarProvider);
  statusBarProvider.setupContextTracking();
  logger.info('Status bar provider initialized');
}

/**
 * Initialize language feature providers
 */
async function initializeProviders(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('ollama-code');

  // Register inline completion provider
  if (config.get<boolean>('inlineCompletions', true)) {
    const inlineProvider = new InlineCompletionProvider(client, logger);
    context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider(
        { scheme: 'file' },
        inlineProvider
      )
    );
    logger.info('Inline completion provider registered');
  }

  // Register code action provider
  if (config.get<boolean>('codeActions', true)) {
    const codeActionProvider = new CodeActionProvider(client, logger);
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        { scheme: 'file' },
        codeActionProvider,
        {
          providedCodeActionKinds: [
            vscode.CodeActionKind.QuickFix,
            vscode.CodeActionKind.Refactor,
            vscode.CodeActionKind.RefactorExtract,
            vscode.CodeActionKind.RefactorInline,
            vscode.CodeActionKind.RefactorRewrite
          ]
        }
      )
    );
    logger.info('Code action provider registered');
  }

  // Register hover provider
  const hoverProvider = new HoverProvider(client, logger);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { scheme: 'file' },
      hoverProvider
    )
  );
  logger.info('Hover provider registered');

  // Register diagnostic provider
  if (config.get<boolean>('diagnostics', true)) {
    diagnosticProvider = new DiagnosticProvider(client, logger);
    context.subscriptions.push(diagnosticProvider);
    logger.info('Diagnostic provider registered');
  }

  // Register code lens provider
  const codeLensProvider = new CodeLensProvider(client, logger);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file' },
      codeLensProvider
    )
  );
  logger.info('Code lens provider registered');

  // Register document symbol provider
  const documentSymbolProvider = new DocumentSymbolProvider(client, logger);
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: 'file' },
      documentSymbolProvider
    )
  );
  logger.info('Document symbol provider registered');

  // Register chat view provider
  if (config.get<boolean>('showChatView', true)) {
    const chatProvider = new ChatViewProvider(context, client, logger);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'ollama-code-chat',
        chatProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true
          }
        }
      )
    );
    logger.info('Chat view provider registered');
  }
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  const commandHandler = new CommandHandler(client, logger);

  const commands = [
    { name: 'ollama-code.ask', handler: commandHandler.handleAsk.bind(commandHandler) },
    { name: 'ollama-code.explain', handler: commandHandler.handleExplain.bind(commandHandler) },
    { name: 'ollama-code.refactor', handler: commandHandler.handleRefactor.bind(commandHandler) },
    { name: 'ollama-code.fix', handler: commandHandler.handleFix.bind(commandHandler) },
    { name: 'ollama-code.generate', handler: commandHandler.handleGenerate.bind(commandHandler) },
    { name: 'ollama-code.analyze', handler: commandHandler.handleAnalyze.bind(commandHandler) },
    { name: 'ollama-code.startServer', handler: commandHandler.handleStartServer.bind(commandHandler) },
    { name: 'ollama-code.stopServer', handler: commandHandler.handleStopServer.bind(commandHandler) },
    { name: 'ollama-code.showOutput', handler: commandHandler.handleShowOutput.bind(commandHandler) },

    // Configuration commands
    { name: 'ollama-code.showConfiguration', handler: async () => {
      await configurationUIService.showConfigurationUI();
    }},
    { name: 'ollama-code.resetConfiguration', handler: async () => {
      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to reset all Ollama Code settings to default values?',
        'Reset', 'Cancel'
      );
      if (result === 'Reset') {
        const config = vscode.workspace.getConfiguration('ollama-code');
        const defaultSettings = {
          'serverPort': 3002,
          'autoStart': true,
          'showChatView': true,
          'inlineCompletions': true,
          'codeActions': true,
          'diagnostics': true,
          'contextLines': 20,
          'connectionTimeout': 10000,
          'logLevel': 'info'
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
          await config.update(`ollama-code.${key}`, value, vscode.ConfigurationTarget.Workspace);
        }

        vscode.window.showInformationMessage('Configuration reset to default values');
      }
    }},

    // Status bar commands
    { name: 'ollama-code.toggleConnection', handler: async () => {
      const status = client.getConnectionStatus();
      if (status.connected) {
        await client.disconnect();
        vscode.window.showInformationMessage('Disconnected from Ollama Code server');
      } else {
        try {
          await client.connect();
          vscode.window.showInformationMessage('Connected to Ollama Code server');
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }},

    { name: 'ollama-code.showQuickActions', handler: async () => {
      const items = [
        { label: 'Ask AI', description: 'Ask a general AI question', command: 'ollama-code.ask' },
        { label: 'Explain Code', description: 'Explain selected code', command: 'ollama-code.explain' },
        { label: 'Refactor Code', description: 'Refactor selected code', command: 'ollama-code.refactor' },
        { label: 'Fix Code', description: 'Fix issues in selected code', command: 'ollama-code.fix' },
        { label: 'Generate Code', description: 'Generate new code', command: 'ollama-code.generate' },
        { label: 'Analyze File', description: 'Analyze current file', command: 'ollama-code.analyze' },
        { label: 'Configuration', description: 'Open configuration', command: 'ollama-code.showConfiguration' }
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an AI action'
      });

      if (selected) {
        vscode.commands.executeCommand(selected.command);
      }
    }},

    { name: 'ollama-code.showProgress', handler: async () => {
      const activeTasks = progressIndicatorService.getActiveProgressTasks();
      if (activeTasks.size === 0) {
        vscode.window.showInformationMessage('No active operations');
        return;
      }

      const items = Array.from(activeTasks.entries()).map(([id, task]) => ({
        label: task.task.title,
        description: `${Math.round(task.currentProgress)}% complete`,
        detail: task.task.description,
        id
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Active AI operations'
      });

      if (selected) {
        // Show detailed progress for selected task
        vscode.window.showInformationMessage(
          `${selected.label}: ${selected.description}`
        );
      }
    }}
  ];

  for (const { name, handler } of commands) {
    context.subscriptions.push(
      vscode.commands.registerCommand(name, handler)
    );
  }

  logger.info(`Registered ${commands.length} commands`);
}

/**
 * Set up event listeners
 */
function setupEventListeners(context: vscode.ExtensionContext) {
  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('ollama-code')) {
        logger.info('Configuration changed, updating client...');

        const config = vscode.workspace.getConfiguration('ollama-code');
        await client.updateConfig({
          port: config.get<number>('serverPort', 3002), // IDE_SERVER_DEFAULTS.PORT
          autoStart: config.get<boolean>('autoStart', true),
          connectionTimeout: config.get<number>('connectionTimeout', 10000),
          logLevel: config.get<string>('logLevel', 'info')
        });
      }
    })
  );

  // Listen for file system changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      // Update context for the changed document
      client.updateContext({
        activeFile: event.document.uri.fsPath,
        language: event.document.languageId
      });
    })
  );

  // Listen for editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        client.updateContext({
          activeFile: editor.document.uri.fsPath,
          language: editor.document.languageId,
          cursorPosition: {
            line: editor.selection.active.line,
            character: editor.selection.active.character
          },
          selection: editor.selection.isEmpty ? undefined : {
            start: {
              line: editor.selection.start.line,
              character: editor.selection.start.character
            },
            end: {
              line: editor.selection.end.line,
              character: editor.selection.end.character
            }
          }
        });
      }
    })
  );

  // Listen for selection changes
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      client.updateContext({
        activeFile: event.textEditor.document.uri.fsPath,
        cursorPosition: {
          line: event.selections[0].active.line,
          character: event.selections[0].active.character
        },
        selection: event.selections[0].isEmpty ? undefined : {
          start: {
            line: event.selections[0].start.line,
            character: event.selections[0].start.character
          },
          end: {
            line: event.selections[0].end.line,
            character: event.selections[0].end.character
          }
        }
      });
    })
  );

  // Listen for workspace folder changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        client.updateContext({
          rootPath: vscode.workspace.workspaceFolders[0].uri.fsPath
        });
      }
    })
  );

  logger.info('Event listeners set up');
}