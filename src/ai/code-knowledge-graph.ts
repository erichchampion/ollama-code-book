/**
 * Code Knowledge Graph
 *
 * Advanced knowledge graph implementation for code analysis and relationship mapping.
 * Provides intelligent code understanding through graph-based analysis, pattern
 * identification, and contextual recommendations.
 *
 * Features:
 * - Semantic code indexing with entity recognition
 * - Multi-dimensional relationship mapping
 * - Architectural pattern identification
 * - Data flow analysis and visualization
 * - Best practices integration and suggestions
 * - Performance-optimized graph operations
 * - Dynamic graph updates and maintenance
 */

import { ProjectContext } from './context.js';
import * as fs from 'fs';
import * as path from 'path';

// Core graph data structures
export interface GraphNode {
  id: string;
  type: 'file' | 'class' | 'function' | 'variable' | 'interface' | 'module' | 'concept';
  name: string;
  properties: Record<string, any>;
  metadata?: {
    created: Date;
    updated: Date;
    confidence: number;
    source: string;
  };
}

export interface GraphEdge {
  id: string;
  type: 'imports' | 'exports' | 'calls' | 'extends' | 'implements' | 'uses' | 'contains' | 'related_to';
  source: string;
  target: string;
  properties?: Record<string, any>;
  weight?: number;
  metadata?: {
    created: Date;
    confidence: number;
    strength: number;
  };
}

export interface GraphSchema {
  nodeTypes: string[];
  edgeTypes: string[];
  properties: string[];
  constraints?: {
    maxNodes: number;
    maxEdges: number;
    maxDepth: number;
  };
}

// Pattern and analysis interfaces
export interface CodePattern {
  id: string;
  type: 'service_layer' | 'repository' | 'factory' | 'observer' | 'singleton' | 'mvc' | 'crud_operations' | 'validation' | 'error_handling';
  name: string;
  confidence: number;
  nodes: string[];
  description?: string;
  examples?: string[];
  metadata?: {
    identified: Date;
    validator: string;
    complexity: 'low' | 'medium' | 'high';
  };
}

export interface BestPractice {
  id: string;
  category: 'architecture' | 'performance' | 'security' | 'maintainability' | 'testing';
  name: string;
  description: string;
  applicablePatterns: string[];
  recommendations: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface DataFlowPath {
  id: string;
  source: string;
  target: string;
  path: string[];
  flowType: 'data_dependency' | 'control_flow' | 'information_flow' | 'event_flow';
  confidence: number;
  complexity: 'low' | 'medium' | 'high';
  metadata?: {
    analyzed: Date;
    pathLength: number;
    cyclic: boolean;
  };
}

// Query and result interfaces
export interface GraphQuery {
  query: string;
  nodeTypes?: string[];
  edgeTypes?: string[];
  filters?: Record<string, any>;
  limit?: number;
  depth?: number;
  includePatterns?: boolean;
  includeBestPractices?: boolean;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  patterns: CodePattern[];
  bestPractices: BestPractice[];
  dataFlows: DataFlowPath[];
  confidence: number;
  executionTime: number;
  metadata: {
    queryId: string;
    timestamp: Date;
    resultCount: number;
    cacheHit: boolean;
  };
}

export interface RelatedCodeResult {
  directRelations: Array<{
    id: string;
    type: string;
    name: string;
    distance: number;
    relationshipType: string;
    confidence: number;
  }>;
  indirectRelations: Array<{
    id: string;
    type: string;
    name: string;
    distance: number;
    path: string[];
    confidence: number;
  }>;
  patterns: CodePattern[];
  confidence: number;
  metadata: {
    searchDepth: number;
    totalRelations: number;
    searchTime: number;
  };
}

export interface ImprovementSuggestion {
  id: string;
  type: 'architecture' | 'performance' | 'security' | 'maintainability' | 'testing' | 'code_quality';
  category: 'refactoring' | 'optimization' | 'modernization' | 'best_practices';
  title: string;
  suggestion: string;
  rationale: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  applicableNodes: string[];
  relatedPatterns: string[];
  bestPractices: string[];
  metadata?: {
    generated: Date;
    source: string;
    validated: boolean;
  };
}

// Configuration interface
export interface GraphConfig {
  maxNodes: number;
  maxEdges: number;
  maxPatterns: number;
  indexingTimeout: number;
  queryTimeout: number;
  enableCaching: boolean;
  cacheExpirationMs: number;
  enablePatternMatching: boolean;
  enableDataFlowAnalysis: boolean;
  enableBestPracticesLinking: boolean;
  performanceOptimization: boolean;
  maxCacheSize: number;
  maxSearchDepth: number;
  confidenceThreshold: number;
}

// Statistics interfaces
export interface GraphStatistics {
  graph: {
    nodeCount: number;
    edgeCount: number;
    patternCount: number;
    bestPracticeCount: number;
    density: number;
    avgDegree: number;
    maxDepth: number;
    componentCount: number;
  };
  performance: {
    avgQueryTime: number;
    avgIndexingTime: number;
    cacheHitRate: number;
    memoryUsage: number;
    lastOptimization: Date;
  };
  quality: {
    avgConfidence: number;
    patternCoverage: number;
    relationshipAccuracy: number;
    dataFlowCompleteness: number;
    bestPracticeAdherence: number;
  };
  usage: {
    totalQueries: number;
    uniqueQueries: number;
    avgResultSize: number;
    popularNodeTypes: string[];
    commonPatterns: string[];
  };
}

// LRU Cache implementation for performance optimization
class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, V>();
  private accessOrder = new Map<K, number>();
  private accessCounter = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      this.accessOrder.set(key, ++this.accessCounter);
      return this.cache.get(key);
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.capacity) {
      this.evictLeastRecentlyUsed();
    }
    this.cache.set(key, value);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: K | undefined;
    let lruAccess = Infinity;

    for (const [key, access] of this.accessOrder) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
    }
  }
}

/**
 * Code Knowledge Graph Implementation
 *
 * Main class providing comprehensive graph-based code analysis capabilities
 */
export class CodeKnowledgeGraph {
  protected aiClient: any;
  protected projectContext: ProjectContext;
  protected config: GraphConfig;
  protected initialized = false;

  // Core graph data structures
  protected nodeIndex = new Map<string, GraphNode>();
  protected edgeIndex = new Map<string, GraphEdge>();
  protected patternIndex = new Map<string, CodePattern>();
  protected bestPracticeIndex = new Map<string, BestPractice>();
  protected dataFlowIndex = new Map<string, DataFlowPath>();

  // Performance optimization
  protected queryCache: LRUCache<string, GraphQueryResult>;
  protected relatedCodeCache: LRUCache<string, RelatedCodeResult>;
  protected patternCache: LRUCache<string, CodePattern[]>;

  // Graph schema and metadata
  private schema: GraphSchema;
  private statistics: GraphStatistics;
  private lastOptimization: Date = new Date();

  // Indexing and pattern recognition
  private nodeTypePatterns = new Map<string, RegExp[]>();
  private edgeTypePatterns = new Map<string, RegExp[]>();
  private architecturalPatterns = new Map<string, {
    nodeSignatures: string[];
    edgeSignatures: string[];
    validator: (nodes: GraphNode[], edges: GraphEdge[]) => boolean;
  }>();

  constructor(aiClient: any, projectContext: ProjectContext, config: Partial<GraphConfig> = {}) {
    this.aiClient = aiClient;
    this.projectContext = projectContext;
    this.config = {
      maxNodes: 10000,
      maxEdges: 50000,
      maxPatterns: 1000,
      indexingTimeout: 30000,
      queryTimeout: 5000,
      enableCaching: true,
      cacheExpirationMs: 300000, // 5 minutes
      enablePatternMatching: true,
      enableDataFlowAnalysis: true,
      enableBestPracticesLinking: true,
      performanceOptimization: true,
      maxCacheSize: 1000,
      maxSearchDepth: 10,
      confidenceThreshold: 0.5,
      ...config
    };

    // Initialize caches
    this.queryCache = new LRUCache(this.config.maxCacheSize);
    this.relatedCodeCache = new LRUCache(this.config.maxCacheSize);
    this.patternCache = new LRUCache(this.config.maxCacheSize);

    // Initialize schema
    this.schema = {
      nodeTypes: ['file', 'class', 'function', 'variable', 'interface', 'module', 'concept'],
      edgeTypes: ['imports', 'exports', 'calls', 'extends', 'implements', 'uses', 'contains', 'related_to'],
      properties: ['name', 'type', 'scope', 'complexity', 'confidence', 'path', 'lineNumber'],
      constraints: {
        maxNodes: this.config.maxNodes,
        maxEdges: this.config.maxEdges,
        maxDepth: this.config.maxSearchDepth
      }
    };

    // Initialize statistics
    this.statistics = {
      graph: {
        nodeCount: 0,
        edgeCount: 0,
        patternCount: 0,
        bestPracticeCount: 0,
        density: 0,
        avgDegree: 0,
        maxDepth: 0,
        componentCount: 0
      },
      performance: {
        avgQueryTime: 0,
        avgIndexingTime: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        lastOptimization: new Date()
      },
      quality: {
        avgConfidence: 0,
        patternCoverage: 0,
        relationshipAccuracy: 0,
        dataFlowCompleteness: 0,
        bestPracticeAdherence: 0
      },
      usage: {
        totalQueries: 0,
        uniqueQueries: 0,
        avgResultSize: 0,
        popularNodeTypes: [],
        commonPatterns: []
      }
    };
  }

  /**
   * Initialize the knowledge graph
   */
  async initialize(): Promise<void> {
    try {
      const startTime = Date.now();

      // Initialize pattern recognition
      await this.initializePatternRecognition();

      // Build graph schema
      await this.buildGraphSchema();

      // Index code elements
      await this.indexCodeElements();

      // Build relationships
      await this.buildRelationships();

      // Identify patterns
      if (this.config.enablePatternMatching) {
        await this.identifyPatterns();
      }

      // Link best practices
      if (this.config.enableBestPracticesLinking) {
        await this.linkBestPractices();
      }

      // Analyze data flows
      if (this.config.enableDataFlowAnalysis) {
        await this.analyzeDataFlows();
      }

      // Update statistics
      await this.updateStatistics();

      this.initialized = true;
      this.statistics.performance.avgIndexingTime = Date.now() - startTime;

    } catch (error) {
      console.error('Failed to initialize knowledge graph:', error);
      // Don't throw - allow graceful degradation
      this.initialized = false;
    }
  }

  /**
   * Initialize pattern recognition system
   */
  private async initializePatternRecognition(): Promise<void> {
    // Node type patterns
    this.nodeTypePatterns.set('class', [
      /class\s+(\w+)/gi,
      /interface\s+(\w+)/gi,
      /type\s+(\w+)/gi
    ]);

    this.nodeTypePatterns.set('function', [
      /function\s+(\w+)/gi,
      /const\s+(\w+)\s*=\s*\(/gi,
      /(\w+)\s*:\s*\([^)]*\)\s*=>/gi,
      /async\s+function\s+(\w+)/gi
    ]);

    this.nodeTypePatterns.set('variable', [
      /const\s+(\w+)\s*=/gi,
      /let\s+(\w+)\s*=/gi,
      /var\s+(\w+)\s*=/gi
    ]);

    // Edge type patterns
    this.edgeTypePatterns.set('imports', [
      /import\s+.*\s+from\s+['"]([^'"]+)['"]/gi,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/gi,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/gi
    ]);

    this.edgeTypePatterns.set('extends', [
      /class\s+\w+\s+extends\s+(\w+)/gi,
      /interface\s+\w+\s+extends\s+(\w+)/gi
    ]);

    this.edgeTypePatterns.set('implements', [
      /class\s+\w+\s+implements\s+(\w+)/gi
    ]);

    // Architectural patterns
    this.architecturalPatterns.set('service_layer', {
      nodeSignatures: ['class', 'function'],
      edgeSignatures: ['contains', 'calls'],
      validator: (nodes, edges) => {
        const serviceNodes = nodes.filter(n =>
          n.name.toLowerCase().includes('service') ||
          n.properties.scope === 'service'
        );
        return serviceNodes.length > 0;
      }
    });

    this.architecturalPatterns.set('repository', {
      nodeSignatures: ['class', 'interface'],
      edgeSignatures: ['implements', 'contains'],
      validator: (nodes, edges) => {
        const repoNodes = nodes.filter(n =>
          n.name.toLowerCase().includes('repository') ||
          n.name.toLowerCase().includes('repo')
        );
        return repoNodes.length > 0;
      }
    });

    this.architecturalPatterns.set('crud_operations', {
      nodeSignatures: ['function'],
      edgeSignatures: ['contains'],
      validator: (nodes, edges) => {
        const crudMethods = ['create', 'read', 'update', 'delete', 'get', 'post', 'put', 'patch'];
        const crudNodes = nodes.filter(n =>
          crudMethods.some(method =>
            n.name.toLowerCase().includes(method)
          )
        );
        return crudNodes.length >= 2; // At least 2 CRUD operations
      }
    });
  }

  /**
   * Build graph schema
   */
  async buildGraphSchema(): Promise<GraphSchema> {
    // Schema is already initialized in constructor
    // Can be extended based on project analysis
    return this.schema;
  }

  /**
   * Filter files to exclude irrelevant directories and files
   */
  protected filterRelevantFiles(files: any[]): any[] {
    const excludedDirectories = [
      '.git', '.svn', '.hg', '.bzr',           // Version control
      '.vscode', '.idea', '.vs',               // IDE folders
      '.cursor', '.claude',                    // AI tool folders
      '.github', '.gitlab',                    // CI/CD folders
      '.specfy',                              // Spec tool folders
      'node_modules', '.npm', '.yarn',         // Package manager
      'dist', 'build', 'out', '.next',        // Build outputs
      '.cache', '.tmp', '.temp',               // Cache folders
      'coverage', '.nyc_output',               // Test coverage
      '.DS_Store', 'Thumbs.db'                // OS files
    ];

    const excludedExtensions = [
      '.log', '.lock', '.pid',                 // Log and lock files
      '.exe', '.dll', '.so', '.dylib',         // Binaries
      '.jar', '.war', '.ear',                  // Java archives
      '.zip', '.tar', '.gz', '.7z',            // Archives
      '.png', '.jpg', '.jpeg', '.gif',         // Images
      '.pdf', '.doc', '.docx',                 // Documents
      '.mp3', '.mp4', '.avi',                  // Media files
    ];

    return files.filter(fileInfo => {
      const relativePath = fileInfo.relativePath;
      const fileName = path.basename(relativePath);
      const extension = path.extname(fileName).toLowerCase();

      // Skip if file is in excluded directory
      const pathParts = relativePath.split('/');
      const hasExcludedDir = pathParts.some((part: string) =>
        excludedDirectories.includes(part) || part.startsWith('.')
      );

      if (hasExcludedDir) {
        return false;
      }

      // Skip if file has excluded extension
      if (excludedExtensions.includes(extension)) {
        return false;
      }

      // Skip hidden files (starting with .)
      if (fileName.startsWith('.') && fileName !== '.env') {
        return false;
      }

      // Only include code files for analysis
      const codeExtensions = [
        '.js', '.jsx', '.ts', '.tsx',           // JavaScript/TypeScript
        '.py', '.pyw',                          // Python
        '.java', '.kt',                         // Java/Kotlin
        '.cs',                                  // C#
        '.cpp', '.cc', '.cxx', '.c', '.h',      // C/C++
        '.rs',                                  // Rust
        '.go',                                  // Go
        '.php',                                 // PHP
        '.rb',                                  // Ruby
        '.swift',                               // Swift
        '.dart',                                // Dart
        '.scala',                               // Scala
        '.clj', '.cljs',                        // Clojure
        '.hs',                                  // Haskell
        '.elm',                                 // Elm
        '.vue',                                 // Vue
        '.svelte',                              // Svelte
        '.json', '.yaml', '.yml',               // Config files
        '.md', '.txt',                          // Documentation
        '.html', '.htm', '.css', '.scss',       // Web files
        '.sql',                                 // Database
        '.sh', '.bash', '.zsh',                 // Shell scripts
        '.ps1',                                 // PowerShell
        '.dockerfile', '.makefile'              // Build files
      ];

      return fileInfo.type === 'file' &&
             (codeExtensions.includes(extension) ||
              codeExtensions.some(ext => fileName.toLowerCase().includes(ext.slice(1))));
    });
  }

  /**
   * Index code elements from project files
   */
  async indexCodeElements(): Promise<GraphNode[]> {
    const nodes: GraphNode[] = [];

    try {
      const allFiles = this.projectContext.allFiles;
      const filteredFiles = this.filterRelevantFiles(allFiles);

      for (const fileInfo of filteredFiles) {
        if (nodes.length >= this.config.maxNodes) break;

        const fileNode = await this.indexFile(fileInfo.relativePath);
        if (fileNode) {
          nodes.push(fileNode);
        }

        // Index elements within the file
        const fileElements = await this.indexFileElements(fileInfo.relativePath);
        nodes.push(...fileElements.slice(0, this.config.maxNodes - nodes.length));
      }

      // Store nodes in index
      nodes.forEach(node => {
        this.nodeIndex.set(node.id, node);
      });

      return nodes;

    } catch (error) {
      console.error('Error indexing code elements:', error);
      return nodes;
    }
  }

  /**
   * Index a single file as a node
   */
  private async indexFile(filePath: string): Promise<GraphNode | null> {
    try {
      const stats = fs.statSync(path.join(this.projectContext.root, filePath));
      const extension = path.extname(filePath);

      return {
        id: `file_${this.generateId()}`,
        type: 'file',
        name: path.basename(filePath),
        properties: {
          path: filePath,
          extension,
          size: stats.size,
          modified: stats.mtime,
          directory: path.dirname(filePath)
        },
        metadata: {
          created: new Date(),
          updated: new Date(),
          confidence: 1.0,
          source: 'file_indexer'
        }
      };

    } catch (error) {
      console.error(`Error indexing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Index elements within a file
   */
  private async indexFileElements(filePath: string): Promise<GraphNode[]> {
    const elements: GraphNode[] = [];

    try {
      const fullPath = path.join(this.projectContext.root, filePath);
      const content = await fs.promises.readFile(fullPath, 'utf8');

      // Extract classes
      const classes = this.extractClasses(content, filePath);
      elements.push(...classes);

      // Extract functions
      const functions = this.extractFunctions(content, filePath);
      elements.push(...functions);

      // Extract variables
      const variables = this.extractVariables(content, filePath);
      elements.push(...variables);

      // Extract interfaces
      const interfaces = this.extractInterfaces(content, filePath);
      elements.push(...interfaces);

      return elements;

    } catch (error) {
      console.error(`Error indexing elements in ${filePath}:`, error);
      return elements;
    }
  }

  /**
   * Extract class nodes from file content
   */
  private extractClasses(content: string, filePath: string): GraphNode[] {
    const classes: GraphNode[] = [];
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{/gi;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const extendedClass = match[2];
      const implementedInterfaces = match[3]?.split(',').map(i => i.trim());

      classes.push({
        id: `class_${className}_${this.generateId()}`,
        type: 'class',
        name: className,
        properties: {
          file: filePath,
          lineNumber: this.getLineNumber(content, match.index),
          extends: extendedClass,
          implements: implementedInterfaces,
          scope: 'public' // Default, could be analyzed further
        },
        metadata: {
          created: new Date(),
          updated: new Date(),
          confidence: 0.9,
          source: 'class_extractor'
        }
      });
    }

    return classes;
  }

  /**
   * Extract function nodes from file content
   */
  private extractFunctions(content: string, filePath: string): GraphNode[] {
    const functions: GraphNode[] = [];

    // Various function patterns
    const patterns = [
      /function\s+(\w+)\s*\([^)]*\)/gi,
      /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/gi,
      /(\w+)\s*:\s*\([^)]*\)\s*=>/gi,
      /async\s+function\s+(\w+)\s*\([^)]*\)/gi,
      /(\w+)\s*\([^)]*\)\s*\{/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];

        // Skip if already found
        if (functions.some(f => f.name === functionName)) continue;

        functions.push({
          id: `function_${functionName}_${this.generateId()}`,
          type: 'function',
          name: functionName,
          properties: {
            file: filePath,
            lineNumber: this.getLineNumber(content, match.index),
            async: match[0].includes('async'),
            arrow: match[0].includes('=>')
          },
          metadata: {
            created: new Date(),
            updated: new Date(),
            confidence: 0.8,
            source: 'function_extractor'
          }
        });
      }
    });

    return functions;
  }

  /**
   * Extract variable nodes from file content
   */
  private extractVariables(content: string, filePath: string): GraphNode[] {
    const variables: GraphNode[] = [];
    const patterns = [
      /const\s+(\w+)\s*=/gi,
      /let\s+(\w+)\s*=/gi,
      /var\s+(\w+)\s*=/gi
    ];

    patterns.forEach((pattern, index) => {
      const varType = ['const', 'let', 'var'][index];
      let match;

      while ((match = pattern.exec(content)) !== null) {
        const varName = match[1];

        // Skip if already found
        if (variables.some(v => v.name === varName)) continue;

        variables.push({
          id: `variable_${varName}_${this.generateId()}`,
          type: 'variable',
          name: varName,
          properties: {
            file: filePath,
            lineNumber: this.getLineNumber(content, match.index),
            varType,
            scope: 'local' // Could be analyzed further
          },
          metadata: {
            created: new Date(),
            updated: new Date(),
            confidence: 0.7,
            source: 'variable_extractor'
          }
        });
      }
    });

    return variables;
  }

  /**
   * Extract interface nodes from file content
   */
  private extractInterfaces(content: string, filePath: string): GraphNode[] {
    const interfaces: GraphNode[] = [];
    const interfaceRegex = /interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?\s*\{/gi;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const extendedInterfaces = match[2]?.split(',').map(i => i.trim());

      interfaces.push({
        id: `interface_${interfaceName}_${this.generateId()}`,
        type: 'interface',
        name: interfaceName,
        properties: {
          file: filePath,
          lineNumber: this.getLineNumber(content, match.index),
          extends: extendedInterfaces
        },
        metadata: {
          created: new Date(),
          updated: new Date(),
          confidence: 0.9,
          source: 'interface_extractor'
        }
      });
    }

    return interfaces;
  }

  /**
   * Build relationships between nodes
   */
  async buildRelationships(): Promise<GraphEdge[]> {
    const edges: GraphEdge[] = [];

    try {
      // Build file-based relationships
      const fileRelationships = await this.buildFileRelationships();
      edges.push(...fileRelationships);

      // Build code element relationships
      const elementRelationships = await this.buildElementRelationships();
      edges.push(...elementRelationships);

      // Store edges in index
      const limitedEdges = edges.slice(0, this.config.maxEdges);
      limitedEdges.forEach(edge => {
        this.edgeIndex.set(edge.id, edge);
      });

      return limitedEdges;

    } catch (error) {
      console.error('Error building relationships:', error);
      return edges;
    }
  }

  /**
   * Build relationships between files (imports, etc.)
   */
  private async buildFileRelationships(): Promise<GraphEdge[]> {
    const edges: GraphEdge[] = [];

    const allFiles = this.projectContext.allFiles;
    const filteredFiles = this.filterRelevantFiles(allFiles);

    for (const fileInfo of filteredFiles) {
      try {
        const fullPath = path.join(this.projectContext.root, fileInfo.relativePath);
        const content = await fs.promises.readFile(fullPath, 'utf8');
        const fileNode = Array.from(this.nodeIndex.values()).find(n =>
          n.type === 'file' && n.properties.path === fileInfo.relativePath
        );

        if (!fileNode) continue;

        // Extract import relationships
        const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/gi;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          const resolvedPath = this.resolveImportPath(importPath, fileInfo.relativePath);

          if (resolvedPath) {
            const targetFileNode = Array.from(this.nodeIndex.values()).find(n =>
              n.type === 'file' && n.properties.path === resolvedPath
            );

            if (targetFileNode) {
              edges.push({
                id: `import_${this.generateId()}`,
                type: 'imports',
                source: fileNode.id,
                target: targetFileNode.id,
                properties: {
                  importPath,
                  resolvedPath
                },
                metadata: {
                  created: new Date(),
                  confidence: 0.9,
                  strength: 1.0
                }
              });
            }
          }
        }

      } catch (error) {
        console.error(`Error processing file relationships for ${fileInfo.relativePath}:`, error);
      }
    }

    return edges;
  }

  /**
   * Build relationships between code elements
   */
  private async buildElementRelationships(): Promise<GraphEdge[]> {
    const edges: GraphEdge[] = [];

    // Build containment relationships (file contains class, class contains function)
    for (const node of this.nodeIndex.values()) {
      if (node.type !== 'file' && node.properties.file) {
        const fileNode = Array.from(this.nodeIndex.values()).find(n =>
          n.type === 'file' && n.properties.path === node.properties.file
        );

        if (fileNode) {
          edges.push({
            id: `contains_${this.generateId()}`,
            type: 'contains',
            source: fileNode.id,
            target: node.id,
            metadata: {
              created: new Date(),
              confidence: 1.0,
              strength: 1.0
            }
          });
        }
      }

      // Build inheritance relationships
      if (node.type === 'class' && node.properties.extends) {
        const parentClass = Array.from(this.nodeIndex.values()).find(n =>
          n.type === 'class' && n.name === node.properties.extends
        );

        if (parentClass) {
          edges.push({
            id: `extends_${this.generateId()}`,
            type: 'extends',
            source: node.id,
            target: parentClass.id,
            metadata: {
              created: new Date(),
              confidence: 0.9,
              strength: 0.8
            }
          });
        }
      }

      // Build interface implementation relationships
      if (node.type === 'class' && node.properties.implements) {
        for (const interfaceName of node.properties.implements) {
          const interfaceNode = Array.from(this.nodeIndex.values()).find(n =>
            n.type === 'interface' && n.name === interfaceName
          );

          if (interfaceNode) {
            edges.push({
              id: `implements_${this.generateId()}`,
              type: 'implements',
              source: node.id,
              target: interfaceNode.id,
              metadata: {
                created: new Date(),
                confidence: 0.9,
                strength: 0.8
              }
            });
          }
        }
      }
    }

    return edges;
  }

  /**
   * Identify architectural patterns in the codebase
   */
  async identifyPatterns(): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];

    try {
      for (const [patternType, definition] of this.architecturalPatterns) {
        const patternNodes = Array.from(this.nodeIndex.values()).filter(node =>
          definition.nodeSignatures.includes(node.type)
        );

        const patternEdges = Array.from(this.edgeIndex.values()).filter(edge =>
          definition.edgeSignatures.includes(edge.type)
        );

        if (definition.validator(patternNodes, patternEdges)) {
          const pattern: CodePattern = {
            id: `pattern_${patternType}_${this.generateId()}`,
            type: patternType as any,
            name: patternType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            confidence: this.calculatePatternConfidence(patternNodes, patternEdges, definition),
            nodes: patternNodes.map(n => n.id),
            description: `Identified ${patternType} pattern`,
            metadata: {
              identified: new Date(),
              validator: 'architectural_pattern_matcher',
              complexity: this.assessPatternComplexity(patternNodes, patternEdges)
            }
          };

          patterns.push(pattern);
          this.patternIndex.set(pattern.id, pattern);
        }
      }

      return patterns;

    } catch (error) {
      console.error('Error identifying patterns:', error);
      return patterns;
    }
  }

  /**
   * Link best practices to identified patterns
   */
  async linkBestPractices(): Promise<Array<{ pattern: string; practices: string[] }>> {
    const links: Array<{ pattern: string; practices: string[] }> = [];

    // Predefined best practices for common patterns
    const practiceLinks = new Map<string, string[]>([
      ['service_layer', ['dependency_injection', 'single_responsibility', 'interface_segregation']],
      ['repository', ['data_access_abstraction', 'testable_architecture', 'separation_of_concerns']],
      ['crud_operations', ['input_validation', 'error_handling', 'transaction_management']],
      ['factory', ['object_creation_abstraction', 'flexible_instantiation']],
      ['observer', ['loose_coupling', 'event_driven_architecture']],
      ['singleton', ['global_state_management', 'lazy_initialization']],
      ['mvc', ['separation_of_concerns', 'testable_architecture', 'maintainable_code']],
      ['validation', ['input_sanitization', 'error_prevention', 'data_integrity']],
      ['error_handling', ['graceful_degradation', 'logging', 'user_feedback']]
    ]);

    // Create best practice objects
    const bestPractices = new Map<string, BestPractice>([
      ['dependency_injection', {
        id: 'bp_dependency_injection',
        category: 'architecture',
        name: 'Dependency Injection',
        description: 'Inject dependencies rather than creating them internally',
        applicablePatterns: ['service_layer', 'repository'],
        recommendations: [
          'Use constructor injection for required dependencies',
          'Use setter injection for optional dependencies',
          'Consider using dependency injection containers for complex applications'
        ],
        priority: 'high'
      }],
      ['single_responsibility', {
        id: 'bp_single_responsibility',
        category: 'architecture',
        name: 'Single Responsibility Principle',
        description: 'Each class should have only one reason to change',
        applicablePatterns: ['service_layer', 'repository'],
        recommendations: [
          'Keep classes focused on a single concern',
          'Split large classes into smaller, focused ones',
          'Use composition over inheritance'
        ],
        priority: 'high'
      }],
      ['input_validation', {
        id: 'bp_input_validation',
        category: 'security',
        name: 'Input Validation',
        description: 'Validate all inputs before processing',
        applicablePatterns: ['crud_operations', 'validation'],
        recommendations: [
          'Validate input types and formats',
          'Sanitize inputs to prevent injection attacks',
          'Use schema validation for complex data structures'
        ],
        priority: 'critical'
      }],
      ['error_handling', {
        id: 'bp_error_handling',
        category: 'maintainability',
        name: 'Proper Error Handling',
        description: 'Handle errors gracefully and provide meaningful feedback',
        applicablePatterns: ['crud_operations', 'service_layer', 'error_handling'],
        recommendations: [
          'Use try-catch blocks for error-prone operations',
          'Log errors with sufficient context',
          'Provide user-friendly error messages'
        ],
        priority: 'high'
      }]
    ]);

    // Store best practices in index
    for (const practice of bestPractices.values()) {
      this.bestPracticeIndex.set(practice.id, practice);
    }

    // Link patterns to best practices
    for (const pattern of this.patternIndex.values()) {
      const practices = practiceLinks.get(pattern.type) || [];
      if (practices.length > 0) {
        links.push({
          pattern: pattern.type,
          practices
        });
      }
    }

    return links;
  }

  /**
   * Analyze data flows in the codebase
   */
  async analyzeDataFlows(): Promise<DataFlowPath[]> {
    const dataFlows: DataFlowPath[] = [];

    try {
      // Simple data flow analysis based on function calls and data dependencies
      for (const sourceNode of this.nodeIndex.values()) {
        if (sourceNode.type === 'function' || sourceNode.type === 'class') {
          const outgoingEdges = Array.from(this.edgeIndex.values()).filter(edge =>
            edge.source === sourceNode.id && (edge.type === 'calls' || edge.type === 'uses')
          );

          for (const edge of outgoingEdges) {
            const targetNode = this.nodeIndex.get(edge.target);
            if (targetNode) {
              const flow: DataFlowPath = {
                id: `flow_${this.generateId()}`,
                source: sourceNode.id,
                target: targetNode.id,
                path: [sourceNode.id, targetNode.id],
                flowType: 'data_dependency',
                confidence: 0.7,
                complexity: 'low',
                metadata: {
                  analyzed: new Date(),
                  pathLength: 2,
                  cyclic: false
                }
              };

              dataFlows.push(flow);
              this.dataFlowIndex.set(flow.id, flow);
            }
          }
        }
      }

      return dataFlows;

    } catch (error) {
      console.error('Error analyzing data flows:', error);
      return dataFlows;
    }
  }

  /**
   * Query the knowledge graph
   */
  async queryGraph(query: string, options: Partial<GraphQuery> = {}): Promise<GraphQueryResult> {
    const queryId = this.generateId();
    const startTime = Date.now();
    const cacheKey = `${query}_${JSON.stringify(options)}`;

    // Check cache
    if (this.config.enableCaching && this.queryCache.has(cacheKey)) {
      const cachedResult = this.queryCache.get(cacheKey)!;
      cachedResult.metadata.cacheHit = true;
      return cachedResult;
    }

    try {
      // Simple query processing - can be enhanced with NLP
      const queryWords = query.toLowerCase().split(/\s+/);

      // Filter nodes based on query
      let relevantNodes = Array.from(this.nodeIndex.values()).filter(node => {
        const nameMatch = queryWords.some(word =>
          node.name.toLowerCase().includes(word)
        );
        const typeMatch = options.nodeTypes ?
          options.nodeTypes.includes(node.type) : true;

        return nameMatch && typeMatch;
      });

      // Apply limit
      if (options.limit) {
        relevantNodes = relevantNodes.slice(0, options.limit);
      }

      // Get related edges
      const nodeIds = new Set(relevantNodes.map(n => n.id));
      const relevantEdges = Array.from(this.edgeIndex.values()).filter(edge =>
        nodeIds.has(edge.source) || nodeIds.has(edge.target)
      );

      // Get related patterns
      const relevantPatterns = options.includePatterns ?
        Array.from(this.patternIndex.values()).filter(pattern =>
          pattern.nodes.some(nodeId => nodeIds.has(nodeId))
        ) : [];

      // Get related best practices
      const relevantBestPractices = options.includeBestPractices ?
        Array.from(this.bestPracticeIndex.values()).filter(practice =>
          relevantPatterns.some(pattern =>
            practice.applicablePatterns.includes(pattern.type)
          )
        ) : [];

      // Get related data flows
      const relevantDataFlows = Array.from(this.dataFlowIndex.values()).filter(flow =>
        nodeIds.has(flow.source) || nodeIds.has(flow.target)
      );

      const result: GraphQueryResult = {
        nodes: relevantNodes,
        edges: relevantEdges,
        patterns: relevantPatterns,
        bestPractices: relevantBestPractices,
        dataFlows: relevantDataFlows,
        confidence: this.calculateQueryConfidence(relevantNodes, query),
        executionTime: Date.now() - startTime,
        metadata: {
          queryId,
          timestamp: new Date(),
          resultCount: relevantNodes.length,
          cacheHit: false
        }
      };

      // Cache result
      if (this.config.enableCaching) {
        this.queryCache.set(cacheKey, result);
      }

      // Update statistics
      this.statistics.usage.totalQueries++;
      this.statistics.performance.avgQueryTime =
        (this.statistics.performance.avgQueryTime + result.executionTime) / 2;

      return result;

    } catch (error) {
      console.error('Error querying graph:', error);
      // Return empty result on error
      return {
        nodes: [],
        edges: [],
        patterns: [],
        bestPractices: [],
        dataFlows: [],
        confidence: 0,
        executionTime: Date.now() - startTime,
        metadata: {
          queryId,
          timestamp: new Date(),
          resultCount: 0,
          cacheHit: false
        }
      };
    }
  }

  /**
   * Find code related to a specific element
   */
  async findRelatedCode(elementId: string, options: {
    maxDepth?: number;
    includePatterns?: boolean;
  } = {}): Promise<RelatedCodeResult> {
    const maxDepth = options.maxDepth || this.config.maxSearchDepth;
    const cacheKey = `related_${elementId}_${JSON.stringify(options)}`;

    // Check cache
    if (this.config.enableCaching && this.relatedCodeCache.has(cacheKey)) {
      return this.relatedCodeCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    const visited = new Set<string>();
    const directRelations: any[] = [];
    const indirectRelations: any[] = [];

    try {
      // Find direct relationships
      const directEdges = Array.from(this.edgeIndex.values()).filter(edge =>
        edge.source === elementId || edge.target === elementId
      );

      for (const edge of directEdges) {
        const relatedId = edge.source === elementId ? edge.target : edge.source;
        const relatedNode = this.nodeIndex.get(relatedId);

        if (relatedNode && !visited.has(relatedId)) {
          visited.add(relatedId);
          directRelations.push({
            id: relatedId,
            type: relatedNode.type,
            name: relatedNode.name,
            distance: 1,
            relationshipType: edge.type,
            confidence: edge.metadata?.confidence || 0.5
          });
        }
      }

      // Find indirect relationships (depth-limited BFS)
      const queue: Array<{ id: string; distance: number; path: string[] }> =
        directRelations.map(rel => ({
          id: rel.id,
          distance: 1,
          path: [elementId, rel.id]
        }));

      while (queue.length > 0 && indirectRelations.length < 100) {
        const current = queue.shift()!;

        if (current.distance >= maxDepth) continue;

        const nextEdges = Array.from(this.edgeIndex.values()).filter(edge =>
          edge.source === current.id || edge.target === current.id
        );

        for (const edge of nextEdges) {
          const nextId = edge.source === current.id ? edge.target : edge.source;
          const nextNode = this.nodeIndex.get(nextId);

          if (nextNode && !visited.has(nextId) && !current.path.includes(nextId)) {
            visited.add(nextId);
            const newPath = [...current.path, nextId];

            indirectRelations.push({
              id: nextId,
              type: nextNode.type,
              name: nextNode.name,
              distance: current.distance + 1,
              path: newPath,
              confidence: (edge.metadata?.confidence || 0.5) * (1 - current.distance * 0.1)
            });

            if (current.distance + 1 < maxDepth) {
              queue.push({
                id: nextId,
                distance: current.distance + 1,
                path: newPath
              });
            }
          }
        }
      }

      // Find related patterns
      const relatedPatterns = options.includePatterns ?
        Array.from(this.patternIndex.values()).filter(pattern =>
          pattern.nodes.includes(elementId) ||
          pattern.nodes.some(nodeId =>
            directRelations.some(rel => rel.id === nodeId) ||
            indirectRelations.some(rel => rel.id === nodeId)
          )
        ) : [];

      const result: RelatedCodeResult = {
        directRelations,
        indirectRelations,
        patterns: relatedPatterns,
        confidence: this.calculateRelationshipConfidence(directRelations, indirectRelations),
        metadata: {
          searchDepth: maxDepth,
          totalRelations: directRelations.length + indirectRelations.length,
          searchTime: Date.now() - startTime
        }
      };

      // Cache result
      if (this.config.enableCaching) {
        this.relatedCodeCache.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      console.error('Error finding related code:', error);
      return {
        directRelations: [],
        indirectRelations: [],
        patterns: [],
        confidence: 0,
        metadata: {
          searchDepth: maxDepth,
          totalRelations: 0,
          searchTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Get data flow between two nodes
   */
  async getDataFlow(startNode: string, endNode: string): Promise<DataFlowPath | null> {
    try {
      // Simple path finding using BFS
      const queue: Array<{ node: string; path: string[] }> = [{ node: startNode, path: [startNode] }];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const current = queue.shift()!;

        if (current.node === endNode) {
          return {
            id: `flow_${this.generateId()}`,
            source: startNode,
            target: endNode,
            path: current.path,
            flowType: 'data_dependency',
            confidence: 1 - (current.path.length * 0.1), // Confidence decreases with path length
            complexity: current.path.length <= 3 ? 'low' :
                       current.path.length <= 6 ? 'medium' : 'high',
            metadata: {
              analyzed: new Date(),
              pathLength: current.path.length,
              cyclic: current.path.includes(current.node) // Simple cycle detection
            }
          };
        }

        if (!visited.has(current.node)) {
          visited.add(current.node);

          // Find connected nodes
          const outgoingEdges = Array.from(this.edgeIndex.values()).filter(edge =>
            edge.source === current.node &&
            ['calls', 'uses', 'contains'].includes(edge.type)
          );

          for (const edge of outgoingEdges) {
            if (!visited.has(edge.target) && !current.path.includes(edge.target)) {
              queue.push({
                node: edge.target,
                path: [...current.path, edge.target]
              });
            }
          }
        }
      }

      return null; // No path found

    } catch (error) {
      console.error('Error analyzing data flow:', error);
      return null;
    }
  }

  /**
   * Generate improvement suggestions based on context
   */
  async suggestImprovements(context: { context?: string; nodeIds?: string[] }): Promise<ImprovementSuggestion[]> {
    const suggestions: ImprovementSuggestion[] = [];

    try {
      // Analyze patterns for improvement opportunities
      for (const pattern of this.patternIndex.values()) {
        const patternSuggestions = this.generatePatternBasedSuggestions(pattern);
        suggestions.push(...patternSuggestions);
      }

      // Analyze nodes for code quality improvements
      if (context.nodeIds) {
        for (const nodeId of context.nodeIds) {
          const node = this.nodeIndex.get(nodeId);
          if (node) {
            const nodeSuggestions = this.generateNodeBasedSuggestions(node);
            suggestions.push(...nodeSuggestions);
          }
        }
      }

      // Add general architecture suggestions
      const architectureSuggestions = this.generateArchitectureSuggestions();
      suggestions.push(...architectureSuggestions);

      // Sort by priority and confidence
      suggestions.sort((a, b) => b.priority - a.priority || b.confidence - a.confidence);

      return suggestions.slice(0, 10); // Return top 10 suggestions

    } catch (error) {
      console.error('Error generating improvement suggestions:', error);
      return suggestions;
    }
  }

  /**
   * Generate pattern-based improvement suggestions
   */
  private generatePatternBasedSuggestions(pattern: CodePattern): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    switch (pattern.type) {
      case 'service_layer':
        suggestions.push({
          id: `suggestion_${this.generateId()}`,
          type: 'architecture',
          category: 'best_practices',
          title: 'Implement Repository Pattern',
          suggestion: 'Consider implementing repository pattern for data access',
          rationale: 'Repository pattern provides better separation of concerns and testability',
          confidence: 0.8,
          impact: 'medium',
          effort: 'low',
          priority: 7,
          applicableNodes: pattern.nodes,
          relatedPatterns: [pattern.id],
          bestPractices: ['data_access_abstraction', 'testable_architecture']
        });
        break;

      case 'crud_operations':
        suggestions.push({
          id: `suggestion_${this.generateId()}`,
          type: 'security',
          category: 'best_practices',
          title: 'Add Input Validation',
          suggestion: 'Add comprehensive input validation for CRUD operations',
          rationale: 'Input validation prevents security vulnerabilities and data corruption',
          confidence: 0.9,
          impact: 'high',
          effort: 'medium',
          priority: 9,
          applicableNodes: pattern.nodes,
          relatedPatterns: [pattern.id],
          bestPractices: ['input_validation', 'security']
        });
        break;
    }

    return suggestions;
  }

  /**
   * Generate node-based improvement suggestions
   */
  private generateNodeBasedSuggestions(node: GraphNode): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // Check for functions without error handling
    if (node.type === 'function') {
      suggestions.push({
        id: `suggestion_${this.generateId()}`,
        type: 'maintainability',
        category: 'best_practices',
        title: 'Add Error Handling',
        suggestion: `Add proper error handling to function '${node.name}'`,
        rationale: 'Proper error handling improves reliability and debugging',
        confidence: 0.7,
        impact: 'medium',
        effort: 'low',
        priority: 6,
        applicableNodes: [node.id],
        relatedPatterns: [],
        bestPractices: ['error_handling']
      });
    }

    // Check for classes that might benefit from interfaces
    if (node.type === 'class') {
      suggestions.push({
        id: `suggestion_${this.generateId()}`,
        type: 'architecture',
        category: 'refactoring',
        title: 'Extract Interface',
        suggestion: `Consider extracting an interface for class '${node.name}'`,
        rationale: 'Interfaces improve testability and enable dependency injection',
        confidence: 0.6,
        impact: 'medium',
        effort: 'low',
        priority: 5,
        applicableNodes: [node.id],
        relatedPatterns: [],
        bestPractices: ['interface_segregation', 'dependency_injection']
      });
    }

    return suggestions;
  }

  /**
   * Generate general architecture suggestions
   */
  private generateArchitectureSuggestions(): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // Check if there are many service classes without a service layer pattern
    const serviceClasses = Array.from(this.nodeIndex.values()).filter(node =>
      node.type === 'class' && node.name.toLowerCase().includes('service')
    );

    if (serviceClasses.length > 3) {
      const serviceLayerPatterns = Array.from(this.patternIndex.values()).filter(p =>
        p.type === 'service_layer'
      );

      if (serviceLayerPatterns.length === 0) {
        suggestions.push({
          id: `suggestion_${this.generateId()}`,
          type: 'architecture',
          category: 'modernization',
          title: 'Implement Service Layer Pattern',
          suggestion: 'Organize service classes using service layer pattern',
          rationale: 'Service layer pattern provides better organization and separation of concerns',
          confidence: 0.8,
          impact: 'high',
          effort: 'medium',
          priority: 8,
          applicableNodes: serviceClasses.map(c => c.id),
          relatedPatterns: [],
          bestPractices: ['service_layer', 'separation_of_concerns']
        });
      }
    }

    return suggestions;
  }

  /**
   * Get comprehensive graph statistics
   */
  getStatistics(): GraphStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Update internal statistics
   */
  private updateStatistics(): void {
    // Graph statistics
    this.statistics.graph.nodeCount = this.nodeIndex.size;
    this.statistics.graph.edgeCount = this.edgeIndex.size;
    this.statistics.graph.patternCount = this.patternIndex.size;
    this.statistics.graph.bestPracticeCount = this.bestPracticeIndex.size;

    // Calculate density
    const nodeCount = this.nodeIndex.size;
    if (nodeCount > 1) {
      this.statistics.graph.density = this.edgeIndex.size / (nodeCount * (nodeCount - 1));
    }

    // Calculate average degree
    const degrees = new Map<string, number>();
    for (const edge of this.edgeIndex.values()) {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }

    if (degrees.size > 0) {
      const totalDegree = Array.from(degrees.values()).reduce((sum, deg) => sum + deg, 0);
      this.statistics.graph.avgDegree = totalDegree / degrees.size;
    }

    // Performance statistics
    this.statistics.performance.cacheHitRate = this.calculateCacheHitRate();
    this.statistics.performance.memoryUsage = this.estimateMemoryUsage();

    // Quality statistics
    const confidences = Array.from(this.nodeIndex.values()).map(n => n.metadata?.confidence || 0);
    if (confidences.length > 0) {
      this.statistics.quality.avgConfidence =
        confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }

    // Calculate pattern coverage
    const nodesInPatterns = new Set<string>();
    for (const pattern of this.patternIndex.values()) {
      pattern.nodes.forEach(nodeId => nodesInPatterns.add(nodeId));
    }
    this.statistics.quality.patternCoverage = nodesInPatterns.size / this.nodeIndex.size;
  }

  /**
   * Node and edge manipulation methods
   */
  async addNode(node: GraphNode): Promise<string> {
    if (this.nodeIndex.size >= this.config.maxNodes) {
      throw new Error('Maximum node limit reached');
    }

    this.nodeIndex.set(node.id, node);
    return node.id;
  }

  async updateNode(nodeId: string, properties: Record<string, any>): Promise<boolean> {
    const node = this.nodeIndex.get(nodeId);
    if (node) {
      Object.assign(node.properties, properties);
      if (node.metadata) {
        node.metadata.updated = new Date();
      }
      return true;
    }
    return false;
  }

  async removeNode(nodeId: string): Promise<boolean> {
    // Remove associated edges
    const edgesToRemove = Array.from(this.edgeIndex.entries()).filter(([_, edge]) =>
      edge.source === nodeId || edge.target === nodeId
    );

    for (const [edgeId] of edgesToRemove) {
      this.edgeIndex.delete(edgeId);
    }

    return this.nodeIndex.delete(nodeId);
  }

  async addEdge(edge: GraphEdge): Promise<string> {
    if (this.edgeIndex.size >= this.config.maxEdges) {
      throw new Error('Maximum edge limit reached');
    }

    // Validate that source and target nodes exist
    if (!this.nodeIndex.has(edge.source) || !this.nodeIndex.has(edge.target)) {
      throw new Error('Source or target node does not exist');
    }

    this.edgeIndex.set(edge.id, edge);
    return edge.id;
  }

  async removeEdge(edgeId: string): Promise<boolean> {
    return this.edgeIndex.delete(edgeId);
  }

  /**
   * Utility methods
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  protected resolveImportPath(importPath: string, currentFile: string): string | null {
    // Simple resolution logic - can be enhanced
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const currentDir = path.dirname(currentFile);
      let resolved = path.resolve(currentDir, importPath);

      // Try common extensions
      const extensions = ['.ts', '.js', '.tsx', '.jsx'];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        const relativePath = withExt.replace(this.projectContext.root + '/', '');
        if (this.projectContext.allFiles.some(f => f.relativePath === relativePath)) {
          return relativePath;
        }
      }
    }
    return null;
  }

  private calculatePatternConfidence(
    nodes: GraphNode[],
    edges: GraphEdge[],
    definition: any
  ): number {
    // Simple confidence calculation - can be enhanced
    const nodeTypeMatch = nodes.length > 0 ? 0.5 : 0;
    const edgeTypeMatch = edges.length > 0 ? 0.3 : 0;
    const validatorBonus = 0.2; // Bonus for passing validator

    return Math.min(nodeTypeMatch + edgeTypeMatch + validatorBonus, 1.0);
  }

  private assessPatternComplexity(nodes: GraphNode[], edges: GraphEdge[]): 'low' | 'medium' | 'high' {
    const complexity = nodes.length + edges.length;
    if (complexity <= 5) return 'low';
    if (complexity <= 15) return 'medium';
    return 'high';
  }

  private calculateQueryConfidence(nodes: GraphNode[], query: string): number {
    if (nodes.length === 0) return 0;

    const queryWords = query.toLowerCase().split(/\s+/);
    let totalRelevance = 0;

    for (const node of nodes) {
      const nameWords = node.name.toLowerCase().split(/[_\-\s]+/);
      const matchCount = queryWords.filter(qw =>
        nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
      ).length;

      totalRelevance += matchCount / queryWords.length;
    }

    return Math.min(totalRelevance / nodes.length, 1.0);
  }

  private calculateRelationshipConfidence(directRels: any[], indirectRels: any[]): number {
    if (directRels.length === 0 && indirectRels.length === 0) return 0;

    const directConfidence = directRels.reduce((sum, rel) => sum + rel.confidence, 0);
    const indirectConfidence = indirectRels.reduce((sum, rel) => sum + rel.confidence, 0);

    const totalRelations = directRels.length + indirectRels.length;
    return (directConfidence + indirectConfidence) / totalRelations;
  }

  protected calculateCacheHitRate(): number {
    // Simple approximation based on cache sizes
    const totalCacheAccess = this.statistics.usage.totalQueries;
    if (totalCacheAccess === 0) return 0;

    const estimatedHits = this.queryCache.size + this.relatedCodeCache.size + this.patternCache.size;
    return Math.min(estimatedHits / totalCacheAccess, 1.0);
  }

  private estimateMemoryUsage(): number {
    // Rough estimation in MB
    const nodeMemory = this.nodeIndex.size * 0.001; // ~1KB per node
    const edgeMemory = this.edgeIndex.size * 0.0005; // ~0.5KB per edge
    const cacheMemory = (this.queryCache.size + this.relatedCodeCache.size) * 0.002; // ~2KB per cache entry

    return nodeMemory + edgeMemory + cacheMemory;
  }

  /**
   * Public API methods
   */
  clear(): void {
    this.nodeIndex.clear();
    this.edgeIndex.clear();
    this.patternIndex.clear();
    this.bestPracticeIndex.clear();
    this.dataFlowIndex.clear();
    this.queryCache.clear();
    this.relatedCodeCache.clear();
    this.patternCache.clear();
    this.initialized = false;
  }

  isReady(): boolean {
    return this.initialized;
  }
}