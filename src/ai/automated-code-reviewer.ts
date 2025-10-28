/**
 * Automated Code Reviewer
 *
 * Provides automated code review capabilities matching human reviewer quality
 * with comprehensive analysis, suggestions, and quality assessment.
 */

import { logger } from '../utils/logger.js';
import { getPerformanceConfig } from '../config/performance.js';
import { ArchitecturalAnalyzer } from './architectural-analyzer.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';
import { calculateCyclomaticComplexity } from '../utils/complexity-calculator.js';
import { detectLanguageFromPath } from '../utils/language-detector.js';
import { Result, ok, err, errFromError, tryAsync, isOk, ErrorDetails } from '../types/result.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CodeReviewRequest {
  files: ReviewFile[];
  context?: ReviewContext;
  options?: ReviewOptions;
}

export interface ReviewFile {
  path: string;
  content: string;
  changes?: FileChange[];
  isNew?: boolean;
  language?: string;
}

export interface FileChange {
  type: 'added' | 'modified' | 'deleted';
  line: number;
  content: string;
  oldContent?: string;
}

export interface ReviewContext {
  pullRequestId?: string;
  branch?: string;
  baseBranch?: string;
  author?: string;
  title?: string;
  description?: string;
  relatedIssues?: string[];
}

export interface ReviewOptions {
  severity?: 'all' | 'high' | 'critical';
  categories?: ReviewCategory[];
  includePositiveFeedback?: boolean;
  includeSuggestions?: boolean;
  includeExamples?: boolean;
  maxIssuesPerFile?: number;
  focusAreas?: FocusArea[];
}

export type ReviewCategory =
  | 'code-quality'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'testing'
  | 'documentation'
  | 'architecture'
  | 'best-practices';

export type FocusArea =
  | 'new-code'
  | 'complex-logic'
  | 'security-sensitive'
  | 'performance-critical'
  | 'public-apis'
  | 'error-handling';

export interface CodeReviewResult {
  summary: ReviewSummary;
  files: FileReview[];
  overallAssessment: OverallAssessment;
  recommendations: Recommendation[];
  metrics: ReviewMetrics;
}

export interface ReviewSummary {
  totalIssues: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  positivePoints: number;
  overallScore: number;
  reviewStatus: 'approve' | 'request-changes' | 'comment';
}

export interface FileReview {
  filePath: string;
  language: string;
  issues: ReviewIssue[];
  positivePoints: PositivePoint[];
  metrics: FileMetrics;
  suggestions: FileSuggestion[];
}

export interface ReviewIssue {
  id: string;
  category: ReviewCategory;
  severity: 'info' | 'minor' | 'major' | 'critical';
  title: string;
  description: string;
  line?: number;
  column?: number;
  codeSnippet?: string;
  suggestion?: string;
  example?: string;
  references?: string[];
  autoFixable: boolean;
  effort: 'low' | 'medium' | 'high';
}

export interface PositivePoint {
  category: string;
  description: string;
  line?: number;
  impact: 'minor' | 'moderate' | 'significant';
}

export interface FileSuggestion {
  type: 'refactoring' | 'optimization' | 'enhancement';
  title: string;
  description: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
}

export interface FileMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  testCoverage?: number;
  duplicateLines: number;
  codeSmells: number;
  securityIssues: number;
  performanceIssues: number;
}

export interface OverallAssessment {
  readability: number;
  maintainability: number;
  testability: number;
  performance: number;
  security: number;
  documentation: number;
  overallQuality: number;
  recommendedAction: 'approve' | 'minor-changes' | 'major-changes' | 'reject';
  reasoning: string;
}

export interface Recommendation {
  type: 'immediate' | 'follow-up' | 'architectural';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  category: ReviewCategory;
  benefits: string[];
  effort: string;
  timeline: string;
}

export interface ReviewMetrics {
  filesReviewed: number;
  linesReviewed: number;
  issuesFound: number;
  averageQualityScore: number;
  reviewDuration: number;
  coverageAnalysis: CoverageAnalysis;
}

export interface CoverageAnalysis {
  functionsReviewed: number;
  classesReviewed: number;
  branchesAnalyzed: number;
  complexityDistribution: ComplexityDistribution;
}

export interface ComplexityDistribution {
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
}

export class AutomatedCodeReviewer {
  private config = getPerformanceConfig();
  private architecturalAnalyzer: ArchitecturalAnalyzer;

  constructor() {
    this.architecturalAnalyzer = new ArchitecturalAnalyzer();
  }

  /**
   * Perform comprehensive automated code review
   */
  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResult> {
    const startTime = performance.now();

    try {
      logger.info('Starting automated code review', {
        files: request.files.length,
        context: request.context?.pullRequestId
      });

      // Analyze architecture and context
      const architecturalAnalysis = await this.architecturalAnalyzer.analyzeArchitecture(
        request.files.map(f => ({ path: f.path, content: f.content, type: f.language || 'unknown' }))
      );

      // Review each file
      const fileReviews: FileReview[] = [];
      for (const file of request.files) {
        const fileReview = await this.reviewFile(file, request.options, architecturalAnalysis);
        fileReviews.push(fileReview);
      }

      // Generate overall assessment
      const overallAssessment = this.generateOverallAssessment(fileReviews, architecturalAnalysis);

      // Create summary
      const summary = this.createReviewSummary(fileReviews, overallAssessment);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        fileReviews,
        architecturalAnalysis,
        request.context
      );

      // Calculate metrics
      const metrics = this.calculateReviewMetrics(
        fileReviews,
        performance.now() - startTime
      );

      const result: CodeReviewResult = {
        summary,
        files: fileReviews,
        overallAssessment,
        recommendations,
        metrics
      };

      const duration = performance.now() - startTime;
      logger.info(`Code review completed in ${duration.toFixed(2)}ms`, {
        totalIssues: summary.totalIssues,
        overallScore: summary.overallScore,
        status: summary.reviewStatus
      });

      return result;
    } catch (error) {
      logger.error('Code review failed:', error);
      throw error;
    }
  }

  private async reviewFile(
    file: ReviewFile,
    options?: ReviewOptions,
    architecturalContext?: any
  ): Promise<FileReview> {
    const startTime = performance.now();

    try {
      const language = file.language || this.detectLanguage(file.path);
      const issues: ReviewIssue[] = [];
      const positivePoints: PositivePoint[] = [];
      const suggestions: FileSuggestion[] = [];

      // Calculate file metrics
      const metrics = await this.calculateFileMetrics(file);

      // Analyze different categories
      if (!options?.categories || options.categories.includes('code-quality')) {
        issues.push(...await this.analyzeCodeQuality(file, metrics));
      }

      if (!options?.categories || options.categories.includes('security')) {
        issues.push(...await this.analyzeSecurity(file));
      }

      if (!options?.categories || options.categories.includes('performance')) {
        issues.push(...await this.analyzePerformance(file));
      }

      if (!options?.categories || options.categories.includes('maintainability')) {
        issues.push(...await this.analyzeMaintainability(file, metrics));
      }

      if (!options?.categories || options.categories.includes('testing')) {
        issues.push(...await this.analyzeTesting(file));
      }

      if (!options?.categories || options.categories.includes('documentation')) {
        issues.push(...await this.analyzeDocumentation(file));
      }

      if (!options?.categories || options.categories.includes('architecture')) {
        issues.push(...await this.analyzeArchitecture(file, architecturalContext));
      }

      if (!options?.categories || options.categories.includes('best-practices')) {
        issues.push(...await this.analyzeBestPractices(file));
      }

      // Find positive points
      if (options?.includePositiveFeedback !== false) {
        positivePoints.push(...this.findPositivePoints(file, metrics));
      }

      // Generate suggestions
      if (options?.includeSuggestions !== false) {
        suggestions.push(...this.generateFileSuggestions(file, issues, metrics));
      }

      // Filter by severity if specified
      const filteredIssues = this.filterIssuesBySeverity(issues, options?.severity);

      // Limit issues per file if specified
      const limitedIssues = options?.maxIssuesPerFile
        ? filteredIssues.slice(0, options.maxIssuesPerFile)
        : filteredIssues;

      const duration = performance.now() - startTime;
      logger.debug(`File review completed: ${file.path}`, {
        issues: limitedIssues.length,
        positivePoints: positivePoints.length,
        duration: `${duration.toFixed(2)}ms`
      });

      return {
        filePath: file.path,
        language,
        issues: limitedIssues,
        positivePoints,
        metrics,
        suggestions
      };
    } catch (error) {
      logger.error(`Failed to review file: ${file.path}`, error);
      throw error;
    }
  }

  private async calculateFileMetrics(file: ReviewFile): Promise<FileMetrics> {
    const lines = file.content.split('\n');
    const linesOfCode = lines.filter(line =>
      line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')
    ).length;

    // Calculate cyclomatic complexity
    const complexityResult = calculateCyclomaticComplexity(file.content);

    return {
      linesOfCode,
      cyclomaticComplexity: complexityResult.cyclomaticComplexity,
      maintainabilityIndex: this.calculateMaintainabilityIndex(file.content, complexityResult.cyclomaticComplexity),
      duplicateLines: this.findDuplicateLines(file.content),
      codeSmells: 0, // Would be calculated from various metrics
      securityIssues: 0, // Would be calculated from security analysis
      performanceIssues: 0 // Would be calculated from performance analysis
    };
  }

  private calculateMaintainabilityIndex(content: string, complexity: number): number {
    const lines = content.split('\n').length;
    const volume = Math.log2(lines);
    const maintainabilityIndex = Math.max(0, (171 - 5.2 * Math.log(volume) - 0.23 * complexity - 16.2 * Math.log(lines)) * 100 / 171);
    return Math.round(maintainabilityIndex);
  }

  private findDuplicateLines(content: string): number {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const lineCount = new Map<string, number>();

    for (const line of lines) {
      lineCount.set(line, (lineCount.get(line) || 0) + 1);
    }

    return Array.from(lineCount.values()).reduce((sum, count) => sum + (count > 1 ? count - 1 : 0), 0);
  }

  private async analyzeCodeQuality(file: ReviewFile, metrics: FileMetrics): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    // Long method detection
    const methods = this.extractMethods(file.content, file.language || 'typescript');
    for (const method of methods) {
      if (method.lineCount > (this.config.codeAnalysis?.performance?.maxFunctionLines || 50)) {
        issues.push({
          id: `long-method-${method.name}`,
          category: 'code-quality',
          severity: 'major',
          title: 'Long Method',
          description: `Method '${method.name}' is too long (${method.lineCount} lines)`,
          line: method.startLine,
          suggestion: 'Consider breaking this method into smaller, focused methods',
          autoFixable: false,
          effort: 'medium'
        });
      }
    }

    // High complexity detection
    if (metrics.cyclomaticComplexity > (this.config.codeAnalysis?.quality?.complexityThresholds?.high || 10)) {
      issues.push({
        id: 'high-complexity',
        category: 'code-quality',
        severity: 'major',
        title: 'High Cyclomatic Complexity',
        description: `File has high cyclomatic complexity (${metrics.cyclomaticComplexity})`,
        suggestion: 'Reduce complexity by extracting methods or simplifying conditional logic',
        autoFixable: false,
        effort: 'high'
      });
    }

    // Large class detection
    const classes = this.extractClasses(file.content, file.language || 'typescript');
    for (const cls of classes) {
      if (cls.methodCount > 20) {
        issues.push({
          id: `large-class-${cls.name}`,
          category: 'code-quality',
          severity: 'major',
          title: 'Large Class',
          description: `Class '${cls.name}' has too many methods (${cls.methodCount})`,
          line: cls.startLine,
          suggestion: 'Consider splitting this class using composition or inheritance',
          autoFixable: false,
          effort: 'high'
        });
      }
    }

    // Magic number detection
    const magicNumbers = this.findMagicNumbers(file.content);
    for (const magicNumber of magicNumbers) {
      issues.push({
        id: `magic-number-${magicNumber.line}`,
        category: 'code-quality',
        severity: 'minor',
        title: 'Magic Number',
        description: `Magic number '${magicNumber.value}' should be extracted to a named constant`,
        line: magicNumber.line,
        codeSnippet: magicNumber.context,
        suggestion: `Extract '${magicNumber.value}' to a well-named constant`,
        autoFixable: true,
        effort: 'low'
      });
    }

    return issues;
  }

  private async analyzeSecurity(file: ReviewFile): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];
    const content = file.content.toLowerCase();

    // SQL injection patterns
    const sqlInjectionPatterns = [
      /query\s*\+\s*['"`]/g,
      /execute\s*\(\s*['"`][^'"`]*['"`]\s*\+/g,
      /\$\{[^}]*\}\s*into\s+/g
    ];

    for (const pattern of sqlInjectionPatterns) {
      const matches = [...file.content.matchAll(new RegExp(pattern.source, 'gmi'))];
      for (const match of matches) {
        const line = this.getLineNumber(file.content, match.index || 0);
        issues.push({
          id: `sql-injection-${line}`,
          category: 'security',
          severity: 'critical',
          title: 'Potential SQL Injection',
          description: 'Dynamic SQL query construction detected',
          line,
          codeSnippet: match[0],
          suggestion: 'Use parameterized queries or prepared statements',
          references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
          autoFixable: false,
          effort: 'medium'
        });
      }
    }

    // Hardcoded secrets
    const secretPatterns = [
      { pattern: /password\s*=\s*['"][^'"]*['"]/gi, name: 'password' },
      { pattern: /api[_-]?key\s*=\s*['"][^'"]*['"]/gi, name: 'API key' },
      { pattern: /token\s*=\s*['"][^'"]*['"]/gi, name: 'token' },
      { pattern: /secret\s*=\s*['"][^'"]*['"]/gi, name: 'secret' }
    ];

    for (const { pattern, name } of secretPatterns) {
      const matches = [...file.content.matchAll(pattern)];
      for (const match of matches) {
        const line = this.getLineNumber(file.content, match.index || 0);
        issues.push({
          id: `hardcoded-secret-${line}`,
          category: 'security',
          severity: 'critical',
          title: 'Hardcoded Secret',
          description: `Hardcoded ${name} detected`,
          line,
          codeSnippet: match[0].replace(/(['"][^'"]*['"])/, "'***'"),
          suggestion: 'Move secrets to environment variables or secure configuration',
          autoFixable: false,
          effort: 'low'
        });
      }
    }

    // Insecure random number generation
    if (content.includes('math.random()')) {
      const matches = [...file.content.matchAll(/math\.random\(\)/gi)];
      for (const match of matches) {
        const line = this.getLineNumber(file.content, match.index || 0);
        issues.push({
          id: `insecure-random-${line}`,
          category: 'security',
          severity: 'major',
          title: 'Insecure Random Number Generation',
          description: 'Math.random() is not cryptographically secure',
          line,
          suggestion: 'Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive operations',
          autoFixable: true,
          effort: 'low'
        });
      }
    }

    return issues;
  }

  private async analyzePerformance(file: ReviewFile): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    // Inefficient loops
    const nestedLoopMatches = file.content.match(/for\s*\([^}]*\{\s*[^}]*for\s*\(/g);
    if (nestedLoopMatches) {
      issues.push({
        id: 'nested-loops',
        category: 'performance',
        severity: 'minor',
        title: 'Nested Loops',
        description: 'Nested loops detected - consider optimization',
        suggestion: 'Review algorithm complexity and consider using more efficient data structures',
        autoFixable: false,
        effort: 'medium'
      });
    }

    // Inefficient string concatenation
    const stringConcatMatches = [...file.content.matchAll(/\+=\s*['"`]/g)];
    if (stringConcatMatches.length > 3) {
      issues.push({
        id: 'string-concatenation',
        category: 'performance',
        severity: 'minor',
        title: 'Inefficient String Concatenation',
        description: 'Multiple string concatenations using += detected',
        suggestion: 'Consider using template literals or array.join() for better performance',
        autoFixable: true,
        effort: 'low'
      });
    }

    // Missing await in async functions
    const asyncFunctionRegex = /async\s+function[^{]*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    const asyncMatches = [...file.content.matchAll(asyncFunctionRegex)];

    for (const match of asyncMatches) {
      const functionBody = match[1];
      const promiseCallsWithoutAwait = [...functionBody.matchAll(/\.\s*(?:then|catch)\s*\(/g)];

      if (promiseCallsWithoutAwait.length > 0) {
        const line = this.getLineNumber(file.content, match.index || 0);
        issues.push({
          id: `missing-await-${line}`,
          category: 'performance',
          severity: 'major',
          title: 'Missing Await in Async Function',
          description: 'Promise chains found in async function - consider using await',
          line,
          suggestion: 'Replace .then()/.catch() chains with await and try/catch blocks',
          autoFixable: true,
          effort: 'low'
        });
      }
    }

    return issues;
  }

  private async analyzeMaintainability(file: ReviewFile, metrics: FileMetrics): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    // Low maintainability index
    if (metrics.maintainabilityIndex < 20) {
      issues.push({
        id: 'low-maintainability',
        category: 'maintainability',
        severity: 'major',
        title: 'Low Maintainability Index',
        description: `File has low maintainability index (${metrics.maintainabilityIndex})`,
        suggestion: 'Refactor to improve readability, reduce complexity, and add documentation',
        autoFixable: false,
        effort: 'high'
      });
    }

    // Too many parameters
    const functionMatches = [...file.content.matchAll(/function\s+\w+\s*\(([^)]*)\)/g)];
    for (const match of functionMatches) {
      const params = match[1].split(',').filter(p => p.trim()).length;
      if (params > 5) {
        const line = this.getLineNumber(file.content, match.index || 0);
        issues.push({
          id: `too-many-params-${line}`,
          category: 'maintainability',
          severity: 'minor',
          title: 'Too Many Parameters',
          description: `Function has too many parameters (${params})`,
          line,
          suggestion: 'Consider using an options object or splitting the function',
          autoFixable: false,
          effort: 'medium'
        });
      }
    }

    // Duplicate code
    if (metrics.duplicateLines > 10) {
      issues.push({
        id: 'duplicate-code',
        category: 'maintainability',
        severity: 'major',
        title: 'Duplicate Code',
        description: `File contains ${metrics.duplicateLines} duplicate lines`,
        suggestion: 'Extract common code into reusable functions or modules',
        autoFixable: false,
        effort: 'high'
      });
    }

    return issues;
  }

  private async analyzeTesting(file: ReviewFile): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];
    const isTestFile = file.path.includes('test') || file.path.includes('spec');

    if (!isTestFile) {
      // Look for corresponding test file
      const hasTests = await this.hasCorrespondingTests(file.path);
      if (!hasTests) {
        issues.push({
          id: 'missing-tests',
          category: 'testing',
          severity: 'major',
          title: 'Missing Tests',
          description: 'No corresponding test file found',
          suggestion: 'Create unit tests for this module',
          autoFixable: false,
          effort: 'medium'
        });
      }
    } else {
      // Analyze test file quality
      const testCount = (file.content.match(/it\s*\(|test\s*\(/g) || []).length;
      if (testCount < 3) {
        issues.push({
          id: 'insufficient-tests',
          category: 'testing',
          severity: 'minor',
          title: 'Insufficient Test Coverage',
          description: `Test file has only ${testCount} test cases`,
          suggestion: 'Add more test cases to cover edge cases and error scenarios',
          autoFixable: false,
          effort: 'medium'
        });
      }
    }

    return issues;
  }

  private async analyzeDocumentation(file: ReviewFile): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    // Missing JSDoc for public functions
    const publicFunctions = this.extractPublicFunctions(file.content);
    for (const func of publicFunctions) {
      if (!this.hasJSDoc(file.content, func.startLine)) {
        issues.push({
          id: `missing-jsdoc-${func.name}`,
          category: 'documentation',
          severity: 'minor',
          title: 'Missing Documentation',
          description: `Public function '${func.name}' lacks JSDoc documentation`,
          line: func.startLine,
          suggestion: 'Add JSDoc comments describing the function, its parameters, and return value',
          example: '/**\n * Description of the function\n * @param {type} param Description\n * @returns {type} Description\n */',
          autoFixable: false,
          effort: 'low'
        });
      }
    }

    // Missing class documentation
    const classes = this.extractClasses(file.content, file.language || 'typescript');
    for (const cls of classes) {
      if (!this.hasJSDoc(file.content, cls.startLine)) {
        issues.push({
          id: `missing-class-doc-${cls.name}`,
          category: 'documentation',
          severity: 'minor',
          title: 'Missing Class Documentation',
          description: `Class '${cls.name}' lacks documentation`,
          line: cls.startLine,
          suggestion: 'Add JSDoc comments describing the class and its purpose',
          autoFixable: false,
          effort: 'low'
        });
      }
    }

    return issues;
  }

  private async analyzeArchitecture(file: ReviewFile, context?: any): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    // Circular dependencies (simplified check)
    const imports = this.extractImports(file.content);
    const fileName = path.basename(file.path, path.extname(file.path));

    for (const importPath of imports) {
      const importName = path.basename(importPath, path.extname(importPath));
      if (importName === fileName) {
        issues.push({
          id: 'circular-dependency',
          category: 'architecture',
          severity: 'major',
          title: 'Potential Circular Dependency',
          description: `File may have circular dependency with '${importPath}'`,
          suggestion: 'Restructure imports to avoid circular dependencies',
          autoFixable: false,
          effort: 'high'
        });
      }
    }

    // Inappropriate coupling
    if (imports.length > 15) {
      issues.push({
        id: 'high-coupling',
        category: 'architecture',
        severity: 'minor',
        title: 'High Coupling',
        description: `File has many dependencies (${imports.length} imports)`,
        suggestion: 'Consider reducing dependencies through dependency injection or interface segregation',
        autoFixable: false,
        effort: 'high'
      });
    }

    return issues;
  }

  private async analyzeBestPractices(file: ReviewFile): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    // console.log in production code
    const consoleMatches = [...file.content.matchAll(/console\.\w+\(/g)];
    if (consoleMatches.length > 0 && !file.path.includes('test')) {
      for (const match of consoleMatches) {
        const line = this.getLineNumber(file.content, match.index || 0);
        issues.push({
          id: `console-log-${line}`,
          category: 'best-practices',
          severity: 'minor',
          title: 'Console Statement',
          description: 'console.* statement found in production code',
          line,
          suggestion: 'Replace with proper logging framework or remove debug statements',
          autoFixable: true,
          effort: 'low'
        });
      }
    }

    // Unused variables (simplified detection)
    const variableDeclarations = [...file.content.matchAll(/(?:const|let|var)\s+(\w+)/g)];
    for (const match of variableDeclarations) {
      const varName = match[1];
      const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
      const usages = [...file.content.matchAll(usageRegex)];

      if (usages.length === 1) { // Only the declaration
        const line = this.getLineNumber(file.content, match.index || 0);
        issues.push({
          id: `unused-variable-${line}`,
          category: 'best-practices',
          severity: 'minor',
          title: 'Unused Variable',
          description: `Variable '${varName}' is declared but never used`,
          line,
          suggestion: 'Remove unused variable or prefix with underscore if intentional',
          autoFixable: true,
          effort: 'low'
        });
      }
    }

    return issues;
  }

  private findPositivePoints(file: ReviewFile, metrics: FileMetrics): PositivePoint[] {
    const points: PositivePoint[] = [];

    // Good maintainability
    if (metrics.maintainabilityIndex > 80) {
      points.push({
        category: 'maintainability',
        description: 'Excellent maintainability index indicating well-structured, readable code',
        impact: 'significant'
      });
    }

    // Good complexity
    if (metrics.cyclomaticComplexity <= 5) {
      points.push({
        category: 'complexity',
        description: 'Low cyclomatic complexity makes the code easy to understand and test',
        impact: 'moderate'
      });
    }

    // Good documentation
    const functionCount = this.extractMethods(file.content, file.language || 'typescript').length;
    const docCount = (file.content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
    if (functionCount > 0 && docCount / functionCount > THRESHOLD_CONSTANTS.CODE_REVIEW.GOOD_DOCUMENTATION_RATIO) {
      points.push({
        category: 'documentation',
        description: 'Good documentation coverage with JSDoc comments',
        impact: 'moderate'
      });
    }

    // Proper error handling
    const tryCount = (file.content.match(/try\s*\{/g) || []).length;
    const functionCount2 = this.extractMethods(file.content, file.language || 'typescript').length;
    if (functionCount2 > 0 && tryCount / functionCount2 > THRESHOLD_CONSTANTS.CODE_REVIEW.GOOD_ERROR_HANDLING_RATIO) {
      points.push({
        category: 'error-handling',
        description: 'Good error handling with appropriate try-catch blocks',
        impact: 'significant'
      });
    }

    return points;
  }

  private generateFileSuggestions(
    file: ReviewFile,
    issues: ReviewIssue[],
    metrics: FileMetrics
  ): FileSuggestion[] {
    const suggestions: FileSuggestion[] = [];

    // Refactoring suggestion for large files
    if (metrics.linesOfCode > 500) {
      suggestions.push({
        type: 'refactoring',
        title: 'Split Large File',
        description: 'Consider splitting this large file into smaller, focused modules',
        benefits: ['Improved maintainability', 'Better testability', 'Clearer separation of concerns'],
        effort: 'high',
        priority: 'medium'
      });
    }

    // Performance optimization suggestions
    const performanceIssues = issues.filter(i => i.category === 'performance');
    if (performanceIssues.length > 0) {
      suggestions.push({
        type: 'optimization',
        title: 'Performance Optimization',
        description: 'Address identified performance issues to improve execution speed',
        benefits: ['Better user experience', 'Reduced resource usage', 'Improved scalability'],
        effort: 'medium',
        priority: 'high'
      });
    }

    // Testing enhancement
    const testingIssues = issues.filter(i => i.category === 'testing');
    if (testingIssues.length > 0) {
      suggestions.push({
        type: 'enhancement',
        title: 'Improve Test Coverage',
        description: 'Add comprehensive unit tests and integration tests',
        benefits: ['Better reliability', 'Easier refactoring', 'Faster bug detection'],
        effort: 'medium',
        priority: 'high'
      });
    }

    return suggestions;
  }

  private filterIssuesBySeverity(issues: ReviewIssue[], severity?: string): ReviewIssue[] {
    if (!severity || severity === 'all') return issues;

    const severityOrder = { info: 0, minor: 1, major: 2, critical: 3 };
    const minSeverity = severity === 'high' ? 2 : severity === 'critical' ? 3 : 0;

    return issues.filter(issue => severityOrder[issue.severity] >= minSeverity);
  }

  private generateOverallAssessment(
    fileReviews: FileReview[],
    architecturalAnalysis: any
  ): OverallAssessment {
    const totalIssues = fileReviews.reduce((sum, review) => sum + review.issues.length, 0);
    const criticalIssues = fileReviews.reduce(
      (sum, review) => sum + review.issues.filter(i => i.severity === 'critical').length,
      0
    );
    const majorIssues = fileReviews.reduce(
      (sum, review) => sum + review.issues.filter(i => i.severity === 'major').length,
      0
    );

    // Calculate quality scores
    const avgMaintainability = fileReviews.reduce(
      (sum, review) => sum + review.metrics.maintainabilityIndex, 0
    ) / fileReviews.length / 100;

    const avgComplexity = fileReviews.reduce(
      (sum, review) => sum + Math.min(review.metrics.cyclomaticComplexity / 20, 1), 0
    ) / fileReviews.length;

    const readability = Math.max(0, 1 - avgComplexity + avgMaintainability) / 2;
    const maintainability = avgMaintainability;
    const testability = Math.max(0, 1 - avgComplexity);
    const performance = Math.max(0, 1 - (fileReviews.reduce(
      (sum, review) => sum + review.issues.filter(i => i.category === 'performance').length, 0
    ) / (totalIssues || 1)));
    const security = Math.max(0, 1 - (criticalIssues * THRESHOLD_CONSTANTS.CODE_REVIEW.SECURITY_CRITICAL_WEIGHT + majorIssues * THRESHOLD_CONSTANTS.CODE_REVIEW.SECURITY_MAJOR_WEIGHT) / Math.max(totalIssues, 1));

    const documentationScore = fileReviews.reduce(
      (sum, review) => sum + (review.issues.filter(i => i.category === 'documentation').length === 0 ? 1 : THRESHOLD_CONSTANTS.CODE_REVIEW.DOCUMENTATION_WITH_ISSUES), 0
    ) / fileReviews.length;

    const overallQuality = (readability + maintainability + testability + performance + security + documentationScore) / 6;

    // Determine recommended action
    let recommendedAction: 'approve' | 'minor-changes' | 'major-changes' | 'reject';
    let reasoning: string;

    if (criticalIssues > 0) {
      recommendedAction = 'reject';
      reasoning = `${criticalIssues} critical security or quality issues must be addressed before approval`;
    } else if (majorIssues > THRESHOLD_CONSTANTS.CODE_REVIEW.MAX_MAJOR_ISSUES || overallQuality < THRESHOLD_CONSTANTS.CODE_REVIEW.MAJOR_CHANGES_THRESHOLD) {
      recommendedAction = 'major-changes';
      reasoning = `Significant issues found that impact code quality and maintainability`;
    } else if (totalIssues > THRESHOLD_CONSTANTS.CODE_REVIEW.MAX_TOTAL_ISSUES || overallQuality < THRESHOLD_CONSTANTS.CODE_REVIEW.MINOR_CHANGES_THRESHOLD) {
      recommendedAction = 'minor-changes';
      reasoning = `Some issues found that should be addressed for better code quality`;
    } else {
      recommendedAction = 'approve';
      reasoning = `Code meets quality standards with minimal issues`;
    }

    return {
      readability,
      maintainability,
      testability,
      performance,
      security,
      documentation: documentationScore,
      overallQuality,
      recommendedAction,
      reasoning
    };
  }

  private createReviewSummary(
    fileReviews: FileReview[],
    overallAssessment: OverallAssessment
  ): ReviewSummary {
    const totalIssues = fileReviews.reduce((sum, review) => sum + review.issues.length, 0);
    const criticalIssues = fileReviews.reduce(
      (sum, review) => sum + review.issues.filter(i => i.severity === 'critical').length, 0
    );
    const majorIssues = fileReviews.reduce(
      (sum, review) => sum + review.issues.filter(i => i.severity === 'major').length, 0
    );
    const minorIssues = fileReviews.reduce(
      (sum, review) => sum + review.issues.filter(i => i.severity === 'minor').length, 0
    );
    const positivePoints = fileReviews.reduce((sum, review) => sum + review.positivePoints.length, 0);

    const overallScore = Math.round(overallAssessment.overallQuality * 100);

    const reviewStatus: 'approve' | 'request-changes' | 'comment' =
      overallAssessment.recommendedAction === 'approve' ? 'approve' :
      overallAssessment.recommendedAction === 'reject' || overallAssessment.recommendedAction === 'major-changes' ? 'request-changes' :
      'comment';

    return {
      totalIssues,
      criticalIssues,
      majorIssues,
      minorIssues,
      positivePoints,
      overallScore,
      reviewStatus
    };
  }

  private generateRecommendations(
    fileReviews: FileReview[],
    architecturalAnalysis: any,
    context?: ReviewContext
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Critical security recommendations
    const securityIssues = fileReviews.flatMap(r => r.issues.filter(i => i.category === 'security'));
    if (securityIssues.length > 0) {
      recommendations.push({
        type: 'immediate',
        priority: 'critical',
        title: 'Address Security Vulnerabilities',
        description: `${securityIssues.length} security issues found that need immediate attention`,
        category: 'security',
        benefits: ['Prevent security breaches', 'Protect user data', 'Maintain compliance'],
        effort: 'High',
        timeline: 'Before merge'
      });
    }

    // Performance recommendations
    const performanceIssues = fileReviews.flatMap(r => r.issues.filter(i => i.category === 'performance'));
    if (performanceIssues.length > 0) {
      recommendations.push({
        type: 'follow-up',
        priority: 'high',
        title: 'Optimize Performance',
        description: 'Several performance issues identified that could impact user experience',
        category: 'performance',
        benefits: ['Improved response times', 'Better resource utilization', 'Enhanced user experience'],
        effort: 'Medium',
        timeline: 'Next sprint'
      });
    }

    // Testing recommendations
    const testingIssues = fileReviews.flatMap(r => r.issues.filter(i => i.category === 'testing'));
    if (testingIssues.length > 0) {
      recommendations.push({
        type: 'follow-up',
        priority: 'medium',
        title: 'Improve Test Coverage',
        description: 'Add comprehensive tests to ensure code reliability',
        category: 'testing',
        benefits: ['Better reliability', 'Easier maintenance', 'Faster debugging'],
        effort: 'Medium',
        timeline: 'Within 2 weeks'
      });
    }

    // Architectural recommendations
    if (architecturalAnalysis?.codeSmells?.length > 5) {
      recommendations.push({
        type: 'architectural',
        priority: 'medium',
        title: 'Address Architectural Issues',
        description: 'Code smells detected that may impact long-term maintainability',
        category: 'architecture',
        benefits: ['Better maintainability', 'Improved code organization', 'Easier feature development'],
        effort: 'High',
        timeline: 'Next quarter'
      });
    }

    return recommendations;
  }

  private calculateReviewMetrics(
    fileReviews: FileReview[],
    reviewDuration: number
  ): ReviewMetrics {
    const totalLines = fileReviews.reduce((sum, review) => sum + review.metrics.linesOfCode, 0);
    const totalIssues = fileReviews.reduce((sum, review) => sum + review.issues.length, 0);
    const avgQualityScore = fileReviews.reduce(
      (sum, review) => sum + review.metrics.maintainabilityIndex, 0
    ) / fileReviews.length;

    // Calculate complexity distribution
    const complexityDistribution = fileReviews.reduce(
      (dist, review) => {
        const complexity = review.metrics.cyclomaticComplexity;
        if (complexity <= 5) dist.low++;
        else if (complexity <= 10) dist.medium++;
        else if (complexity <= 20) dist.high++;
        else dist.veryHigh++;
        return dist;
      },
      { low: 0, medium: 0, high: 0, veryHigh: 0 }
    );

    return {
      filesReviewed: fileReviews.length,
      linesReviewed: totalLines,
      issuesFound: totalIssues,
      averageQualityScore: avgQualityScore,
      reviewDuration,
      coverageAnalysis: {
        functionsReviewed: fileReviews.reduce(
          (sum, review) => sum + this.extractMethods(review.filePath, review.language).length, 0
        ),
        classesReviewed: fileReviews.reduce(
          (sum, review) => sum + this.extractClasses(review.filePath, review.language).length, 0
        ),
        branchesAnalyzed: 0, // Would calculate from actual analysis
        complexityDistribution
      }
    };
  }

  // Helper methods
  private detectLanguage(filePath: string): string {
    return detectLanguageFromPath(filePath) || 'unknown';
  }

  private extractMethods(content: string, language: string): Array<{ name: string; startLine: number; lineCount: number }> {
    const methods: Array<{ name: string; startLine: number; lineCount: number }> = [];

    // Simple regex-based method extraction (would be more sophisticated in practice)
    const methodRegex = /(?:function\s+(\w+)|(\w+)\s*\(.*?\)\s*\{|(\w+)\s*:\s*(?:function|\([^)]*\)\s*=>))/gm;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1] || match[2] || match[3];
      if (methodName && !['if', 'for', 'while', 'switch'].includes(methodName)) {
        const startLine = this.getLineNumber(content, match.index);
        const endIndex = this.findMatchingBrace(content, match.index);
        const lineCount = this.getLineNumber(content, endIndex) - startLine + 1;

        methods.push({
          name: methodName,
          startLine,
          lineCount
        });
      }
    }

    return methods;
  }

  private extractClasses(content: string, language: string): Array<{ name: string; startLine: number; methodCount: number }> {
    const classes: Array<{ name: string; startLine: number; methodCount: number }> = [];

    const classRegex = /class\s+(\w+)/gm;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const startLine = this.getLineNumber(content, match.index);

      // Count methods in class (simplified)
      const classStart = match.index;
      const classEnd = this.findMatchingBrace(content, classStart);
      const classContent = content.substring(classStart, classEnd);
      const methodCount = (classContent.match(/(?:function\s+\w+|\w+\s*\(.*?\)\s*\{)/g) || []).length;

      classes.push({
        name: className,
        startLine,
        methodCount
      });
    }

    return classes;
  }

  private findMagicNumbers(content: string): Array<{ value: string; line: number; context: string }> {
    const magicNumbers: Array<{ value: string; line: number; context: string }> = [];

    // Find numeric literals that aren't obvious constants
    const numberRegex = /\b(\d+(?:\.\d+)?)\b/g;
    let match;

    while ((match = numberRegex.exec(content)) !== null) {
      const value = match[1];
      // Skip obvious non-magic numbers
      if (['0', '1', '2', '100', '0.0', '1.0'].includes(value)) continue;

      const line = this.getLineNumber(content, match.index);
      const lineContent = this.getLineContent(content, line);

      // Skip if it's in a comment or string
      if (lineContent.includes('//') || lineContent.includes('/*') ||
          lineContent.includes('"') || lineContent.includes("'")) continue;

      magicNumbers.push({
        value,
        line,
        context: lineContent.trim()
      });
    }

    return magicNumbers;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];

    // Match various import patterns
    const importPatterns = [
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }

    return imports;
  }

  private extractPublicFunctions(content: string): Array<{ name: string; startLine: number }> {
    const functions: Array<{ name: string; startLine: number }> = [];

    // Match exported functions
    const exportRegex = /export\s+(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/gm;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2];
      if (functionName) {
        functions.push({
          name: functionName,
          startLine: this.getLineNumber(content, match.index)
        });
      }
    }

    return functions;
  }

  private hasJSDoc(content: string, line: number): boolean {
    const lines = content.split('\n');
    const targetLine = line - 1; // Convert to 0-based index

    // Check previous few lines for JSDoc comment
    for (let i = Math.max(0, targetLine - 5); i < targetLine; i++) {
      if (lines[i]?.trim().startsWith('/**')) {
        return true;
      }
    }

    return false;
  }

  private async hasCorrespondingTests(filePath: string): Promise<boolean> {
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, path.extname(filePath));

    const testPaths = [
      path.join(dir, `${basename}.test.ts`),
      path.join(dir, `${basename}.test.js`),
      path.join(dir, `${basename}.spec.ts`),
      path.join(dir, `${basename}.spec.js`),
      path.join(dir, '__tests__', `${basename}.test.ts`),
      path.join(dir, '__tests__', `${basename}.test.js`)
    ];

    for (const testPath of testPaths) {
      try {
        await fs.access(testPath);
        return true;
      } catch {
        // File doesn't exist
      }
    }

    return false;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getLineContent(content: string, lineNumber: number): string {
    const lines = content.split('\n');
    return lines[lineNumber - 1] || '';
  }

  private findMatchingBrace(content: string, startIndex: number): number {
    let braceCount = 0;
    let inString = false;
    let inComment = false;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';
      const nextChar = i < content.length - 1 ? content[i + 1] : '';

      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      // Handle comments
      if (char === '/' && nextChar === '*') {
        inComment = true;
        i++; // Skip next char
        continue;
      }

      if (char === '*' && nextChar === '/') {
        inComment = false;
        i++; // Skip next char
        continue;
      }

      if (inComment) continue;

      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return i;
        }
      }
    }

    return content.length - 1;
  }
}