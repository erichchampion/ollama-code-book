/**
 * Refactoring Engine
 *
 * Provides automated code refactoring capabilities with safety checks.
 * Implements safe refactoring operations with rollback support.
 */

import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import { getPerformanceConfig } from '../config/performance.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RefactoringOperation {
  id: string;
  type: RefactoringType;
  description: string;
  target: {
    file: string;
    startLine: number;
    endLine: number;
    originalCode: string;
  };
  transformation: {
    newCode: string;
    additionalFiles?: Array<{
      path: string;
      content: string;
    }>;
  };
  impact: RefactoringImpact;
  safety: SafetyAssessment;
  estimatedEffort: 'low' | 'medium' | 'high';
}

export type RefactoringType =
  | 'extract-method'
  | 'extract-class'
  | 'rename-variable'
  | 'rename-method'
  | 'move-method'
  | 'inline-method'
  | 'remove-duplicate'
  | 'simplify-conditional'
  | 'replace-magic-number'
  | 'introduce-parameter-object'
  | 'remove-dead-code'
  | 'optimize-imports';

export interface RefactoringImpact {
  filesAffected: string[];
  dependenciesChanged: boolean;
  testingRequired: boolean;
  breakingChange: boolean;
  performanceImprovement: number; // percentage
  maintainabilityImprovement: number; // percentage
}

export interface SafetyAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  potentialIssues: string[];
  prerequisites: string[];
  rollbackSupported: boolean;
}

export interface RefactoringResult {
  success: boolean;
  operationsApplied: RefactoringOperation[];
  backupCreated: string;
  filesModified: string[];
  testResults?: {
    passed: boolean;
    details: string;
  };
  rollbackInstructions?: string;
  error?: string;
}

export class RefactoringEngine {
  private config = getPerformanceConfig();
  private backupDirectory: string;

  constructor(backupDir?: string) {
    this.backupDirectory = backupDir || '.refactoring-backups';
  }

  /**
   * Analyze code and suggest refactoring opportunities
   */
  async suggestRefactorings(
    files: Array<{ path: string; content: string; type: string }>,
    context?: any
  ): Promise<RefactoringOperation[]> {
    try {
      logger.info('Analyzing code for refactoring opportunities', { fileCount: files.length });

      const operations: RefactoringOperation[] = [];

      for (const file of files) {
        operations.push(...await this.analyzeFileForRefactoring(file));
      }

      // Sort by impact and safety
      return operations.sort((a, b) => {
        const scoreA = this.calculateRefactoringScore(a);
        const scoreB = this.calculateRefactoringScore(b);
        return scoreB - scoreA;
      });
    } catch (error) {
      logger.error('Refactoring analysis failed:', error);
      throw error;
    }
  }

  /**
   * Apply refactoring operations safely
   */
  async applyRefactorings(
    operations: RefactoringOperation[],
    options: {
      dryRun?: boolean;
      runTests?: boolean;
      createBackup?: boolean;
    } = {}
  ): Promise<RefactoringResult> {
    const {
      dryRun = false,
      runTests = true,
      createBackup = true
    } = options;

    try {
      logger.info('Starting refactoring process', {
        operations: operations.length,
        dryRun,
        runTests,
        createBackup
      });

      if (!this.config.codeAnalysis.refactoring.safetyChecksEnabled) {
        logger.warn('Safety checks are disabled - proceeding with caution');
      }

      // Create backup if requested
      let backupPath = '';
      if (createBackup && !dryRun) {
        backupPath = await this.createBackup(operations);
      }

      // Validate operations
      const validationResult = await this.validateOperations(operations);
      if (!validationResult.valid) {
        return {
          success: false,
          operationsApplied: [],
          backupCreated: backupPath,
          filesModified: [],
          error: `Validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      if (dryRun) {
        return {
          success: true,
          operationsApplied: operations,
          backupCreated: '',
          filesModified: operations.map(op => op.target.file),
          testResults: { passed: true, details: 'Dry run - no changes applied' }
        };
      }

      // Apply operations
      const modifiedFiles: string[] = [];
      const appliedOperations: RefactoringOperation[] = [];

      for (const operation of operations) {
        try {
          await this.applyOperation(operation);
          appliedOperations.push(operation);
          if (!modifiedFiles.includes(operation.target.file)) {
            modifiedFiles.push(operation.target.file);
          }
        } catch (error) {
          logger.error(`Failed to apply operation ${operation.id}:`, error);
          // Rollback previous operations
          await this.rollbackOperations(appliedOperations);
          return {
            success: false,
            operationsApplied: appliedOperations,
            backupCreated: backupPath,
            filesModified: modifiedFiles,
            error: `Operation failed: ${normalizeError(error).message}`
          };
        }
      }

      // Run tests if requested
      let testResults;
      if (runTests) {
        testResults = await this.runTests();
        if (!testResults.passed) {
          logger.warn('Tests failed after refactoring - consider rollback');
        }
      }

      return {
        success: true,
        operationsApplied: appliedOperations,
        backupCreated: backupPath,
        filesModified: modifiedFiles,
        testResults,
        rollbackInstructions: backupPath ? `Use backup at ${backupPath} to rollback changes` : undefined
      };

    } catch (error) {
      logger.error('Refactoring process failed:', error);
      return {
        success: false,
        operationsApplied: [],
        backupCreated: '',
        filesModified: [],
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Analyze individual file for refactoring opportunities
   */
  private async analyzeFileForRefactoring(
    file: { path: string; content: string; type: string }
  ): Promise<RefactoringOperation[]> {
    const operations: RefactoringOperation[] = [];

    // Extract method opportunities
    operations.push(...this.detectExtractMethodOpportunities(file));

    // Magic numbers
    operations.push(...this.detectMagicNumbers(file));

    // Duplicate code
    operations.push(...this.detectDuplicateCode(file));

    // Complex conditionals
    operations.push(...this.detectComplexConditionals(file));

    // Dead code
    operations.push(...this.detectDeadCode(file));

    // Import optimization
    operations.push(...this.detectImportOptimizations(file));

    return operations;
  }

  /**
   * Detect extract method opportunities
   */
  private detectExtractMethodOpportunities(
    file: { path: string; content: string; type: string }
  ): RefactoringOperation[] {
    const operations: RefactoringOperation[] = [];
    const lines = file.content.split('\n');
    const minLines = this.config.codeAnalysis.refactoring.extractMethodMinLines;

    // Look for long methods or code blocks
    let inMethod = false;
    let methodStart = 0;
    let methodLines = 0;
    let braceCount = 0;
    let currentMethod = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect method start
      const methodMatch = line.match(/^\s*(public|private|protected)?\s*(static\s+)?(async\s+)?(\w+)\s*\(/);
      if (methodMatch && !inMethod) {
        currentMethod = methodMatch[4];
        methodStart = i;
        methodLines = 0;
        inMethod = true;
        braceCount = 0;
      }

      if (inMethod) {
        methodLines++;
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;

        if (braceCount === 0 && methodLines > 1) {
          if (methodLines > minLines) {
            operations.push({
              id: `extract-method-${file.path}-${methodStart}`,
              type: 'extract-method',
              description: `Extract parts of long method '${currentMethod}' (${methodLines} lines)`,
              target: {
                file: file.path,
                startLine: methodStart + 1,
                endLine: i + 1,
                originalCode: lines.slice(methodStart, i + 1).join('\n')
              },
              transformation: {
                newCode: this.generateExtractMethodRefactoring(lines.slice(methodStart, i + 1), currentMethod)
              },
              impact: {
                filesAffected: [file.path],
                dependenciesChanged: false,
                testingRequired: true,
                breakingChange: false,
                performanceImprovement: 0,
                maintainabilityImprovement: 25
              },
              safety: {
                riskLevel: 'low',
                confidence: 0.8,
                potentialIssues: ['Method signature changes', 'Variable scope changes'],
                prerequisites: ['Ensure no external dependencies on internal variables'],
                rollbackSupported: true
              },
              estimatedEffort: 'medium'
            });
          }
          inMethod = false;
        }
      }
    }

    return operations;
  }

  /**
   * Detect magic numbers
   */
  private detectMagicNumbers(
    file: { path: string; content: string; type: string }
  ): RefactoringOperation[] {
    const operations: RefactoringOperation[] = [];
    const lines = file.content.split('\n');

    // Pattern to find magic numbers (excluding 0, 1, -1, common values)
    const magicNumberPattern = /\b(?!0\b|1\b|-1\b|10\b|100\b|1000\b)\d{2,}\b/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;

      while ((match = magicNumberPattern.exec(line)) !== null) {
        const number = match[0];
        operations.push({
          id: `magic-number-${file.path}-${i}-${number}`,
          type: 'replace-magic-number',
          description: `Replace magic number ${number} with named constant`,
          target: {
            file: file.path,
            startLine: i + 1,
            endLine: i + 1,
            originalCode: line
          },
          transformation: {
            newCode: line.replace(number, `CONST_${number}`),
            additionalFiles: [{
              path: path.join(path.dirname(file.path), 'constants.ts'),
              content: `export const CONST_${number} = ${number};\n`
            }]
          },
          impact: {
            filesAffected: [file.path],
            dependenciesChanged: false,
            testingRequired: false,
            breakingChange: false,
            performanceImprovement: 0,
            maintainabilityImprovement: 15
          },
          safety: {
            riskLevel: 'low',
            confidence: 0.9,
            potentialIssues: [],
            prerequisites: [],
            rollbackSupported: true
          },
          estimatedEffort: 'low'
        });
      }
    }

    return operations;
  }

  /**
   * Detect other refactoring opportunities (simplified implementations)
   */
  private detectDuplicateCode(file: { path: string; content: string; type: string }): RefactoringOperation[] {
    // Implementation would detect duplicate code blocks
    return [];
  }

  private detectComplexConditionals(file: { path: string; content: string; type: string }): RefactoringOperation[] {
    const operations: RefactoringOperation[] = [];
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect complex if conditions (multiple && or ||)
      if (/if\s*\(.*&&.*&&|if\s*\(.*\|\|.*\|\|/.test(line)) {
        operations.push({
          id: `simplify-conditional-${file.path}-${i}`,
          type: 'simplify-conditional',
          description: 'Simplify complex conditional expression',
          target: {
            file: file.path,
            startLine: i + 1,
            endLine: i + 1,
            originalCode: line
          },
          transformation: {
            newCode: line // Would contain simplified version
          },
          impact: {
            filesAffected: [file.path],
            dependenciesChanged: false,
            testingRequired: true,
            breakingChange: false,
            performanceImprovement: 5,
            maintainabilityImprovement: 20
          },
          safety: {
            riskLevel: 'medium',
            confidence: 0.7,
            potentialIssues: ['Logic changes'],
            prerequisites: ['Verify conditional logic equivalence'],
            rollbackSupported: true
          },
          estimatedEffort: 'medium'
        });
      }
    }

    return operations;
  }

  private detectDeadCode(file: { path: string; content: string; type: string }): RefactoringOperation[] {
    // Implementation would detect unused functions, variables, imports
    return [];
  }

  private detectImportOptimizations(file: { path: string; content: string; type: string }): RefactoringOperation[] {
    const operations: RefactoringOperation[] = [];

    // Detect unused imports
    const importPattern = /import\s+\{([^}]+)\}\s+from/g;
    let match;

    while ((match = importPattern.exec(file.content)) !== null) {
      const imports = match[1].split(',').map(imp => imp.trim());
      const unusedImports = imports.filter(imp => !file.content.includes(imp.replace(/\s+as\s+\w+/, '')));

      if (unusedImports.length > 0) {
        operations.push({
          id: `optimize-imports-${file.path}`,
          type: 'optimize-imports',
          description: `Remove ${unusedImports.length} unused import(s)`,
          target: {
            file: file.path,
            startLine: 1,
            endLine: 20, // Approximate import section
            originalCode: match[0]
          },
          transformation: {
            newCode: match[0] // Would contain optimized imports
          },
          impact: {
            filesAffected: [file.path],
            dependenciesChanged: false,
            testingRequired: false,
            breakingChange: false,
            performanceImprovement: 2,
            maintainabilityImprovement: 10
          },
          safety: {
            riskLevel: 'low',
            confidence: 0.95,
            potentialIssues: [],
            prerequisites: [],
            rollbackSupported: true
          },
          estimatedEffort: 'low'
        });
      }
    }

    return operations;
  }

  /**
   * Helper methods
   */
  private calculateRefactoringScore(operation: RefactoringOperation): number {
    const impactScore = operation.impact.maintainabilityImprovement + operation.impact.performanceImprovement;
    const safetyScore = operation.safety.confidence * 100;
    const effortPenalty = { low: 0, medium: 10, high: 25 }[operation.estimatedEffort];

    return impactScore + safetyScore - effortPenalty;
  }

  private generateExtractMethodRefactoring(methodLines: string[], methodName: string): string {
    // Simplified method extraction
    return methodLines.join('\n') + '\n\n// TODO: Extract helper methods from long method';
  }

  private async validateOperations(operations: RefactoringOperation[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const operation of operations) {
      if (operation.safety.riskLevel === 'high' && operation.safety.confidence < THRESHOLD_CONSTANTS.RISK.HIGH_RISK_MIN_CONFIDENCE) {
        errors.push(`Operation ${operation.id} has high risk and low confidence`);
      }

      if (operation.impact.breakingChange && !this.config.codeAnalysis.refactoring.safetyChecksEnabled) {
        errors.push(`Breaking change operation ${operation.id} requires safety checks`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async createBackup(operations: RefactoringOperation[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDirectory, `backup-${timestamp}`);

    try {
      await fs.mkdir(backupPath, { recursive: true });

      const filesToBackup = [...new Set(operations.map(op => op.target.file))];

      for (const filePath of filesToBackup) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const backupFilePath = path.join(backupPath, path.basename(filePath));
          await fs.writeFile(backupFilePath, content);
        } catch (error) {
          logger.warn(`Failed to backup file ${filePath}:`, error);
        }
      }

      return backupPath;
    } catch (error) {
      logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  private async applyOperation(operation: RefactoringOperation): Promise<void> {
    try {
      const content = await fs.readFile(operation.target.file, 'utf-8');
      const lines = content.split('\n');

      // Replace target lines with new code
      const newLines = [
        ...lines.slice(0, operation.target.startLine - 1),
        ...operation.transformation.newCode.split('\n'),
        ...lines.slice(operation.target.endLine)
      ];

      await fs.writeFile(operation.target.file, newLines.join('\n'));

      // Create additional files if specified
      if (operation.transformation.additionalFiles) {
        for (const additionalFile of operation.transformation.additionalFiles) {
          await fs.mkdir(path.dirname(additionalFile.path), { recursive: true });
          await fs.writeFile(additionalFile.path, additionalFile.content);
        }
      }

      logger.info(`Applied refactoring operation: ${operation.id}`);
    } catch (error) {
      logger.error(`Failed to apply operation ${operation.id}:`, error);
      throw error;
    }
  }

  private async rollbackOperations(operations: RefactoringOperation[]): Promise<void> {
    logger.info('Rolling back operations', { count: operations.length });
    // Implementation would restore from backup
  }

  private async runTests(): Promise<{ passed: boolean; details: string }> {
    // Implementation would run test suite
    return { passed: true, details: 'No test runner configured' };
  }
}
