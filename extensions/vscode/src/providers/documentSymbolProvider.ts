/**
 * Document Symbol Provider with AI-Enhanced Navigation
 *
 * Provides enhanced document outline and symbol navigation with AI-powered
 * insights, intelligent categorization, and contextual information.
 */

import * as vscode from 'vscode';
import { OllamaCodeClient } from '../client/ollamaCodeClient';
import { Logger } from '../utils/logger';
import { CodeAnalysisUtils, EnhancedSymbolInfo } from '../utils/codeAnalysisUtils';
import { LANGUAGE_PATTERNS } from '../config/analysisConstants';

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  constructor(
    private client: OllamaCodeClient,
    private logger: Logger
  ) {}

  async provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.DocumentSymbol[]> {
    try {
      if (token.isCancellationRequested) {
        return [];
      }

      const symbols = await this.parseDocumentSymbols(document);

      // Enhance symbols with AI insights if connected
      if (this.client.getConnectionStatus().connected) {
        await this.enhanceSymbolsWithAI(symbols, document, token);
      }

      return this.convertToVSCodeSymbols(symbols);

    } catch (error) {
      this.logger.error('Error providing document symbols:', error);
      return [];
    }
  }

  /**
   * Parse document symbols based on language
   */
  private async parseDocumentSymbols(document: vscode.TextDocument): Promise<EnhancedSymbolInfo[]> {
    const languageId = document.languageId;
    const text = document.getText();
    const lines = text.split('\n');

    switch (languageId) {
      case 'typescript':
      case 'javascript':
        return this.parseTypeScriptSymbols(lines, document);
      case 'python':
        return this.parsePythonSymbols(lines, document);
      case 'java':
        return this.parseJavaSymbols(lines, document);
      case 'csharp':
        return this.parseCSharpSymbols(lines, document);
      case 'cpp':
      case 'c':
        return this.parseCppSymbols(lines, document);
      case 'go':
        return this.parseGoSymbols(lines, document);
      case 'rust':
        return this.parseRustSymbols(lines, document);
      default:
        return this.parseGenericSymbols(lines, document);
    }
  }

  /**
   * Parse TypeScript/JavaScript symbols
   */
  private parseTypeScriptSymbols(lines: string[], document: vscode.TextDocument): EnhancedSymbolInfo[] {
    const symbols: EnhancedSymbolInfo[] = [];
    const text = lines.join('\n');

    // Classes
    const classPatterns = LANGUAGE_PATTERNS.TYPESCRIPT.CLASSES;
    for (const pattern of classPatterns) {
      pattern.lastIndex = 0; // Reset regex state
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const position = document.positionAt(match.index || 0);
        const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

        symbols.push({
          name: match[1],
          kind: vscode.SymbolKind.Class,
          range,
          selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
          isExported: match[0].includes('export'),
          children: []
        });
      }
    }

    // Interfaces
    const interfaceRegex = /(?:export\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match2;
    while ((match2 = interfaceRegex.exec(text)) !== null) {
      const position = document.positionAt(match2.index!);
      const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

      symbols.push({
        name: match2[1],
        kind: vscode.SymbolKind.Interface,
        range,
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        isExported: match2[0].includes('export'),
        children: []
      });
    }

    // Functions
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match3;
    while ((match3 = functionRegex.exec(text)) !== null) {
      const position = document.positionAt(match3.index!);
      const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

      symbols.push({
        name: match3[1],
        kind: vscode.SymbolKind.Function,
        range,
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        isExported: match3[0].includes('export'),
        isAsync: match3[0].includes('async'),
        isTest: match3[1].toLowerCase().includes('test') || match3[1].toLowerCase().includes('spec'),
        children: []
      });
    }

    // Arrow functions and methods
    const arrowFuncRegex = /(?:export\s+)?(?:const\s+|let\s+|var\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:\([^)]*\)\s*=>|[^=]*=>\s*{)/g;
    let match4;
    while ((match4 = arrowFuncRegex.exec(text)) !== null) {
      const position = document.positionAt(match4.index!);
      const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

      symbols.push({
        name: match4[1],
        kind: vscode.SymbolKind.Function,
        range,
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        isExported: match4[0].includes('export'),
        children: []
      });
    }

    // Enums
    const enumRegex = /(?:export\s+)?enum\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match5;
    while ((match5 = enumRegex.exec(text)) !== null) {
      const position = document.positionAt(match5.index!);
      const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

      symbols.push({
        name: match5[1],
        kind: vscode.SymbolKind.Enum,
        range,
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        isExported: match5[0].includes('export'),
        children: []
      });
    }

    // Constants and variables
    const variableRegex = /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match6;
    while ((match6 = variableRegex.exec(text)) !== null) {
      const position = document.positionAt(match6.index!);

      symbols.push({
        name: match6[1],
        kind: match6[0].includes('const') ? vscode.SymbolKind.Constant : vscode.SymbolKind.Variable,
        range: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        isExported: match6[0].includes('export'),
        children: []
      });
    }

    return symbols;
  }

  /**
   * Parse Python symbols
   */
  private parsePythonSymbols(lines: string[], document: vscode.TextDocument): EnhancedSymbolInfo[] {
    const symbols: EnhancedSymbolInfo[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Classes
      const classMatch = line.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (classMatch) {
        const range = CodeAnalysisUtils.findPythonBlockRange(lines, i);
        symbols.push({
          name: classMatch[1],
          kind: vscode.SymbolKind.Class,
          range,
          selectionRange: new vscode.Range(i, 0, i, lines[i].length),
          children: []
        });
      }

      // Functions
      const funcMatch = line.match(/^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (funcMatch) {
        const range = CodeAnalysisUtils.findPythonBlockRange(lines, i);
        symbols.push({
          name: funcMatch[1],
          kind: vscode.SymbolKind.Function,
          range,
          selectionRange: new vscode.Range(i, 0, i, lines[i].length),
          isAsync: line.includes('async'),
          isTest: funcMatch[1].startsWith('test_'),
          children: []
        });
      }
    }

    return symbols;
  }

  /**
   * Parse Java symbols (simplified)
   */
  private parseJavaSymbols(lines: string[], document: vscode.TextDocument): EnhancedSymbolInfo[] {
    const symbols: EnhancedSymbolInfo[] = [];
    const text = lines.join('\n');

    // Classes
    const classRegex = /(?:public\s+|private\s+|protected\s+)?(?:abstract\s+|final\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = classRegex.exec(text)) !== null) {
      const position = document.positionAt(match.index!);
      const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

      symbols.push({
        name: match[1],
        kind: vscode.SymbolKind.Class,
        range,
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        children: []
      });
    }

    // Methods
    const methodRegex = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:\w+\s+)+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*{/g;
    while ((match = methodRegex.exec(text)) !== null) {
      const position = document.positionAt(match.index!);
      const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

      symbols.push({
        name: match[1],
        kind: vscode.SymbolKind.Method,
        range,
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        children: []
      });
    }

    return symbols;
  }

  /**
   * Parse C# symbols with proper C# syntax support
   */
  private parseCSharpSymbols(lines: string[], document: vscode.TextDocument): EnhancedSymbolInfo[] {
    const symbols: EnhancedSymbolInfo[] = [];
    const text = lines.join('\n');

    // Classes with C# specific patterns
    const classPatterns = LANGUAGE_PATTERNS.CSHARP.CLASSES;
    for (const pattern of classPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const position = document.positionAt(match.index || 0);
        const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

        symbols.push({
          name: match[1],
          kind: vscode.SymbolKind.Class,
          range,
          selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
          children: []
        });
      }
    }

    // Methods with C# specific patterns
    const methodPatterns = LANGUAGE_PATTERNS.CSHARP.METHODS;
    for (const pattern of methodPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const position = document.positionAt(match.index || 0);
        const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

        symbols.push({
          name: match[1],
          kind: vscode.SymbolKind.Method,
          range,
          selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
          children: []
        });
      }
    }

    return symbols;
  }

  /**
   * Parse C/C++ symbols (simplified)
   */
  private parseCppSymbols(lines: string[], document: vscode.TextDocument): EnhancedSymbolInfo[] {
    const symbols: EnhancedSymbolInfo[] = [];
    const text = lines.join('\n');

    // Functions
    const functionRegex = /(?:\w+\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*{/g;
    let match;
    while ((match = functionRegex.exec(text)) !== null) {
      const position = document.positionAt(match.index!);
      const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

      symbols.push({
        name: match[1],
        kind: vscode.SymbolKind.Function,
        range,
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        children: []
      });
    }

    return symbols;
  }

  /**
   * Parse Go symbols (simplified)
   */
  private parseGoSymbols(lines: string[], document: vscode.TextDocument): EnhancedSymbolInfo[] {
    const symbols: EnhancedSymbolInfo[] = [];
    const text = lines.join('\n');

    // Functions
    const functionRegex = /func\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = functionRegex.exec(text)) !== null) {
      const position = document.positionAt(match.index!);
      const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

      symbols.push({
        name: match[1],
        kind: vscode.SymbolKind.Function,
        range,
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        children: []
      });
    }

    return symbols;
  }

  /**
   * Parse Rust symbols (simplified)
   */
  private parseRustSymbols(lines: string[], document: vscode.TextDocument): EnhancedSymbolInfo[] {
    const symbols: EnhancedSymbolInfo[] = [];
    const text = lines.join('\n');

    // Functions
    const functionRegex = /fn\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = functionRegex.exec(text)) !== null) {
      const position = document.positionAt(match.index!);
      const range = CodeAnalysisUtils.findBlockRange(lines, position.line);

      symbols.push({
        name: match[1],
        kind: vscode.SymbolKind.Function,
        range,
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        children: []
      });
    }

    return symbols;
  }

  /**
   * Generic symbol parser for unsupported languages
   */
  private parseGenericSymbols(lines: string[], document: vscode.TextDocument): EnhancedSymbolInfo[] {
    const symbols: EnhancedSymbolInfo[] = [];

    // Look for function-like patterns
    const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    const text = lines.join('\n');
    let match;

    while ((match = functionRegex.exec(text)) !== null) {
      const name = match[1] || match[2];
      const position = document.positionAt(match.index!);

      symbols.push({
        name,
        kind: vscode.SymbolKind.Function,
        range: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        selectionRange: new vscode.Range(position.line, 0, position.line, lines[position.line].length),
        children: []
      });
    }

    return symbols;
  }


  /**
   * Enhance symbols with AI insights
   */
  private async enhanceSymbolsWithAI(
    symbols: EnhancedSymbolInfo[],
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<void> {
    // This would typically make AI requests to analyze each symbol
    // For now, we'll add some basic enhancements based on patterns

    for (const symbol of symbols) {
      if (token.isCancellationRequested) break;

      // Detect deprecated symbols using shared utility
      const symbolText = document.getText(symbol.range);
      symbol.isDeprecated = CodeAnalysisUtils.isDeprecated(symbolText);

      // Calculate complexity for functions using shared utility
      if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
        symbol.complexity = CodeAnalysisUtils.calculateComplexity(symbolText);
      }

      // Add detail based on symbol type
      if (symbol.isAsync) symbol.detail = 'async function';
      if (symbol.isTest) symbol.detail = 'test function';
      if (symbol.isExported) symbol.detail = (symbol.detail || '') + ' (exported)';
    }
  }


  /**
   * Convert enhanced symbols to VS Code symbols
   */
  private convertToVSCodeSymbols(symbols: EnhancedSymbolInfo[]): vscode.DocumentSymbol[] {
    return symbols.map(symbol => {
      const documentSymbol = new vscode.DocumentSymbol(
        symbol.name,
        symbol.detail || '',
        symbol.kind,
        symbol.range,
        symbol.selectionRange
      );

      // Add child symbols
      if (symbol.children.length > 0) {
        documentSymbol.children = this.convertToVSCodeSymbols(symbol.children);
      }

      return documentSymbol;
    });
  }
}