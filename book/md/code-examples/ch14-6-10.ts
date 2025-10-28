// src/providers/inlineCompletions.ts
import * as vscode from 'vscode';
import { AIClient } from '../client';

export class InlineCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 300;
  private lastCompletionRequest: string | null = null;

  constructor(private aiClient: AIClient) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
    // Don't provide completions if user is deleting or in specific contexts
    if (
      context.triggerKind ===
        vscode.InlineCompletionTriggerKind.Automatic &&
      !this.shouldProvideCompletion(document, position)
    ) {
      return [];
    }

    // Debounce to avoid excessive API calls
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        try {
          const completion = await this.generateCompletion(
            document,
            position,
            token
          );

          if (completion) {
            resolve([
              new vscode.InlineCompletionItem(
                completion,
                new vscode.Range(position, position)
              )
            ]);
          } else {
            resolve([]);
          }
        } catch (error) {
          console.error('Inline completion error:', error);
          resolve([]);
        }
      }, this.DEBOUNCE_MS);
    });
  }

  private shouldProvideCompletion(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    // Don't complete in strings or comments (simplified check)
    const lineText = document.lineAt(position.line).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Skip if in string literal
    const stringMatches = textBeforeCursor.match(/["'`]/g);
    if (stringMatches && stringMatches.length % 2 !== 0) {
      return false;
    }

    // Skip if in comment
    if (textBeforeCursor.trim().startsWith('//')) {
      return false;
    }

    return true;
  }

  private async generateCompletion(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<string | null> {
    // Get context before cursor
    const prefixRange = new vscode.Range(
      new vscode.Position(Math.max(0, position.line - 20), 0),
      position
    );
    const prefix = document.getText(prefixRange);

    // Get context after cursor (for fill-in-the-middle models)
    const suffixRange = new vscode.Range(
      position,
      new vscode.Position(
        Math.min(document.lineCount - 1, position.line + 5),
        Number.MAX_SAFE_INTEGER
      )
    );
    const suffix = document.getText(suffixRange);

    // Avoid duplicate requests
    const requestKey = `${prefix}|||${suffix}`;
    if (requestKey === this.lastCompletionRequest) {
      return null;
    }
    this.lastCompletionRequest = requestKey;

    const languageId = document.languageId;

    try {
      // Use streaming for faster perceived performance
      let completion = '';
      let firstChunk = true;

      for await (const chunk of this.aiClient.streamComplete({
        prompt: `Complete the following ${languageId} code:

${prefix}<CURSOR>${suffix}

Continue from <CURSOR>. Return ONLY the code completion, no explanation.`,
        temperature: 0.4,
        maxTokens: 256,
        stopSequences: ['\n\n', '```', '<CURSOR>']
      })) {
        if (token.isCancellationRequested) {
          return null;
        }

        completion += chunk;

        // Return first chunk immediately for faster UX
        if (firstChunk) {
          firstChunk = false;
          return completion;
        }
      }

      return completion.trim();
    } catch (error) {
      console.error('Completion generation error:', error);
      return null;
    }
  }
}