// src/extension.ts
import * as vscode from 'vscode';
import { ExplainCodeCommand } from './commands/explainCode';
import { FixErrorCommand } from './commands/fixError';
import { GenerateTestsCommand } from './commands/generateTests';
import { RefactorCommand } from './commands/refactor';
import { InlineCompletionProvider } from './providers/inlineCompletions';
import { CodeActionProvider } from './providers/codeActions';
import { AIClient } from './client';

let aiClient: AIClient;

export function activate(context: vscode.ExtensionContext) {
  console.log('Ollama Code extension is now active');

  // Initialize AI client
  const config = vscode.workspace.getConfiguration('ollamaCode');
  aiClient = new AIClient({
    apiUrl: config.get('apiUrl') || 'http://localhost:11434',
    model: config.get('model') || 'codellama:7b',
    maxTokens: config.get('maxTokens') || 2048
  });

  // Register commands
  registerCommands(context);

  // Register providers
  registerProviders(context);

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('ollamaCode')) {
        const newConfig = vscode.workspace.getConfiguration('ollamaCode');
        aiClient.updateConfig({
          apiUrl: newConfig.get('apiUrl') || 'http://localhost:11434',
          model: newConfig.get('model') || 'codellama:7b',
          maxTokens: newConfig.get('maxTokens') || 2048
        });
      }
    })
  );

  // Status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = '$(robot) Ollama Code';
  statusBarItem.tooltip = 'Ollama Code AI Assistant is active';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

function registerCommands(context: vscode.ExtensionContext) {
  const commands = [
    new ExplainCodeCommand(aiClient),
    new FixErrorCommand(aiClient),
    new GenerateTestsCommand(aiClient),
    new RefactorCommand(aiClient)
  ];

  for (const cmd of commands) {
    const disposable = vscode.commands.registerCommand(
      cmd.id,
      cmd.execute.bind(cmd)
    );
    context.subscriptions.push(disposable);
  }
}

function registerProviders(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('ollamaCode');

  // Inline completions (like GitHub Copilot)
  if (config.get('enableInlineCompletions')) {
    const inlineProvider = new InlineCompletionProvider(aiClient);
    context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider(
        { pattern: '**' },
        inlineProvider
      )
    );
  }

  // Code actions (Quick Fixes)
  const codeActionProvider = new CodeActionProvider(aiClient);
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { pattern: '**' },
      codeActionProvider,
      {
        providedCodeActionKinds: [
          vscode.CodeActionKind.QuickFix,
          vscode.CodeActionKind.Refactor
        ]
      }
    )
  );
}

export function deactivate() {
  if (aiClient) {
    aiClient.dispose();
  }
}