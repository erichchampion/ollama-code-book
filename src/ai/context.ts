/**
 * Project Context Management
 *
 * Manages project-wide context including file dependencies, structure analysis,
 * conversation history, and context window optimization for AI interactions.
 */

import { promises as fs } from 'fs';
import { watch } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { toolRegistry } from '../tools/index.js';
import { TIMEOUT_CONSTANTS } from '../config/constants.js';
import {
  MAX_FILES_FOR_ANALYSIS,
  MAX_FILES_LIMIT,
  MAX_CONVERSATION_HISTORY,
  MAX_FILE_WATCHERS
} from '../constants.js';

export interface FileInfo {
  path: string;
  relativePath: string;
  size: number;
  modified: Date;
  type: 'file' | 'directory';
  language?: string;
  imports?: string[];
  exports?: string[];
  dependencies?: string[];
}

export interface ProjectStructure {
  root: string;
  files: Map<string, FileInfo>;
  directories: string[];
  dependencies: Map<string, string[]>;
  entryPoints: string[];
  configFiles: string[];
  testFiles: string[];
  documentationFiles: string[];
}

export interface ProjectState {
  currentFiles: string[];
  activeFeatures: string[];
  buildStatus: 'success' | 'failure' | 'unknown';
  testStatus: 'passing' | 'failing' | 'unknown';
  lastModified: Date;
  dependencies: Record<string, string>;
}

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  userMessage: string;
  assistantResponse: string;
  context: {
    filesReferenced: string[];
    toolsUsed: string[];
    projectState: ProjectState;
  };
  metadata: {
    tokensUsed: number;
    executionTime: number;
    confidence: number;
  };
}

export interface ContextWindow {
  maxTokens: number;
  currentTokens: number;
  files: FileInfo[];
  conversation: ConversationTurn[];
  priorityContent: string[];
  lastOptimized: Date;
}

export interface ProjectDependencies {
  [key: string]: string[];
}

export interface PromptContext {
  files: FileInfo[];
  projectStructure: ProjectStructure;
  conversationHistory: ConversationTurn[];
  currentTask?: string;
}

export interface AIResponse {
  content: string;
  metadata: QualityMetrics;
}

export interface QualityMetrics {
  confidence: number;
  relevance: number;
  completeness: number;
  accuracy: number;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  dependencies: TaskDependency[];
  status: string;
  priority: number;
  estimatedTime: number;
}

export interface TaskDependency {
  taskId: string;
  type: 'requires' | 'enhances' | 'blocks';
  strength: number;
}

export interface ExecutionPlan {
  tasks: Task[];
  order: string[];
  parallelGroups: string[][];
  estimatedDuration: number;
}

export interface PlanningConstraints {
  maxExecutionTime: number;
  allowedOperations: string[];
  resourceLimits: {
    maxMemory: number;
    maxCpuTime: number;
    maxFileOperations: number;
  };
  securityRestrictions: string[];
}

export interface PlanningContext {
  userRequest: string;
  projectContext: ProjectStructure;
  availableTools: string[];
  constraints: PlanningConstraints;
}

export class ProjectContext {
  private projectRoot: string;
  private structure: ProjectStructure;
  private conversationHistory: ConversationTurn[] = [];
  private contextWindow: ContextWindow;
  private fileWatchers = new Map<string, any>();

  constructor(projectRoot: string, maxTokens: number = 32000) {
    this.projectRoot = path.resolve(projectRoot);
    this.structure = {
      root: this.projectRoot,
      files: new Map(),
      directories: [],
      dependencies: new Map(),
      entryPoints: [],
      configFiles: [],
      testFiles: [],
      documentationFiles: []
    };

    this.contextWindow = {
      maxTokens,
      currentTokens: 0,
      files: [],
      conversation: [],
      priorityContent: [],
      lastOptimized: new Date()
    };
  }

  /**
   * Initialize project context by analyzing project structure
   */
  async initialize(): Promise<void> {
    logger.info(`Initializing project context for: ${this.projectRoot}`);

    try {
      await this.analyzeProjectStructure();
      await this.detectDependencies();
      this.setupFileWatchers();

      logger.info('Project context initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize project context:', error);
      throw error;
    }
  }

  /**
   * Analyze project structure and categorize files
   */
  private async analyzeProjectStructure(): Promise<void> {
    const filesystem = toolRegistry.get('filesystem');
    if (!filesystem) {
      throw new Error('Filesystem tool not available');
    }

    // Get all files recursively
    const result = await filesystem.execute({
      operation: 'list',
      path: this.projectRoot,
      recursive: true
    }, {
      projectRoot: this.projectRoot,
      workingDirectory: this.projectRoot,
      environment: process.env as Record<string, string>,
      timeout: TIMEOUT_CONSTANTS.MEDIUM
    });

    if (!result.success) {
      throw new Error(`Failed to analyze project structure: ${result.error}`);
    }

    // Process files and categorize them
    for (const item of result.data) {
      const fullPath = path.join(this.projectRoot, item.path);
      const fileInfo: FileInfo = {
        path: fullPath,
        relativePath: item.path,
        size: item.size || 0,
        modified: new Date(item.modified || Date.now()),
        type: item.isDirectory ? 'directory' : 'file'
      };

      if (item.isDirectory) {
        this.structure.directories.push(item.path);
      } else {
        // Determine file type and language
        const ext = path.extname(item.name).toLowerCase();
        fileInfo.language = this.detectLanguage(ext);

        // Categorize special files
        this.categorizeFile(item.path, item.name);

        this.structure.files.set(item.path, fileInfo);
      }
    }

    logger.debug(`Analyzed ${this.structure.files.size} files in project structure`);
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(extension: string): string | undefined {
    const langMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.swift': 'swift',
      '.dart': 'dart',
      '.vue': 'vue',
      '.svelte': 'svelte',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.sh': 'bash',
      '.ps1': 'powershell',
      '.sql': 'sql'
    };

    return langMap[extension];
  }

  /**
   * Categorize files into special groups
   */
  private categorizeFile(relativePath: string, filename: string): void {
    const lowerName = filename.toLowerCase();
    const isConfig = [
      'package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.js',
      '.env', '.gitignore', 'dockerfile', 'docker-compose.yml',
      'jest.config.js', '.eslintrc', '.prettierrc'
    ].some(pattern => lowerName.includes(pattern.toLowerCase()));

    const isTest = [
      '.test.', '.spec.', '__tests__', '__test__'
    ].some(pattern => lowerName.includes(pattern));

    const isDoc = [
      'readme', 'changelog', 'license', 'contributing', 'docs/'
    ].some(pattern => lowerName.includes(pattern.toLowerCase()) || relativePath.toLowerCase().includes(pattern));

    const isEntry = [
      'index.', 'main.', 'app.', 'server.', 'client.'
    ].some(pattern => lowerName.startsWith(pattern));

    if (isConfig) this.structure.configFiles.push(relativePath);
    if (isTest) this.structure.testFiles.push(relativePath);
    if (isDoc) this.structure.documentationFiles.push(relativePath);
    if (isEntry) this.structure.entryPoints.push(relativePath);
  }

  /**
   * Detect file dependencies by analyzing imports/requires
   */
  private async detectDependencies(): Promise<void> {
    const filesystem = toolRegistry.get('filesystem');
    if (!filesystem) return;

    // Analyze key files for dependencies
    const filesToAnalyze = Array.from(this.structure.files.keys())
      .filter(file => {
        const fileInfo = this.structure.files.get(file);
        return fileInfo?.language && ['typescript', 'javascript', 'python'].includes(fileInfo.language);
      })
      .slice(0, MAX_FILES_FOR_ANALYSIS); // Limit analysis to avoid overwhelming

    for (const filePath of filesToAnalyze) {
      try {
        const result = await filesystem.execute({
          operation: 'read',
          path: filePath
        }, {
          projectRoot: this.projectRoot,
          workingDirectory: this.projectRoot,
          environment: process.env as Record<string, string>,
          timeout: TIMEOUT_CONSTANTS.SHORT * 2
        });

        if (result.success) {
          const fileInfo = this.structure.files.get(filePath);
          if (fileInfo) {
            const dependencies = this.extractDependencies(result.data.content, fileInfo.language);
            fileInfo.imports = dependencies.imports;
            fileInfo.exports = dependencies.exports;
            fileInfo.dependencies = dependencies.dependencies;

            this.structure.dependencies.set(filePath, dependencies.dependencies);
          }
        }
      } catch (error) {
        logger.debug(`Failed to analyze dependencies for ${filePath}:`, error);
      }
    }
  }

  /**
   * Extract imports, exports, and dependencies from file content
   */
  private extractDependencies(content: string, language?: string): {
    imports: string[];
    exports: string[];
    dependencies: string[];
  } {
    const imports: string[] = [];
    const exports: string[] = [];
    const dependencies: string[] = [];

    if (!language) return { imports, exports, dependencies };

    try {
      if (language === 'typescript' || language === 'javascript') {
        // Extract ES6 imports
        const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          imports.push(match[1]);
          if (!match[1].startsWith('.')) {
            dependencies.push(match[1]);
          }
        }

        // Extract CommonJS requires
        const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
          imports.push(match[1]);
          if (!match[1].startsWith('.')) {
            dependencies.push(match[1]);
          }
        }

        // Extract exports
        const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
        while ((match = exportRegex.exec(content)) !== null) {
          exports.push(match[1]);
        }
      } else if (language === 'python') {
        // Extract Python imports
        const importRegex = /(?:^|\n)\s*(?:from\s+(\S+)\s+)?import\s+([^\n;]+)/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const module = match[1] || match[2].split(',')[0].trim();
          imports.push(module);
          if (!module.startsWith('.')) {
            dependencies.push(module);
          }
        }
      }
    } catch (error) {
      logger.debug('Error extracting dependencies:', error);
    }

    return { imports, exports, dependencies };
  }

  /**
   * Setup file watchers for real-time updates
   */
  private setupFileWatchers(): void {
    try {
      // Watch key configuration files for changes
      const watchFiles = [
        ...this.structure.configFiles,
        ...this.structure.entryPoints
      ].slice(0, MAX_FILE_WATCHERS); // Limit number of watchers

      for (const file of watchFiles) {
        try {
          const fullPath = path.join(this.projectRoot, file);
          const watcher = watch(fullPath, (eventType) => {
            if (eventType === 'change') {
              this.handleFileChange(file);
            }
          });
          this.fileWatchers.set(file, watcher);
        } catch (error) {
          logger.debug(`Failed to watch file ${file}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error setting up file watchers:', error);
      // Cleanup any partial watchers that were created
      this.cleanup();
      throw error;
    }

    logger.debug(`Setup ${this.fileWatchers.size} file watchers`);
  }

  /**
   * Handle file change events
   */
  private handleFileChange(filePath: string): void {
    logger.debug(`File changed: ${filePath}`);
    // Invalidate context for this file
    this.invalidateFileContext(filePath);
  }

  /**
   * Add conversation turn to history
   */
  addConversationTurn(turn: ConversationTurn): void {
    this.conversationHistory.push(turn);
    this.contextWindow.conversation.push(turn);
    this.optimizeContextWindow();
  }

  /**
   * Get relevant context for a given query
   */
  async getRelevantContext(query: string, maxTokens?: number): Promise<{
    files: FileInfo[];
    conversation: ConversationTurn[];
    structure: ProjectStructure;
    totalTokens: number;
  }> {
    const targetTokens = maxTokens || this.contextWindow.maxTokens * 0.8;

    // Find relevant files based on query
    const relevantFiles = this.findRelevantFiles(query);

    // Get recent conversation context
    const recentConversation = this.conversationHistory.slice(-MAX_CONVERSATION_HISTORY);

    // Calculate token usage (simplified)
    const totalTokens = this.estimateTokens(relevantFiles, recentConversation);

    return {
      files: relevantFiles.slice(0, MAX_FILES_LIMIT), // Limit files
      conversation: recentConversation,
      structure: this.structure,
      totalTokens
    };
  }

  /**
   * Find files relevant to the query
   */
  private findRelevantFiles(query: string): FileInfo[] {
    const queryLower = query.toLowerCase();
    const relevantFiles: { file: FileInfo; score: number }[] = [];

    // Detect query intent
    const isCodeReview = /review|analyz|bug|error|issue|quality|refactor|improve|fix|check|audit|inspect/.test(queryLower);
    const isDocumentationQuery = /document|readme|doc|guide|help|instruction/.test(queryLower);
    const isConfigQuery = /config|setting|setup|environment|build/.test(queryLower);

    for (const [filePath, fileInfo] of this.structure.files) {
      let score = 0;

      // Skip directories
      if (fileInfo.type === 'directory') {
        continue;
      }

      // Intent-based scoring
      if (isCodeReview) {
        // For code review requests, prioritize actual source code files
        if (fileInfo.language && ['typescript', 'javascript', 'python', 'java', 'cpp', 'c', 'go', 'rust'].includes(fileInfo.language)) {
          score += 8; // High priority for source code files

          // Skip test and config files unless specifically requested
          if (!this.structure.testFiles.includes(fileInfo.relativePath) &&
              !this.structure.configFiles.includes(fileInfo.relativePath) &&
              !this.structure.documentationFiles.includes(fileInfo.relativePath)) {
            score += 5; // Extra points for non-test/config/doc source files
          }
        }

        // Lower priority for documentation during code review
        if (this.structure.documentationFiles.includes(fileInfo.relativePath)) {
          score = Math.max(score - 3, 1); // Reduce score for docs in code review context
        }
      } else if (isDocumentationQuery) {
        // For documentation queries, prioritize docs
        if (this.structure.documentationFiles.includes(fileInfo.relativePath)) {
          score += 8;
        }
      } else if (isConfigQuery) {
        // For config queries, prioritize config files
        if (this.structure.configFiles.includes(fileInfo.relativePath)) {
          score += 8;
        }
      }

      // Check if file path matches query keywords
      if (fileInfo.relativePath.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Check if it's a key file type (entry points)
      if (this.structure.entryPoints.includes(fileInfo.relativePath)) {
        score += 3;
      }

      // Recently modified files get higher score
      const daysSinceModified = (Date.now() - fileInfo.modified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceModified < 1) score += 2;
      else if (daysSinceModified < 7) score += 1;

      // Default score for any file if no specific criteria match
      if (score === 0 && fileInfo.language) {
        score = 1; // Include all code files as potential matches
      }

      if (score > 0) {
        relevantFiles.push({ file: fileInfo, score });
      }
    }

    // Sort by relevance score
    relevantFiles.sort((a, b) => b.score - a.score);
    return relevantFiles.map(item => item.file);
  }

  /**
   * Estimate token count (simplified)
   */
  private estimateTokens(files: FileInfo[], conversation: ConversationTurn[]): number {
    let tokens = 0;

    // Estimate file tokens (rough: 1 token per 4 characters)
    for (const file of files) {
      tokens += Math.ceil(file.size / 4);
    }

    // Estimate conversation tokens
    for (const turn of conversation) {
      tokens += Math.ceil((turn.userMessage.length + turn.assistantResponse.length) / 4);
    }

    return tokens;
  }

  /**
   * Optimize context window to fit within token limits
   */
  private optimizeContextWindow(): void {
    // Remove old conversation turns if needed
    while (this.contextWindow.conversation.length > 10) {
      this.contextWindow.conversation.shift();
    }

    // Update optimization timestamp
    this.contextWindow.lastOptimized = new Date();
  }

  /**
   * Invalidate context for a specific file
   */
  private invalidateFileContext(filePath: string): void {
    // Remove file from context window
    this.contextWindow.files = this.contextWindow.files.filter(
      file => file.relativePath !== filePath
    );

    // Re-analyze file if it exists
    const fileInfo = this.structure.files.get(filePath);
    if (fileInfo) {
      // Mark for re-analysis
      fileInfo.modified = new Date();
    }
  }

  /**
   * Get project summary
   */
  getProjectSummary(): {
    fileCount: number;
    languages: string[];
    structure: string;
    entryPoints: string[];
    recentActivity: string[];
  } {
    const languages = Array.from(new Set(
      Array.from(this.structure.files.values())
        .map(file => file.language)
        .filter(Boolean)
    ));

    const recentFiles = Array.from(this.structure.files.values())
      .filter(file => Date.now() - file.modified.getTime() < 24 * 60 * 60 * 1000)
      .map(file => file.relativePath);

    return {
      fileCount: this.structure.files.size,
      languages: languages as string[],
      structure: this.generateStructureOverview(),
      entryPoints: this.structure.entryPoints,
      recentActivity: recentFiles
    };
  }

  /**
   * Generate a text overview of project structure
   */
  private generateStructureOverview(): string {
    const dirs = this.structure.directories.slice(0, MAX_FILES_LIMIT);
    const files = this.structure.configFiles.concat(this.structure.entryPoints).slice(0, MAX_FILES_LIMIT);

    return `
Directories: ${dirs.join(', ')}
Key Files: ${files.join(', ')}
Total Files: ${this.structure.files.size}
`.trim();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Close file watchers
    for (const watcher of this.fileWatchers.values()) {
      watcher.close();
    }
    this.fileWatchers.clear();

    logger.debug('Project context cleanup completed');
  }

  // Getter methods for accessing private properties
  get root(): string {
    return this.projectRoot;
  }

  get allFiles(): FileInfo[] {
    return Array.from(this.structure.files.values());
  }

  get projectLanguages(): string[] {
    const files = Array.from(this.structure.files.values());
    const languages = new Set<string>();
    files.forEach(f => {
      if (f.language) {
        languages.add(f.language);
      }
    });
    return Array.from(languages);
  }
}