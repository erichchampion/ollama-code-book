// src/commands/explainCode.ts
import * as vscode from 'vscode';
import { AIClient } from '../client';

export class ExplainCodeCommand {
  readonly id = 'ollamaCode.explainCode';

  constructor(private aiClient: AIClient) {}

  async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
      vscode.window.showErrorMessage('No code selected');
      return;
    }

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Explaining code...',
        cancellable: true
      },
      async (progress, token) => {
        try {
          // Get language context
          const languageId = editor.document.languageId;
          const fileName = editor.document.fileName;

          const response = await this.aiClient.complete({
            prompt: `Explain the following ${languageId} code:\n\n${selectedText}`,
            context: `File: ${fileName}\nLanguage: ${languageId}`,
            temperature: 0.3
          });

          // Show explanation in a webview panel
          this.showExplanation(selectedText, response.content, languageId);
        } catch (error) {
          if (token.isCancellationRequested) {
            return;
          }
          vscode.window.showErrorMessage(
            `Failed to explain code: ${error.message}`
          );
        }
      }
    );
  }

  private showExplanation(
    code: string,
    explanation: string,
    language: string
  ): void {
    const panel = vscode.window.createWebviewPanel(
      'codeExplanation',
      'Code Explanation',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true
      }
    );

    panel.webview.html = this.getExplanationHtml(code, explanation, language);
  }

  private getExplanationHtml(
    code: string,
    explanation: string,
    language: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Explanation</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        h2 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        pre {
            background-color: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            overflow-x: auto;
        }
        code {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }
        .explanation {
            margin-top: 20px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <h2>Selected Code</h2>
    <pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>

    <h2>Explanation</h2>
    <div class="explanation">${this.escapeHtml(explanation)}</div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}