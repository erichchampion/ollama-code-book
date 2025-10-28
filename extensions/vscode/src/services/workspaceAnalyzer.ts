/**
 * Workspace Analyzer Service
 *
 * Provides workspace-level analysis and context for AI-powered features
 * including project structure, dependencies, and contextual intelligence.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CodeAnalysisUtils } from '../utils/codeAnalysisUtils';
import { TIMEOUT_CONSTANTS } from '../config/analysisConstants';
import { ProviderCache, CACHE_TTL } from '../utils/cacheUtils';
import { WORKSPACE_ANALYSIS, FILE_PATTERNS, LANGUAGE_EXTENSIONS, FRAMEWORK_PATTERNS } from '../config/serviceConstants';
import { formatError } from '../utils/errorUtils';

export interface WorkspaceContext {
  projectType: string;
  language: string;
  framework?: string;
  testFramework?: string;
  buildTool?: string;
  dependencies: string[];
  devDependencies: string[];
  fileStructure: FileStructureInfo;
  gitInfo?: GitInfo;
}

export interface FileStructureInfo {
  sourceDirectories: string[];
  testDirectories: string[];
  configFiles: string[];
  totalFiles: number;
  fileTypes: Record<string, number>;
}

export interface GitInfo {
  isGitRepo: boolean;
  currentBranch?: string;
  remoteUrl?: string;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: Date;
  };
  modifiedFiles: string[];
}

export interface ProjectDependency {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer';
  description?: string;
  usagePatterns?: string[];
}

export class WorkspaceAnalyzer {
  private contextCache = new ProviderCache<WorkspaceContext>(WORKSPACE_ANALYSIS.CACHE_TTL);
  private dependencyCache = new ProviderCache<ProjectDependency[]>(WORKSPACE_ANALYSIS.CACHE_TTL);

  constructor(private outputChannel?: vscode.OutputChannel) {}

  /**
   * Analyze workspace for contextual AI responses
   */
  async analyzeWorkspace(): Promise<WorkspaceContext | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return null;
    }

    const cacheKey = workspaceFolder.uri.fsPath;
    const cached = this.contextCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const context = await this.performWorkspaceAnalysis(workspaceFolder);
      this.contextCache.set(cacheKey, context);
      return context;
    } catch (error) {
      this.log(`Workspace analysis failed: ${formatError(error)}`);
      return null;
    }
  }

  /**
   * Analyze project dependencies for better suggestions
   */
  async analyzeDependencies(): Promise<ProjectDependency[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return [];
    }

    const cacheKey = `deps_${workspaceFolder.uri.fsPath}`;
    const cached = this.dependencyCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const dependencies = await this.extractDependencies(workspaceFolder);
      this.dependencyCache.set(cacheKey, dependencies);
      return dependencies;
    } catch (error) {
      this.log(`Dependency analysis failed: ${formatError(error)}`);
      return [];
    }
  }

  /**
   * Get git history integration for change-aware intelligence
   */
  async getGitContext(): Promise<GitInfo | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return null;
    }

    try {
      return await this.analyzeGitRepository(workspaceFolder);
    } catch (error) {
      this.log(`Git analysis failed: ${formatError(error)}`);
      return null;
    }
  }

  /**
   * Analyze cursor position and selection context
   */
  getCursorContext(document: vscode.TextDocument, position: vscode.Position): {
    functionName?: string;
    className?: string;
    namespace?: string;
    isInComment: boolean;
    isInString: boolean;
    surroundingCode: string;
    indentLevel: number;
  } {
    const text = document.getText();
    const lines = text.split('\n');
    const currentLine = lines[position.line] || '';

    // Get surrounding context
    const startLine = Math.max(0, position.line - WORKSPACE_ANALYSIS.CONTEXT_LINES);
    const endLine = Math.min(lines.length - 1, position.line + WORKSPACE_ANALYSIS.CONTEXT_LINES);
    const surroundingCode = lines.slice(startLine, endLine + 1).join('\n');

    // Detect if cursor is in comment or string
    const lineUpToCursor = currentLine.substring(0, position.character);
    const isInComment = this.isPositionInComment(lineUpToCursor, document.languageId);
    const isInString = this.isPositionInString(lineUpToCursor);

    // Calculate indentation level
    const indentMatch = currentLine.match(/^(\s*)/);
    const indentLevel = indentMatch ? indentMatch[1].length : 0;

    // Extract function and class context
    const { functionName, className, namespace } = this.extractSymbolContext(
      lines,
      position.line,
      document.languageId
    );

    return {
      functionName,
      className,
      namespace,
      isInComment,
      isInString,
      surroundingCode,
      indentLevel
    };
  }

  /**
   * Get multi-file context understanding for comprehensive assistance
   */
  async getMultiFileContext(currentDocument: vscode.TextDocument): Promise<{
    relatedFiles: string[];
    imports: string[];
    exports: string[];
    usageExamples: string[];
  }> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return { relatedFiles: [], imports: [], exports: [], usageExamples: [] };
    }

    try {
      const imports = await this.extractImports(currentDocument);
      const exports = await this.extractExports(currentDocument);
      const relatedFiles = await this.findRelatedFiles(currentDocument, workspaceFolder);
      const usageExamples = await this.findUsageExamples(currentDocument, workspaceFolder);

      return { relatedFiles, imports, exports, usageExamples };
    } catch (error) {
      this.log(`Multi-file context analysis failed: ${formatError(error)}`);
      return { relatedFiles: [], imports: [], exports: [], usageExamples: [] };
    }
  }

  /**
   * Create intelligent caching for frequently accessed contexts
   */
  optimizeContextCaching(): void {
    // The ProviderCache already handles this with automatic cleanup
    // Additional optimization could include context pre-loading for commonly accessed files

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const document = activeEditor.document;
      // Pre-cache context for current document
      this.getCursorContext(document, activeEditor.selection.active);
    }
  }

  /**
   * Perform comprehensive workspace analysis
   */
  private async performWorkspaceAnalysis(workspaceFolder: vscode.WorkspaceFolder): Promise<WorkspaceContext> {
    const rootPath = workspaceFolder.uri.fsPath;

    // Analyze project configuration files
    const packageJsonPath = path.join(rootPath, 'package.json');
    const tsConfigPath = path.join(rootPath, 'tsconfig.json');
    const pyProjectPath = path.join(rootPath, 'pyproject.toml');
    const cargoPath = path.join(rootPath, 'Cargo.toml');

    let projectType = 'unknown';
    let language = 'unknown';
    let framework: string | undefined;
    let dependencies: string[] = [];
    let devDependencies: string[] = [];

    // Detect project type and extract dependencies
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      projectType = 'node';
      language = fs.existsSync(tsConfigPath) ? 'typescript' : 'javascript';
      dependencies = Object.keys(packageJson.dependencies || {});
      devDependencies = Object.keys(packageJson.devDependencies || {});

      // Detect framework
      for (const [frameworkName, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
        if (patterns.some(pattern => dependencies.includes(pattern) || devDependencies.includes(pattern))) {
          framework = frameworkName;
          break;
        }
      }
    } else if (fs.existsSync(pyProjectPath) || fs.existsSync(path.join(rootPath, 'requirements.txt'))) {
      projectType = 'python';
      language = 'python';
      // Could parse pyproject.toml or requirements.txt for dependencies
    } else if (fs.existsSync(cargoPath)) {
      projectType = 'rust';
      language = 'rust';
      // Could parse Cargo.toml for dependencies
    }

    // Analyze file structure
    const fileStructure = await this.analyzeFileStructure(rootPath);

    // Get git information
    const gitInfo = await this.analyzeGitRepository(workspaceFolder);

    return {
      projectType,
      language,
      framework,
      dependencies,
      devDependencies,
      fileStructure,
      gitInfo: gitInfo || undefined
    };
  }

  /**
   * Extract project dependencies with detailed information
   */
  private async extractDependencies(workspaceFolder: vscode.WorkspaceFolder): Promise<ProjectDependency[]> {
    const rootPath = workspaceFolder.uri.fsPath;
    const packageJsonPath = path.join(rootPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return [];
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies: ProjectDependency[] = [];

    // Process production dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        dependencies.push({
          name,
          version: version as string,
          type: 'production'
        });
      }
    }

    // Process development dependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        dependencies.push({
          name,
          version: version as string,
          type: 'development'
        });
      }
    }

    return dependencies;
  }

  /**
   * Analyze git repository information
   */
  private async analyzeGitRepository(workspaceFolder: vscode.WorkspaceFolder): Promise<GitInfo | null> {
    const rootPath = workspaceFolder.uri.fsPath;
    const gitPath = path.join(rootPath, '.git');

    if (!fs.existsSync(gitPath)) {
      return { isGitRepo: false, modifiedFiles: [] };
    }

    try {
      // This is a simplified version - in a real implementation,
      // you would use a git library like simple-git or isomorphic-git
      return {
        isGitRepo: true,
        currentBranch: 'main', // Would be detected from git
        modifiedFiles: [] // Would be detected from git status
      };
    } catch (error) {
      return { isGitRepo: true, modifiedFiles: [] };
    }
  }

  /**
   * Analyze file structure
   */
  private async analyzeFileStructure(rootPath: string): Promise<FileStructureInfo> {
    const sourceDirectories: string[] = [];
    const testDirectories: string[] = [];
    const configFiles: string[] = [];
    const fileTypes: Record<string, number> = {};
    let totalFiles = 0;

    const MAX_DEPTH = WORKSPACE_ANALYSIS.MAX_DIRECTORY_DEPTH;

    const walkDir = (dirPath: string, depth: number = 0) => {
      if (depth > MAX_DEPTH) {
        return; // Prevent excessive recursion
      }

      try {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
          if (item.startsWith('.') || (FILE_PATTERNS.IGNORE_PATTERNS as readonly string[]).includes(item)) continue;

          const fullPath = path.join(dirPath, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            const relativePath = path.relative(rootPath, fullPath);

            if ((FILE_PATTERNS.TEST_DIRECTORIES as readonly string[]).some(testDir => item.includes(testDir))) {
              testDirectories.push(relativePath);
            } else if ((FILE_PATTERNS.SOURCE_DIRECTORIES as readonly string[]).includes(item)) {
              sourceDirectories.push(relativePath);
            }

            walkDir(fullPath, depth + 1);
          } else {
            totalFiles++;
            const ext = path.extname(item);
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;

            if ((FILE_PATTERNS.CONFIG_FILES as readonly string[]).includes(item) || this.isConfigFile(item)) {
              configFiles.push(path.relative(rootPath, fullPath));
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    walkDir(rootPath);

    return {
      sourceDirectories,
      testDirectories,
      configFiles,
      totalFiles,
      fileTypes
    };
  }

  /**
   * Extract imports from a document
   */
  private async extractImports(document: vscode.TextDocument): Promise<string[]> {
    const text = document.getText();
    const imports: string[] = [];

    // Simple regex patterns for common import statements
    const importPatterns = [
      /import\s+.*\s+from\s+['"]([^'"]+)['"]/g, // ES6 imports
      /import\s+['"]([^'"]+)['"]/g, // Side-effect imports
      /require\(['"]([^'"]+)['"]\)/g, // CommonJS requires
      /from\s+(['"][^'"]+['"])/g, // Python imports
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        imports.push(match[1]);
      }
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  /**
   * Extract exports from a document
   */
  private async extractExports(document: vscode.TextDocument): Promise<string[]> {
    const text = document.getText();
    const exports: string[] = [];

    const exportPatterns = [
      /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g,
      /export\s*\{\s*([^}]+)\s*\}/g,
    ];

    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1].includes(',')) {
          // Handle export { a, b, c }
          exports.push(...match[1].split(',').map(s => s.trim()));
        } else {
          exports.push(match[1]);
        }
      }
    }

    return [...new Set(exports)];
  }

  /**
   * Find related files
   */
  private async findRelatedFiles(document: vscode.TextDocument, workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
    const currentPath = document.uri.fsPath;
    const currentName = path.basename(currentPath, path.extname(currentPath));
    const currentDir = path.dirname(currentPath);

    const relatedFiles: string[] = [];

    // Look for test files
    const testPatterns = [
      `${currentName}.test.*`,
      `${currentName}.spec.*`,
      `${currentName}Test.*`,
      `${currentName}Spec.*`
    ];

    for (const pattern of testPatterns) {
      const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
      relatedFiles.push(...files.map(f => f.fsPath));
    }

    // Look for files with similar names
    const similarFiles = await vscode.workspace.findFiles(
      `**/${currentName}*.*`,
      '**/node_modules/**'
    );
    relatedFiles.push(...similarFiles.map(f => f.fsPath).filter(f => f !== currentPath));

    return relatedFiles.slice(0, 10); // Limit to 10 related files
  }

  /**
   * Find usage examples
   */
  private async findUsageExamples(document: vscode.TextDocument, workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
    // This would search for usage patterns of exported functions/classes
    // For now, return empty array as this requires more complex analysis
    return [];
  }

  /**
   * Extract symbol context (function, class, namespace)
   */
  private extractSymbolContext(lines: string[], currentLine: number, languageId: string): {
    functionName?: string;
    className?: string;
    namespace?: string;
  } {
    const functionPatterns = CodeAnalysisUtils.getFunctionPatterns(languageId);
    const classPatterns = [
      /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
      /interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
      /type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/
    ];

    let functionName: string | undefined;
    let className: string | undefined;

    // Search backwards from current line to find containing symbols
    for (let i = currentLine; i >= Math.max(0, currentLine - WORKSPACE_ANALYSIS.MAX_SYMBOL_SEARCH_DEPTH); i--) {
      const line = lines[i];

      // Check for function
      if (!functionName) {
        for (const pattern of functionPatterns) {
          const match = line.match(pattern);
          if (match) {
            functionName = match[1];
            break;
          }
        }
      }

      // Check for class
      if (!className) {
        for (const pattern of classPatterns) {
          const match = line.match(pattern);
          if (match) {
            className = match[1];
            break;
          }
        }
      }

      if (functionName && className) break;
    }

    return { functionName, className };
  }

  /**
   * Check if position is in a comment
   */
  private isPositionInComment(lineUpToCursor: string, languageId: string): boolean {
    if (languageId === 'python' || languageId === 'ruby') {
      return lineUpToCursor.includes('#');
    } else {
      return lineUpToCursor.includes('//') ||
             (lineUpToCursor.includes('/*') && !lineUpToCursor.includes('*/'));
    }
  }

  /**
   * Check if position is in a string
   */
  private isPositionInString(lineUpToCursor: string): boolean {
    const singleQuotes = (lineUpToCursor.match(/'/g) || []).length;
    const doubleQuotes = (lineUpToCursor.match(/"/g) || []).length;
    const backQuotes = (lineUpToCursor.match(/`/g) || []).length;

    return (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1) || (backQuotes % 2 === 1);
  }

  /**
   * Check if file is a configuration file
   */
  private isConfigFile(filename: string): boolean {
    return filename.startsWith('.') ||
           filename.includes('config') ||
           filename.endsWith('.config.js') ||
           filename.endsWith('.config.ts');
  }

  /**
   * Log message to output channel
   */
  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[WorkspaceAnalyzer] ${message}`);
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.contextCache.dispose();
    this.dependencyCache.dispose();
  }
}