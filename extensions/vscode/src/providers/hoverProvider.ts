/**
 * AI-Powered Hover Provider
 *
 * Provides intelligent hover information with AI-generated documentation,
 * code explanations, type information, and contextual insights.
 */

import * as vscode from 'vscode';
import { OllamaCodeClient } from '../client/ollamaCodeClient';
import { Logger } from '../utils/logger';
import { CodeAnalysisUtils } from '../utils/codeAnalysisUtils';
import { CODE_METRICS_THRESHOLDS } from '../config/analysisConstants';

interface HoverAnalysis {
  elementType: 'function' | 'class' | 'variable' | 'method' | 'property' | 'parameter' | 'unknown';
  name: string;
  context: string;
  signature?: string;
  complexity?: number;
  isExported?: boolean;
  isAsync?: boolean;
  isTest?: boolean;
}

export class HoverProvider implements vscode.HoverProvider {
  private hoverCache = new Map<string, { hover: vscode.Hover; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    private client: OllamaCodeClient,
    private logger: Logger
  ) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    try {
      if (!this.client.getConnectionStatus().connected) {
        return null;
      }

      // Check if this is a supported language
      if (!CodeAnalysisUtils.isSupportedLanguage(document.languageId)) {
        return null;
      }

      // Check file size limits
      const text = document.getText();
      const fileSizeKB = text.length / 1024;
      if (fileSizeKB > CODE_METRICS_THRESHOLDS.MAX_FILE_SIZE_KB) {
        return null;
      }

      // Get element at position with enhanced analysis
      const analysis = this.analyzeElement(document, position);
      if (!analysis || analysis.name.length < 2) {
        return null;
      }

      // Check cache first
      const cacheKey = this.createCacheKey(document, analysis);
      const cached = this.hoverCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.hover;
      }

      // Generate AI-powered hover content
      const hoverContent = await this.generateHoverContent(document, analysis, token);
      if (!hoverContent) {
        return null;
      }

      const range = this.getElementRange(document, position, analysis);
      const hover = new vscode.Hover(hoverContent, range);

      // Cache the result
      this.hoverCache.set(cacheKey, {
        hover,
        timestamp: Date.now()
      });

      return hover;

    } catch (error) {
      this.logger.error('Hover provider failed:', error);
      return null;
    }
  }

  /**
   * Analyze the element at the given position
   */
  private analyzeElement(document: vscode.TextDocument, position: vscode.Position): HoverAnalysis | null {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return null;

    const word = document.getText(range);
    const line = document.lineAt(position);
    const lineText = line.text;

    // Get extended context for better analysis
    const contextRange = new vscode.Range(
      Math.max(0, position.line - 10),
      0,
      Math.min(document.lineCount - 1, position.line + 10),
      0
    );
    const context = document.getText(contextRange);

    // Determine element type based on context
    const elementType = this.determineElementType(word, lineText, context, document.languageId);

    // Extract signature if it's a function or method
    const signature = this.extractSignature(word, context, elementType);

    // Calculate complexity if it's a function
    let complexity: number | undefined;
    if (elementType === 'function' || elementType === 'method') {
      complexity = this.calculateElementComplexity(word, context);
    }

    // Analyze modifiers
    const isExported = this.isExported(word, context);
    const isAsync = this.isAsync(word, context);
    const isTest = CodeAnalysisUtils.isTestFunction(word);

    return {
      elementType,
      name: word,
      context,
      signature,
      complexity,
      isExported,
      isAsync,
      isTest
    };
  }

  /**
   * Determine the type of element at the cursor
   */
  private determineElementType(
    word: string,
    lineText: string,
    context: string,
    languageId: string
  ): HoverAnalysis['elementType'] {
    // Function patterns
    const funcPatterns = [
      /function\s+\w+/, // JavaScript/TypeScript function
      /def\s+\w+/, // Python def
      /func\s+\w+/, // Go func
      /fn\s+\w+/, // Rust fn
      /\w+\s*\([^)]*\)\s*{/, // Generic function with braces
    ];

    if (funcPatterns.some(pattern => pattern.test(context) && context.includes(word))) {
      // Check if it's a method (inside a class)
      if (context.includes('class ') && this.isInClass(word, context)) {
        return 'method';
      }
      return 'function';
    }

    // Class patterns
    if (/class\s+\w+/.test(context) && context.includes(`class ${word}`) ||
        /struct\s+\w+/.test(context) && context.includes(`struct ${word}`)) {
      return 'class';
    }

    // Variable/constant patterns
    if (lineText.includes('const ') || lineText.includes('let ') ||
        lineText.includes('var ') || lineText.includes('=')) {
      return 'variable';
    }

    // Property access
    if (lineText.includes('.') && lineText.split('.').pop()?.trim().startsWith(word)) {
      return 'property';
    }

    // Parameter (inside function parentheses)
    if (this.isParameter(word, context)) {
      return 'parameter';
    }

    return 'unknown';
  }

  /**
   * Extract function/method signature
   */
  private extractSignature(word: string, context: string, elementType: string): string | undefined {
    if (elementType !== 'function' && elementType !== 'method') {
      return undefined;
    }

    // Look for function signature patterns
    const patterns = [
      new RegExp(`function\\s+${word}\\s*\\([^)]*\\)`, 'i'),
      new RegExp(`def\\s+${word}\\s*\\([^)]*\\)`, 'i'),
      new RegExp(`func\\s+${word}\\s*\\([^)]*\\)`, 'i'),
      new RegExp(`fn\\s+${word}\\s*\\([^)]*\\)`, 'i'),
      new RegExp(`${word}\\s*\\([^)]*\\)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = context.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Calculate complexity of a function/method
   */
  private calculateElementComplexity(word: string, context: string): number | undefined {
    // Find the function body
    const lines = context.split('\n');
    const funcStart = lines.findIndex(line => line.includes(word) &&
      (line.includes('function') || line.includes('def') || line.includes('func') || line.includes('fn')));

    if (funcStart === -1) return undefined;

    // Try to find the function end (simplified)
    let funcEnd = funcStart;
    let braceCount = 0;
    let foundStart = false;

    for (let i = funcStart; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
          if (foundStart && braceCount === 0) {
            funcEnd = i;
            break;
          }
        }
      }
      if (foundStart && braceCount === 0) break;
    }

    const functionCode = lines.slice(funcStart, funcEnd + 1).join('\n');
    return CodeAnalysisUtils.calculateComplexity(functionCode);
  }

  /**
   * Check if element is exported
   */
  private isExported(word: string, context: string): boolean {
    return context.includes(`export ${word}`) ||
           context.includes(`export function ${word}`) ||
           context.includes(`export class ${word}`) ||
           context.includes(`export const ${word}`);
  }

  /**
   * Check if element is async
   */
  private isAsync(word: string, context: string): boolean {
    return context.includes(`async ${word}`) ||
           context.includes(`async function ${word}`);
  }

  /**
   * Check if element is inside a class
   */
  private isInClass(word: string, context: string): boolean {
    const lines = context.split('\n');
    const wordLine = lines.findIndex(line => line.includes(word));

    if (wordLine === -1) return false;

    // Look backward for class declaration
    for (let i = wordLine; i >= 0; i--) {
      if (lines[i].includes('class ')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if element is a parameter
   */
  private isParameter(word: string, context: string): boolean {
    const lines = context.split('\n');
    const wordLine = lines.findIndex(line => line.includes(word));

    if (wordLine === -1) return false;

    const line = lines[wordLine];
    // Simple heuristic: check if the word appears between parentheses in a function signature
    const funcPattern = /\([^)]*\)/;
    const match = line.match(funcPattern);

    return match ? match[0].includes(word) : false;
  }

  /**
   * Generate comprehensive hover content using AI
   */
  private async generateHoverContent(
    document: vscode.TextDocument,
    analysis: HoverAnalysis,
    token: vscode.CancellationToken
  ): Promise<vscode.MarkdownString | null> {
    try {
      const prompt = this.createAnalysisPrompt(document, analysis);

      const result = await Promise.race([
        this.client.sendAIRequest({
          prompt,
          type: 'explanation',
          language: document.languageId
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Hover timeout')), 3000)
        )
      ]) as any;

      if (token.isCancellationRequested) {
        return null;
      }

      if (result?.result) {
        return this.formatHoverContent(analysis, result.result);
      }

      return null;

    } catch (error) {
      this.logger.error('Failed to generate hover content:', error);
      return null;
    }
  }

  /**
   * Create analysis prompt for AI
   */
  private createAnalysisPrompt(document: vscode.TextDocument, analysis: HoverAnalysis): string {
    let prompt = `Analyze this ${document.languageId} ${analysis.elementType}: "${analysis.name}"\n\n`;

    // Add context
    const contextLines = analysis.context.split('\n').slice(-20); // Last 20 lines
    prompt += `Context:\n\`\`\`${document.languageId}\n${contextLines.join('\n')}\n\`\`\`\n\n`;

    // Add specific instructions based on element type
    switch (analysis.elementType) {
      case 'function':
      case 'method':
        prompt += `Provide:\n`;
        prompt += `1. Brief description of what this function does\n`;
        prompt += `2. Parameters and their types/purpose\n`;
        prompt += `3. Return value and type\n`;
        if (analysis.complexity && analysis.complexity > 10) {
          prompt += `4. Note: This function has high complexity (${analysis.complexity})\n`;
        }
        if (analysis.isAsync) {
          prompt += `5. Note: This is an async function\n`;
        }
        break;

      case 'class':
        prompt += `Provide:\n`;
        prompt += `1. Purpose and responsibility of this class\n`;
        prompt += `2. Key methods and properties\n`;
        prompt += `3. Usage examples if possible\n`;
        break;

      case 'variable':
        prompt += `Provide:\n`;
        prompt += `1. Purpose and usage of this variable\n`;
        prompt += `2. Type and possible values\n`;
        prompt += `3. Scope and lifecycle\n`;
        break;

      case 'property':
        prompt += `Provide:\n`;
        prompt += `1. Purpose of this property\n`;
        prompt += `2. Type and expected values\n`;
        prompt += `3. How it's typically used\n`;
        break;

      default:
        prompt += `Explain what this ${analysis.elementType} does and how it's used.\n`;
    }

    prompt += `\nKeep the explanation concise but informative, suitable for a code editor hover tooltip.`;

    return prompt;
  }

  /**
   * Format the hover content with markdown
   */
  private formatHoverContent(analysis: HoverAnalysis, aiExplanation: string): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    // Header with element type and name
    markdown.appendMarkdown(`### ${analysis.elementType.charAt(0).toUpperCase() + analysis.elementType.slice(1)}: \`${analysis.name}\`\n\n`);

    // Add signature if available
    if (analysis.signature) {
      markdown.appendCodeblock(analysis.signature, 'typescript');
      markdown.appendMarkdown('\n');
    }

    // Add badges for special properties
    const badges: string[] = [];
    if (analysis.isExported) badges.push('`exported`');
    if (analysis.isAsync) badges.push('`async`');
    if (analysis.isTest) badges.push('`test`');
    if (analysis.complexity && analysis.complexity > 10) badges.push('`high complexity`');

    if (badges.length > 0) {
      markdown.appendMarkdown(`${badges.join(' ')} \n\n`);
    }

    // Add AI explanation
    markdown.appendMarkdown(aiExplanation);

    // Add complexity information if available
    if (analysis.complexity !== undefined) {
      markdown.appendMarkdown(`\n\n---\n**Complexity**: ${analysis.complexity}`);
      if (analysis.complexity > CODE_METRICS_THRESHOLDS.HIGH_COMPLEXITY) {
        markdown.appendMarkdown(' ⚠️ *Consider refactoring*');
      }
    }

    return markdown;
  }

  /**
   * Get the range for the element
   */
  private getElementRange(
    document: vscode.TextDocument,
    position: vscode.Position,
    analysis: HoverAnalysis
  ): vscode.Range | undefined {
    // For functions and classes, try to get the full declaration range
    if (analysis.elementType === 'function' || analysis.elementType === 'class' || analysis.elementType === 'method') {
      const line = document.lineAt(position);
      const lineText = line.text;

      // Find the start of the declaration
      const declarationStart = lineText.indexOf(analysis.name);
      if (declarationStart !== -1) {
        return new vscode.Range(
          position.line,
          declarationStart,
          position.line,
          declarationStart + analysis.name.length
        );
      }
    }

    // Default to word range
    return document.getWordRangeAtPosition(position);
  }

  /**
   * Create cache key for hover caching
   */
  private createCacheKey(document: vscode.TextDocument, analysis: HoverAnalysis): string {
    return `${document.languageId}:${analysis.elementType}:${analysis.name}:${analysis.signature || ''}`;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.hoverCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.hoverCache.delete(key);
      }
    }
  }
}