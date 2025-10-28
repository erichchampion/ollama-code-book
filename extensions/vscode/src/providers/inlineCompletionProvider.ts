/**
 * AI-Powered Inline Completion Provider
 *
 * Provides intelligent code completions using AI with context awareness,
 * smart filtering, and multi-line completion support.
 */

import * as vscode from 'vscode';
import { OllamaCodeClient } from '../client/ollamaCodeClient';
import { Logger } from '../utils/logger';
import { CodeAnalysisUtils } from '../utils/codeAnalysisUtils';
import { TIMEOUT_CONSTANTS } from '../config/analysisConstants';
import { ProviderCache, CACHE_TTL } from '../utils/cacheUtils';

interface CompletionContext {
  functionName?: string;
  className?: string;
  isInFunction: boolean;
  isInComment: boolean;
  isInString: boolean;
  indentationLevel: number;
  surroundingCode: string;
}

export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  private completionCache = new ProviderCache<string>(CACHE_TTL.COMPLETION);

  constructor(
    private client: OllamaCodeClient,
    private logger: Logger
  ) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
    try {
      if (!this.client.getConnectionStatus().connected) {
        return [];
      }

      // Check if this is a supported language
      if (!CodeAnalysisUtils.isSupportedLanguage(document.languageId)) {
        return [];
      }

      // Check file size limits
      const text = document.getText();
      if (!CodeAnalysisUtils.checkFileSizeForAnalysis(text, document.fileName, this.logger)) {
        return [];
      }

      const completionContext = this.analyzeContext(document, position);

      // Skip completion in comments or strings (unless it's a documentation comment)
      if (completionContext.isInString ||
          (completionContext.isInComment && !this.isDocumentationComment(document, position))) {
        return [];
      }

      const line = document.lineAt(position);
      const prefix = line.text.substring(0, position.character);

      // Enhanced filtering - be more selective about when to suggest
      if (!this.shouldProvideCompletion(prefix, completionContext)) {
        return [];
      }

      // Check cache first
      const cacheKey = this.createCacheKey(document, position, completionContext);
      const cached = this.completionCache.get(cacheKey);
      if (cached) {
        return this.createCompletionItems(cached, position);
      }

      // Get contextual prompt
      const prompt = this.createContextualPrompt(document, position, completionContext);

      const result = await Promise.race([
        this.client.sendAIRequest({
          prompt,
          type: 'completion',
          language: document.languageId
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Completion timeout')), TIMEOUT_CONSTANTS.COMPLETION_TIMEOUT)
        )
      ]) as any;

      if (token.isCancellationRequested) {
        return [];
      }

      if (result?.result) {
        const completion = this.processCompletion(result.result, prefix, completionContext);

        // Cache the result
        this.completionCache.set(cacheKey, completion);

        return this.createCompletionItems(completion, position);
      }

      return [];

    } catch (error) {
      this.logger.error('Inline completion failed:', error);
      return [];
    }
  }

  /**
   * Analyze the context around the cursor position
   */
  private analyzeContext(document: vscode.TextDocument, position: vscode.Position): CompletionContext {
    const line = document.lineAt(position);
    const prefix = line.text.substring(0, position.character);

    // Determine indentation level
    const indentationLevel = CodeAnalysisUtils.getIndentation(line.text);

    // Check if we're in a string or comment
    const isInString = this.isInString(line.text, position.character);
    const isInComment = this.isInComment(line.text, position.character);

    // Get surrounding code context (up to 20 lines before and after)
    const startLine = Math.max(0, position.line - 20);
    const endLine = Math.min(document.lineCount - 1, position.line + 20);
    const surroundingCode = document.getText(new vscode.Range(startLine, 0, endLine, 0));

    // Try to determine if we're inside a function
    let isInFunction = false;
    let functionName: string | undefined;
    let className: string | undefined;

    // Simple heuristic to detect function context
    for (let i = position.line; i >= Math.max(0, position.line - 50); i--) {
      const currentLine = document.lineAt(i).text;

      // Check for function declarations
      const funcMatch = currentLine.match(/(?:function|def|func|fn)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (funcMatch) {
        isInFunction = true;
        functionName = funcMatch[1];
        break;
      }

      // Check for class declarations
      const classMatch = currentLine.match(/(?:class|struct)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (classMatch) {
        className = classMatch[1];
      }
    }

    return {
      functionName,
      className,
      isInFunction,
      isInComment,
      isInString,
      indentationLevel,
      surroundingCode
    };
  }

  /**
   * Determine if we should provide completion based on context
   */
  private shouldProvideCompletion(prefix: string, context: CompletionContext): boolean {
    const trimmedPrefix = prefix.trim();

    // Don't complete for very short input
    if (trimmedPrefix.length < 2) {
      return false;
    }

    // Don't complete if the line is already "complete" (ends with ; or })
    if (trimmedPrefix.endsWith(';') || trimmedPrefix.endsWith('}')) {
      return false;
    }

    // Don't complete in the middle of words (unless it's a dot/arrow access)
    const lastChar = prefix[prefix.length - 1];
    if (lastChar && /[a-zA-Z0-9_]/.test(lastChar)) {
      // Allow completion after . or -> or ::
      if (!prefix.includes('.') && !prefix.includes('->') && !prefix.includes('::')) {
        return false;
      }
    }

    // Good candidates for completion
    const goodPatterns = [
      /\.\s*$/, // Method/property access
      /=\s*$/, // Assignment
      /\(\s*$/, // Function call
      /{\s*$/, // Block start
      /if\s*\(\s*$/, // Condition start
      /for\s*\(\s*$/, // Loop start
      /return\s+$/, // Return statement
      /import\s+$/, // Import statement
      /from\s+$/, // Import from
    ];

    return goodPatterns.some(pattern => pattern.test(prefix));
  }

  /**
   * Create a contextual prompt for the AI
   */
  private createContextualPrompt(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: CompletionContext
  ): string {
    const line = document.lineAt(position);
    const prefix = line.text.substring(0, position.character);

    let prompt = `Complete this ${document.languageId} code:\n\n`;

    // Add file context if we have a class or function
    if (context.className) {
      prompt += `// Inside class: ${context.className}\n`;
    }
    if (context.functionName) {
      prompt += `// Inside function: ${context.functionName}\n`;
    }

    // Add surrounding code for better context
    const lines = context.surroundingCode.split('\n');
    const contextLines = lines.slice(-10, -1); // Last 10 lines before current

    if (contextLines.length > 0) {
      prompt += contextLines.join('\n') + '\n';
    }

    // Add the current line with cursor position marked
    prompt += prefix + '|CURSOR|';

    // Add instructions based on context
    if (prefix.trim().endsWith('.')) {
      prompt += '\n\n// Provide method or property suggestions';
    } else if (prefix.includes('function') || prefix.includes('def')) {
      prompt += '\n\n// Complete the function implementation';
    } else if (prefix.includes('if') || prefix.includes('for') || prefix.includes('while')) {
      prompt += '\n\n// Complete the control structure';
    }

    return prompt;
  }

  /**
   * Process and clean the AI completion
   */
  private processCompletion(rawCompletion: string, prefix: string, context: CompletionContext): string {
    let completion = rawCompletion.trim();

    // Remove any cursor markers
    completion = completion.replace(/\|CURSOR\|/g, '');

    // If the completion includes the prefix, remove it
    if (completion.startsWith(prefix.trim())) {
      completion = completion.substring(prefix.trim().length);
    }

    // Limit completion length to avoid overly long suggestions
    const lines = completion.split('\n');
    if (lines.length > 3) {
      completion = lines.slice(0, 3).join('\n');
      if (!completion.endsWith('\n')) {
        completion += '\n...';
      }
    }

    // Ensure proper indentation
    if (completion.includes('\n')) {
      const indent = ' '.repeat(context.indentationLevel);
      completion = completion.split('\n')
        .map((line, index) => index === 0 ? line : indent + line.trim())
        .join('\n');
    }

    return completion;
  }

  /**
   * Create completion items from the processed completion
   */
  private createCompletionItems(completion: string, position: vscode.Position): vscode.InlineCompletionItem[] {
    if (!completion || completion.trim().length === 0) {
      return [];
    }

    const item = new vscode.InlineCompletionItem(
      completion,
      new vscode.Range(position, position)
    );

    // Add command to trigger another completion after acceptance
    item.command = {
      command: 'editor.action.triggerSuggest',
      title: 'Trigger Suggest'
    };

    return [item];
  }

  /**
   * Check if position is inside a string literal
   */
  private isInString(lineText: string, position: number): boolean {
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < position; i++) {
      const char = lineText[i];
      const prevChar = i > 0 ? lineText[i - 1] : '';

      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = '';
      }
    }

    return inString;
  }

  /**
   * Check if position is inside a comment
   */
  private isInComment(lineText: string, position: number): boolean {
    const beforeCursor = lineText.substring(0, position);
    return beforeCursor.includes('//') || beforeCursor.includes('/*') ||
           beforeCursor.includes('#') || beforeCursor.includes('<!--');
  }

  /**
   * Check if this is a documentation comment where completion might be useful
   */
  private isDocumentationComment(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position);
    return line.text.trim().startsWith('/**') ||
           line.text.trim().startsWith('///') ||
           line.text.trim().startsWith('"""');
  }

  /**
   * Create cache key for completion caching
   */
  private createCacheKey(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: CompletionContext
  ): string {
    const line = document.lineAt(position);
    const prefix = line.text.substring(0, position.character);

    return `${document.languageId}:${prefix}:${context.functionName || ''}:${context.className || ''}`;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.completionCache.dispose();
  }
}