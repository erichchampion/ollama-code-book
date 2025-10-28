import { BaseTool, ToolResult, ToolExecutionContext, ToolMetadata } from './types.js';
import { normalizeError } from '../utils/error-utils.js';
import * as fs from 'fs';
import * as path from 'path';

export interface TestingToolOptions {
    framework?: 'jest' | 'mocha' | 'vitest' | 'auto';
    testType?: 'unit' | 'integration' | 'e2e' | 'all';
    coverage?: boolean;
    mockStrategy?: 'full' | 'minimal' | 'none';
    language?: 'typescript' | 'javascript' | 'auto';
    outputPath?: string;
}

export class AdvancedTestingTool extends BaseTool {
    metadata: ToolMetadata = {
        name: 'advanced-testing',
        description: 'Automated test generation, testing strategy recommendations, and comprehensive test analysis',
        category: 'testing',
        version: '1.0.0',
        parameters: [
            {
                name: 'operation',
                type: 'string',
                description: 'Testing operation to perform (generate, analyze, strategy, coverage, mocks, scaffold)',
                required: true
            },
            {
                name: 'target',
                type: 'string',
                description: 'File or directory path to analyze for testing. Use relative paths like "src/utils.ts" or "." for current directory. Omit this parameter entirely to analyze the working directory.',
                required: false
            },
            {
                name: 'options',
                type: 'object',
                description: 'Testing-specific options and configuration',
                required: false,
                default: {}
            }
        ],
        examples: [
            {
                description: 'Generate unit tests for a file',
                parameters: {
                    operation: 'generate',
                    target: 'src/utils.ts',
                    options: { testType: 'unit', framework: 'jest' }
                }
            },
            {
                description: 'Analyze testing strategy for project',
                parameters: {
                    operation: 'strategy',
                    options: { coverage: true }
                }
            },
            {
                description: 'Scaffold complete test suite',
                parameters: {
                    operation: 'scaffold',
                    options: { framework: 'jest', language: 'typescript' }
                }
            }
        ]
    };

    async execute(parameters: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
        try {
            const operation = parameters.operation as string;
            const target = parameters.target as string || context.workingDirectory;
            const options: TestingToolOptions = parameters.options || {};

            switch (operation.toLowerCase()) {
                case 'generate':
                    return await this.generateTests(target, context, options);
                case 'analyze':
                    return await this.analyzeTestability(target, context, options);
                case 'strategy':
                    return await this.recommendTestStrategy(target, context, options);
                case 'coverage':
                    return await this.analyzeCoverage(target, context, options);
                case 'mocks':
                    return await this.generateMocks(target, context, options);
                case 'scaffold':
                    return await this.scaffoldTestSuite(target, context, options);
                default:
                    return this.createErrorResult(`Unknown testing operation: ${operation}`);
            }
        } catch (error) {
            return this.createErrorResult(`Testing tool error: ${normalizeError(error).message}`);
        }
    }

    private async generateTests(target: string, context: ToolExecutionContext, options: TestingToolOptions): Promise<ToolResult> {
        const targetPath = path.resolve(context.workingDirectory, target);

        if (!fs.existsSync(targetPath)) {
            return this.createErrorResult(`Target file does not exist: ${targetPath}`);
        }

        const sourceCode = fs.readFileSync(targetPath, 'utf-8');
        const framework = options.framework || this.detectTestingFramework(context.workingDirectory);
        const language = options.language || this.detectLanguage(targetPath);

        const analysisResult = await this.analyzeSourceForTesting(sourceCode, targetPath, language);
        const testCases = this.generateTestCases(analysisResult, options);
        const testCode = this.generateTestCode(testCases, framework || 'jest', language);

        const testFilePath = this.getTestFilePath(targetPath, options.outputPath);

        const result = {
            testFile: testFilePath,
            testCases: testCases.length,
            framework: framework || 'jest',
            language,
            generatedCode: testCode,
            recommendations: this.generateTestRecommendations(analysisResult, options),
            coverage: this.calculateExpectedCoverage(analysisResult, testCases)
        };

        if (options.mockStrategy !== 'none') {
            (result as any).mockFiles = this.generateMockFiles(analysisResult, options);
        }

        return this.createSuccessResult('Tests generated successfully', result);
    }

    private async analyzeTestability(target: string, context: ToolExecutionContext, options: TestingToolOptions): Promise<ToolResult> {
        const targetPath = path.resolve(context.workingDirectory, target);

        if (!fs.existsSync(targetPath)) {
            return this.createErrorResult(`Target path does not exist: ${targetPath}`);
        }

        const isDirectory = fs.statSync(targetPath).isDirectory();
        const analysis = isDirectory ?
            await this.analyzeDirectoryTestability(targetPath) :
            await this.analyzeFileTestability(targetPath);

        const testabilityScore = this.calculateTestabilityScore(analysis);
        const improvements = this.suggestTestabilityImprovements(analysis);

        return this.createSuccessResult('Testability analysis completed', {
            score: testabilityScore,
            analysis,
            improvements,
            recommendations: [
                'Reduce function complexity for easier testing',
                'Consider dependency injection for better mockability',
                'Extract pure functions where possible',
                'Add more granular public interfaces'
            ]
        });
    }

    private async analyzeFileTestability(filePath: string) {
        const sourceCode = fs.readFileSync(filePath, 'utf-8');
        const language = this.detectLanguage(filePath);

        return await this.analyzeSourceForTesting(sourceCode, filePath, language);
    }

    private async analyzeDirectoryTestability(dirPath: string) {
        const codeFiles = this.getCodeFiles(dirPath);
        const testFiles = this.getTestFiles(dirPath);

        let totalComplexity = 0;
        let totalFunctions = 0;
        let totalClasses = 0;
        let totalDependencies = new Set<string>();

        for (const file of codeFiles.slice(0, 20)) { // Limit for performance
            try {
                const analysis = await this.analyzeFileTestability(file);
                totalComplexity += analysis.complexity || 0;
                totalFunctions += analysis.functions?.length || 0;
                totalClasses += analysis.classes?.length || 0;
                analysis.dependencies?.forEach(dep => totalDependencies.add(dep));
            } catch (error) {
                // Continue with other files
            }
        }

        return {
            totalFiles: codeFiles.length,
            testFiles: testFiles.length,
            testCoverage: codeFiles.length > 0 ? (testFiles.length / codeFiles.length) * 100 : 0,
            averageComplexity: totalFunctions > 0 ? totalComplexity / totalFunctions : 0,
            totalFunctions,
            totalClasses,
            uniqueDependencies: totalDependencies.size,
            testingFramework: this.detectTestingFramework(dirPath)
        };
    }

    private async recommendTestStrategy(target: string, context: ToolExecutionContext, options: TestingToolOptions): Promise<ToolResult> {
        const targetPath = path.resolve(context.workingDirectory, target);
        const projectStructure = await this.analyzeProjectStructure(targetPath);
        const existingTests = await this.analyzeExistingTests(targetPath);
        const framework = this.detectTestingFramework(targetPath);

        const strategy = {
            recommended_framework: framework || 'jest',
            test_structure: this.recommendTestStructure(projectStructure),
            coverage_targets: this.recommendCoverageTargets(projectStructure),
            testing_priorities: this.prioritizeTestingEfforts(projectStructure),
            automation_strategy: this.recommendAutomationStrategy(projectStructure),
            performance_testing: this.recommendPerformanceTestStrategy(projectStructure)
        };

        return this.createSuccessResult('Testing strategy recommended', {
            strategy,
            current_state: {
                existing_tests: existingTests.testFiles.length,
                coverage: existingTests.estimatedCoverage,
                framework: framework || 'none detected'
            },
            next_steps: [
                'Set up testing framework if not present',
                'Create test structure following recommended patterns',
                'Implement unit tests for core business logic',
                'Add integration tests for critical workflows',
                'Set up continuous integration testing'
            ]
        });
    }

    private async analyzeCoverage(target: string, context: ToolExecutionContext, options: TestingToolOptions): Promise<ToolResult> {
        const targetPath = path.resolve(context.workingDirectory, target);
        const coverageData = await this.collectCoverageData(targetPath);
        const gaps = this.identifyCoverageGaps(coverageData);
        const recommendations = this.generateCoverageRecommendations(gaps);

        return this.createSuccessResult('Coverage analysis completed', {
            overall_coverage: coverageData.overall,
            by_type: coverageData.byType,
            critical_gaps: gaps.critical,
            recommended_targets: recommendations.targets,
            improvement_plan: recommendations.plan
        });
    }

    private async generateMocks(target: string, context: ToolExecutionContext, options: TestingToolOptions): Promise<ToolResult> {
        const targetPath = path.resolve(context.workingDirectory, target);

        if (!fs.existsSync(targetPath)) {
            return this.createErrorResult(`Target file does not exist: ${targetPath}`);
        }

        const sourceCode = fs.readFileSync(targetPath, 'utf-8');
        const analysis = await this.analyzeSourceForTesting(sourceCode, targetPath, options.language || 'typescript');

        const mocks = this.generateMockDefinitions(analysis, options);
        const mockCode = this.generateMockImplementations(mocks, options.framework || 'jest');

        return this.createSuccessResult('Mocks generated successfully', {
            mocks,
            mockCode,
            usage_examples: this.generateMockUsageExamples(mocks)
        });
    }

    private async scaffoldTestSuite(target: string, context: ToolExecutionContext, options: TestingToolOptions): Promise<ToolResult> {
        const targetPath = path.resolve(context.workingDirectory, target);
        const projectStructure = await this.analyzeProjectStructure(targetPath);
        const framework = options.framework || this.detectTestingFramework(targetPath) || 'jest';

        const scaffolding = {
            structure: this.createTestDirectoryStructure(projectStructure),
            config_files: this.generateTestConfigFiles(framework, options),
            helper_files: this.generateTestHelpers(framework),
            example_tests: this.generateExampleTests(framework, projectStructure)
        };

        return this.createSuccessResult('Test suite scaffolded', {
            framework,
            structure: scaffolding.structure,
            files_created: Object.keys(scaffolding.config_files).length + Object.keys(scaffolding.helper_files).length,
            next_steps: [
                'Review generated test configuration',
                'Customize test helpers for your needs',
                'Run example tests to verify setup',
                'Begin implementing actual test cases'
            ]
        });
    }

    private async analyzeSourceForTesting(sourceCode: string, filePath: string, language: string) {
        const ast = this.parseSourceCode(sourceCode, language);

        return {
            functions: this.extractFunctions(ast),
            classes: this.extractClasses(ast),
            dependencies: this.extractDependencies(ast),
            complexity: this.calculateComplexity(ast),
            cyclomaticComplexity: this.calculateCyclomaticComplexity(ast),
            publicApi: this.extractPublicApi(ast),
            sideEffects: this.identifySideEffects(ast),
            asyncOperations: this.identifyAsyncOperations(ast)
        };
    }

    private parseSourceCode(sourceCode: string, language: string) {
        try {
            if (language === 'typescript' || language === 'javascript') {
                return this.parseJavaScriptTypeScript(sourceCode);
            }
            return { type: 'unknown', body: [] };
        } catch (error) {
            return { type: 'error', body: [], error: normalizeError(error).message };
        }
    }

    private parseJavaScriptTypeScript(sourceCode: string) {
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g;
        const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?\s*{/g;
        const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;

        const functions = [];
        const classes = [];
        const imports = [];

        let match;
        while ((match = functionRegex.exec(sourceCode)) !== null) {
            functions.push({
                name: match[1],
                type: 'function',
                visibility: sourceCode.includes(`export`) ? 'public' : 'private'
            });
        }

        while ((match = classRegex.exec(sourceCode)) !== null) {
            classes.push({
                name: match[1],
                type: 'class',
                visibility: sourceCode.includes(`export`) ? 'public' : 'private'
            });
        }

        while ((match = importRegex.exec(sourceCode)) !== null) {
            imports.push(match[1]);
        }

        return {
            type: 'javascript/typescript',
            functions,
            classes,
            imports,
            body: sourceCode.split('\n')
        };
    }

    private extractFunctions(ast: any): any[] {
        return ast.functions || [];
    }

    private extractClasses(ast: any): any[] {
        return ast.classes || [];
    }

    private extractDependencies(ast: any): string[] {
        return ast.imports || [];
    }

    private calculateComplexity(ast: any): number {
        const lines = ast.body?.length || 0;
        const functions = ast.functions?.length || 0;
        const classes = ast.classes?.length || 0;

        return Math.min(10, Math.max(1, Math.floor((lines + functions * 2 + classes * 3) / 50)));
    }

    private calculateCyclomaticComplexity(ast: any): number {
        const sourceCode = ast.body?.join('\n') || '';
        const conditionals = (sourceCode.match(/\b(if|while|for|case|catch)\b/g) || []).length;
        const logicalOperators = (sourceCode.match(/(\|\||&&)/g) || []).length;

        return conditionals + logicalOperators + 1;
    }

    private extractPublicApi(ast: any): any[] {
        const functions = ast.functions?.filter((f: any) => f.visibility === 'public') || [];
        const classes = ast.classes?.filter((c: any) => c.visibility === 'public') || [];

        return [...functions, ...classes];
    }

    private identifySideEffects(ast: any): string[] {
        const sourceCode = ast.body?.join('\n') || '';
        const sideEffects = [];

        if (sourceCode.includes('console.')) sideEffects.push('console output');
        if (sourceCode.includes('fs.') || sourceCode.includes('readFile') || sourceCode.includes('writeFile')) sideEffects.push('file system');
        if (sourceCode.includes('fetch') || sourceCode.includes('axios') || sourceCode.includes('http')) sideEffects.push('network requests');
        if (sourceCode.includes('localStorage') || sourceCode.includes('sessionStorage')) sideEffects.push('browser storage');
        if (sourceCode.includes('Math.random') || sourceCode.includes('Date.now')) sideEffects.push('non-deterministic values');

        return sideEffects;
    }

    private identifyAsyncOperations(ast: any): string[] {
        const sourceCode = ast.body?.join('\n') || '';
        const asyncOps = [];

        if (sourceCode.includes('async') || sourceCode.includes('await')) asyncOps.push('async/await');
        if (sourceCode.includes('Promise')) asyncOps.push('promises');
        if (sourceCode.includes('setTimeout') || sourceCode.includes('setInterval')) asyncOps.push('timers');
        if (sourceCode.includes('fetch') || sourceCode.includes('axios')) asyncOps.push('network requests');

        return asyncOps;
    }

    private generateTestCases(analysis: any, options: TestingToolOptions) {
        const testCases = [];

        analysis.functions?.forEach((func: any) => {
            testCases.push({
                description: `should test ${func.name} with valid inputs`,
                type: 'unit',
                code: this.generateUnitTestCode(func, 'valid'),
                dependencies: analysis.dependencies,
                mocks: this.generateMocksForFunction(func, analysis.dependencies)
            });

            testCases.push({
                description: `should test ${func.name} with invalid inputs`,
                type: 'unit',
                code: this.generateUnitTestCode(func, 'invalid'),
                dependencies: analysis.dependencies,
                mocks: this.generateMocksForFunction(func, analysis.dependencies)
            });
        });

        analysis.classes?.forEach((cls: any) => {
            testCases.push({
                description: `should instantiate ${cls.name} correctly`,
                type: 'unit',
                code: this.generateClassTestCode(cls, 'instantiation'),
                dependencies: analysis.dependencies,
                mocks: this.generateMocksForClass(cls, analysis.dependencies)
            });
        });

        if (options.testType === 'integration' || options.testType === 'all') {
            testCases.push({
                description: 'should test component integration',
                type: 'integration',
                code: this.generateIntegrationTestCode(analysis),
                dependencies: analysis.dependencies,
                mocks: []
            });
        }

        return testCases;
    }

    private generateUnitTestCode(func: any, scenario: string): string {
        const testName = `${func.name} - ${scenario} scenario`;
        return `
describe('${func.name}', () => {
  it('${testName}', () => {
    // Arrange
    const input = ${scenario === 'valid' ? '/* valid input */' : '/* invalid input */'};

    // Act
    const result = ${func.name}(input);

    // Assert
    expect(result).${scenario === 'valid' ? 'toBeDefined()' : 'toThrow()'};
  });
});`;
    }

    private generateClassTestCode(cls: any, scenario: string): string {
        return `
describe('${cls.name}', () => {
  it('should ${scenario}', () => {
    // Arrange & Act
    const instance = new ${cls.name}();

    // Assert
    expect(instance).toBeInstanceOf(${cls.name});
  });
});`;
    }

    private generateIntegrationTestCode(analysis: any): string {
        return `
describe('Integration Tests', () => {
  it('should integrate components correctly', async () => {
    // Arrange
    const testData = {};

    // Act
    const result = await integrationTestFunction(testData);

    // Assert
    expect(result).toBeDefined();
  });
});`;
    }

    private generateMocksForFunction(func: any, dependencies: string[]) {
        return dependencies.map(dep => ({
            target: dep,
            type: 'module',
            implementation: `jest.mock('${dep}');`
        }));
    }

    private generateMocksForClass(cls: any, dependencies: string[]) {
        return dependencies.map(dep => ({
            target: dep,
            type: 'class',
            implementation: `jest.mock('${dep}');`
        }));
    }

    private generateTestCode(testCases: any[], framework: string, language: string): string {
        const imports = this.generateTestImports(framework, language);
        const testCode = testCases.map(tc => tc.code).join('\n\n');

        return `${imports}\n\n${testCode}`;
    }

    private generateTestImports(framework: string, language: string): string {
        if (framework === 'jest') {
            return language === 'typescript'
                ? "import { describe, it, expect, jest } from '@jest/globals';"
                : "const { describe, it, expect, jest } = require('@jest/globals');";
        }
        return '';
    }

    private calculateTestabilityScore(analysis: any): number {
        let score = 100;

        if (analysis.complexity > 7) score -= 20;
        if (analysis.cyclomaticComplexity > 10) score -= 15;
        if (analysis.dependencies?.length > 5) score -= 10;
        if (analysis.sideEffects?.length > 2) score -= 15;
        if (analysis.publicApi?.length === 0) score -= 20;

        return Math.max(0, score);
    }

    private suggestTestabilityImprovements(analysis: any): string[] {
        const improvements = [];

        if (analysis.complexity > 7) {
            improvements.push('Reduce function complexity by breaking down large functions');
        }
        if (analysis.cyclomaticComplexity > 10) {
            improvements.push('Simplify conditional logic and reduce branching');
        }
        if (analysis.dependencies?.length > 5) {
            improvements.push('Consider dependency injection to reduce coupling');
        }
        if (analysis.sideEffects?.length > 2) {
            improvements.push('Extract side effects to make functions more pure');
        }
        if (analysis.publicApi?.length === 0) {
            improvements.push('Expose testable public interfaces');
        }

        return improvements;
    }

    private async analyzeProjectStructure(workingDir: string) {
        const structure = {
            sourceFiles: [] as string[],
            testFiles: [] as string[],
            configFiles: [] as string[],
            packageManager: 'npm'
        };

        try {
            const files = this.getAllFiles(workingDir);

            files.forEach(file => {
                if (file.endsWith('.test.js') || file.endsWith('.test.ts') || file.endsWith('.spec.js') || file.endsWith('.spec.ts')) {
                    structure.testFiles.push(file);
                } else if (file.endsWith('.js') || file.endsWith('.ts')) {
                    structure.sourceFiles.push(file);
                } else if (file.includes('config') || file.includes('.json')) {
                    structure.configFiles.push(file);
                }
            });

            if (fs.existsSync(path.join(workingDir, 'yarn.lock'))) {
                structure.packageManager = 'yarn';
            } else if (fs.existsSync(path.join(workingDir, 'pnpm-lock.yaml'))) {
                structure.packageManager = 'pnpm';
            }
        } catch (error) {
            // Handle errors silently
        }

        return structure;
    }

    private async analyzeExistingTests(workingDir: string) {
        const structure = await this.analyzeProjectStructure(workingDir);

        return {
            testFiles: structure.testFiles,
            estimatedCoverage: structure.testFiles.length > 0 ? Math.min(80, structure.testFiles.length * 10) : 0,
            framework: this.detectTestingFramework(workingDir)
        };
    }

    private recommendTestStructure(projectStructure: any) {
        return {
            pattern: 'co-located',
            directories: ['__tests__', 'test', 'tests'],
            naming: '*.test.{js,ts}',
            organization: 'by-feature'
        };
    }

    private recommendCoverageTargets(projectStructure: any) {
        return {
            unit: 80,
            integration: 60,
            e2e: 40,
            overall: 75
        };
    }

    private prioritizeTestingEfforts(projectStructure: any) {
        return [
            'Core business logic functions',
            'Public API endpoints',
            'Data transformation utilities',
            'Error handling paths',
            'Integration points'
        ];
    }

    private recommendAutomationStrategy(projectStructure: any) {
        return {
            ci_integration: true,
            pre_commit_hooks: true,
            coverage_reporting: true,
            automated_test_generation: false
        };
    }

    private recommendPerformanceTestStrategy(projectStructure: any) {
        return {
            load_testing: projectStructure.sourceFiles.some((f: string) => f.includes('server') || f.includes('api')),
            benchmarking: true,
            memory_profiling: false
        };
    }

    private async collectCoverageData(workingDir: string) {
        return {
            overall: 0,
            byType: {
                unit: 0,
                integration: 0,
                e2e: 0
            }
        };
    }

    private identifyCoverageGaps(coverageData: any) {
        return {
            critical: [],
            medium: [],
            low: []
        };
    }

    private generateCoverageRecommendations(gaps: any) {
        return {
            targets: {
                unit: 80,
                integration: 60,
                overall: 75
            },
            plan: [
                'Focus on unit testing core business logic',
                'Add integration tests for critical workflows',
                'Implement end-to-end tests for user journeys'
            ]
        };
    }

    private generateMockDefinitions(analysis: any, options: TestingToolOptions) {
        const mocks: any[] = [];

        analysis.dependencies?.forEach((dep: string) => {
            mocks.push({
                target: dep,
                type: 'module',
                implementation: `jest.mock('${dep}');`
            });
        });

        return mocks;
    }

    private generateMockImplementations(mocks: any[], framework: string): string {
        return mocks.map(mock => mock.implementation).join('\n');
    }

    private generateMockUsageExamples(mocks: any[]): string[] {
        return mocks.map(mock => `// Mock ${mock.target}\n${mock.implementation}`);
    }

    private createTestDirectoryStructure(projectStructure: any) {
        return {
            'tests/unit': 'Unit test files',
            'tests/integration': 'Integration test files',
            'tests/e2e': 'End-to-end test files',
            'tests/fixtures': 'Test data and fixtures',
            'tests/helpers': 'Test utility functions'
        };
    }

    private generateTestConfigFiles(framework: string, options: TestingToolOptions) {
        const configs: { [key: string]: string } = {};

        if (framework === 'jest') {
            configs['jest.config.js'] = `module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  testMatch: [
    '**/__tests__/**/*.(js|ts)',
    '**/*.(test|spec).(js|ts)'
  ]
};`;
        }

        return configs;
    }

    private generateTestHelpers(framework: string) {
        const helpers: { [key: string]: string } = {};

        helpers['tests/helpers/test-utils.js'] = `
export const createMockData = (overrides = {}) => ({
  id: 1,
  name: 'Test Item',
  ...overrides
});

export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const mockConsole = () => {
  const originalConsole = console;
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();

  return () => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  };
};
`;

        return helpers;
    }

    private generateExampleTests(framework: string, projectStructure: any) {
        const examples: { [key: string]: string } = {};

        examples['tests/examples/example.test.js'] = `
describe('Example Test Suite', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should demonstrate basic testing patterns', () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = processInput(input);

    // Assert
    expect(result).toBeDefined();
  });

  it('should test async operations', async () => {
    // Arrange
    const asyncData = Promise.resolve('async result');

    // Act
    const result = await asyncData;

    // Assert
    expect(result).toBe('async result');
  });
});
`;

        return examples;
    }

    private generateTestRecommendations(analysisResult: any, options: TestingToolOptions): string[] {
        const recommendations = [];

        if (analysisResult.asyncOperations?.length > 0) {
            recommendations.push('Consider using async/await testing patterns for asynchronous code');
        }
        if (analysisResult.sideEffects?.includes('network requests')) {
            recommendations.push('Mock external API calls to ensure test reliability');
        }
        if (analysisResult.sideEffects?.includes('file system')) {
            recommendations.push('Use temporary files or mock file system operations');
        }
        if (analysisResult.complexity > 5) {
            recommendations.push('Focus on testing critical paths and edge cases');
        }

        return recommendations;
    }

    private calculateExpectedCoverage(analysisResult: any, testCases: any[]) {
        const functionCoverage = testCases.filter(tc => tc.type === 'unit').length / (analysisResult.functions?.length || 1);
        const expectedCoverage = Math.min(95, Math.max(60, functionCoverage * 100));

        return {
            expectedCoverage,
            criticalPaths: analysisResult.functions?.filter((f: any) => f.visibility === 'public').map((f: any) => f.name) || [],
            edgeCases: ['null inputs', 'empty arrays', 'boundary values', 'error conditions']
        };
    }

    private generateMockFiles(analysisResult: any, options: TestingToolOptions): string[] {
        return analysisResult.dependencies?.map((dep: string) => `mocks/${dep}.mock.js`) || [];
    }

    // Utility methods
    private getAllFiles(dirPath: string): string[] {
        const files: string[] = [];

        try {
            const items = fs.readdirSync(dirPath);

            for (const item of items) {
                if (item.startsWith('.') || item === 'node_modules') continue;

                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    files.push(...this.getAllFiles(fullPath));
                } else {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Handle errors silently
        }

        return files;
    }

    private getCodeFiles(dirPath: string): string[] {
        const codeExtensions = ['.js', '.ts', '.jsx', '.tsx'];
        return this.getAllFiles(dirPath).filter(file =>
            codeExtensions.includes(path.extname(file).toLowerCase())
        );
    }

    private getTestFiles(dirPath: string): string[] {
        return this.getAllFiles(dirPath).filter(file =>
            file.includes('.test.') ||
            file.includes('.spec.') ||
            file.includes('__tests__')
        );
    }

    private detectTestingFramework(workingDir: string): string | null {
        const packageJsonPath = path.join(workingDir, 'package.json');

        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

                if (deps.jest) return 'jest';
                if (deps.mocha) return 'mocha';
                if (deps.vitest) return 'vitest';
            } catch (error) {
                // Handle JSON parsing errors
            }
        }

        return null;
    }

    private detectLanguage(filePath: string): string {
        const ext = path.extname(filePath);
        if (ext === '.ts' || ext === '.tsx') return 'typescript';
        if (ext === '.js' || ext === '.jsx') return 'javascript';
        return 'javascript';
    }

    private getTestFilePath(sourcePath: string, outputPath?: string): string {
        const dir = outputPath || path.dirname(sourcePath);
        const name = path.basename(sourcePath, path.extname(sourcePath));
        const ext = this.detectLanguage(sourcePath) === 'typescript' ? '.test.ts' : '.test.js';

        return path.join(dir, `${name}${ext}`);
    }

    private createSuccessResult(message: string, data: any): ToolResult {
        return {
            success: true,
            data,
            metadata: {
                executionTime: Date.now(),
                resourcesUsed: { tool: 'advanced-testing' }
            }
        };
    }

    private createErrorResult(error: string): ToolResult {
        return {
            success: false,
            error,
            metadata: {
                executionTime: Date.now(),
                resourcesUsed: { tool: 'advanced-testing' }
            }
        };
    }
}
