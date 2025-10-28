/**
 * Test Generator
 *
 * Provides automated test generation capabilities for various testing frameworks.
 * Generates unit tests, integration tests, and test strategies.
 */

import { logger } from '../utils/logger.js';
import { getPerformanceConfig } from '../config/performance.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';
import * as path from 'path';

export interface TestGenerationRequest {
  target: {
    file: string;
    functions?: string[];
    classes?: string[];
    entireFile?: boolean;
  };
  framework: TestFramework;
  testTypes: TestType[];
  options: TestGenerationOptions;
}

export type TestFramework = 'jest' | 'mocha' | 'vitest' | 'jasmine' | 'cypress' | 'playwright' | 'auto';

export type TestType = 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'accessibility';

export interface TestGenerationOptions {
  coverage: 'basic' | 'comprehensive' | 'extensive';
  mockExternal: boolean;
  includeEdgeCases: boolean;
  generatePropertyTests: boolean;
  asyncSupport: boolean;
  errorHandling: boolean;
  performanceTests: boolean;
}

export interface GeneratedTest {
  testFile: string;
  content: string;
  framework: TestFramework;
  testType: TestType;
  coverage: {
    functions: string[];
    branches: string[];
    statements: number;
    expectedCoverage: number;
  };
  dependencies: string[];
  setupRequired: string[];
  description: string;
}

export interface TestStrategy {
  recommendedFramework: TestFramework;
  testPyramid: {
    unit: number;
    integration: number;
    e2e: number;
  };
  coverage: {
    target: number;
    critical: string[];
    optional: string[];
  };
  priority: Array<{
    file: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  setupInstructions: string[];
  recommendations: string[];
}

export interface TestSuite {
  name: string;
  tests: GeneratedTest[];
  strategy: TestStrategy;
  setupFiles: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  configFiles: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  totalCoverage: number;
  estimatedRuntime: string;
}

export class TestGenerator {
  private config = getPerformanceConfig();

  /**
   * Generate comprehensive test suite for codebase
   */
  async generateTestSuite(
    files: Array<{ path: string; content: string; type: string }>,
    options: {
      framework?: TestFramework;
      testTypes?: TestType[];
      coverage?: 'basic' | 'comprehensive' | 'extensive';
    } = {}
  ): Promise<TestSuite> {
    try {
      logger.info('Generating test suite', { fileCount: files.length, options });

      const framework = options.framework || this.detectOptimalFramework(files);
      const testTypes = options.testTypes || ['unit', 'integration'];
      const coverage = options.coverage || 'comprehensive';

      const strategy = await this.generateTestStrategy(files, framework);
      const tests: GeneratedTest[] = [];

      for (const file of files) {
        if (this.shouldGenerateTestsFor(file)) {
          const fileTests = await this.generateTestsForFile(file, {
            framework,
            testTypes,
            coverage
          });
          tests.push(...fileTests);
        }
      }

      const setupFiles = await this.generateSetupFiles(framework, tests);
      const configFiles = await this.generateConfigFiles(framework, tests);

      const totalCoverage = this.calculateExpectedCoverage(tests);

      return {
        name: `Test Suite (${framework})`,
        tests,
        strategy,
        setupFiles,
        configFiles,
        totalCoverage,
        estimatedRuntime: this.estimateRuntime(tests)
      };
    } catch (error) {
      logger.error('Test suite generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate tests for a specific file
   */
  async generateTestsForFile(
    file: { path: string; content: string; type: string },
    options: {
      framework: TestFramework;
      testTypes: TestType[];
      coverage: 'basic' | 'comprehensive' | 'extensive';
    }
  ): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];

    const analysis = this.analyzeFileForTesting(file);

    for (const testType of options.testTypes) {
      if (testType === 'unit') {
        tests.push(...await this.generateUnitTests(file, analysis, options));
      } else if (testType === 'integration') {
        tests.push(...await this.generateIntegrationTests(file, analysis, options));
      } else if (testType === 'e2e' && this.isE2ECandidate(file)) {
        tests.push(...await this.generateE2ETests(file, analysis, options));
      }
    }

    return tests;
  }

  /**
   * Generate unit tests
   */
  private async generateUnitTests(
    file: { path: string; content: string; type: string },
    analysis: FileAnalysis,
    options: { framework: TestFramework; coverage: string }
  ): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];

    for (const func of analysis.functions) {
      const testContent = this.generateUnitTestContent(func, options.framework, file);

      tests.push({
        testFile: this.getTestFilePath(file.path, 'unit', options.framework),
        content: testContent,
        framework: options.framework,
        testType: 'unit',
        coverage: {
          functions: [func.name],
          branches: func.branches,
          statements: func.statements,
          expectedCoverage: this.config.codeAnalysis.testing.coverageTarget || 85
        },
        dependencies: this.extractDependencies(file),
        setupRequired: ['Mock external dependencies', 'Setup test environment'],
        description: `Unit tests for ${func.name} function`
      });
    }

    for (const cls of analysis.classes) {
      const testContent = this.generateClassTestContent(cls, options.framework, file);

      tests.push({
        testFile: this.getTestFilePath(file.path, 'unit', options.framework),
        content: testContent,
        framework: options.framework,
        testType: 'unit',
        coverage: {
          functions: cls.methods,
          branches: cls.branches,
          statements: cls.statements,
          expectedCoverage: this.config.codeAnalysis.testing.coverageTarget
        },
        dependencies: this.extractDependencies(file),
        setupRequired: ['Mock dependencies', 'Setup class instances'],
        description: `Unit tests for ${cls.name} class`
      });
    }

    return tests;
  }

  /**
   * Generate unit test content for a function
   */
  private generateUnitTestContent(
    func: FunctionAnalysis,
    framework: TestFramework,
    file: { path: string; content: string; type: string }
  ): string {
    const testName = `${func.name}.test.${this.getFileExtension(framework)}`;
    const modulePath = this.getRelativeImportPath(file.path);

    if (framework === 'jest') {
      return this.generateJestTest(func, modulePath);
    } else if (framework === 'mocha') {
      return this.generateMochaTest(func, modulePath);
    } else if (framework === 'vitest') {
      return this.generateVitestTest(func, modulePath);
    } else {
      return this.generateGenericTest(func, modulePath);
    }
  }

  /**
   * Framework-specific test generators
   */
  private generateJestTest(func: FunctionAnalysis, modulePath: string): string {
    const imports = `import { ${func.name} } from '${modulePath}';`;
    const mocks = func.dependencies.map(dep => `jest.mock('${dep}');`).join('\n');

    return `${imports}
${mocks}

describe('${func.name}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle normal case', () => {
    // Arrange
    const input = ${this.generateSampleInput(func)};
    const expected = ${this.generateExpectedOutput(func)};

    // Act
    const result = ${func.name}(input);

    // Assert
    expect(result).toEqual(expected);
  });

  it('should handle edge cases', () => {
    // Test edge cases
    ${this.generateEdgeCaseTests(func)}
  });

  ${func.isAsync ? this.generateAsyncTests(func) : ''}

  ${func.canThrow ? this.generateErrorTests(func) : ''}
});
`;
  }

  private generateMochaTest(func: FunctionAnalysis, modulePath: string): string {
    return `const { expect } = require('chai');
const { ${func.name} } = require('${modulePath}');

describe('${func.name}', () => {
  it('should handle normal case', () => {
    const input = ${this.generateSampleInput(func)};
    const expected = ${this.generateExpectedOutput(func)};

    const result = ${func.name}(input);

    expect(result).to.equal(expected);
  });

  it('should handle edge cases', () => {
    ${this.generateEdgeCaseTests(func)}
  });
});
`;
  }

  private generateVitestTest(func: FunctionAnalysis, modulePath: string): string {
    return `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${func.name} } from '${modulePath}';

describe('${func.name}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle normal case', () => {
    const input = ${this.generateSampleInput(func)};
    const expected = ${this.generateExpectedOutput(func)};

    const result = ${func.name}(input);

    expect(result).toEqual(expected);
  });
});
`;
  }

  private generateGenericTest(func: FunctionAnalysis, modulePath: string): string {
    return `// Generic test template for ${func.name}
// TODO: Adapt for your testing framework

function test_${func.name}() {
  const input = ${this.generateSampleInput(func)};
  const expected = ${this.generateExpectedOutput(func)};

  const result = ${func.name}(input);

  assert(result === expected, 'Function should return expected value');
}
`;
  }

  /**
   * Generate integration tests
   */
  private async generateIntegrationTests(
    file: { path: string; content: string; type: string },
    analysis: FileAnalysis,
    options: { framework: TestFramework; coverage: string }
  ): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];

    if (analysis.hasExternalDependencies) {
      const testContent = this.generateIntegrationTestContent(file, analysis, options.framework);

      tests.push({
        testFile: this.getTestFilePath(file.path, 'integration', options.framework),
        content: testContent,
        framework: options.framework,
        testType: 'integration',
        coverage: {
          functions: analysis.functions.map(f => f.name),
          branches: [],
          statements: 0,
          expectedCoverage: this.config.codeAnalysis.testing.coverageTarget * 0.875
        },
        dependencies: analysis.externalDependencies,
        setupRequired: ['Database setup', 'API mocking', 'Environment configuration'],
        description: `Integration tests for ${path.basename(file.path)}`
      });
    }

    return tests;
  }

  private generateIntegrationTestContent(
    file: { path: string; content: string; type: string },
    analysis: FileAnalysis,
    framework: TestFramework
  ): string {
    return `// Integration tests for ${path.basename(file.path)}
// Tests interaction between components and external dependencies

describe('${path.basename(file.path)} Integration', () => {
  beforeAll(async () => {
    // Setup test environment
    // Initialize database connections
    // Start mock servers
  });

  afterAll(async () => {
    // Cleanup test environment
    // Close database connections
    // Stop mock servers
  });

  it('should integrate with external services', async () => {
    // Test external API calls
    // Test database operations
    // Test file system operations
  });

  it('should handle service failures gracefully', async () => {
    // Test error scenarios
    // Test fallback mechanisms
    // Test retry logic
  });
});
`;
  }

  /**
   * Generate E2E tests
   */
  private async generateE2ETests(
    file: { path: string; content: string; type: string },
    analysis: FileAnalysis,
    options: { framework: TestFramework; coverage: string }
  ): Promise<GeneratedTest[]> {
    if (!this.isE2ECandidate(file)) {
      return [];
    }

    const framework = this.detectE2EFramework(options.framework);
    const testContent = this.generateE2ETestContent(file, framework);

    return [{
      testFile: this.getTestFilePath(file.path, 'e2e', framework),
      content: testContent,
      framework: framework,
      testType: 'e2e',
      coverage: {
        functions: [],
        branches: [],
        statements: 0,
        expectedCoverage: this.config.codeAnalysis.testing.coverageTarget * 0.75
      },
      dependencies: ['browser', 'test-server'],
      setupRequired: ['Start application', 'Setup test data', 'Configure browser'],
      description: `End-to-end tests for ${path.basename(file.path)}`
    }];
  }

  private generateE2ETestContent(file: { path: string; content: string; type: string }, framework: TestFramework): string {
    if (framework === 'cypress') {
      return this.generateCypressTest(file);
    } else if (framework === 'playwright') {
      return this.generatePlaywrightTest(file);
    }
    return '';
  }

  private generateCypressTest(file: { path: string; content: string; type: string }): string {
    return `describe('${path.basename(file.path)} E2E', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should complete user workflow', () => {
    // User interaction tests
    cy.get('[data-testid="submit"]').click();
    cy.url().should('include', '/success');
  });

  it('should handle error scenarios', () => {
    // Error handling tests
    cy.get('[data-testid="error-trigger"]').click();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });
});
`;
  }

  private generatePlaywrightTest(file: { path: string; content: string; type: string }): string {
    return `import { test, expect } from '@playwright/test';

test.describe('${path.basename(file.path)} E2E', () => {
  test('should complete user workflow', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="submit"]');
    await expect(page).toHaveURL(/.*success/);
  });

  test('should handle error scenarios', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="error-trigger"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
`;
  }

  /**
   * Generate test strategy
   */
  private async generateTestStrategy(
    files: Array<{ path: string; content: string; type: string }>,
    framework: TestFramework
  ): Promise<TestStrategy> {
    const analysis = this.analyzeCodebaseForTesting(files);

    return {
      recommendedFramework: framework,
      testPyramid: {
        unit: 70,
        integration: 20,
        e2e: 10
      },
      coverage: {
        target: this.config.codeAnalysis.testing.coverageTarget,
        critical: analysis.criticalFiles,
        optional: analysis.optionalFiles
      },
      priority: this.prioritizeFiles(files),
      setupInstructions: this.generateSetupInstructions(framework),
      recommendations: this.generateTestingRecommendations(analysis)
    };
  }

  /**
   * Helper methods
   */
  private analyzeFileForTesting(file: { path: string; content: string; type: string }): FileAnalysis {
    const functions = this.extractFunctions(file.content);
    const classes = this.extractClasses(file.content);
    const dependencies = this.extractDependencies(file);

    return {
      functions,
      classes,
      dependencies,
      externalDependencies: dependencies.filter(dep => !dep.startsWith('.')),
      hasExternalDependencies: dependencies.some(dep => !dep.startsWith('.')),
      complexity: this.calculateComplexity(file.content),
      testability: this.assessTestability(file.content)
    };
  }

  private extractFunctions(content: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    const arrowFunctionPattern = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;

    let match;
    while ((match = functionPattern.exec(content)) !== null) {
      functions.push(this.analyzeFunctionSignature(match[1], match[2], content));
    }

    while ((match = arrowFunctionPattern.exec(content)) !== null) {
      functions.push(this.analyzeFunctionSignature(match[1], match[2], content));
    }

    return functions;
  }

  private analyzeFunctionSignature(name: string, params: string, content: string): FunctionAnalysis {
    return {
      name,
      parameters: params.split(',').map(p => p.trim()).filter(p => p),
      returnType: 'unknown',
      isAsync: content.includes(`async function ${name}`) || content.includes(`${name} = async`),
      canThrow: content.includes('throw') || content.includes('error'),
      dependencies: [],
      branches: [],
      statements: 10, // Simplified
      complexity: 5 // Simplified
    };
  }

  private extractClasses(content: string): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    const classPattern = /class\s+(\w+)/g;
    let match;

    while ((match = classPattern.exec(content)) !== null) {
      classes.push({
        name: match[1],
        methods: [],
        properties: [],
        branches: [],
        statements: 20,
        complexity: 8
      });
    }

    return classes;
  }

  private extractDependencies(file: { path: string; content: string; type: string }): string[] {
    const importPattern = /import.*from\s+['"]([^'"]+)['"]/g;
    const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const dependencies: string[] = [];

    let match;
    while ((match = importPattern.exec(file.content)) !== null) {
      dependencies.push(match[1]);
    }

    while ((match = requirePattern.exec(file.content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  private analyzeCodebaseForTesting(files: Array<{ path: string; content: string; type: string }>): CodebaseTestingAnalysis {
    return {
      criticalFiles: files.filter(f => this.isCriticalFile(f)).map(f => f.path),
      optionalFiles: files.filter(f => !this.isCriticalFile(f)).map(f => f.path),
      complexity: 'medium',
      testingChallenges: ['External dependencies', 'Async operations', 'Complex business logic']
    };
  }

  private isCriticalFile(file: { path: string; content: string; type: string }): boolean {
    return file.path.includes('core') ||
           file.path.includes('main') ||
           file.path.includes('index') ||
           file.content.includes('export default');
  }

  private shouldGenerateTestsFor(file: { path: string; content: string; type: string }): boolean {
    return !file.path.includes('test') &&
           !file.path.includes('spec') &&
           (file.type === 'typescript' || file.type === 'javascript');
  }

  private detectOptimalFramework(files: Array<{ path: string; content: string; type: string }>): TestFramework {
    // Check for existing test framework usage
    for (const file of files) {
      if (file.content.includes('jest')) return 'jest';
      if (file.content.includes('vitest')) return 'vitest';
      if (file.content.includes('mocha')) return 'mocha';
    }

    // Default recommendation based on project type
    const hasTypeScript = files.some(f => f.path.endsWith('.ts'));
    return hasTypeScript ? 'vitest' : 'jest';
  }

  private isE2ECandidate(file: { path: string; content: string; type: string }): boolean {
    return file.path.includes('page') ||
           file.path.includes('component') ||
           file.content.includes('render') ||
           file.content.includes('router');
  }

  private detectE2EFramework(framework: TestFramework): TestFramework {
    return framework === 'cypress' || framework === 'playwright' ? framework : 'playwright';
  }

  // Additional helper methods with simplified implementations
  private generateSampleInput(func: FunctionAnalysis): string {
    return func.parameters.length > 0 ? `{ /* sample input */ }` : '';
  }

  private generateExpectedOutput(func: FunctionAnalysis): string {
    return '/* expected output */';
  }

  private generateEdgeCaseTests(func: FunctionAnalysis): string {
    return '// TODO: Add edge case tests';
  }

  private generateAsyncTests(func: FunctionAnalysis): string {
    return `
  it('should handle async operations', async () => {
    const result = await ${func.name}();
    expect(result).toBeDefined();
  });`;
  }

  private generateErrorTests(func: FunctionAnalysis): string {
    return `
  it('should handle errors appropriately', () => {
    expect(() => ${func.name}(invalidInput)).toThrow();
  });`;
  }

  private generateClassTestContent(cls: ClassAnalysis, framework: TestFramework, file: any): string {
    return `// Class tests for ${cls.name}`;
  }

  private getTestFilePath(filePath: string, testType: string, framework: TestFramework): string {
    const dir = path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    const ext = this.getFileExtension(framework);
    return path.join(dir, '__tests__', `${name}.${testType}.${ext}`);
  }

  private getFileExtension(framework: TestFramework): string {
    return framework === 'vitest' ? 'test.ts' : 'test.js';
  }

  private getRelativeImportPath(filePath: string): string {
    return '../' + path.basename(filePath, path.extname(filePath));
  }

  private calculateComplexity(content: string): number {
    return Math.min(content.split('\n').length / 10, 10);
  }

  private assessTestability(content: string): 'high' | 'medium' | 'low' {
    const hasExternalDeps = content.includes('import') && content.includes('from');
    const hasComplexLogic = content.includes('if') && content.includes('for');

    if (hasExternalDeps && hasComplexLogic) return 'low';
    if (hasExternalDeps || hasComplexLogic) return 'medium';
    return 'high';
  }

  private prioritizeFiles(files: Array<{ path: string; content: string; type: string }>): Array<{ file: string; priority: 'high' | 'medium' | 'low'; reason: string }> {
    return files.map(file => ({
      file: file.path,
      priority: this.isCriticalFile(file) ? 'high' : 'medium' as 'high' | 'medium' | 'low',
      reason: this.isCriticalFile(file) ? 'Critical business logic' : 'Supporting functionality'
    }));
  }

  private generateSetupInstructions(framework: TestFramework): string[] {
    const instructions = [`Install ${framework} testing framework`];

    if (framework === 'jest') {
      instructions.push('Configure jest.config.js', 'Setup test environment');
    } else if (framework === 'vitest') {
      instructions.push('Configure vitest.config.ts', 'Setup test utilities');
    }

    return instructions;
  }

  private generateTestingRecommendations(analysis: CodebaseTestingAnalysis): string[] {
    return [
      'Implement test-driven development (TDD) for new features',
      'Focus on high-coverage unit tests for critical business logic',
      'Use integration tests for external API interactions',
      'Implement automated test runs in CI/CD pipeline'
    ];
  }

  private async generateSetupFiles(framework: TestFramework, tests: GeneratedTest[]): Promise<Array<{ path: string; content: string; description: string }>> {
    return [{
      path: `tests/setup.${framework === 'vitest' ? 'ts' : 'js'}`,
      content: this.generateSetupFileContent(framework),
      description: 'Test environment setup and global configuration'
    }];
  }

  private generateSetupFileContent(framework: TestFramework): string {
    if (framework === 'jest') {
      return `// Jest setup file
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
`;
    }
    return '// Test setup file\n';
  }

  private async generateConfigFiles(framework: TestFramework, tests: GeneratedTest[]): Promise<Array<{ path: string; content: string; description: string }>> {
    return [{
      path: this.getConfigFileName(framework),
      content: this.generateConfigFileContent(framework),
      description: `${framework} configuration file`
    }];
  }

  private getConfigFileName(framework: TestFramework): string {
    if (framework === 'jest') return 'jest.config.js';
    if (framework === 'vitest') return 'vitest.config.ts';
    return `${framework}.config.js`;
  }

  private generateConfigFileContent(framework: TestFramework): string {
    if (framework === 'jest') {
      return `module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.test.{js,ts}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
`;
    }

    if (framework === 'vitest') {
      return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
`;
    }

    return '// Configuration file\n';
  }

  private calculateExpectedCoverage(tests: GeneratedTest[]): number {
    if (tests.length === 0) return 0;
    return tests.reduce((sum, test) => sum + test.coverage.expectedCoverage, 0) / tests.length;
  }

  private estimateRuntime(tests: GeneratedTest[]): string {
    const unitTests = tests.filter(t => t.testType === 'unit').length;
    const integrationTests = tests.filter(t => t.testType === 'integration').length;
    const e2eTests = tests.filter(t => t.testType === 'e2e').length;

    const totalMinutes = (unitTests * THRESHOLD_CONSTANTS.TEST_ESTIMATION.UNIT_TEST_TIME) +
                         (integrationTests * THRESHOLD_CONSTANTS.TEST_ESTIMATION.INTEGRATION_TEST_TIME) +
                         (e2eTests * THRESHOLD_CONSTANTS.TEST_ESTIMATION.E2E_TEST_TIME);

    if (totalMinutes < 1) return '< 1 minute';
    if (totalMinutes < 60) return `~${Math.ceil(totalMinutes)} minutes`;
    return `~${Math.ceil(totalMinutes / 60)} hours`;
  }
}

// Supporting interfaces
interface FileAnalysis {
  functions: FunctionAnalysis[];
  classes: ClassAnalysis[];
  dependencies: string[];
  externalDependencies: string[];
  hasExternalDependencies: boolean;
  complexity: number;
  testability: 'high' | 'medium' | 'low';
}

interface FunctionAnalysis {
  name: string;
  parameters: string[];
  returnType: string;
  isAsync: boolean;
  canThrow: boolean;
  dependencies: string[];
  branches: string[];
  statements: number;
  complexity: number;
}

interface ClassAnalysis {
  name: string;
  methods: string[];
  properties: string[];
  branches: string[];
  statements: number;
  complexity: number;
}

interface CodebaseTestingAnalysis {
  criticalFiles: string[];
  optionalFiles: string[];
  complexity: 'low' | 'medium' | 'high';
  testingChallenges: string[];
}