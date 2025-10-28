/**
 * Code Lens Provider for AI Insights and Metrics
 *
 * Provides contextual information and actions directly inline with code,
 * including complexity metrics, performance insights, and AI-powered suggestions.
 */

import * as vscode from 'vscode';
import { OllamaCodeClient } from '../client/ollamaCodeClient';
import { Logger } from '../utils/logger';
import { CodeAnalysisUtils, FunctionInfo } from '../utils/codeAnalysisUtils';
import { CODE_METRICS_THRESHOLDS } from '../config/analysisConstants';

interface CodeMetrics {
  complexity: number;
  maintainability: number;
  performance: 'low' | 'medium' | 'high';
  suggestions: string[];
}

export class CodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(
    private client: OllamaCodeClient,
    private logger: Logger
  ) {}

  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    try {
      if (!this.client.getConnectionStatus().connected) {
        return [];
      }

      const codeLenses: vscode.CodeLens[] = [];

      // Only analyze supported file types
      if (!CodeAnalysisUtils.isSupportedLanguage(document.languageId)) {
        return [];
      }

      // Find functions and classes for analysis
      const functions = await CodeAnalysisUtils.extractFunctions(document, token);

      for (const func of functions) {
        if (token.isCancellationRequested) {
          break;
        }

        // Add complexity lens
        if (func.complexity > CODE_METRICS_THRESHOLDS.HIGH_COMPLEXITY) {
          codeLenses.push(new vscode.CodeLens(func.range, {
            title: `⚠️ Complexity: ${func.complexity} (Consider refactoring)`,
            command: 'ollama-code.refactor',
            arguments: [document.uri, func.range]
          }));
        } else if (func.complexity > CODE_METRICS_THRESHOLDS.MEDIUM_COMPLEXITY) {
          codeLenses.push(new vscode.CodeLens(func.range, {
            title: `📊 Complexity: ${func.complexity}`,
            command: 'ollama-code.analyze',
            arguments: [document.uri, func.range]
          }));
        }

        // Add line count lens for large functions
        if (func.lineCount > CODE_METRICS_THRESHOLDS.LONG_FUNCTION_LINES) {
          codeLenses.push(new vscode.CodeLens(func.range, {
            title: `📏 Lines: ${func.lineCount} (Consider breaking down)`,
            command: 'ollama-code.refactor',
            arguments: [document.uri, func.range]
          }));
        }

        // Add parameter count lens
        if (func.parameterCount > CODE_METRICS_THRESHOLDS.TOO_MANY_PARAMS) {
          codeLenses.push(new vscode.CodeLens(func.range, {
            title: `📝 Parameters: ${func.parameterCount} (Too many parameters)`,
            command: 'ollama-code.refactor',
            arguments: [document.uri, func.range]
          }));
        }

        // Add AI insights lens
        codeLenses.push(new vscode.CodeLens(func.range, {
          title: `🤖 Get AI insights for ${func.name}`,
          command: 'ollama-code.analyzeFunction',
          arguments: [document.uri, func.range, func.name]
        }));
      }

      // Add file-level metrics
      if (functions.length > 0) {
        const fileComplexity = functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length;
        const firstLine = new vscode.Range(0, 0, 0, 0);

        if (fileComplexity > CODE_METRICS_THRESHOLDS.FILE_COMPLEXITY_WARNING) {
          codeLenses.unshift(new vscode.CodeLens(firstLine, {
            title: `📊 File Complexity: ${fileComplexity.toFixed(1)} (Consider refactoring)`,
            command: 'ollama-code.analyzeFile',
            arguments: [document.uri]
          }));
        }

        // Add test coverage lens (if available)
        codeLenses.unshift(new vscode.CodeLens(firstLine, {
          title: `🧪 Generate tests for this file`,
          command: 'ollama-code.generateTests',
          arguments: [document.uri]
        }));

        // Add security analysis lens
        codeLenses.unshift(new vscode.CodeLens(firstLine, {
          title: `🔒 Run security analysis`,
          command: 'ollama-code.securityAnalysis',
          arguments: [document.uri]
        }));
      }

      return codeLenses;

    } catch (error) {
      this.logger.error('Error providing code lenses:', error);
      return [];
    }
  }

  resolveCodeLens?(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    // Code lenses are already resolved in provideCodeLenses
    return codeLens;
  }


  /**
   * Refresh code lenses
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}