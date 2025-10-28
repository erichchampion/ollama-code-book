// src/providers/codeActions.ts
import * as vscode from 'vscode';
import { AIClient } from '../client';

export class CodeActionProvider implements vscode.CodeActionProvider {
  constructor(private aiClient: AIClient) {}

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    // Quick Fix: Fix errors/warnings with AI
    if (context.diagnostics.length > 0) {
      const fixAction = new vscode.CodeAction(
        '✨ Fix with AI',
        vscode.CodeActionKind.QuickFix
      );
      fixAction.command = {
        command: 'ollamaCode.fixError',
        title: 'Fix with AI'
      };
      fixAction.isPreferred = true;
      actions.push(fixAction);
    }

    // Refactor: Only show if there's selected code
    if (!range.isEmpty) {
      // Refactor: Extract function
      const extractFunctionAction = new vscode.CodeAction(
        '✨ Extract Function',
        vscode.CodeActionKind.Refactor
      );
      extractFunctionAction.command = {
        command: 'ollamaCode.refactorExtractFunction',
        title: 'Extract Function',
        arguments: [document, range]
      };
      actions.push(extractFunctionAction);

      // Refactor: Simplify
      const simplifyAction = new vscode.CodeAction(
        '✨ Simplify Code',
        vscode.CodeActionKind.Refactor
      );
      simplifyAction.command = {
        command: 'ollamaCode.refactorSimplify',
        title: 'Simplify Code',
        arguments: [document, range]
      };
      actions.push(simplifyAction);

      // Refactor: Add error handling
      const addErrorHandlingAction = new vscode.CodeAction(
        '✨ Add Error Handling',
        vscode.CodeActionKind.Refactor
      );
      addErrorHandlingAction.command = {
        command: 'ollamaCode.addErrorHandling',
        title: 'Add Error Handling',
        arguments: [document, range]
      };
      actions.push(addErrorHandlingAction);

      // Refactor: Optimize performance
      const optimizeAction = new vscode.CodeAction(
        '✨ Optimize Performance',
        vscode.CodeActionKind.Refactor
      );
      optimizeAction.command = {
        command: 'ollamaCode.optimizePerformance',
        title: 'Optimize Performance',
        arguments: [document, range]
      };
      actions.push(optimizeAction);
    }

    return actions;
  }
}

// Additional refactoring command handlers
export function registerRefactoringCommands(
  context: vscode.ExtensionContext,
  aiClient: AIClient
): void {
  // Extract Function
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'ollamaCode.refactorExtractFunction',
      async (document: vscode.TextDocument, range: vscode.Range) => {
        await refactorWithGoal(aiClient, document, range, 'extract a reusable function');
      }
    )
  );

  // Simplify
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'ollamaCode.refactorSimplify',
      async (document: vscode.TextDocument, range: vscode.Range) => {
        await refactorWithGoal(aiClient, document, range, 'simplify the logic');
      }
    )
  );

  // Add Error Handling
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'ollamaCode.addErrorHandling',
      async (document: vscode.TextDocument, range: vscode.Range) => {
        await refactorWithGoal(
          aiClient,
          document,
          range,
          'add comprehensive error handling'
        );
      }
    )
  );

  // Optimize Performance
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'ollamaCode.optimizePerformance',
      async (document: vscode.TextDocument, range: vscode.Range) => {
        await refactorWithGoal(
          aiClient,
          document,
          range,
          'optimize for better performance'
        );
      }
    )
  );
}

async function refactorWithGoal(
  aiClient: AIClient,
  document: vscode.TextDocument,
  range: vscode.Range,
  goal: string
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const selectedText = document.getText(range);
  const languageId = document.languageId;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Refactoring: ${goal}...`,
      cancellable: true
    },
    async (progress, token) => {
      try {
        const response = await aiClient.complete({
          prompt: `Refactor the following ${languageId} code to ${goal}:

${selectedText}

Return ONLY the refactored code, maintaining functionality.`,
          temperature: 0.3
        });

        // Clean and apply
        let cleanedCode = response.content.trim();
        if (cleanedCode.startsWith('```')) {
          const lines = cleanedCode.split('\n');
          lines.shift();
          if (lines[lines.length - 1].trim() === '```') {
            lines.pop();
          }
          cleanedCode = lines.join('\n');
        }

        const success = await editor.edit((editBuilder) => {
          editBuilder.replace(range, cleanedCode);
        });

        if (success) {
          vscode.window.showInformationMessage('Refactoring applied');
        }
      } catch (error) {
        if (!token.isCancellationRequested) {
          vscode.window.showErrorMessage(`Refactoring failed: ${error.message}`);
        }
      }
    }
  );
}