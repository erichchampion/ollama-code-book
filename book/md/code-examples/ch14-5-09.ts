// src/commands/refactor.ts
import * as vscode from 'vscode';
import { AIClient } from '../client';

export class RefactorCommand {
  readonly id = 'ollamaCode.refactor';

  constructor(private aiClient: AIClient) {}

  async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
      vscode.window.showErrorMessage('No code selected');
      return;
    }

    // Ask user for refactoring goal
    const goal = await vscode.window.showInputBox({
      prompt: 'What would you like to refactor?',
      placeHolder: 'e.g., Extract function, simplify logic, improve performance'
    });

    if (!goal) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Refactoring code...',
        cancellable: true
      },
      async (progress, token) => {
        try {
          const languageId = editor.document.languageId;

          const response = await this.aiClient.complete({
            prompt: `Refactor the following ${languageId} code to: ${goal}

Original code:
${selectedText}

Return ONLY the refactored code, maintaining the same functionality.`,
            temperature: 0.3,
            maxTokens: 4096
          });

          // Show diff and ask for confirmation
          await this.showRefactoringDiff(
            editor,
            selection,
            selectedText,
            response.content
          );
        } catch (error) {
          if (token.isCancellationRequested) {
            return;
          }
          vscode.window.showErrorMessage(
            `Failed to refactor: ${error.message}`
          );
        }
      }
    );
  }

  private async showRefactoringDiff(
    editor: vscode.TextEditor,
    range: vscode.Range,
    originalCode: string,
    refactoredCode: string
  ): Promise<void> {
    // Clean up AI response
    let cleanedCode = refactoredCode.trim();
    if (cleanedCode.startsWith('```')) {
      const lines = cleanedCode.split('\n');
      lines.shift();
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop();
      }
      cleanedCode = lines.join('\n');
    }

    // Create temporary documents for diff
    const originalUri = vscode.Uri.parse(
      `untitled:Original ${path.basename(editor.document.fileName)}`
    );
    const refactoredUri = vscode.Uri.parse(
      `untitled:Refactored ${path.basename(editor.document.fileName)}`
    );

    await vscode.workspace.fs.writeFile(
      originalUri,
      Buffer.from(originalCode)
    );
    await vscode.workspace.fs.writeFile(
      refactoredUri,
      Buffer.from(cleanedCode)
    );

    // Show diff
    await vscode.commands.executeCommand(
      'vscode.diff',
      originalUri,
      refactoredUri,
      'Original ↔ Refactored'
    );

    // Ask for confirmation
    const choice = await vscode.window.showInformationMessage(
      'Apply refactoring?',
      'Apply',
      'Cancel'
    );

    if (choice === 'Apply') {
      const success = await editor.edit((editBuilder) => {
        editBuilder.replace(range, cleanedCode);
      });

      if (success) {
        vscode.window.showInformationMessage('Refactoring applied');
      }
    }

    // Clean up temporary files
    await vscode.workspace.fs.delete(originalUri);
    await vscode.workspace.fs.delete(refactoredUri);
  }
}