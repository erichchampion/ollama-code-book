/**
 * Testing Commands
 *
 * Intelligent testing capabilities with AI-powered test generation
 */

import { commandRegistry, ArgType } from './index.js';
import { logger } from '../utils/logger.js';
import { testManager, TestGenerationOptions } from '../testing/index.js';
import { validateNonEmptyString, validateFileExists, executeWithSpinner } from '../utils/command-helpers.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Register testing commands
 */
export function registerTestingCommands(): void {
  logger.debug('Registering testing commands');

  registerTestSetupCommand();
  registerTestGenerateCommand();
  registerTestRunCommand();
  registerTestCoverageCommand();
  registerTestAnalyzeCommand();
}

/**
 * Setup testing framework
 */
function registerTestSetupCommand(): void {
  const command = {
    name: 'test-setup',
    description: 'Setup testing framework for the project',
    category: 'Testing',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { framework } = args;

        if (framework) {
          if (!validateNonEmptyString(framework, 'framework name')) {
            return;
          }

          // Setup specific framework
          await testManager.setupFramework(framework);
          console.log(`✅ ${framework} testing framework setup complete!`);

        } else {
          // Auto-detect or show options
          const detected = await testManager.detectFramework();

          if (detected) {
            console.log(`🔍 Detected framework: ${detected.name}`);
            console.log('\n💡 Framework is already configured!');
            console.log('\nAvailable commands:');
            console.log('   test-run        - Run tests');
            console.log('   test-generate   - Generate new tests');
            console.log('   test-coverage   - Analyze coverage');
          } else {
            console.log('🔧 No testing framework detected. Choose one to setup:\n');
            console.log('📦 Available frameworks:');
            console.log('   jest     - Popular JavaScript testing framework');
            console.log('   vitest   - Fast Vite-native testing framework');
            console.log('   mocha    - Flexible JavaScript test framework');
            console.log('   cypress  - End-to-end testing framework');
            console.log('\nExample: test-setup jest');
          }
        }

      } catch (error) {
        logger.error('Test setup command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'framework',
        description: 'Testing framework to setup (jest, vitest, mocha, cypress)',
        type: ArgType.STRING,
        position: 0,
        required: false
      }
    ],
    examples: [
      'test-setup',
      'test-setup jest',
      'test-setup vitest',
      'test-setup cypress'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Generate tests for source files
 */
function registerTestGenerateCommand(): void {
  const command = {
    name: 'test-generate',
    description: 'Generate intelligent test cases for source files',
    category: 'Testing',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file, type = 'unit', edges = true, mocks = false, framework } = args;

        if (!await validateFileExists(file)) {
          return;
        }

        // Detect framework if not specified
        let targetFramework = framework;
        if (!targetFramework) {
          const detected = await testManager.detectFramework();
          targetFramework = detected?.name || 'jest';
        }

        const options: TestGenerationOptions = {
          framework: targetFramework,
          testType: type,
          includeEdgeCases: edges,
          includeMocks: mocks
        };

        console.log(`🔬 Generating ${type} tests for: ${file}`);
        console.log(`📋 Framework: ${targetFramework}`);
        console.log(`🎯 Options: Edge cases: ${edges}, Mocks: ${mocks}\n`);

        const testCode = await testManager.generateTests(file, options);

        // Determine output file name
        const ext = path.extname(file);
        const baseName = path.basename(file, ext);
        const dirName = path.dirname(file);

        const testFileName = `${baseName}.test${ext}`;
        const testFilePath = path.join(dirName, '__tests__', testFileName);

        // Create test directory if it doesn't exist
        const testDir = path.dirname(testFilePath);
        await fs.mkdir(testDir, { recursive: true });

        // Write test file
        await fs.writeFile(testFilePath, testCode);

        console.log(`✅ Tests generated successfully!`);
        console.log(`📁 Test file: ${testFilePath}`);
        console.log('\n💡 Next steps:');
        console.log('   1. Review the generated tests');
        console.log('   2. Customize as needed');
        console.log('   3. Run tests with: test-run');

      } catch (error) {
        logger.error('Test generation command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'Source file to generate tests for',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'type',
        description: 'Type of tests (unit, integration, e2e)',
        type: ArgType.STRING,
        flag: '--type',
        required: false
      },
      {
        name: 'edges',
        description: 'Include edge cases (default: true)',
        type: ArgType.BOOLEAN,
        flag: '--edges',
        required: false
      },
      {
        name: 'mocks',
        description: 'Include mocking (default: false)',
        type: ArgType.BOOLEAN,
        flag: '--mocks',
        required: false
      },
      {
        name: 'framework',
        description: 'Target framework (auto-detected if not specified)',
        type: ArgType.STRING,
        flag: '--framework',
        required: false
      }
    ],
    examples: [
      'test-generate src/utils/helpers.js',
      'test-generate src/api/users.ts --type integration',
      'test-generate src/components/Button.tsx --mocks --framework jest'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Run tests with intelligent analysis
 */
function registerTestRunCommand(): void {
  const command = {
    name: 'test-run',
    description: 'Run tests with intelligent analysis and reporting',
    category: 'Testing',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { pattern, watch = false } = args;

        // Check if framework is setup
        const framework = await testManager.detectFramework();
        if (!framework) {
          throw createUserError('No testing framework detected', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Setup a testing framework with: test-setup <framework>'
          });
        }

        console.log(`🧪 Running tests with ${framework.name}...\n`);

        const results = await testManager.runTests(pattern);

        // Display results
        console.log('\n📊 Test Results Summary:\n');

        let totalTests = 0;
        let passedTests = 0;
        let failedTests = 0;

        for (const suite of results) {
          console.log(`📁 ${suite.name} (${suite.framework})`);

          for (const test of suite.tests) {
            totalTests++;
            const statusIcon = test.status === 'pass' ? '✅' :
                             test.status === 'fail' ? '❌' :
                             test.status === 'pending' ? '⏳' : '⏭️';

            console.log(`   ${statusIcon} ${test.name} (${test.type})`);

            if (test.status === 'pass') {
              passedTests++;
            } else if (test.status === 'fail') {
              failedTests++;
              if (test.error) {
                console.log(`      Error: ${test.error}`);
              }
            }

            if (test.duration) {
              console.log(`      Duration: ${test.duration}ms`);
            }
          }

          if (suite.coverage !== undefined) {
            console.log(`   📈 Coverage: ${suite.coverage}%`);
          }

          console.log('');
        }

        // Summary
        console.log('=' .repeat(50));
        console.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);

        if (failedTests > 0) {
          console.log('\n💡 Tips for failing tests:');
          console.log('   • Check test logic and assertions');
          console.log('   • Verify dependencies and imports');
          console.log('   • Use test-analyze for detailed insights');
        } else if (totalTests > 0) {
          console.log('\n🎉 All tests passed!');
        }

      } catch (error) {
        logger.error('Test run command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'pattern',
        description: 'Test pattern to match (optional)',
        type: ArgType.STRING,
        position: 0,
        required: false
      },
      {
        name: 'watch',
        description: 'Run in watch mode',
        type: ArgType.BOOLEAN,
        flag: '--watch',
        required: false
      }
    ],
    examples: [
      'test-run',
      'test-run "user"',
      'test-run --watch'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Analyze test coverage
 */
function registerTestCoverageCommand(): void {
  const command = {
    name: 'test-coverage',
    description: 'Analyze test coverage with intelligent insights',
    category: 'Testing',
    async handler(): Promise<void> {
      try {
        // Check if framework is setup
        const framework = await testManager.detectFramework();
        if (!framework) {
          throw createUserError('No testing framework detected', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Setup a testing framework with: test-setup <framework>'
          });
        }

        console.log(`📊 Analyzing test coverage with ${framework.name}...\n`);

        const coverage = await testManager.analyzeCoverage();

        console.log('📈 Coverage Report:\n');

        if (coverage.coverage !== undefined) {
          const percentage = typeof coverage.coverage === 'number' ?
            coverage.coverage :
            parseFloat(coverage.coverage) || 0;

          const coverageBar = generateCoverageBar(percentage);

          console.log(`Overall Coverage: ${percentage}% ${coverageBar}`);
          console.log('');

          if (percentage >= 90) {
            console.log('🌟 Excellent coverage!');
          } else if (percentage >= 70) {
            console.log('✅ Good coverage, but room for improvement');
          } else if (percentage >= 50) {
            console.log('⚠️  Coverage needs improvement');
          } else {
            console.log('🚨 Low coverage - consider adding more tests');
          }
        }

        if (coverage.details) {
          console.log('\n📋 Details:');
          if (typeof coverage.details === 'string') {
            console.log(coverage.details);
          } else {
            console.log(JSON.stringify(coverage.details, null, 2));
          }
        }

        console.log('\n💡 Coverage improvement tips:');
        console.log('   • Focus on uncovered lines and branches');
        console.log('   • Add tests for edge cases and error conditions');
        console.log('   • Use test-generate to create comprehensive tests');
        console.log('   • Aim for 80%+ coverage on critical code paths');

      } catch (error) {
        logger.error('Test coverage command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'test-coverage'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Analyze test quality and suggest improvements
 */
function registerTestAnalyzeCommand(): void {
  const command = {
    name: 'test-analyze',
    description: 'Analyze test quality and suggest improvements',
    category: 'Testing',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file } = args;

        if (!await validateFileExists(file)) {
          return;
        }

        console.log(`🔍 Analyzing test file: ${file}\n`);

        const suggestions = await testManager.suggestTestImprovements(file);

        console.log('🤖 AI-Powered Test Analysis:\n');

        if (suggestions.length === 0) {
          console.log('✅ No specific improvements suggested - tests look good!');
        } else {
          suggestions.forEach((suggestion, index) => {
            console.log(`${index + 1}. ${suggestion}`);
          });
        }

        console.log('\n💡 General best practices:');
        console.log('   • Use descriptive test names');
        console.log('   • Group related tests with describe blocks');
        console.log('   • Keep tests independent and isolated');
        console.log('   • Test both success and failure scenarios');
        console.log('   • Mock external dependencies appropriately');

      } catch (error) {
        logger.error('Test analyze command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'Test file to analyze',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'test-analyze src/utils/__tests__/helpers.test.js',
      'test-analyze tests/unit/user.spec.ts'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Generate a visual coverage bar
 */
function generateCoverageBar(percentage: number): string {
  const width = 20;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  let color = '';
  if (percentage >= 90) color = '🟢';
  else if (percentage >= 70) color = '🟡';
  else color = '🔴';

  return `${color} [${'█'.repeat(filled)}${' '.repeat(empty)}]`;
}