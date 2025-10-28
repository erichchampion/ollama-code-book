/**
 * Code Refactoring Module
 *
 * Provides intelligent code refactoring capabilities including:
 * - Extract function/variable/component
 * - Rename symbols with scope awareness
 * - Code structure optimization
 * - Design pattern application
 * - Performance optimizations
 * - Dependency injection
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getEnhancedClient } from '../ai/index.js';
import { createSpinner } from '../utils/spinner.js';
import { fileExists } from '../fs/operations.js';
import { AI_CONSTANTS } from '../config/constants.js';

export interface RefactoringOperation {
  type: 'extract-function' | 'extract-variable' | 'extract-component' | 'rename' |
        'optimize' | 'pattern' | 'split-file' | 'merge-files';
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  files: string[];
  preview?: string;
}

export interface RefactoringOptions {
  preserveComments: boolean;
  updateTests: boolean;
  updateImports: boolean;
  generateDocumentation: boolean;
  performanceOptimize: boolean;
}

export interface CodeSmell {
  type: 'long-method' | 'large-class' | 'duplicate-code' | 'complex-conditional' |
        'primitive-obsession' | 'feature-envy' | 'god-class' | 'dead-code';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    file: string;
    line: number;
    column?: number;
  };
  description: string;
  suggestion: string;
}

export interface ExtractOptions {
  newName: string;
  targetFile?: string;
  includeImports: boolean;
  generateTests: boolean;
}

export class RefactoringManager {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * Analyze code for refactoring opportunities
   */
  async analyzeCode(filePath: string): Promise<RefactoringOperation[]> {
    const spinner = createSpinner('Analyzing code for refactoring opportunities...');
    spinner.start();

    try {
      const code = await fs.readFile(filePath, 'utf-8');
      const aiClient = await getEnhancedClient();

      const prompt = `Analyze the following code for refactoring opportunities:

File: ${filePath}

Code:
${code}

Please identify potential refactoring operations including:
1. Extract function opportunities (long methods, repeated code)
2. Extract variable opportunities (complex expressions)
3. Rename suggestions (unclear names)
4. Performance optimizations
5. Design pattern applications
6. Code structure improvements

For each opportunity, provide:
- type: The refactoring type
- description: What would be improved
- confidence: 0-1 score for the suggestion
- impact: low/medium/high
- files: List of files that would be affected

Return as JSON array of RefactoringOperation objects.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.CODE_GEN_TEMPERATURE
      });

      let operations: RefactoringOperation[];
      try {
        operations = JSON.parse(response.content);
      } catch {
        // Fallback to pattern-based analysis
        operations = await this.patternBasedAnalysis(code, filePath);
      }

      spinner.succeed(`Found ${operations.length} refactoring opportunities`);
      return operations;
    } catch (error) {
      spinner.fail('Failed to analyze code');
      throw error;
    }
  }

  /**
   * Detect code smells
   */
  async detectCodeSmells(filePath: string): Promise<CodeSmell[]> {
    const spinner = createSpinner('Detecting code smells...');
    spinner.start();

    try {
      const code = await fs.readFile(filePath, 'utf-8');
      const smells: CodeSmell[] = [];

      // Pattern-based detection
      const lines = code.split('\n');

      // Long method detection
      const functions = this.extractFunctions(code);
      for (const func of functions) {
        if (func.lineCount > 20) {
          smells.push({
            type: 'long-method',
            severity: func.lineCount > 50 ? 'high' : 'medium',
            location: { file: filePath, line: func.startLine },
            description: `Function '${func.name}' is ${func.lineCount} lines long`,
            suggestion: 'Consider breaking this function into smaller, more focused functions'
          });
        }
      }

      // Complex conditional detection
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const complexity = this.calculateConditionalComplexity(line);

        if (complexity > 3) {
          smells.push({
            type: 'complex-conditional',
            severity: complexity > 5 ? 'high' : 'medium',
            location: { file: filePath, line: i + 1 },
            description: `Complex conditional with ${complexity} conditions`,
            suggestion: 'Extract conditions into well-named boolean variables or methods'
          });
        }
      }

      // Duplicate code detection (simplified)
      const duplicates = this.findDuplicateCode(lines);
      for (const duplicate of duplicates) {
        smells.push({
          type: 'duplicate-code',
          severity: 'medium',
          location: { file: filePath, line: duplicate.line },
          description: `Potential duplicate code block (${duplicate.lines} lines)`,
          suggestion: 'Extract common code into a shared function or module'
        });
      }

      // Use AI for more sophisticated analysis
      if (smells.length < 10) { // Don't overwhelm the AI with too much input
        const aiSmells = await this.aiBasedSmellDetection(code, filePath);
        smells.push(...aiSmells);
      }

      spinner.succeed(`Detected ${smells.length} code smells`);
      return smells;
    } catch (error) {
      spinner.fail('Failed to detect code smells');
      throw error;
    }
  }

  /**
   * Extract function from selected code
   */
  async extractFunction(
    filePath: string,
    startLine: number,
    endLine: number,
    options: ExtractOptions
  ): Promise<string> {
    const spinner = createSpinner('Extracting function...');
    spinner.start();

    try {
      const code = await fs.readFile(filePath, 'utf-8');
      const lines = code.split('\n');

      // Extract the selected code
      const selectedCode = lines.slice(startLine - 1, endLine).join('\n');

      const aiClient = await getEnhancedClient();

      const prompt = `Extract a function from the following code selection:

File: ${filePath}
New function name: ${options.newName}
Selected code (lines ${startLine}-${endLine}):
${selectedCode}

Full file context:
${code}

Please:
1. Create a new function with the name '${options.newName}'
2. Identify parameters and return value
3. Replace the original code with a function call
4. Ensure proper variable scoping
5. Maintain code functionality

Return the complete refactored file content.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.REFACTOR_TEMPERATURE
      });

      // Backup original file
      await fs.writeFile(`${filePath}.backup`, code);

      // Write refactored code
      await fs.writeFile(filePath, response.content);

      spinner.succeed(`Function '${options.newName}' extracted successfully`);
      return response.content;
    } catch (error) {
      spinner.fail('Failed to extract function');
      throw error;
    }
  }

  /**
   * Extract variable from expression
   */
  async extractVariable(
    filePath: string,
    line: number,
    expression: string,
    variableName: string
  ): Promise<string> {
    const spinner = createSpinner('Extracting variable...');
    spinner.start();

    try {
      const code = await fs.readFile(filePath, 'utf-8');
      const aiClient = await getEnhancedClient();

      const prompt = `Extract a variable from the following expression:

File: ${filePath}
Line: ${line}
Expression: ${expression}
Variable name: ${variableName}

Full file:
${code}

Please:
1. Declare a new variable '${variableName}' with the expression value
2. Replace the original expression with the variable
3. Place the variable declaration in the appropriate scope
4. Maintain code functionality and readability

Return the complete refactored file content.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.REFACTOR_TEMPERATURE
      });

      // Backup and write
      await fs.writeFile(`${filePath}.backup`, code);
      await fs.writeFile(filePath, response.content);

      spinner.succeed(`Variable '${variableName}' extracted successfully`);
      return response.content;
    } catch (error) {
      spinner.fail('Failed to extract variable');
      throw error;
    }
  }

  /**
   * Rename symbol throughout codebase
   */
  async renameSymbol(
    symbol: string,
    newName: string,
    filePaths: string[]
  ): Promise<void> {
    const spinner = createSpinner(`Renaming '${symbol}' to '${newName}'...`);
    spinner.start();

    try {
      const updatedFiles: string[] = [];

      for (const filePath of filePaths) {
        if (!await fileExists(filePath)) {
          continue;
        }

        const code = await fs.readFile(filePath, 'utf-8');

        // Use AI for intelligent renaming that preserves context
        const aiClient = await getEnhancedClient();

        const prompt = `Rename the symbol '${symbol}' to '${newName}' in this code while preserving:
1. Variable scope and context
2. String literals that shouldn't be changed
3. Comments that reference the symbol
4. Import/export statements

File: ${filePath}
Original symbol: ${symbol}
New name: ${newName}

Code:
${code}

Return the updated code with the symbol renamed appropriately.`;

        const response = await aiClient.complete(prompt, {
          temperature: AI_CONSTANTS.ANALYSIS_TEMPERATURE
        });

        // Check if any changes were made
        if (response.content !== code) {
          await fs.writeFile(`${filePath}.backup`, code);
          await fs.writeFile(filePath, response.content);
          updatedFiles.push(filePath);
        }
      }

      spinner.succeed(`Renamed '${symbol}' to '${newName}' in ${updatedFiles.length} files`);
    } catch (error) {
      spinner.fail('Failed to rename symbol');
      throw error;
    }
  }

  /**
   * Optimize code performance
   */
  async optimizePerformance(filePath: string): Promise<string> {
    const spinner = createSpinner('Optimizing code performance...');
    spinner.start();

    try {
      const code = await fs.readFile(filePath, 'utf-8');
      const aiClient = await getEnhancedClient();

      const prompt = `Analyze and optimize this code for performance:

File: ${filePath}

Code:
${code}

Please optimize for:
1. Time complexity improvements
2. Memory usage optimization
3. Async/await patterns
4. Loop optimizations
5. Caching opportunities
6. Lazy loading where appropriate

Maintain functionality while improving performance. Add comments explaining optimizations made.

Return the optimized code.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.CODE_GEN_TEMPERATURE
      });

      // Backup and write
      await fs.writeFile(`${filePath}.backup`, code);
      await fs.writeFile(filePath, response.content);

      spinner.succeed('Code performance optimized');
      return response.content;
    } catch (error) {
      spinner.fail('Failed to optimize performance');
      throw error;
    }
  }

  /**
   * Apply design pattern
   */
  async applyDesignPattern(
    filePath: string,
    pattern: string,
    options: any = {}
  ): Promise<string> {
    const spinner = createSpinner(`Applying ${pattern} pattern...`);
    spinner.start();

    try {
      const code = await fs.readFile(filePath, 'utf-8');
      const aiClient = await getEnhancedClient();

      const prompt = `Apply the ${pattern} design pattern to this code:

File: ${filePath}
Pattern: ${pattern}
Options: ${JSON.stringify(options)}

Code:
${code}

Please:
1. Identify where the pattern can be applied
2. Refactor the code to implement the pattern
3. Maintain existing functionality
4. Add comments explaining the pattern implementation
5. Follow best practices for the ${pattern} pattern

Return the refactored code with the design pattern applied.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.CODE_GEN_TEMPERATURE
      });

      // Backup and write
      await fs.writeFile(`${filePath}.backup`, code);
      await fs.writeFile(filePath, response.content);

      spinner.succeed(`${pattern} pattern applied successfully`);
      return response.content;
    } catch (error) {
      spinner.fail(`Failed to apply ${pattern} pattern`);
      throw error;
    }
  }

  /**
   * Pattern-based analysis fallback
   */
  private async patternBasedAnalysis(code: string, filePath: string): Promise<RefactoringOperation[]> {
    const operations: RefactoringOperation[] = [];

    // Long function detection
    const functions = this.extractFunctions(code);
    for (const func of functions) {
      if (func.lineCount > 15) {
        operations.push({
          type: 'extract-function',
          description: `Break down '${func.name}' function (${func.lineCount} lines)`,
          confidence: 0.7,
          impact: 'medium',
          files: [filePath]
        });
      }
    }

    // Complex expression detection
    const complexExpressions = this.findComplexExpressions(code);
    for (const expr of complexExpressions) {
      operations.push({
        type: 'extract-variable',
        description: `Extract complex expression: ${expr.preview}`,
        confidence: 0.6,
        impact: 'low',
        files: [filePath]
      });
    }

    return operations;
  }

  /**
   * Extract function information from code
   */
  private extractFunctions(code: string): Array<{
    name: string;
    startLine: number;
    lineCount: number;
  }> {
    const functions: Array<{ name: string; startLine: number; lineCount: number }> = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const funcMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:function|\([^)]*\)\s*=>))/);

      if (funcMatch) {
        const name = funcMatch[1] || funcMatch[2] || 'anonymous';
        const startLine = i + 1;

        // Find end of function (simplified)
        let braceCount = 0;
        let endLine = i;

        for (let j = i; j < lines.length; j++) {
          const currentLine = lines[j];
          braceCount += (currentLine.match(/{/g) || []).length;
          braceCount -= (currentLine.match(/}/g) || []).length;

          if (braceCount === 0 && j > i) {
            endLine = j;
            break;
          }
        }

        functions.push({
          name,
          startLine,
          lineCount: endLine - i + 1
        });
      }
    }

    return functions;
  }

  /**
   * Calculate conditional complexity
   */
  private calculateConditionalComplexity(line: string): number {
    const conditions = (line.match(/&&|\|\||if|else if/g) || []).length;
    return conditions;
  }

  /**
   * Find duplicate code blocks
   */
  private findDuplicateCode(lines: string[]): Array<{ line: number; lines: number }> {
    const duplicates: Array<{ line: number; lines: number }> = [];
    const minBlockSize = 3;

    for (let i = 0; i < lines.length - minBlockSize; i++) {
      for (let j = i + minBlockSize; j < lines.length - minBlockSize; j++) {
        let matchLength = 0;

        while (
          i + matchLength < lines.length &&
          j + matchLength < lines.length &&
          lines[i + matchLength].trim() === lines[j + matchLength].trim() &&
          lines[i + matchLength].trim() !== ''
        ) {
          matchLength++;
        }

        if (matchLength >= minBlockSize) {
          duplicates.push({
            line: i + 1,
            lines: matchLength
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Find complex expressions
   */
  private findComplexExpressions(code: string): Array<{ preview: string; line: number }> {
    const expressions: Array<{ preview: string; line: number }> = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for complex expressions (simplified)
      if (line.length > 80 && (line.includes('&&') || line.includes('||') || line.includes('?'))) {
        expressions.push({
          preview: line.trim().substring(0, 40) + '...',
          line: i + 1
        });
      }
    }

    return expressions;
  }

  /**
   * AI-based code smell detection
   */
  private async aiBasedSmellDetection(code: string, filePath: string): Promise<CodeSmell[]> {
    try {
      const aiClient = await getEnhancedClient();

      const prompt = `Analyze this code for code smells and anti-patterns:

File: ${filePath}

Code:
${code}

Identify specific issues like:
- God classes (too many responsibilities)
- Feature envy (using other class data more than own)
- Primitive obsession (overuse of primitives instead of objects)
- Dead code (unused variables, functions)
- Poor naming conventions

Return as JSON array of CodeSmell objects with type, severity, location, description, and suggestion.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.CODE_GEN_TEMPERATURE
      });

      return JSON.parse(response.content);
    } catch {
      return [];
    }
  }
}

/**
 * Default refactoring manager instance
 */
export const refactoringManager = new RefactoringManager();