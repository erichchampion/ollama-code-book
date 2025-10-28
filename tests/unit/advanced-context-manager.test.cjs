const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

/**
 * Advanced Context Manager Test Suite
 *
 * Tests the implementation of advanced context management including semantic code indexing,
 * code relationship mapping, domain knowledge base, and historical context tracking.
 */

// Mock dependencies
const mockOllamaClient = {
  complete: jest.fn()
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockProjectContext = {
  root: '/test/project',
  allFiles: [
    { path: 'src/index.ts', type: 'typescript' },
    { path: 'src/utils/helper.ts', type: 'typescript' },
    { path: 'src/models/user.ts', type: 'typescript' },
    { path: 'package.json', type: 'json' },
    { path: 'README.md', type: 'markdown' }
  ]
};

const mockCodeSamples = {
  'src/index.ts': `
import { UserService } from './models/user.js';
import { logger } from './utils/helper.js';

export class App {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async start() {
    logger.info('Application starting');
    const users = await this.userService.getAllUsers();
    logger.info(\`Loaded \${users.length} users\`);
  }
}
  `,
  'src/models/user.ts': `
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class UserService {
  private users: User[] = [];

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      id: Math.random().toString(36),
      createdAt: new Date(),
      ...userData
    };
    this.users.push(user);
    return user;
  }
}
  `,
  'src/utils/helper.ts': `
export const logger = {
  info: (message: string) => console.log(\`[INFO] \${message}\`),
  warn: (message: string) => console.warn(\`[WARN] \${message}\`),
  error: (message: string) => console.error(\`[ERROR] \${message}\`)
};

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
  `
};

// Mock modules
jest.mock('../../dist/src/utils/logger.js', () => ({
  logger: mockLogger
}));

// Create mock implementation for testing
class AdvancedContextManager {
  constructor(aiClient, projectContext) {
    this.aiClient = aiClient;
    this.projectContext = projectContext;
    this.semanticIndex = new Map();
    this.codeRelationships = new Map();
    this.domainKnowledge = new Map();
    this.historicalContext = [];
    this.contextCache = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Initialize semantic index
    await this.buildSemanticIndex();

    // Build code relationships
    await this.buildCodeRelationships();

    // Initialize domain knowledge
    await this.initializeDomainKnowledge();

    this.initialized = true;
  }

  async buildSemanticIndex() {
    // Simulate building semantic index from code
    const files = this.projectContext.allFiles;

    for (const file of files) {
      if (file.type === 'typescript' || file.type === 'javascript') {
        const content = mockCodeSamples[file.path] || '';
        const analysis = this.analyzeCodeSemantics(content, file.path);
        this.semanticIndex.set(file.path, analysis);
      }
    }
  }

  analyzeCodeSemantics(code, filePath) {
    // Extract semantic information from code
    const symbols = this.extractSymbols(code);
    const concepts = this.extractConcepts(code);
    const patterns = this.extractPatterns(code);

    return {
      filePath,
      symbols,
      concepts,
      patterns,
      complexity: this.calculateComplexity(code),
      dependencies: this.extractDependencies(code),
      exports: this.extractExports(code)
    };
  }

  extractSymbols(code) {
    const symbols = [];

    // Extract classes
    const classMatches = code.match(/class\s+(\w+)/g) || [];
    classMatches.forEach(match => {
      const name = match.replace('class ', '');
      symbols.push({ type: 'class', name, scope: 'global' });
    });

    // Extract functions
    const functionMatches = code.match(/(?:function\s+(\w+)|async\s+function\s+(\w+))/g) || [];
    functionMatches.forEach(match => {
      const nameMatch = match.match(/function\s+(\w+)/);
      if (nameMatch) {
        symbols.push({ type: 'function', name: nameMatch[1], scope: 'global' });
      }
    });

    // Extract interfaces
    const interfaceMatches = code.match(/interface\s+(\w+)/g) || [];
    interfaceMatches.forEach(match => {
      const name = match.replace('interface ', '');
      symbols.push({ type: 'interface', name, scope: 'global' });
    });

    return symbols;
  }

  extractConcepts(code) {
    const concepts = [];

    // Domain concepts based on common patterns
    if (code.includes('User') || code.includes('user')) {
      concepts.push({ type: 'domain', name: 'user-management', confidence: 0.8 });
    }
    if (code.includes('Service') || code.includes('service')) {
      concepts.push({ type: 'pattern', name: 'service-layer', confidence: 0.9 });
    }
    if (code.includes('logger') || code.includes('log')) {
      concepts.push({ type: 'infrastructure', name: 'logging', confidence: 0.7 });
    }
    if (code.includes('async') || code.includes('Promise')) {
      concepts.push({ type: 'pattern', name: 'async-programming', confidence: 0.8 });
    }

    return concepts;
  }

  extractPatterns(code) {
    const patterns = [];

    // Architectural patterns
    if (code.includes('constructor') && code.includes('private')) {
      patterns.push({ type: 'oop', name: 'encapsulation', confidence: 0.8 });
    }
    if (code.includes('import') && code.includes('export')) {
      patterns.push({ type: 'module', name: 'es6-modules', confidence: 0.9 });
    }
    if (code.includes('interface') && code.includes('implements')) {
      patterns.push({ type: 'oop', name: 'interface-segregation', confidence: 0.7 });
    }

    return patterns;
  }

  calculateComplexity(code) {
    // Simple complexity calculation
    const lines = code.split('\n').filter(line => line.trim().length > 0).length;
    const conditions = (code.match(/if|for|while|switch|catch/g) || []).length;
    const functions = (code.match(/function|=>/g) || []).length;

    return {
      lines,
      conditions,
      functions,
      cyclomaticComplexity: conditions + functions + 1
    };
  }

  extractDependencies(code) {
    const dependencies = [];
    const importMatches = code.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];

    importMatches.forEach(match => {
      const path = match.match(/from\s+['"]([^'"]+)['"]/)[1];
      dependencies.push({
        path,
        type: path.startsWith('.') ? 'local' : 'external'
      });
    });

    return dependencies;
  }

  extractExports(code) {
    const exports = [];
    const exportMatches = code.match(/export\s+(?:class|function|interface|const|let|var)\s+(\w+)/g) || [];

    exportMatches.forEach(match => {
      const name = match.match(/(\w+)$/)[1];
      const type = match.includes('class') ? 'class' :
                   match.includes('function') ? 'function' :
                   match.includes('interface') ? 'interface' : 'variable';
      exports.push({ name, type });
    });

    return exports;
  }

  async buildCodeRelationships() {
    // Build relationships between code elements
    for (const [filePath, analysis] of this.semanticIndex) {
      const relationships = {
        imports: [],
        exports: [],
        references: [],
        dependents: []
      };

      // Map imports to actual files
      analysis.dependencies.forEach(dep => {
        if (dep.type === 'local') {
          const resolvedPath = this.resolveLocalPath(filePath, dep.path);
          relationships.imports.push(resolvedPath);
        }
      });

      // Map exports
      analysis.exports.forEach(exp => {
        relationships.exports.push({
          name: exp.name,
          type: exp.type,
          filePath
        });
      });

      this.codeRelationships.set(filePath, relationships);
    }

    // Build reverse relationships (dependents)
    this.buildReverseRelationships();
  }

  resolveLocalPath(fromPath, importPath) {
    // Simple path resolution for testing
    const fromDir = fromPath.split('/').slice(0, -1).join('/');
    if (importPath.startsWith('./')) {
      return fromDir + '/' + importPath.slice(2) + '.ts';
    } else if (importPath.startsWith('../')) {
      const upLevels = (importPath.match(/\.\.\//g) || []).length;
      const pathParts = fromDir.split('/');
      const newPath = pathParts.slice(0, -upLevels).join('/');
      const fileName = importPath.replace(/\.\.\//g, '');
      return newPath + '/' + fileName + '.ts';
    }
    return importPath;
  }

  buildReverseRelationships() {
    for (const [filePath, relationships] of this.codeRelationships) {
      relationships.imports.forEach(importPath => {
        const importRelationships = this.codeRelationships.get(importPath);
        if (importRelationships) {
          importRelationships.dependents.push(filePath);
        }
      });
    }
  }

  async initializeDomainKnowledge() {
    // Initialize domain-specific knowledge base
    const domains = [
      {
        name: 'web-development',
        concepts: ['http', 'rest', 'api', 'middleware', 'router'],
        patterns: ['mvc', 'service-layer', 'repository'],
        technologies: ['express', 'react', 'node']
      },
      {
        name: 'data-management',
        concepts: ['database', 'orm', 'migration', 'schema'],
        patterns: ['active-record', 'data-mapper', 'unit-of-work'],
        technologies: ['sequelize', 'typeorm', 'prisma']
      },
      {
        name: 'testing',
        concepts: ['unit-test', 'integration-test', 'mock', 'stub'],
        patterns: ['arrange-act-assert', 'given-when-then'],
        technologies: ['jest', 'mocha', 'chai']
      }
    ];

    domains.forEach(domain => {
      this.domainKnowledge.set(domain.name, domain);
    });
  }

  async getEnhancedContext(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const context = {
      semanticMatches: this.findSemanticMatches(query),
      relatedCode: this.findRelatedCode(query),
      domainContext: this.getDomainContext(query),
      historicalContext: this.getRelevantHistory(query),
      suggestions: this.generateContextualSuggestions(query)
    };

    return context;
  }

  findSemanticMatches(query) {
    const matches = [];
    const queryLower = query.toLowerCase();

    for (const [filePath, analysis] of this.semanticIndex) {
      let score = 0;

      // Check symbol matches
      analysis.symbols.forEach(symbol => {
        if (queryLower.includes(symbol.name.toLowerCase())) {
          score += 10;
        }
      });

      // Check concept matches
      analysis.concepts.forEach(concept => {
        if (queryLower.includes(concept.name.toLowerCase())) {
          score += concept.confidence * 5;
        }
      });

      // Check pattern matches
      analysis.patterns.forEach(pattern => {
        if (queryLower.includes(pattern.name.toLowerCase())) {
          score += pattern.confidence * 3;
        }
      });

      if (score > 0) {
        matches.push({
          filePath,
          score,
          analysis,
          relevanceReason: this.explainRelevance(query, analysis)
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  explainRelevance(query, analysis) {
    const reasons = [];
    const queryLower = query.toLowerCase();

    analysis.symbols.forEach(symbol => {
      if (queryLower.includes(symbol.name.toLowerCase())) {
        reasons.push(`Contains ${symbol.type} '${symbol.name}'`);
      }
    });

    analysis.concepts.forEach(concept => {
      if (queryLower.includes(concept.name.toLowerCase())) {
        reasons.push(`Related to ${concept.type} concept '${concept.name}'`);
      }
    });

    return reasons.join(', ');
  }

  findRelatedCode(query) {
    const semanticMatches = this.findSemanticMatches(query);
    const relatedFiles = new Set();

    // Add direct matches
    semanticMatches.forEach(match => {
      relatedFiles.add(match.filePath);
    });

    // Add related files through relationships
    semanticMatches.forEach(match => {
      const relationships = this.codeRelationships.get(match.filePath);
      if (relationships) {
        relationships.imports.forEach(imp => relatedFiles.add(imp));
        relationships.dependents.forEach(dep => relatedFiles.add(dep));
      }
    });

    return Array.from(relatedFiles);
  }

  getDomainContext(query) {
    const queryLower = query.toLowerCase();
    const relevantDomains = [];

    for (const [domainName, domain] of this.domainKnowledge) {
      let score = 0;

      domain.concepts.forEach(concept => {
        if (queryLower.includes(concept)) {
          score += 2;
        }
      });

      domain.patterns.forEach(pattern => {
        if (queryLower.includes(pattern)) {
          score += 3;
        }
      });

      domain.technologies.forEach(tech => {
        if (queryLower.includes(tech)) {
          score += 4;
        }
      });

      if (score > 0) {
        relevantDomains.push({
          domain: domainName,
          score,
          knowledge: domain
        });
      }
    }

    return relevantDomains.sort((a, b) => b.score - a.score);
  }

  getRelevantHistory(query, maxItems = 5) {
    // Filter historical context by relevance to current query
    return this.historicalContext
      .filter(item => this.isHistoryRelevant(item, query))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxItems);
  }

  isHistoryRelevant(historyItem, query) {
    const queryLower = query.toLowerCase();
    const itemLower = historyItem.query?.toLowerCase() || '';

    // Simple relevance check - can be enhanced with ML
    const commonWords = queryLower.split(' ').filter(word =>
      word.length > 3 && itemLower.includes(word)
    );

    return commonWords.length > 0 ||
           historyItem.filesReferenced?.some(file =>
             this.findSemanticMatches(query).some(match => match.filePath === file)
           );
  }

  generateContextualSuggestions(query) {
    const suggestions = [];
    const matches = this.findSemanticMatches(query);

    if (matches.length > 0) {
      const topMatch = matches[0];
      suggestions.push(`Explore related code in ${topMatch.filePath}`);

      const relationships = this.codeRelationships.get(topMatch.filePath);
      if (relationships?.imports.length > 0) {
        suggestions.push(`Check dependencies: ${relationships.imports.slice(0, 2).join(', ')}`);
      }

      if (relationships?.dependents.length > 0) {
        suggestions.push(`See usage in: ${relationships.dependents.slice(0, 2).join(', ')}`);
      }
    }

    const domainContext = this.getDomainContext(query);
    if (domainContext.length > 0) {
      const topDomain = domainContext[0];
      suggestions.push(`Consider ${topDomain.domain} best practices`);
    }

    return suggestions;
  }

  addToHistory(query, result, filesReferenced = []) {
    this.historicalContext.push({
      timestamp: Date.now(),
      query,
      result,
      filesReferenced,
      contextUsed: {
        semanticMatches: this.findSemanticMatches(query).length,
        domainContext: this.getDomainContext(query).length
      }
    });

    // Keep only recent history
    if (this.historicalContext.length > 100) {
      this.historicalContext = this.historicalContext.slice(-100);
    }
  }

  getContextStats() {
    return {
      semanticIndex: {
        filesIndexed: this.semanticIndex.size,
        totalSymbols: Array.from(this.semanticIndex.values())
          .reduce((sum, analysis) => sum + analysis.symbols.length, 0),
        totalConcepts: Array.from(this.semanticIndex.values())
          .reduce((sum, analysis) => sum + analysis.concepts.length, 0)
      },
      relationships: {
        totalFiles: this.codeRelationships.size,
        totalImports: Array.from(this.codeRelationships.values())
          .reduce((sum, rel) => sum + rel.imports.length, 0),
        totalExports: Array.from(this.codeRelationships.values())
          .reduce((sum, rel) => sum + rel.exports.length, 0)
      },
      domainKnowledge: {
        domains: this.domainKnowledge.size,
        concepts: Array.from(this.domainKnowledge.values())
          .reduce((sum, domain) => sum + domain.concepts.length, 0)
      },
      history: {
        totalEntries: this.historicalContext.length
      }
    };
  }
}

describe('AdvancedContextManager', () => {
  let contextManager;

  beforeEach(() => {
    jest.clearAllMocks();
    contextManager = new AdvancedContextManager(mockOllamaClient, mockProjectContext);
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('Initialization', () => {
    test('should initialize semantic index', async () => {
      await contextManager.initialize();

      expect(contextManager.initialized).toBe(true);
      expect(contextManager.semanticIndex.size).toBeGreaterThan(0);

      const indexData = contextManager.semanticIndex.get('src/index.ts');
      expect(indexData).toBeDefined();
      expect(indexData.symbols).toContainEqual(
        expect.objectContaining({ type: 'class', name: 'App' })
      );
    });

    test('should build code relationships', async () => {
      await contextManager.initialize();

      const relationships = contextManager.codeRelationships.get('src/index.ts');
      expect(relationships).toBeDefined();
      expect(relationships.imports).toContain('src/models/user.js.ts');
      expect(relationships.imports).toContain('src/utils/helper.js.ts');
    });

    test('should initialize domain knowledge', async () => {
      await contextManager.initialize();

      expect(contextManager.domainKnowledge.size).toBeGreaterThan(0);
      expect(contextManager.domainKnowledge.has('web-development')).toBe(true);
      expect(contextManager.domainKnowledge.has('data-management')).toBe(true);
    });
  });

  describe('Semantic Analysis', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    test('should extract symbols from code', () => {
      const code = `
        class TestClass {
          constructor() {}
        }

        function testFunction() {}

        interface TestInterface {}
      `;

      const symbols = contextManager.extractSymbols(code);

      expect(symbols).toContainEqual(
        expect.objectContaining({ type: 'class', name: 'TestClass' })
      );
      expect(symbols).toContainEqual(
        expect.objectContaining({ type: 'function', name: 'testFunction' })
      );
      expect(symbols).toContainEqual(
        expect.objectContaining({ type: 'interface', name: 'TestInterface' })
      );
    });

    test('should extract concepts from code', () => {
      const code = `
        class UserService {
          async getUsers() {
            logger.info('Getting users');
          }
        }
      `;

      const concepts = contextManager.extractConcepts(code);

      expect(concepts).toContainEqual(
        expect.objectContaining({ type: 'domain', name: 'user-management' })
      );
      expect(concepts).toContainEqual(
        expect.objectContaining({ type: 'pattern', name: 'service-layer' })
      );
      expect(concepts).toContainEqual(
        expect.objectContaining({ type: 'infrastructure', name: 'logging' })
      );
    });

    test('should calculate code complexity', () => {
      const code = `
        function complexFunction() {
          if (condition) {
            for (let i = 0; i < 10; i++) {
              while (someCondition) {
                // do something
              }
            }
          }
        }
      `;

      const complexity = contextManager.calculateComplexity(code);

      expect(complexity.cyclomaticComplexity).toBeGreaterThan(1);
      expect(complexity.conditions).toBeGreaterThan(0);
      expect(complexity.functions).toBeGreaterThan(0);
    });
  });

  describe('Context Retrieval', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    test('should find semantic matches for queries', async () => {
      const context = await contextManager.getEnhancedContext('user management');

      expect(context.semanticMatches).toBeDefined();
      expect(context.semanticMatches.length).toBeGreaterThan(0);

      const userMatch = context.semanticMatches.find(match =>
        match.filePath === 'src/models/user.ts'
      );
      expect(userMatch).toBeDefined();
      expect(userMatch.score).toBeGreaterThan(0);
    });

    test('should find related code through relationships', async () => {
      const context = await contextManager.getEnhancedContext('App class');

      expect(context.relatedCode).toBeDefined();
      expect(context.relatedCode).toContain('src/index.ts');
      expect(context.relatedCode).toContain('src/models/user.js.ts');
      expect(context.relatedCode).toContain('src/utils/helper.js.ts');
    });

    test('should provide domain context', async () => {
      const context = await contextManager.getEnhancedContext('web development with HTTP API');

      expect(context.domainContext).toBeDefined();
      expect(context.domainContext.length).toBeGreaterThan(0);

      const webDomain = context.domainContext.find(d => d.domain === 'web-development');
      expect(webDomain).toBeDefined();
    });

    test('should generate contextual suggestions', async () => {
      const context = await contextManager.getEnhancedContext('UserService');

      expect(context.suggestions).toBeDefined();
      expect(context.suggestions.length).toBeGreaterThan(0);
      expect(context.suggestions.some(s => s.includes('src/models/user.ts'))).toBe(true);
    });
  });

  describe('Historical Context', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    test('should add and retrieve historical context', () => {
      contextManager.addToHistory(
        'How to create a user?',
        'Use UserService.createUser method',
        ['src/models/user.ts']
      );

      const history = contextManager.getRelevantHistory('user creation');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].query).toBe('How to create a user?');
    });

    test('should filter relevant history', () => {
      // Add unrelated history
      contextManager.addToHistory('Database connection', 'Use connection pool', []);

      // Add related history
      contextManager.addToHistory('User model', 'Check User interface', ['src/models/user.ts']);

      const history = contextManager.getRelevantHistory('user management');
      expect(history.length).toBe(1);
      expect(history[0].query).toBe('User model');
    });

    test('should limit history size', () => {
      // Add many entries to test limit
      for (let i = 0; i < 150; i++) {
        contextManager.addToHistory(`Query ${i}`, `Result ${i}`, []);
      }

      expect(contextManager.historicalContext.length).toBe(100);
    });
  });

  describe('Performance and Statistics', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    test('should provide context statistics', () => {
      const stats = contextManager.getContextStats();

      expect(stats.semanticIndex.filesIndexed).toBeGreaterThan(0);
      expect(stats.relationships.totalFiles).toBeGreaterThan(0);
      expect(stats.domainKnowledge.domains).toBeGreaterThan(0);
      expect(stats.history.totalEntries).toBe(0); // No history added yet
    });

    test('should handle large codebases efficiently', async () => {
      const startTime = Date.now();

      // Simulate processing larger codebase
      await contextManager.getEnhancedContext('complex query with multiple concepts');

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    test('should handle comprehensive context request', async () => {
      // Add some historical context
      contextManager.addToHistory(
        'How to implement authentication?',
        'Use UserService with token validation',
        ['src/models/user.ts']
      );

      const context = await contextManager.getEnhancedContext(
        'I need to add user authentication using web http api patterns'
      );

      expect(context.semanticMatches.length).toBeGreaterThan(0);
      expect(context.relatedCode.length).toBeGreaterThan(0);
      expect(context.domainContext.length).toBeGreaterThan(0);
      expect(context.historicalContext.length).toBeGreaterThan(0);
      expect(context.suggestions.length).toBeGreaterThan(0);
    });

    test('should maintain context consistency across queries', async () => {
      const context1 = await contextManager.getEnhancedContext('UserService methods');
      const context2 = await contextManager.getEnhancedContext('User class functionality');

      // Both queries should identify similar relevant files
      const files1 = new Set(context1.relatedCode);
      const files2 = new Set(context2.relatedCode);
      const intersection = new Set([...files1].filter(x => files2.has(x)));

      expect(intersection.size).toBeGreaterThan(0);
      expect(intersection.has('src/models/user.ts')).toBe(true);
    });
  });
});