// src/commands/fixError.ts
import * as vscode from 'vscode';
import { AIClient } from '../client';

export class FixErrorCommand {
  readonly id = 'ollamaCode.fixError';

  constructor(private aiClient: AIClient) {}

  async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    // Get diagnostics (errors, warnings) at current position
    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    const position = editor.selection.active;

    // Find diagnostic at cursor position
    const diagnostic = diagnostics.find((d) =>
      d.range.contains(position)
    );

    if (!diagnostic) {
      vscode.window.showInformationMessage(
        'No error found at cursor position'
      );
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating fix...',
        cancellable: true
      },
      async (progress, token) => {
        try {
          const errorRange = diagnostic.range;
          const errorCode = editor.document.getText(errorRange);
          const errorMessage = diagnostic.message;

          // Get surrounding context (5 lines before and after)
          const contextRange = new vscode.Range(
            Math.max(0, errorRange.start.line - 5),
            0,
            Math.min(
              editor.document.lineCount - 1,
              errorRange.end.line + 5
            ),
            Number.MAX_SAFE_INTEGER
          );
          const context = editor.document.getText(contextRange);

          const response = await this.aiClient.complete({
            prompt: `Fix this error:
Error: ${errorMessage}
Code with error: ${errorCode}

Return ONLY the fixed code, without explanation.`,
            context: `Surrounding context:\n${context}`,
            temperature: 0.2
          });

          // Apply fix
          await this.applyFix(editor, errorRange, response.content);
        } catch (error) {
          if (token.isCancellationRequested) {
            return;
          }
          vscode.window.showErrorMessage(
            `Failed to generate fix: ${error.message}`
          );
        }
      }
    );
  }

  private async applyFix(
    editor: vscode.TextEditor,
    range: vscode.Range,
    fixedCode: string
  ): Promise<void> {
    // Clean up the AI response (remove markdown code blocks if present)
    let cleanedCode = fixedCode.trim();
    if (cleanedCode.startsWith('```')) {
      const lines = cleanedCode.split('\n');
      lines.shift(); // Remove opening ```
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop(); // Remove closing ```
      }
      cleanedCode = lines.join('\n');
    }

    const success = await editor.edit((editBuilder) => {
      editBuilder.replace(range, cleanedCode);
    });

    if (success) {
      vscode.window.showInformationMessage('Fix applied successfully');
    } else {
      vscode.window.showErrorMessage('Failed to apply fix');
    }
  }
}