/**
 * Refactoring Commands
 *
 * Intelligent code refactoring with AI-powered suggestions
 */

import { commandRegistry, ArgType } from './index.js';
import { logger } from '../utils/logger.js';
import { refactoringManager } from '../refactoring/index.js';
import { validateNonEmptyString, validateFileExists } from '../utils/command-helpers.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';

/**
 * Register refactoring commands
 */
export function registerRefactoringCommands(): void {
  logger.debug('Registering refactoring commands');

  registerRefactorAnalyzeCommand();
  registerRefactorExtractCommand();
  registerRefactorRenameCommand();
  registerRefactorOptimizeCommand();
  registerRefactorSmellsCommand();
  registerRefactorPatternCommand();
}

/**
 * Analyze code for refactoring opportunities
 */
function registerRefactorAnalyzeCommand(): void {
  const command = {
    name: 'refactor-analyze',
    description: 'Analyze code for refactoring opportunities with AI insights',
    category: 'Refactoring',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file } = args;

        if (!await validateFileExists(file)) {
          return;
        }

        console.log(`🔍 Analyzing refactoring opportunities in: ${file}\n`);

        const operations = await refactoringManager.analyzeCode(file);

        if (operations.length === 0) {
          console.log('✅ No major refactoring opportunities found!');
          console.log('Your code is well-structured.');
          return;
        }

        console.log('🤖 AI-Detected Refactoring Opportunities:\n');

        // Group by impact level
        const groupedOps = {
          high: operations.filter(op => op.impact === 'high'),
          medium: operations.filter(op => op.impact === 'medium'),
          low: operations.filter(op => op.impact === 'low')
        };

        for (const [impact, ops] of Object.entries(groupedOps)) {
          if (ops.length === 0) continue;

          const icon = impact === 'high' ? '🔴' : impact === 'medium' ? '🟡' : '🟢';
          console.log(`${icon} ${impact.toUpperCase()} IMPACT (${ops.length} opportunities):`);

          ops.forEach((op, index) => {
            const confidence = Math.round(op.confidence * 100);
            console.log(`   ${index + 1}. ${op.description}`);
            console.log(`      Type: ${op.type} | Confidence: ${confidence}%`);
            if (op.preview) {
              console.log(`      Preview: ${op.preview}`);
            }
          });
          console.log('');
        }

        console.log('💡 Suggested next steps:');
        console.log('   • Start with high-impact refactorings');
        console.log('   • Use refactor-extract to extract functions/variables');
        console.log('   • Use refactor-optimize for performance improvements');
        console.log('   • Run refactor-smells for code quality analysis');

      } catch (error) {
        logger.error('Refactor analyze command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'File to analyze for refactoring opportunities',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'refactor-analyze src/utils/helpers.js',
      'refactor-analyze src/components/UserProfile.tsx'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Extract function or variable
 */
function registerRefactorExtractCommand(): void {
  const command = {
    name: 'refactor-extract',
    description: 'Extract function, variable, or component from code',
    category: 'Refactoring',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file, type, name, startLine, endLine, expression } = args;

        if (!await validateFileExists(file)) {
          return;
        }

        if (!validateNonEmptyString(name, 'new name')) {
          return;
        }

        if (type === 'function') {
          if (!startLine || !endLine) {
            throw createUserError('Start and end lines required for function extraction', {
              category: ErrorCategory.VALIDATION,
              resolution: 'Provide --start-line and --end-line parameters'
            });
          }

          console.log(`🔧 Extracting function '${name}' from lines ${startLine}-${endLine}...\n`);

          await refactoringManager.extractFunction(file, startLine, endLine, {
            newName: name,
            includeImports: true,
            generateTests: false
          });

          console.log(`✅ Function '${name}' extracted successfully!`);
          console.log(`📁 Original file backed up as: ${file}.backup`);

        } else if (type === 'variable') {
          if (!expression) {
            throw createUserError('Expression required for variable extraction', {
              category: ErrorCategory.VALIDATION,
              resolution: 'Provide --expression parameter with the expression to extract'
            });
          }

          const line = startLine || 1;
          console.log(`🔧 Extracting variable '${name}' from expression: ${expression}...\n`);

          await refactoringManager.extractVariable(file, line, expression, name);

          console.log(`✅ Variable '${name}' extracted successfully!`);
          console.log(`📁 Original file backed up as: ${file}.backup`);

        } else {
          throw createUserError('Invalid extraction type', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Use --type function or --type variable'
          });
        }

        console.log('\n💡 Next steps:');
        console.log('   • Review the refactored code');
        console.log('   • Update any affected tests');
        console.log('   • Check for compilation/runtime errors');

      } catch (error) {
        logger.error('Refactor extract command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'File to refactor',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'type',
        description: 'Type of extraction (function, variable)',
        type: ArgType.STRING,
        flag: '--type',
        required: true
      },
      {
        name: 'name',
        description: 'Name for the extracted element',
        type: ArgType.STRING,
        flag: '--name',
        required: true
      },
      {
        name: 'startLine',
        description: 'Start line (for function extraction)',
        type: ArgType.NUMBER,
        flag: '--start-line',
        required: false
      },
      {
        name: 'endLine',
        description: 'End line (for function extraction)',
        type: ArgType.NUMBER,
        flag: '--end-line',
        required: false
      },
      {
        name: 'expression',
        description: 'Expression to extract (for variable extraction)',
        type: ArgType.STRING,
        flag: '--expression',
        required: false
      }
    ],
    examples: [
      'refactor-extract src/utils.js --type function --name validateUser --start-line 10 --end-line 25',
      'refactor-extract src/calc.js --type variable --name isValid --expression "user && user.email && user.email.includes(\'@\')"'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Rename symbol throughout codebase
 */
function registerRefactorRenameCommand(): void {
  const command = {
    name: 'refactor-rename',
    description: 'Intelligently rename symbols across multiple files',
    category: 'Refactoring',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { symbol, newName, files } = args;

        if (!validateNonEmptyString(symbol, 'symbol to rename')) {
          return;
        }

        if (!validateNonEmptyString(newName, 'new name')) {
          return;
        }

        let filePaths: string[];

        if (files) {
          // Use provided file list
          filePaths = files.split(',').map((f: string) => f.trim());
        } else {
          // Auto-detect files that might contain the symbol
          const { promises: fs } = await import('fs');
          const path = await import('path');

          const findFiles = async (dir: string): Promise<string[]> => {
            const files: string[] = [];
            try {
              const entries = await fs.readdir(dir, { withFileTypes: true });

              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory() && !['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
                  files.push(...await findFiles(fullPath));
                } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
                  files.push(fullPath);
                }
              }
            } catch (error) {
              // Skip directories we can't read
            }

            return files;
          };

          filePaths = await findFiles(process.cwd());
        }

        console.log(`🔧 Renaming '${symbol}' to '${newName}' across ${filePaths.length} files...\n`);

        await refactoringManager.renameSymbol(symbol, newName, filePaths);

        console.log(`✅ Symbol '${symbol}' renamed to '${newName}' successfully!`);
        console.log('📁 Original files backed up with .backup extension');

        console.log('\n💡 Next steps:');
        console.log('   • Test the application to ensure functionality');
        console.log('   • Update documentation if needed');
        console.log('   • Run tests to verify no breaking changes');

      } catch (error) {
        logger.error('Refactor rename command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'symbol',
        description: 'Symbol to rename (function, variable, class name)',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'newName',
        description: 'New name for the symbol',
        type: ArgType.STRING,
        position: 1,
        required: true
      },
      {
        name: 'files',
        description: 'Comma-separated list of files (optional, auto-detected if not provided)',
        type: ArgType.STRING,
        flag: '--files',
        required: false
      }
    ],
    examples: [
      'refactor-rename getUserData fetchUserProfile',
      'refactor-rename calculateTotal computeSum --files "src/math.js,src/calculator.js"'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Optimize code performance
 */
function registerRefactorOptimizeCommand(): void {
  const command = {
    name: 'refactor-optimize',
    description: 'Optimize code for better performance with AI suggestions',
    category: 'Refactoring',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file } = args;

        if (!await validateFileExists(file)) {
          return;
        }

        console.log(`⚡ Optimizing performance of: ${file}\n`);

        await refactoringManager.optimizePerformance(file);

        console.log(`✅ Performance optimizations applied!`);
        console.log(`📁 Original file backed up as: ${file}.backup`);

        console.log('\n🚀 Performance optimization areas covered:');
        console.log('   • Time complexity improvements');
        console.log('   • Memory usage optimization');
        console.log('   • Async/await pattern improvements');
        console.log('   • Loop and iteration optimizations');
        console.log('   • Caching opportunities');

        console.log('\n💡 Next steps:');
        console.log('   • Test performance improvements');
        console.log('   • Profile before and after if needed');
        console.log('   • Verify all functionality still works');

      } catch (error) {
        logger.error('Refactor optimize command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'File to optimize for performance',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'refactor-optimize src/data-processor.js',
      'refactor-optimize src/components/DataTable.tsx'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Detect and analyze code smells
 */
function registerRefactorSmellsCommand(): void {
  const command = {
    name: 'refactor-smells',
    description: 'Detect code smells and anti-patterns with improvement suggestions',
    category: 'Refactoring',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file } = args;

        if (!await validateFileExists(file)) {
          return;
        }

        console.log(`👃 Detecting code smells in: ${file}\n`);

        const smells = await refactoringManager.detectCodeSmells(file);

        if (smells.length === 0) {
          console.log('✅ No code smells detected! Your code is clean.');
          return;
        }

        console.log('🚨 Code Smells Detected:\n');

        // Group by severity
        const groupedSmells = {
          critical: smells.filter(s => s.severity === 'critical'),
          high: smells.filter(s => s.severity === 'high'),
          medium: smells.filter(s => s.severity === 'medium'),
          low: smells.filter(s => s.severity === 'low')
        };

        for (const [severity, smellList] of Object.entries(groupedSmells)) {
          if (smellList.length === 0) continue;

          const icon = severity === 'critical' ? '🆘' :
                      severity === 'high' ? '🔴' :
                      severity === 'medium' ? '🟡' : '🟢';

          console.log(`${icon} ${severity.toUpperCase()} (${smellList.length} issues):`);

          smellList.forEach((smell, index) => {
            console.log(`   ${index + 1}. ${smell.type} at line ${smell.location.line}`);
            console.log(`      Issue: ${smell.description}`);
            console.log(`      Fix: ${smell.suggestion}`);
          });
          console.log('');
        }

        console.log('📊 Summary:');
        console.log(`   Total issues: ${smells.length}`);
        console.log(`   Critical: ${groupedSmells.critical.length}`);
        console.log(`   High: ${groupedSmells.high.length}`);
        console.log(`   Medium: ${groupedSmells.medium.length}`);
        console.log(`   Low: ${groupedSmells.low.length}`);

        console.log('\n💡 Recommended actions:');
        console.log('   • Address critical and high severity issues first');
        console.log('   • Use refactor-extract for long methods');
        console.log('   • Use refactor-optimize for performance issues');
        console.log('   • Consider design patterns for complex code');

      } catch (error) {
        logger.error('Refactor smells command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'File to analyze for code smells',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'refactor-smells src/legacy-code.js',
      'refactor-smells src/complex-component.tsx'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Apply design patterns
 */
function registerRefactorPatternCommand(): void {
  const command = {
    name: 'refactor-pattern',
    description: 'Apply design patterns to improve code structure',
    category: 'Refactoring',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file, pattern } = args;

        if (!await validateFileExists(file)) {
          return;
        }

        if (!validateNonEmptyString(pattern, 'design pattern')) {
          return;
        }

        console.log(`🎨 Applying ${pattern} pattern to: ${file}\n`);

        await refactoringManager.applyDesignPattern(file, pattern);

        console.log(`✅ ${pattern} pattern applied successfully!`);
        console.log(`📁 Original file backed up as: ${file}.backup`);

        console.log('\n📖 Pattern Benefits:');

        switch (pattern.toLowerCase()) {
          case 'strategy':
            console.log('   • Encapsulates algorithms and makes them interchangeable');
            console.log('   • Follows Open/Closed Principle');
            break;
          case 'observer':
            console.log('   • Defines one-to-many dependency between objects');
            console.log('   • Promotes loose coupling');
            break;
          case 'factory':
            console.log('   • Creates objects without specifying exact classes');
            console.log('   • Promotes code reusability');
            break;
          case 'singleton':
            console.log('   • Ensures only one instance exists');
            console.log('   • Provides global access point');
            break;
          default:
            console.log(`   • Applied ${pattern} pattern for better structure`);
        }

        console.log('\n💡 Next steps:');
        console.log('   • Review the pattern implementation');
        console.log('   • Test functionality thoroughly');
        console.log('   • Update documentation if needed');

      } catch (error) {
        logger.error('Refactor pattern command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'File to apply design pattern to',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'pattern',
        description: 'Design pattern to apply (strategy, observer, factory, singleton, etc.)',
        type: ArgType.STRING,
        position: 1,
        required: true
      }
    ],
    examples: [
      'refactor-pattern src/payment.js strategy',
      'refactor-pattern src/event-system.ts observer',
      'refactor-pattern src/user-factory.js factory'
    ]
  };

  commandRegistry.register(command);
}