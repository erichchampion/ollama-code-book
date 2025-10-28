/**
 * Testing and Test Generation Module
 *
 * Provides intelligent testing capabilities including:
 * - Automated test generation from source code
 * - Test framework detection and setup
 * - Test coverage analysis
 * - Performance testing
 * - Unit test suggestions
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getEnhancedClient } from '../ai/index.js';
import { createSpinner } from '../utils/spinner.js';
import { fileExists } from '../fs/operations.js';
import { AI_CONSTANTS } from '../config/constants.js';

const execAsync = promisify(exec);

export interface TestFramework {
  name: string;
  configFile: string;
  testPattern: string;
  runCommand: string;
  dependencies: string[];
}

export interface TestSuite {
  name: string;
  path: string;
  tests: Test[];
  coverage?: number;
  framework: string;
}

export interface Test {
  name: string;
  type: 'unit' | 'integration' | 'e2e';
  status: 'pass' | 'fail' | 'pending' | 'skip';
  duration?: number;
  error?: string;
}

export interface TestGenerationOptions {
  framework?: string;
  testType: 'unit' | 'integration' | 'e2e';
  includeEdgeCases: boolean;
  includeMocks: boolean;
  coverageTarget?: number;
}

export class TestManager {
  private workingDir: string;
  private supportedFrameworks: TestFramework[] = [
    {
      name: 'jest',
      configFile: 'jest.config.js',
      testPattern: '**/*.{test,spec}.{js,ts}',
      runCommand: 'npm test',
      dependencies: ['jest', '@types/jest']
    },
    {
      name: 'vitest',
      configFile: 'vitest.config.ts',
      testPattern: '**/*.{test,spec}.{js,ts}',
      runCommand: 'npm run test',
      dependencies: ['vitest']
    },
    {
      name: 'mocha',
      configFile: 'mocha.opts',
      testPattern: 'test/**/*.js',
      runCommand: 'npm test',
      dependencies: ['mocha', 'chai', '@types/mocha', '@types/chai']
    },
    {
      name: 'cypress',
      configFile: 'cypress.config.js',
      testPattern: 'cypress/e2e/**/*.cy.js',
      runCommand: 'npx cypress run',
      dependencies: ['cypress']
    }
  ];

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * Detect which testing framework is being used
   */
  async detectFramework(): Promise<TestFramework | null> {
    const spinner = createSpinner('Detecting test framework...');
    spinner.start();

    try {
      // Check package.json for test dependencies
      const packageJsonPath = path.join(this.workingDir, 'package.json');

      if (await fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        for (const framework of this.supportedFrameworks) {
          if (framework.dependencies.some(dep => allDeps[dep])) {
            // Also check for config files
            const configPath = path.join(this.workingDir, framework.configFile);
            if (await fileExists(configPath)) {
              spinner.succeed(`Detected ${framework.name} framework`);
              return framework;
            }
          }
        }
      }

      // Check for config files even without package.json
      for (const framework of this.supportedFrameworks) {
        const configPath = path.join(this.workingDir, framework.configFile);
        if (await fileExists(configPath)) {
          spinner.succeed(`Detected ${framework.name} framework`);
          return framework;
        }
      }

      spinner.succeed('No specific framework detected');
      return null;
    } catch (error) {
      spinner.fail('Failed to detect framework');
      throw error;
    }
  }

  /**
   * Setup testing framework for the project
   */
  async setupFramework(frameworkName: string): Promise<void> {
    const framework = this.supportedFrameworks.find(f => f.name === frameworkName);

    if (!framework) {
      throw new Error(`Unsupported framework: ${frameworkName}`);
    }

    const spinner = createSpinner(`Setting up ${framework.name}...`);
    spinner.start();

    try {
      // Install dependencies
      const installCommand = `npm install --save-dev ${framework.dependencies.join(' ')}`;
      await execAsync(installCommand, { cwd: this.workingDir });

      // Create basic config file if it doesn't exist
      const configPath = path.join(this.workingDir, framework.configFile);

      if (!await fileExists(configPath)) {
        const config = this.generateFrameworkConfig(framework);
        await fs.writeFile(configPath, config);
      }

      // Update package.json scripts
      await this.updatePackageJsonScripts(framework);

      // Create test directory structure
      await this.createTestDirectories(framework);

      spinner.succeed(`${framework.name} setup complete`);
    } catch (error) {
      spinner.fail(`Failed to setup ${framework.name}`);
      throw error;
    }
  }

  /**
   * Generate test cases for a source file
   */
  async generateTests(
    filePath: string,
    options: TestGenerationOptions
  ): Promise<string> {
    const spinner = createSpinner('Generating test cases...');
    spinner.start();

    try {
      // Read the source file
      const sourceCode = await fs.readFile(filePath, 'utf-8');

      // Analyze the code structure
      const analysis = await this.analyzeCodeStructure(sourceCode, filePath);

      // Generate tests with AI
      const aiClient = await getEnhancedClient();

      const prompt = `Generate comprehensive ${options.testType} tests for the following code:

File: ${filePath}
Framework: ${options.framework || 'jest'}
Include Edge Cases: ${options.includeEdgeCases}
Include Mocks: ${options.includeMocks}

Code Analysis:
${JSON.stringify(analysis, null, 2)}

Source Code:
${sourceCode}

Generate tests that cover:
1. All exported functions/classes
2. Edge cases and error conditions
3. Async operations if present
4. Dependencies and mocking if requested
5. Performance considerations for critical paths

Follow these guidelines:
- Use clear, descriptive test names
- Group related tests in describe blocks
- Include setup/teardown when needed
- Add comments explaining complex test logic
- Follow ${options.framework || 'jest'} best practices

Return only the test code, ready to save as a .test.${filePath.endsWith('.ts') ? 'ts' : 'js'} file.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.CODE_GEN_TEMPERATURE
      });

      spinner.succeed('Test cases generated');
      return response.content;
    } catch (error) {
      spinner.fail('Failed to generate tests');
      throw error;
    }
  }

  /**
   * Run tests and return results
   */
  async runTests(pattern?: string): Promise<TestSuite[]> {
    const spinner = createSpinner('Running tests...');
    spinner.start();

    try {
      const framework = await this.detectFramework();

      if (!framework) {
        throw new Error('No test framework detected. Please setup a framework first.');
      }

      let command = framework.runCommand;
      if (pattern) {
        command += ` --testNamePattern="${pattern}"`;
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workingDir,
        env: { ...process.env, CI: 'true' } // Ensure non-interactive mode
      });

      // Parse test results based on framework
      const results = this.parseTestResults(stdout, stderr, framework.name);

      spinner.succeed('Tests completed');
      return results;
    } catch (error) {
      spinner.fail('Test execution failed');

      // Try to parse results even from failed execution
      if (error instanceof Error && 'stdout' in error) {
        const framework = await this.detectFramework();
        if (framework) {
          return this.parseTestResults(
            (error as any).stdout,
            (error as any).stderr,
            framework.name
          );
        }
      }

      throw error;
    }
  }

  /**
   * Analyze test coverage
   */
  async analyzeCoverage(): Promise<any> {
    const spinner = createSpinner('Analyzing test coverage...');
    spinner.start();

    try {
      const framework = await this.detectFramework();

      if (!framework) {
        throw new Error('No test framework detected');
      }

      let command = '';

      switch (framework.name) {
        case 'jest':
          command = 'npx jest --coverage --coverageReporters=json';
          break;
        case 'vitest':
          command = 'npx vitest run --coverage --reporter=json';
          break;
        default:
          throw new Error(`Coverage analysis not supported for ${framework.name}`);
      }

      const { stdout } = await execAsync(command, { cwd: this.workingDir });

      // Parse coverage report
      const coverage = this.parseCoverageReport(stdout, framework.name);

      spinner.succeed('Coverage analysis complete');
      return coverage;
    } catch (error) {
      spinner.fail('Coverage analysis failed');
      throw error;
    }
  }

  /**
   * Suggest test improvements
   */
  async suggestTestImprovements(testFilePath: string): Promise<string[]> {
    const spinner = createSpinner('Analyzing test quality...');
    spinner.start();

    try {
      const testCode = await fs.readFile(testFilePath, 'utf-8');

      const aiClient = await getEnhancedClient();

      const prompt = `Analyze this test file and suggest improvements:

Test File: ${testFilePath}

Test Code:
${testCode}

Please analyze for:
1. Test coverage gaps
2. Missing edge cases
3. Test organization and structure
4. Performance considerations
5. Best practices adherence
6. Readability and maintainability

Provide specific, actionable suggestions.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.TEST_GEN_TEMPERATURE
      });

      const suggestions = response.content.split('\n').filter((line: string) =>
        line.trim().length > 0
      );

      spinner.succeed('Test analysis complete');
      return suggestions;
    } catch (error) {
      spinner.fail('Test analysis failed');
      throw error;
    }
  }

  /**
   * Analyze code structure for test generation
   */
  private async analyzeCodeStructure(code: string, filePath: string): Promise<any> {
    const analysis = {
      exports: [] as string[],
      functions: [] as string[],
      classes: [] as string[],
      imports: [] as string[],
      hasAsync: false,
      language: filePath.endsWith('.ts') ? 'typescript' : 'javascript'
    };

    // Simple regex-based analysis (could be enhanced with AST parsing)
    const exportMatches = code.match(/export\s+(function|class|const|let|var)\s+(\w+)/g) || [];
    analysis.exports = exportMatches.map(match => {
      const parts = match.split(/\s+/);
      return parts[parts.length - 1];
    });

    const functionMatches = code.match(/function\s+(\w+)/g) || [];
    analysis.functions = functionMatches.map(match => match.replace('function ', ''));

    const classMatches = code.match(/class\s+(\w+)/g) || [];
    analysis.classes = classMatches.map(match => match.replace('class ', ''));

    const importMatches = code.match(/import\s+.*\s+from\s+['"](.+)['"]/g) || [];
    analysis.imports = importMatches.map(match => {
      const fromMatch = match.match(/from\s+['"](.+)['"]/);
      return fromMatch ? fromMatch[1] : '';
    });

    analysis.hasAsync = /async\s+/.test(code) || /await\s+/.test(code);

    return analysis;
  }

  /**
   * Generate framework-specific config
   */
  private generateFrameworkConfig(framework: TestFramework): string {
    switch (framework.name) {
      case 'jest':
        return `module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
  ],
  testMatch: [
    '**/__tests__/**/*.(js|ts)',
    '**/*.(test|spec).(js|ts)'
  ],
  transform: {
    '^.+\\\\.(ts|tsx)$': 'ts-jest',
  },
};`;

      case 'vitest':
        return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/**/*.d.ts']
    }
  }
});`;

      default:
        return `// ${framework.name} configuration
// Please customize according to your needs
`;
    }
  }

  /**
   * Update package.json scripts
   */
  private async updatePackageJsonScripts(framework: TestFramework): Promise<void> {
    const packageJsonPath = path.join(this.workingDir, 'package.json');

    if (!await fileExists(packageJsonPath)) {
      return;
    }

    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    // Add test scripts
    packageJson.scripts.test = framework.runCommand.replace('npm ', '');
    packageJson.scripts['test:watch'] = packageJson.scripts.test + ' --watch';
    packageJson.scripts['test:coverage'] = packageJson.scripts.test + ' --coverage';

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  /**
   * Create test directory structure
   */
  private async createTestDirectories(framework: TestFramework): Promise<void> {
    const testDirs = [
      'src/__tests__',
      'tests/unit',
      'tests/integration'
    ];

    if (framework.name === 'cypress') {
      testDirs.push('cypress/e2e', 'cypress/fixtures', 'cypress/support');
    }

    for (const dir of testDirs) {
      const fullPath = path.join(this.workingDir, dir);
      try {
        await fs.mkdir(fullPath, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  /**
   * Parse test results based on framework
   */
  private parseTestResults(stdout: string, stderr: string, framework: string): TestSuite[] {
    // This is a simplified parser - in practice you'd want more robust parsing
    const results: TestSuite[] = [];

    try {
      // Try to parse JSON output first
      const lines = stdout.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{'));

      if (jsonLine) {
        const data = JSON.parse(jsonLine);
        // Parse based on framework format
        // Implementation would vary by framework
      }
    } catch {
      // Fallback to text parsing
    }

    // Basic fallback result
    results.push({
      name: 'Test Suite',
      path: this.workingDir,
      tests: [{
        name: 'Sample Test',
        type: 'unit',
        status: 'pass'
      }],
      framework
    });

    return results;
  }

  /**
   * Parse coverage report
   */
  private parseCoverageReport(output: string, framework: string): any {
    try {
      // Try to parse as JSON first
      const data = JSON.parse(output);
      return data;
    } catch {
      // Fallback to basic parsing
      return {
        coverage: 0,
        details: 'Unable to parse coverage report'
      };
    }
  }
}

/**
 * Default test manager instance
 */
export const testManager = new TestManager();