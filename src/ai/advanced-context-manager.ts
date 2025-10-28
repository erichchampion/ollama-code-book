/**
 * Advanced Context Manager
 *
 * Provides intelligent context management with semantic code indexing,
 * code relationship mapping, domain knowledge base, and historical context tracking.
 * This enhances AI interactions by providing rich, contextual information.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { ProjectContext, FileInfo } from './context.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';

// Core interfaces for advanced context management
export interface SemanticSymbol {
  type: 'class' | 'function' | 'interface' | 'variable' | 'method';
  name: string;
  scope: string;
  filePath?: string;
  lineNumber?: number;
  signature?: string;
}

export interface CodeConcept {
  type: 'domain' | 'pattern' | 'infrastructure' | 'business';
  name: string;
  confidence: number;
  description?: string;
  examples?: string[];
}

export interface CodePattern {
  type: 'oop' | 'functional' | 'async' | 'module' | 'architectural';
  name: string;
  confidence: number;
  description?: string;
}

export interface ComplexityMetrics {
  lines: number;
  conditions: number;
  functions: number;
  cyclomaticComplexity: number;
  maintainabilityIndex?: number;
}

export interface CodeDependency {
  path: string;
  type: 'local' | 'external' | 'builtin';
  version?: string;
  isDevDependency?: boolean;
}

export interface CodeExport {
  name: string;
  type: 'class' | 'function' | 'interface' | 'variable' | 'default';
  signature?: string;
}

export interface SemanticAnalysis {
  filePath: string;
  symbols: SemanticSymbol[];
  concepts: CodeConcept[];
  patterns: CodePattern[];
  complexity: ComplexityMetrics;
  dependencies: CodeDependency[];
  exports: CodeExport[];
  lastAnalyzed: Date;
}

export interface CodeRelationship {
  imports: string[];
  exports: CodeExport[];
  references: string[];
  dependents: string[];
  weight: number; // Strength of relationship
}

export interface DomainKnowledge {
  name: string;
  concepts: string[];
  patterns: string[];
  technologies: string[];
  bestPractices: string[];
  commonIssues: string[];
}

export interface HistoricalContext {
  timestamp: number;
  query: string;
  result: string;
  filesReferenced: string[];
  contextUsed: {
    semanticMatches: number;
    domainContext: number;
    relatedFiles: number;
  };
  userSatisfaction?: number;
}

export interface EnhancedContext {
  semanticMatches: SemanticMatch[];
  relatedCode: string[];
  domainContext: DomainMatch[];
  historicalContext: HistoricalContext[];
  suggestions: string[];
  confidence: number;
  processingTime: number;
}

export interface SemanticMatch {
  filePath: string;
  score: number;
  analysis: SemanticAnalysis;
  relevanceReason: string;
  matchedConcepts: string[];
  matchedSymbols: string[];
}

export interface DomainMatch {
  domain: string;
  score: number;
  knowledge: DomainKnowledge;
  matchedConcepts: string[];
  applicablePatterns: string[];
}

export interface ContextCacheEntry {
  query: string;
  context: EnhancedContext;
  timestamp: number;
  expiresAt: number;
}

export interface AdvancedContextConfig {
  maxHistoryEntries: number;
  cacheExpirationMs: number;
  maxSemanticMatches: number;
  maxDomainMatches: number;
  maxSuggestions: number;
  analysisTimeout: number;
  enableCaching: boolean;
  enableHistoricalTracking: boolean;
}

/**
 * Advanced Context Manager Implementation
 */
export class AdvancedContextManager {
  private aiClient: any;
  private projectContext: ProjectContext;
  private semanticIndex: Map<string, SemanticAnalysis>;
  private codeRelationships: Map<string, CodeRelationship>;
  private domainKnowledge: Map<string, DomainKnowledge>;
  private historicalContext: HistoricalContext[];
  private contextCache: Map<string, ContextCacheEntry>;
  private config: AdvancedContextConfig;
  private initialized: boolean;

  constructor(aiClient: any, projectContext: ProjectContext, config?: Partial<AdvancedContextConfig>) {
    this.aiClient = aiClient;
    this.projectContext = projectContext;
    this.semanticIndex = new Map();
    this.codeRelationships = new Map();
    this.domainKnowledge = new Map();
    this.historicalContext = [];
    this.contextCache = new Map();
    this.initialized = false;

    this.config = {
      maxHistoryEntries: 100,
      cacheExpirationMs: 5 * 60 * 1000, // 5 minutes
      maxSemanticMatches: 10,
      maxDomainMatches: 5,
      maxSuggestions: 5,
      analysisTimeout: 30000, // 30 seconds
      enableCaching: true,
      enableHistoricalTracking: true,
      ...config
    };
  }

  /**
   * Initialize the advanced context manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing Advanced Context Manager');

    try {
      // Initialize components in parallel for better performance
      await Promise.all([
        this.buildSemanticIndex(),
        this.initializeDomainKnowledge()
      ]);

      // Build relationships after semantic index is ready
      await this.buildCodeRelationships();

      this.initialized = true;
      logger.info('Advanced Context Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Advanced Context Manager:', error);
      throw error;
    }
  }

  /**
   * Build semantic index from project files
   */
  private async buildSemanticIndex(): Promise<void> {
    logger.debug('Building semantic index');

    const files = this.projectContext.allFiles || [];
    const analyzableFiles = files.filter(file => this.isAnalyzableFile(file));

    logger.info(`Analyzing ${analyzableFiles.length} source files (filtered from ${files.length} total files)`);
    if (files.length === 0) {
      logger.warn('Advanced Context Manager: Project context has 0 files - this indicates the project context was not properly initialized');
      // Debug info only when there's an issue
      logger.debug('Project context type:', this.projectContext.constructor.name);
      logger.debug('Project context root:', this.projectContext.root);
    }

    const analysisPromises = analyzableFiles
      .map(file => this.analyzeFile(file));

    const analyses = await Promise.allSettled(analysisPromises);

    analyses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const analysis = result.value;
        this.semanticIndex.set(analysis.filePath, analysis);
      } else {
        const file = analyzableFiles[index];
        logger.debug(`Failed to analyze file ${file?.path}:`, result.reason);
      }
    });

    logger.debug(`Semantic index built for ${this.semanticIndex.size} files`);
  }

  /**
   * Check if a file should be analyzed
   */
  private isAnalyzableFile(file: FileInfo): boolean {
    const analyzableTypes = ['typescript', 'javascript', 'jsx', 'tsx'];
    const analyzableExtensions = ['.ts', '.js', '.jsx', '.tsx', '.mjs', '.cjs'];

    // Directories to exclude from analysis
    const excludedDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'out',
      'coverage',
      '.next',
      '.nuxt',
      '.cache',
      'tmp',
      'temp',
      '.vscode',
      '.idea',
      'vendor',
      'bower_components',
      '__pycache__',
      '.pytest_cache',
      '.tox',
      '.egg-info',
      'target',  // Rust/Maven
      '.turbo',
      '.parcel-cache',
      '.yarn',
      '.pnp.js',
      '.pnp.cjs'
    ];

    // Check if file path contains any excluded directory
    const pathContainsExcluded = excludedDirs.some(dir =>
      file.path?.includes(`/${dir}/`) || file.path?.includes(`\\${dir}\\`)
    );

    if (pathContainsExcluded) {
      return false;
    }

    // Exclude test and spec files if there are too many (optional)
    const isTestFile = file.path?.includes('.test.') ||
                      file.path?.includes('.spec.') ||
                      file.path?.includes('__tests__/');

    // Check file type and extension
    const hasValidType = analyzableTypes.includes(file.type || '') ||
                        analyzableExtensions.some(ext => file.path?.endsWith(ext));

    return hasValidType && !pathContainsExcluded;
  }

  /**
   * Analyze a single file for semantic information
   */
  private async analyzeFile(file: FileInfo): Promise<SemanticAnalysis> {
    try {
      // Use relativePath if available, otherwise assume path is relative
      const relativePath = file.relativePath || file.path;
      const filePath = path.isAbsolute(relativePath)
        ? relativePath
        : path.join(this.projectContext.root, relativePath);
      const content = await fs.readFile(filePath, 'utf-8');

      return this.analyzeCodeSemantics(content, relativePath);
    } catch (error) {
      // Use debug level since we now filter files and this is expected for some cases
      const relativePath = file.relativePath || file.path;
      logger.debug(`Could not read file ${relativePath} for analysis:`, error);
      // Return empty analysis for missing files
      return this.createEmptyAnalysis(relativePath);
    }
  }

  /**
   * Create empty analysis for missing or unreadable files
   */
  private createEmptyAnalysis(filePath: string): SemanticAnalysis {
    return {
      filePath,
      symbols: [],
      concepts: [],
      patterns: [],
      complexity: { lines: 0, conditions: 0, functions: 0, cyclomaticComplexity: 1 },
      dependencies: [],
      exports: [],
      lastAnalyzed: new Date()
    };
  }

  /**
   * Analyze code semantics from source content
   */
  private analyzeCodeSemantics(code: string, filePath: string): SemanticAnalysis {
    const symbols = this.extractSymbols(code, filePath);
    const concepts = this.extractConcepts(code);
    const patterns = this.extractPatterns(code);
    const complexity = this.calculateComplexity(code);
    const dependencies = this.extractDependencies(code);
    const exports = this.extractExports(code);

    return {
      filePath,
      symbols,
      concepts,
      patterns,
      complexity,
      dependencies,
      exports,
      lastAnalyzed: new Date()
    };
  }

  /**
   * Extract symbols (classes, functions, interfaces, etc.) from code
   */
  private extractSymbols(code: string, filePath: string): SemanticSymbol[] {
    const symbols: SemanticSymbol[] = [];

    // Extract classes
    const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*{/g;
    let match;
    while ((match = classRegex.exec(code)) !== null) {
      symbols.push({
        type: 'class',
        name: match[1],
        scope: 'global',
        filePath,
        lineNumber: this.getLineNumber(code, match.index)
      });
    }

    // Extract functions
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
    while ((match = functionRegex.exec(code)) !== null) {
      symbols.push({
        type: 'function',
        name: match[1],
        scope: 'global',
        filePath,
        lineNumber: this.getLineNumber(code, match.index)
      });
    }

    // Extract arrow functions assigned to variables
    const arrowFunctionRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|[^=]+\s*=>)/g;
    while ((match = arrowFunctionRegex.exec(code)) !== null) {
      symbols.push({
        type: 'function',
        name: match[1],
        scope: 'global',
        filePath,
        lineNumber: this.getLineNumber(code, match.index)
      });
    }

    // Extract interfaces
    const interfaceRegex = /interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?\s*{/g;
    while ((match = interfaceRegex.exec(code)) !== null) {
      symbols.push({
        type: 'interface',
        name: match[1],
        scope: 'global',
        filePath,
        lineNumber: this.getLineNumber(code, match.index)
      });
    }

    // Extract methods within classes
    const methodRegex = /(?:private|protected|public)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g;
    while ((match = methodRegex.exec(code)) !== null) {
      // Skip constructors and common keywords
      if (!['constructor', 'if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
        symbols.push({
          type: 'method',
          name: match[1],
          scope: 'class',
          filePath,
          lineNumber: this.getLineNumber(code, match.index)
        });
      }
    }

    return symbols;
  }

  /**
   * Get line number for a given character index
   */
  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Extract domain concepts from code
   */
  private extractConcepts(code: string): CodeConcept[] {
    const concepts: CodeConcept[] = [];

    // Domain-specific concept detection
    const conceptPatterns = [
      {
        patterns: ['user', 'User', 'auth', 'login', 'register', 'account'],
        concept: { type: 'domain' as const, name: 'user-management', confidence: 0.8 }
      },
      {
        patterns: ['service', 'Service', 'repository', 'Repository'],
        concept: { type: 'pattern' as const, name: 'service-layer', confidence: 0.9 }
      },
      {
        patterns: ['log', 'logger', 'console', 'debug', 'error'],
        concept: { type: 'infrastructure' as const, name: 'logging', confidence: 0.7 }
      },
      {
        patterns: ['async', 'await', 'Promise', 'then', 'catch'],
        concept: { type: 'pattern' as const, name: 'async-programming', confidence: 0.8 }
      },
      {
        patterns: ['database', 'db', 'sql', 'query', 'orm'],
        concept: { type: 'infrastructure' as const, name: 'data-persistence', confidence: 0.8 }
      },
      {
        patterns: ['api', 'endpoint', 'route', 'express', 'fastify'],
        concept: { type: 'pattern' as const, name: 'web-api', confidence: 0.9 }
      },
      {
        patterns: ['test', 'spec', 'describe', 'it', 'expect'],
        concept: { type: 'infrastructure' as const, name: 'testing', confidence: 0.9 }
      },
      {
        patterns: ['config', 'env', 'settings', 'options'],
        concept: { type: 'infrastructure' as const, name: 'configuration', confidence: 0.7 }
      }
    ];

    conceptPatterns.forEach(({ patterns, concept }) => {
      const matches = patterns.filter(pattern => code.includes(pattern));
      if (matches.length > 0) {
        concepts.push({
          ...concept,
          confidence: concept.confidence * (matches.length / patterns.length)
        });
      }
    });

    return concepts;
  }

  /**
   * Extract architectural and design patterns from code
   */
  private extractPatterns(code: string): CodePattern[] {
    const patterns: CodePattern[] = [];

    // OOP patterns
    if (code.includes('constructor') && code.includes('private')) {
      patterns.push({
        type: 'oop',
        name: 'encapsulation',
        confidence: 0.8,
        description: 'Use of private members and constructors'
      });
    }

    if (code.includes('extends') || code.includes('super')) {
      patterns.push({
        type: 'oop',
        name: 'inheritance',
        confidence: 0.9,
        description: 'Class inheritance pattern'
      });
    }

    if (code.includes('implements')) {
      patterns.push({
        type: 'oop',
        name: 'interface-implementation',
        confidence: 0.9,
        description: 'Interface implementation pattern'
      });
    }

    // Module patterns
    if (code.includes('import') && code.includes('export')) {
      patterns.push({
        type: 'module',
        name: 'es6-modules',
        confidence: 0.9,
        description: 'ES6 module system usage'
      });
    }

    // Async patterns
    if (code.includes('async') && code.includes('await')) {
      patterns.push({
        type: 'async',
        name: 'async-await',
        confidence: 0.9,
        description: 'Modern async/await pattern'
      });
    }

    // Functional patterns
    if (code.includes('map') || code.includes('filter') || code.includes('reduce')) {
      patterns.push({
        type: 'functional',
        name: 'array-methods',
        confidence: 0.7,
        description: 'Functional array manipulation'
      });
    }

    // Architectural patterns
    if (code.includes('middleware') || code.includes('next()')) {
      patterns.push({
        type: 'architectural',
        name: 'middleware',
        confidence: 0.8,
        description: 'Middleware pattern for request processing'
      });
    }

    return patterns;
  }

  /**
   * Calculate code complexity metrics
   */
  private calculateComplexity(code: string): ComplexityMetrics {
    const lines = code.split('\n').filter(line => line.trim().length > 0).length;

    // Count control flow statements
    const conditions = (code.match(/\b(if|for|while|switch|catch|&&|\|\|)\b/g) || []).length;

    // Count function definitions
    const functions = (code.match(/\b(function|=>|async\s+function)\b/g) || []).length;

    // Basic cyclomatic complexity calculation
    const cyclomaticComplexity = conditions + functions + 1;

    // Simple maintainability index approximation
    const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(lines) - 0.23 * cyclomaticComplexity);

    return {
      lines,
      conditions,
      functions,
      cyclomaticComplexity,
      maintainabilityIndex
    };
  }

  /**
   * Extract dependencies from import statements
   */
  private extractDependencies(code: string): CodeDependency[] {
    const dependencies: CodeDependency[] = [];

    // ES6 imports
    const importRegex = /import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const path = match[1];
      dependencies.push({
        path,
        type: this.getDependencyType(path)
      });
    }

    // CommonJS requires
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      const path = match[1];
      dependencies.push({
        path,
        type: this.getDependencyType(path)
      });
    }

    return dependencies;
  }

  /**
   * Determine dependency type based on path
   */
  private getDependencyType(path: string): 'local' | 'external' | 'builtin' {
    if (path.startsWith('.') || path.startsWith('/')) {
      return 'local';
    }

    // Node.js built-in modules
    const builtinModules = [
      'fs', 'path', 'http', 'https', 'url', 'crypto', 'os', 'util', 'stream',
      'events', 'buffer', 'child_process', 'cluster', 'worker_threads'
    ];

    if (builtinModules.includes(path)) {
      return 'builtin';
    }

    return 'external';
  }

  /**
   * Extract exports from code
   */
  private extractExports(code: string): CodeExport[] {
    const exports: CodeExport[] = [];

    // Named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    let match;

    while ((match = namedExportRegex.exec(code)) !== null) {
      const name = match[1];
      const type = this.getExportType(match[0]);
      exports.push({ name, type });
    }

    // Export statements
    const exportStatementRegex = /export\s*{\s*([^}]+)\s*}/g;
    while ((match = exportStatementRegex.exec(code)) !== null) {
      const exportList = match[1];
      const names = exportList.split(',').map(name => name.trim().split(' as ')[0].trim());
      names.forEach(name => {
        if (name) {
          exports.push({ name, type: 'variable' });
        }
      });
    }

    // Default exports
    if (code.includes('export default')) {
      exports.push({ name: 'default', type: 'default' });
    }

    return exports;
  }

  /**
   * Determine export type from export statement
   */
  private getExportType(exportStatement: string): CodeExport['type'] {
    if (exportStatement.includes('class')) return 'class';
    if (exportStatement.includes('function')) return 'function';
    if (exportStatement.includes('interface')) return 'interface';
    return 'variable';
  }

  /**
   * Build code relationships between files
   */
  private async buildCodeRelationships(): Promise<void> {
    logger.debug('Building code relationships');

    // Initialize relationships for all analyzed files
    for (const [filePath, analysis] of this.semanticIndex) {
      const relationships: CodeRelationship = {
        imports: [],
        exports: analysis.exports,
        references: [],
        dependents: [],
        weight: 0
      };

      // Resolve local dependencies to actual file paths
      analysis.dependencies.forEach(dep => {
        if (dep.type === 'local') {
          const resolvedPath = this.resolveLocalPath(filePath, dep.path);
          if (resolvedPath && this.semanticIndex.has(resolvedPath)) {
            relationships.imports.push(resolvedPath);
          }
        }
      });

      this.codeRelationships.set(filePath, relationships);
    }

    // Build reverse relationships (dependents)
    this.buildReverseRelationships();

    // Calculate relationship weights
    this.calculateRelationshipWeights();

    logger.debug(`Code relationships built for ${this.codeRelationships.size} files`);
  }

  /**
   * Resolve local import path to actual file path
   */
  private resolveLocalPath(fromPath: string, importPath: string): string | null {
    try {
      const fromDir = path.dirname(fromPath);
      let resolvedPath = path.resolve(fromDir, importPath);

      // Try different extensions
      const extensions = ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'];

      for (const ext of extensions) {
        const pathWithExt = resolvedPath + ext;
        // Convert absolute path back to relative from project root
        const relativePath = path.relative(this.projectContext.root, pathWithExt);
        if (this.semanticIndex.has(relativePath)) {
          return relativePath;
        }
      }

      // Try index files
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, 'index' + ext);
        const relativePath = path.relative(this.projectContext.root, indexPath);
        if (this.semanticIndex.has(relativePath)) {
          return relativePath;
        }
      }

      return null;
    } catch (error) {
      logger.warn(`Failed to resolve path ${importPath} from ${fromPath}:`, error);
      return null;
    }
  }

  /**
   * Build reverse relationships (which files depend on each file)
   */
  private buildReverseRelationships(): void {
    for (const [filePath, relationships] of this.codeRelationships) {
      relationships.imports.forEach(importPath => {
        const importRelationships = this.codeRelationships.get(importPath);
        if (importRelationships) {
          importRelationships.dependents.push(filePath);
        }
      });
    }
  }

  /**
   * Calculate relationship weights based on coupling strength
   */
  private calculateRelationshipWeights(): void {
    for (const [filePath, relationships] of this.codeRelationships) {
      // Weight based on number of imports/exports and dependents
      const importWeight = relationships.imports.length * 2;
      const exportWeight = relationships.exports.length;
      const dependentWeight = relationships.dependents.length * 3;

      relationships.weight = importWeight + exportWeight + dependentWeight;
    }
  }

  /**
   * Initialize domain knowledge base
   */
  private async initializeDomainKnowledge(): Promise<void> {
    logger.debug('Initializing domain knowledge');

    const domains: DomainKnowledge[] = [
      {
        name: 'web-development',
        concepts: ['http', 'rest', 'api', 'middleware', 'router', 'cors', 'session'],
        patterns: ['mvc', 'service-layer', 'repository', 'middleware-chain'],
        technologies: ['express', 'fastify', 'koa', 'react', 'vue', 'angular'],
        bestPractices: [
          'Use proper HTTP status codes',
          'Implement proper error handling',
          'Validate input data',
          'Use HTTPS in production'
        ],
        commonIssues: [
          'Missing error handling',
          'SQL injection vulnerabilities',
          'CORS configuration problems',
          'Memory leaks in event listeners'
        ]
      },
      {
        name: 'data-management',
        concepts: ['database', 'orm', 'migration', 'schema', 'transaction', 'indexing'],
        patterns: ['active-record', 'data-mapper', 'unit-of-work', 'repository'],
        technologies: ['sequelize', 'typeorm', 'prisma', 'mongodb', 'postgresql'],
        bestPractices: [
          'Use parameterized queries',
          'Implement proper indexing',
          'Handle database connections properly',
          'Use transactions for data consistency'
        ],
        commonIssues: [
          'N+1 query problems',
          'Missing database indexes',
          'Connection pool exhaustion',
          'Data integrity violations'
        ]
      },
      {
        name: 'testing',
        concepts: ['unit-test', 'integration-test', 'mock', 'stub', 'spy', 'coverage'],
        patterns: ['arrange-act-assert', 'given-when-then', 'test-doubles'],
        technologies: ['jest', 'mocha', 'chai', 'cypress', 'playwright'],
        bestPractices: [
          'Write readable test names',
          'Keep tests independent',
          'Use proper test doubles',
          'Aim for good test coverage'
        ],
        commonIssues: [
          'Flaky tests',
          'Over-mocking',
          'Poor test organization',
          'Slow test execution'
        ]
      },
      {
        name: 'security',
        concepts: ['authentication', 'authorization', 'encryption', 'hashing', 'csrf', 'xss'],
        patterns: ['oauth', 'jwt', 'rbac', 'defense-in-depth'],
        technologies: ['passport', 'jsonwebtoken', 'bcrypt', 'helmet'],
        bestPractices: [
          'Never store passwords in plain text',
          'Use HTTPS for sensitive data',
          'Implement proper session management',
          'Validate and sanitize user input'
        ],
        commonIssues: [
          'Weak password policies',
          'Missing input validation',
          'Insecure session handling',
          'Exposure of sensitive data'
        ]
      },
      {
        name: 'performance',
        concepts: ['caching', 'optimization', 'profiling', 'bundling', 'lazy-loading'],
        patterns: ['caching-strategy', 'cdn', 'code-splitting', 'memoization'],
        technologies: ['redis', 'webpack', 'rollup', 'worker-threads'],
        bestPractices: [
          'Profile before optimizing',
          'Use appropriate caching strategies',
          'Minimize bundle sizes',
          'Implement lazy loading'
        ],
        commonIssues: [
          'Memory leaks',
          'Inefficient algorithms',
          'Unnecessary re-renders',
          'Large bundle sizes'
        ]
      }
    ];

    domains.forEach(domain => {
      this.domainKnowledge.set(domain.name, domain);
    });

    logger.debug(`Domain knowledge initialized for ${domains.length} domains`);
  }

  /**
   * Get enhanced context for a given query
   */
  async getEnhancedContext(query: string, options: Partial<AdvancedContextConfig> = {}): Promise<EnhancedContext> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.getCacheKey(query, options);
    if (this.config.enableCaching) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Returning cached context for query');
        return cached;
      }
    }

    try {
      // Generate enhanced context
      const context: EnhancedContext = {
        semanticMatches: this.findSemanticMatches(query),
        relatedCode: [],
        domainContext: this.getDomainContext(query),
        historicalContext: this.getRelevantHistory(query),
        suggestions: [],
        confidence: 0,
        processingTime: 0
      };

      // Find related code through relationships
      context.relatedCode = this.findRelatedCode(context.semanticMatches);

      // Generate contextual suggestions
      context.suggestions = this.generateContextualSuggestions(context);

      // Calculate overall confidence
      context.confidence = this.calculateContextConfidence(context);

      // Record processing time
      context.processingTime = Date.now() - startTime;

      // Cache the result
      if (this.config.enableCaching) {
        this.addToCache(cacheKey, context);
      }

      return context;
    } catch (error) {
      logger.error('Failed to generate enhanced context:', error);
      throw error;
    }
  }

  /**
   * Find semantic matches for a query
   */
  private findSemanticMatches(query: string): SemanticMatch[] {
    const matches: SemanticMatch[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

    for (const [filePath, analysis] of this.semanticIndex) {
      let score = 0;
      const matchedConcepts: string[] = [];
      const matchedSymbols: string[] = [];

      // Check symbol matches
      analysis.symbols.forEach(symbol => {
        const symbolName = symbol.name.toLowerCase();
        if (queryWords.some(word => symbolName.includes(word) || word.includes(symbolName))) {
          score += 10;
          matchedSymbols.push(symbol.name);
        }
      });

      // Check concept matches
      analysis.concepts.forEach(concept => {
        const conceptName = concept.name.toLowerCase();
        if (queryWords.some(word => conceptName.includes(word) || word.includes(conceptName))) {
          score += concept.confidence * 5;
          matchedConcepts.push(concept.name);
        }
      });

      // Check pattern matches
      analysis.patterns.forEach(pattern => {
        const patternName = pattern.name.toLowerCase();
        if (queryWords.some(word => patternName.includes(word) || word.includes(patternName))) {
          score += pattern.confidence * 3;
        }
      });

      // Boost score for files with higher complexity (likely more important)
      if (analysis.complexity.cyclomaticComplexity > 5) {
        score *= 1.2;
      }

      if (score > 0) {
        matches.push({
          filePath,
          score,
          analysis,
          matchedConcepts,
          matchedSymbols,
          relevanceReason: this.explainRelevance(query, analysis, matchedSymbols, matchedConcepts)
        });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxSemanticMatches);
  }

  /**
   * Explain why a file is relevant to the query
   */
  private explainRelevance(query: string, analysis: SemanticAnalysis, symbols: string[], concepts: string[]): string {
    const reasons: string[] = [];

    if (symbols.length > 0) {
      reasons.push(`Contains symbols: ${symbols.slice(0, 3).join(', ')}`);
    }

    if (concepts.length > 0) {
      reasons.push(`Related concepts: ${concepts.slice(0, 3).join(', ')}`);
    }

    if (analysis.patterns.length > 0) {
      const patterns = analysis.patterns.slice(0, 2).map(p => p.name);
      reasons.push(`Uses patterns: ${patterns.join(', ')}`);
    }

    return reasons.join('; ') || 'General relevance match';
  }

  /**
   * Find related code through relationships
   */
  private findRelatedCode(semanticMatches: SemanticMatch[]): string[] {
    const relatedFiles = new Set<string>();

    semanticMatches.forEach(match => {
      // Add the file itself
      relatedFiles.add(match.filePath);

      // Add related files through relationships
      const relationships = this.codeRelationships.get(match.filePath);
      if (relationships) {
        // Add imports (files this file depends on)
        relationships.imports.forEach(imp => relatedFiles.add(imp));

        // Add dependents (files that depend on this file)
        relationships.dependents.slice(0, 3).forEach(dep => relatedFiles.add(dep));
      }
    });

    return Array.from(relatedFiles);
  }

  /**
   * Get domain context for a query
   */
  private getDomainContext(query: string): DomainMatch[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const matches: DomainMatch[] = [];

    for (const [domainName, knowledge] of this.domainKnowledge) {
      let score = 0;
      const matchedConcepts: string[] = [];
      const applicablePatterns: string[] = [];

      // Check concept matches
      knowledge.concepts.forEach(concept => {
        if (queryWords.some(word => concept.toLowerCase().includes(word) || word.includes(concept.toLowerCase()))) {
          score += 2;
          matchedConcepts.push(concept);
        }
      });

      // Check pattern matches
      knowledge.patterns.forEach(pattern => {
        if (queryWords.some(word => pattern.toLowerCase().includes(word) || word.includes(pattern.toLowerCase()))) {
          score += 3;
          applicablePatterns.push(pattern);
        }
      });

      // Check technology matches
      knowledge.technologies.forEach(tech => {
        if (queryWords.some(word => tech.toLowerCase().includes(word) || word.includes(tech.toLowerCase()))) {
          score += 4;
        }
      });

      if (score > 0) {
        matches.push({
          domain: domainName,
          score,
          knowledge,
          matchedConcepts,
          applicablePatterns
        });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxDomainMatches);
  }

  /**
   * Get relevant historical context
   */
  private getRelevantHistory(query: string, maxItems?: number): HistoricalContext[] {
    if (!this.config.enableHistoricalTracking) {
      return [];
    }

    const limit = maxItems || Math.min(5, this.config.maxHistoryEntries);

    return this.historicalContext
      .filter(item => this.isHistoryRelevant(item, query))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Check if historical context is relevant to current query
   */
  private isHistoryRelevant(historyItem: HistoricalContext, query: string): boolean {
    const queryLower = query.toLowerCase();
    const historyLower = historyItem.query.toLowerCase();

    // Check for common words (basic similarity)
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 3);
    const historyWords = historyLower.split(/\s+/).filter(word => word.length > 3);

    const commonWords = queryWords.filter(word => historyWords.includes(word));

    if (commonWords.length > 0) {
      return true;
    }

    // Check if any files referenced in history are relevant to current query
    const currentMatches = this.findSemanticMatches(query);
    const relevantFiles = new Set(currentMatches.map(m => m.filePath));

    return historyItem.filesReferenced.some(file => relevantFiles.has(file));
  }

  /**
   * Generate contextual suggestions based on analysis
   */
  private generateContextualSuggestions(context: EnhancedContext): string[] {
    const suggestions: string[] = [];

    // Suggestions based on semantic matches
    if (context.semanticMatches.length > 0) {
      const topMatch = context.semanticMatches[0];
      suggestions.push(`Explore ${topMatch.filePath} for ${topMatch.matchedSymbols.slice(0, 2).join(' and ')} implementation`);

      // Suggest related files
      const relationships = this.codeRelationships.get(topMatch.filePath);
      if (relationships?.imports?.length && relationships.imports.length > 0) {
        suggestions.push(`Check dependencies: ${relationships.imports.slice(0, 2).join(', ')}`);
      }

      if (relationships?.dependents?.length && relationships.dependents.length > 0) {
        suggestions.push(`See usage in: ${relationships.dependents.slice(0, 2).join(', ')}`);
      }
    }

    // Suggestions based on domain context
    if (context.domainContext.length > 0) {
      const topDomain = context.domainContext[0];

      if (topDomain.knowledge.bestPractices.length > 0) {
        const practice = topDomain.knowledge.bestPractices[0];
        suggestions.push(`Consider ${topDomain.domain} best practice: ${practice}`);
      }

      if (topDomain.applicablePatterns.length > 0) {
        suggestions.push(`Apply ${topDomain.applicablePatterns[0]} pattern for better architecture`);
      }
    }

    // Suggestions based on historical context
    if (context.historicalContext.length > 0) {
      const recentHistory = context.historicalContext[0];
      suggestions.push(`Related to previous query: "${recentHistory.query.slice(0, 50)}..."`);
    }

    return suggestions.slice(0, this.config.maxSuggestions);
  }

  /**
   * Calculate overall context confidence
   */
  private calculateContextConfidence(context: EnhancedContext): number {
    let confidence = 0;
    let factors = 0;

    // Factor in semantic matches
    if (context.semanticMatches.length > 0) {
      const avgScore = context.semanticMatches.reduce((sum, match) => sum + match.score, 0) / context.semanticMatches.length;
      confidence += Math.min(avgScore / 20, 1) * THRESHOLD_CONSTANTS.WEIGHTS.MAJOR; // 40% weight
      factors++;
    }

    // Factor in domain context
    if (context.domainContext.length > 0) {
      const domainConfidence = context.domainContext[0].score / 10;
      confidence += Math.min(domainConfidence, 1) * THRESHOLD_CONSTANTS.WEIGHTS.MODERATE; // 30% weight
      factors++;
    }

    // Factor in related code availability
    if (context.relatedCode.length > 0) {
      confidence += Math.min(context.relatedCode.length / 10, 1) * THRESHOLD_CONSTANTS.WEIGHTS.MINOR; // 20% weight
      factors++;
    }

    // Factor in historical context
    if (context.historicalContext.length > 0) {
      confidence += THRESHOLD_CONSTANTS.WEIGHTS.SMALL; // 10% weight
      factors++;
    }

    return factors > 0 ? confidence : 0;
  }

  /**
   * Add query result to historical context
   */
  addToHistory(query: string, result: string, filesReferenced: string[] = []): void {
    if (!this.config.enableHistoricalTracking) {
      return;
    }

    this.historicalContext.push({
      timestamp: Date.now(),
      query,
      result,
      filesReferenced,
      contextUsed: {
        semanticMatches: this.findSemanticMatches(query).length,
        domainContext: this.getDomainContext(query).length,
        relatedFiles: filesReferenced.length
      }
    });

    // Keep only recent history
    if (this.historicalContext.length > this.config.maxHistoryEntries) {
      this.historicalContext = this.historicalContext.slice(-this.config.maxHistoryEntries);
    }
  }

  /**
   * Get context statistics
   */
  getContextStats() {
    return {
      semanticIndex: {
        filesIndexed: this.semanticIndex.size,
        totalSymbols: Array.from(this.semanticIndex.values())
          .reduce((sum, analysis) => sum + analysis.symbols.length, 0),
        totalConcepts: Array.from(this.semanticIndex.values())
          .reduce((sum, analysis) => sum + analysis.concepts.length, 0),
        totalPatterns: Array.from(this.semanticIndex.values())
          .reduce((sum, analysis) => sum + analysis.patterns.length, 0),
        averageComplexity: Array.from(this.semanticIndex.values())
          .reduce((sum, analysis) => sum + analysis.complexity.cyclomaticComplexity, 0) / this.semanticIndex.size
      },
      relationships: {
        totalFiles: this.codeRelationships.size,
        totalImports: Array.from(this.codeRelationships.values())
          .reduce((sum, rel) => sum + rel.imports.length, 0),
        totalExports: Array.from(this.codeRelationships.values())
          .reduce((sum, rel) => sum + rel.exports.length, 0),
        averageWeight: Array.from(this.codeRelationships.values())
          .reduce((sum, rel) => sum + rel.weight, 0) / this.codeRelationships.size
      },
      domainKnowledge: {
        domains: this.domainKnowledge.size,
        totalConcepts: Array.from(this.domainKnowledge.values())
          .reduce((sum, domain) => sum + domain.concepts.length, 0),
        totalPatterns: Array.from(this.domainKnowledge.values())
          .reduce((sum, domain) => sum + domain.patterns.length, 0),
        totalTechnologies: Array.from(this.domainKnowledge.values())
          .reduce((sum, domain) => sum + domain.technologies.length, 0)
      },
      history: {
        totalEntries: this.historicalContext.length,
        avgContextUsage: this.historicalContext.length > 0
          ? this.historicalContext.reduce((sum, item) =>
              sum + item.contextUsed.semanticMatches + item.contextUsed.domainContext, 0) / this.historicalContext.length
          : 0
      },
      cache: {
        entries: this.contextCache.size,
        hitRate: 0 // Would need to track hits/misses for real implementation
      }
    };
  }

  /**
   * Cache management methods
   */
  private getCacheKey(query: string, options: Partial<AdvancedContextConfig>): string {
    return `${query.toLowerCase()}_${JSON.stringify(options)}`;
  }

  private getFromCache(key: string): EnhancedContext | null {
    const entry = this.contextCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.context;
    }

    if (entry) {
      this.contextCache.delete(key);
    }

    return null;
  }

  private addToCache(key: string, context: EnhancedContext): void {
    const entry: ContextCacheEntry = {
      query: key,
      context,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.cacheExpirationMs
    };

    this.contextCache.set(key, entry);

    // Clean up expired entries periodically
    if (this.contextCache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.contextCache) {
      if (entry.expiresAt <= now) {
        this.contextCache.delete(key);
      }
    }
  }

  /**
   * Force refresh of semantic index for specific files
   */
  async refreshSemanticIndex(filePaths?: string[]): Promise<void> {
    const targetFiles = filePaths || Array.from(this.semanticIndex.keys());

    for (const filePath of targetFiles) {
      try {
        const file = this.projectContext.allFiles?.find(f => f.path === filePath);
        if (file && this.isAnalyzableFile(file)) {
          const analysis = await this.analyzeFile(file);
          this.semanticIndex.set(filePath, analysis);
        }
      } catch (error) {
        logger.warn(`Failed to refresh semantic index for ${filePath}:`, error);
      }
    }

    // Rebuild relationships for updated files
    await this.buildCodeRelationships();

    // Clear cache to ensure fresh results
    this.contextCache.clear();
  }

  /**
   * Get detailed analysis for a specific file
   */
  getFileAnalysis(filePath: string): SemanticAnalysis | null {
    return this.semanticIndex.get(filePath) || null;
  }

  /**
   * Get relationships for a specific file
   */
  getFileRelationships(filePath: string): CodeRelationship | null {
    return this.codeRelationships.get(filePath) || null;
  }

  /**
   * Check if the context manager is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.contextCache.clear();
    this.historicalContext = [];
    logger.debug('Advanced Context Manager cleaned up');
  }
}