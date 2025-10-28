/**
 * Code Analysis Utilities
 *
 * Shared utilities for code analysis to eliminate DRY violations
 * between CodeLens and DocumentSymbol providers.
 */

import * as vscode from 'vscode';
import {
  CODE_METRICS_THRESHOLDS,
  SUPPORTED_LANGUAGES,
  COMPLEXITY_KEYWORDS,
  LANGUAGE_PATTERNS,
  SupportedLanguage,
  LanguagePatternKey
} from '../config/analysisConstants';

export interface FunctionInfo {
  name: string;
  range: vscode.Range;
  complexity: number;
  lineCount: number;
  parameterCount: number;
}

export interface EnhancedSymbolInfo {
  name: string;
  kind: vscode.SymbolKind;
  range: vscode.Range;
  selectionRange: vscode.Range;
  detail?: string;
  complexity?: number;
  isTest?: boolean;
  isAsync?: boolean;
  isExported?: boolean;
  isDeprecated?: boolean;
  documentation?: string;
  children: EnhancedSymbolInfo[];
}

export class CodeAnalysisUtils {
  /**
   * Check if the language is supported for code analysis
   */
  static isSupportedLanguage(languageId: string): boolean {
    return SUPPORTED_LANGUAGES.includes(languageId as SupportedLanguage);
  }

  /**
   * Validate file size for analysis
   */
  static validateFileSize(text: string, maxSizeKB?: number): { isValid: boolean; sizeKB: number } {
    const sizeKB = text.length / 1024;
    const maxSize = maxSizeKB || CODE_METRICS_THRESHOLDS.MAX_FILE_SIZE_KB;

    return {
      isValid: sizeKB <= maxSize,
      sizeKB: Math.round(sizeKB * 100) / 100 // Round to 2 decimal places
    };
  }

  /**
   * Check if file is too large for analysis and log warning if needed
   */
  static checkFileSizeForAnalysis(
    text: string,
    fileName?: string,
    logger?: { warn: (message: string) => void }
  ): boolean {
    const { isValid, sizeKB } = this.validateFileSize(text);

    if (!isValid && logger) {
      const fileInfo = fileName ? ` ${fileName}` : '';
      logger.warn(`File${fileInfo} is too large (${sizeKB}KB) for analysis`);
    }

    return isValid;
  }

  /**
   * Calculate cyclomatic complexity with improved accuracy
   */
  static calculateComplexity(text: string): number {
    let complexity = 1; // Base complexity

    // Use centralized complexity keywords
    const keywords = COMPLEXITY_KEYWORDS.ALL();

    for (const keyword of keywords) {
      // Handle operators specially to avoid double-escaping issues
      let regex: RegExp;
      if (keyword === '&&' || keyword === '||') {
        regex = new RegExp(`\\${keyword}`, 'g');
      } else if (keyword === '?') {
        regex = new RegExp('\\?', 'g');
      } else {
        regex = new RegExp(`\\b${keyword}\\b`, 'g');
      }

      const matches = text.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return Math.min(complexity, CODE_METRICS_THRESHOLDS.MAX_DISPLAY_COMPLEXITY);
  }

  /**
   * Find the range of a code block using brace counting with improved handling
   */
  static findBlockRange(lines: string[], startLine: number): vscode.Range {
    if (startLine >= lines.length) {
      return new vscode.Range(startLine, 0, startLine, 0);
    }

    let braceCount = 0;
    let foundStart = false;
    let endLine = startLine;
    let inString = false;
    let inComment = false;
    let stringChar = '';

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = j < line.length - 1 ? line[j + 1] : '';
        const prevChar = j > 0 ? line[j - 1] : '';

        // Handle single-line comments
        if (!inString && char === '/' && nextChar === '/') {
          break; // Skip rest of line
        }

        // Handle multi-line comments
        if (!inString && char === '/' && nextChar === '*') {
          inComment = true;
          j++; // Skip next character
          continue;
        }
        if (inComment && char === '*' && nextChar === '/') {
          inComment = false;
          j++; // Skip next character
          continue;
        }
        if (inComment) continue;

        // Handle strings
        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
          continue;
        }
        if (inString && char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = '';
          continue;
        }
        if (inString) continue;

        // Count braces only when not in strings or comments
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
          if (foundStart && braceCount === 0) {
            endLine = i;
            break;
          }
        }
      }

      if (foundStart && braceCount === 0) break;
    }

    // Ensure endLine is within bounds
    const finalEndLine = Math.min(endLine, lines.length - 1);
    const endLength = lines[finalEndLine]?.length || 0;

    return new vscode.Range(startLine, 0, finalEndLine, endLength);
  }

  /**
   * Find the range of a Python code block using indentation
   */
  static findPythonBlockRange(lines: string[], startLine: number): vscode.Range {
    if (startLine >= lines.length) {
      return new vscode.Range(startLine, 0, startLine, 0);
    }

    const startIndent = this.getIndentation(lines[startLine]);
    let endLine = startLine;

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue; // Skip empty lines

      const currentIndent = this.getIndentation(lines[i]);
      if (currentIndent <= startIndent) {
        endLine = i - 1;
        break;
      }
      endLine = i;
    }

    // Ensure endLine is within bounds
    const finalEndLine = Math.min(endLine, lines.length - 1);
    const endLength = lines[finalEndLine]?.length || 0;

    return new vscode.Range(startLine, 0, finalEndLine, endLength);
  }

  /**
   * Get indentation level of a line
   */
  static getIndentation(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  /**
   * Count function parameters with improved parsing
   */
  static countParameters(functionSignature: string): number {
    const match = functionSignature.match(/\(([^)]*)\)/);
    if (!match || !match[1]) return 0;

    const paramString = match[1].trim();
    if (paramString === '') return 0;

    // Split by comma, but handle nested parentheses and generics
    const params: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < paramString.length; i++) {
      const char = paramString[i];
      const prevChar = i > 0 ? paramString[i - 1] : '';

      // Handle strings
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = '';
      }

      if (!inString) {
        if (char === '(' || char === '<' || char === '[') {
          depth++;
        } else if (char === ')' || char === '>' || char === ']') {
          depth--;
        } else if (char === ',' && depth === 0) {
          params.push(current.trim());
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params.filter(p => p.length > 0).length;
  }

  /**
   * Get function regex patterns for different languages
   */
  static getFunctionPatterns(languageId: string): RegExp[] {
    // Handle special cases and convert readonly arrays to mutable arrays
    switch (languageId.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        return [...LANGUAGE_PATTERNS.TYPESCRIPT.FUNCTIONS];
      case 'python':
        return [...LANGUAGE_PATTERNS.PYTHON.FUNCTIONS];
      case 'java':
        return [...LANGUAGE_PATTERNS.JAVA.METHODS];
      case 'csharp':
        return [...LANGUAGE_PATTERNS.CSHARP.METHODS];
      case 'cpp':
      case 'c':
        return [...LANGUAGE_PATTERNS.CPP.FUNCTIONS];
      case 'go':
        return [...LANGUAGE_PATTERNS.GO.FUNCTIONS];
      case 'rust':
        return [...LANGUAGE_PATTERNS.RUST.FUNCTIONS];
      default:
        return [...LANGUAGE_PATTERNS.GENERIC.FUNCTIONS];
    }
  }

  /**
   * Extract function information from document with improved error handling
   */
  static async extractFunctions(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<FunctionInfo[]> {
    const functions: FunctionInfo[] = [];
    const text = document.getText();

    // Check file size limit
    const fileSizeKB = text.length / 1024;
    if (fileSizeKB > CODE_METRICS_THRESHOLDS.MAX_FILE_SIZE_KB) {
      console.warn(`File ${document.fileName} is too large (${fileSizeKB.toFixed(1)}KB) for analysis`);
      return functions;
    }

    const lines = text.split('\n');
    const patterns = this.getFunctionPatterns(document.languageId);

    for (const pattern of patterns) {
      // Check for cancellation
      if (cancellationToken?.isCancellationRequested) {
        break;
      }

      // Reset regex lastIndex to avoid issues with global regexes
      pattern.lastIndex = 0;
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        if (cancellationToken?.isCancellationRequested) break;
        if (match.index === undefined) continue;

        try {
          const startPos = document.positionAt(match.index);
          const functionName = match[1] || 'anonymous';
          const functionStart = startPos.line;

          // Use improved block range finding
          const range = document.languageId === 'python'
            ? this.findPythonBlockRange(lines, functionStart)
            : this.findBlockRange(lines, functionStart);

          const lineCount = range.end.line - range.start.line + 1;
          const functionText = document.getText(range);
          const complexity = this.calculateComplexity(functionText);
          const parameterCount = this.countParameters(match[0]);

          functions.push({
            name: functionName,
            range,
            complexity,
            lineCount,
            parameterCount
          });
        } catch (error) {
          console.error('Error extracting function:', error);
          // Continue with next function instead of failing entirely
        }
      }
    }

    return functions;
  }

  /**
   * Check if a symbol should be considered deprecated
   */
  static isDeprecated(symbolText: string): boolean {
    const deprecatedPatterns = [
      /@deprecated/i,
      /\/\/\s*deprecated/i,
      /#\s*deprecated/i,
      /\*\s*@deprecated/i,
      /\[Obsolete\]/i, // C#
      /#\[deprecated\]/i, // Rust
    ];

    return deprecatedPatterns.some(pattern => pattern.test(symbolText));
  }

  /**
   * Detect if a function is a test function
   */
  static isTestFunction(functionName: string): boolean {
    const testPatterns = [
      /^test/i,
      /test$/i,
      /_test$/i,
      /^it\s/i,
      /^describe\s/i,
      /^should/i,
      /spec$/i
    ];

    return testPatterns.some(pattern => pattern.test(functionName));
  }
}