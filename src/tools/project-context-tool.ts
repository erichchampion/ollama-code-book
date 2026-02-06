/**
 * Project Context Tool
 *
 * Exposes ProjectContext functionality as a tool for gathering project information
 * needed for planning and context-aware operations.
 */

import { BaseTool, ToolMetadata, ToolResult, ToolExecutionContext } from './types.js';
import { ProjectContext } from '../ai/context.js';
import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import * as path from 'path';
import { promises as fs } from 'fs';

export class ProjectContextTool extends BaseTool {
  private projectContextInstance: ProjectContext | null = null;
  private projectContextFactory?: () => Promise<ProjectContext> | ProjectContext;

  metadata: ToolMetadata = {
    name: 'project-context',
    description: 'Gather comprehensive project context including structure, dependencies, frameworks, and statistics. Use this tool to understand the project before creating plans or making changes. Operations: "analyze" = analyze project structure, "dependencies" = get project dependencies, "frameworks" = detect frameworks, "statistics" = get codebase statistics, "export" = export full context for planning.',
    category: 'context',
    version: '1.0.0',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        description: 'The context operation to perform: "analyze" = analyze structure, "dependencies" = get dependencies, "frameworks" = detect frameworks, "statistics" = get statistics, "export" = export full context',
        required: true,
        enum: ['analyze', 'dependencies', 'frameworks', 'statistics', 'export'],
        validation: (value) =>
          ['analyze', 'dependencies', 'frameworks', 'statistics', 'export'].includes(value),
      },
    ],
    examples: [
      {
        description: 'Analyze project structure',
        parameters: {
          operation: 'analyze',
        },
      },
      {
        description: 'Get project dependencies',
        parameters: {
          operation: 'dependencies',
        },
      },
      {
        description: 'Export full context for planning',
        parameters: {
          operation: 'export',
        },
      },
    ],
  };

  constructor(projectContext?: ProjectContext | (() => Promise<ProjectContext> | ProjectContext)) {
    super();
    if (projectContext) {
      if (typeof projectContext === 'function') {
        this.projectContextFactory = projectContext;
      } else {
        this.projectContextInstance = projectContext;
      }
    }
  }

  /**
   * Get ProjectContext instance, creating it lazily if needed
   */
  private async getProjectContext(context: ToolExecutionContext): Promise<ProjectContext> {
    if (this.projectContextInstance) {
      return this.projectContextInstance;
    }

    if (this.projectContextFactory) {
      const pc = await this.projectContextFactory();
      this.projectContextInstance = pc;
      return pc;
    }

    // Try to get from component factory or create new instance
    try {
      // For now, create a new instance
      // In production, this would be injected or retrieved from a component factory
      const { ProjectContext } = await import('../ai/context.js');
      const pc = new ProjectContext(context.projectRoot);
      await pc.initialize();
      this.projectContextInstance = pc;
      return pc;
    } catch (error) {
      logger.error('Failed to get ProjectContext:', error);
      throw new Error('ProjectContext not available');
    }
  }

  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate operation parameter first
      const { operation } = parameters;
      if (!operation || typeof operation !== 'string') {
        return {
          success: false,
          error: 'operation parameter is required',
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }

      if (!['analyze', 'dependencies', 'frameworks', 'statistics', 'export'].includes(operation)) {
        return {
          success: false,
          error: `Invalid operation: ${operation}. Valid operations: analyze, dependencies, frameworks, statistics, export`,
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }
      const projectContext = await this.getProjectContext(context);

      // Route to appropriate operation handler
      switch (operation) {
        case 'analyze':
          return await this.handleAnalyze(projectContext, context);
        case 'dependencies':
          return await this.handleDependencies(projectContext, context);
        case 'frameworks':
          return await this.handleFrameworks(projectContext, context);
        case 'statistics':
          return await this.handleStatistics(projectContext, context);
        case 'export':
          return await this.handleExport(projectContext, context);
        default:
          return {
            success: false,
            error: `Invalid operation: ${operation}`,
            metadata: {
              executionTime: Date.now() - startTime,
            },
          };
      }
    } catch (error) {
      logger.error('Project context tool execution failed:', error);
      return {
        success: false,
        error: normalizeError(error).message,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Handle analyze operation
   */
  private async handleAnalyze(
    projectContext: ProjectContext,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      const summary = projectContext.getProjectSummary();
      const structure = (projectContext as any).structure;

      return {
        success: true,
        data: {
          structure: summary.structure,
          mainEntry: structure?.entryPoints?.[0] || null,
          configFiles: structure?.configFiles || [],
          entryPoints: summary.entryPoints,
          directories: structure?.directories || [],
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }

  /**
   * Handle dependencies operation
   */
  private async handleDependencies(
    projectContext: ProjectContext,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      // Try to read package.json for dependencies
      const packageJsonPath = path.join(context.projectRoot, 'package.json');
      let dependencies: Record<string, string> = {};
      let devDependencies: Record<string, string> = {};

      try {
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        dependencies = packageJson.dependencies || {};
        devDependencies = packageJson.devDependencies || {};
      } catch (error) {
        // package.json might not exist, that's okay
        logger.debug('Could not read package.json:', error);
      }

      // Also get file-level dependencies from ProjectContext
      const structure = (projectContext as any).structure;
      const fileDependencies: Record<string, string[]> = {};
      if (structure?.dependencies) {
        for (const [file, deps] of structure.dependencies.entries()) {
          fileDependencies[file] = deps;
        }
      }

      return {
        success: true,
        data: {
          dependencies,
          devDependencies,
          fileDependencies,
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }

  /**
   * Handle frameworks operation
   */
  private async handleFrameworks(
    projectContext: ProjectContext,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      const frameworks: string[] = [];

      // Detect frameworks from dependencies
      const packageJsonPath = path.join(context.projectRoot, 'package.json');
      try {
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        const allDeps = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {}),
        };

        // Common framework detection
        const frameworkMap: Record<string, string> = {
          react: 'React',
          'react-dom': 'React',
          vue: 'Vue',
          angular: 'Angular',
          express: 'Express',
          'fastify': 'Fastify',
          'next': 'Next.js',
          'nuxt': 'Nuxt.js',
          'svelte': 'Svelte',
          'nestjs': 'NestJS',
          'django': 'Django',
          'flask': 'Flask',
          'fastapi': 'FastAPI',
          'spring': 'Spring',
          'rails': 'Rails',
        };

        for (const [dep, framework] of Object.entries(frameworkMap)) {
          if (allDeps[dep]) {
            if (!frameworks.includes(framework)) {
              frameworks.push(framework);
            }
          }
        }
      } catch (error) {
        logger.debug('Could not detect frameworks from package.json:', error);
      }

      // Detect from project structure
      const summary = projectContext.getProjectSummary();
      if (summary.languages.includes('TypeScript') || summary.languages.includes('JavaScript')) {
        // Check for common framework patterns
        const structure = (projectContext as any).structure;
        const configFiles = structure?.configFiles || [];
        if (configFiles.some((f: string) => f.includes('next.config'))) {
          if (!frameworks.includes('Next.js')) frameworks.push('Next.js');
        }
        if (configFiles.some((f: string) => f.includes('vite.config'))) {
          if (!frameworks.includes('Vite')) frameworks.push('Vite');
        }
      }

      return {
        success: true,
        data: {
          frameworks,
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }

  /**
   * Handle statistics operation
   */
  private async handleStatistics(
    projectContext: ProjectContext,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      const summary = projectContext.getProjectSummary();
      const structure = (projectContext as any).structure;

      // Calculate statistics
      const totalFiles = summary.fileCount;
      const languages = summary.languages;
      const languageCounts: Record<string, number> = {};

      if (structure?.files) {
        for (const file of structure.files.values()) {
          if (file.language) {
            languageCounts[file.language] = (languageCounts[file.language] || 0) + 1;
          }
        }
      }

      // Estimate total lines (rough estimate)
      let totalLines = 0;
      if (structure?.files) {
        for (const file of structure.files.values()) {
          // Rough estimate: average 50 lines per file
          totalLines += 50;
        }
      }

      return {
        success: true,
        data: {
          totalFiles,
          totalLines,
          languages: languageCounts,
          configFiles: structure?.configFiles?.length || 0,
          testFiles: structure?.testFiles?.length || 0,
          entryPoints: summary.entryPoints.length,
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }

  /**
   * Handle export operation - export full context for planning
   */
  private async handleExport(
    projectContext: ProjectContext,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      const summary = projectContext.getProjectSummary();
      const structure = (projectContext as any).structure;

      // Get dependencies
      const depsResult = await this.handleDependencies(projectContext, context);
      const dependencies = depsResult.success ? depsResult.data : {};

      // Get frameworks
      const frameworksResult = await this.handleFrameworks(projectContext, context);
      const frameworks = frameworksResult.success ? frameworksResult.data?.frameworks || [] : [];

      // Get statistics
      const statsResult = await this.handleStatistics(projectContext, context);
      const statistics = statsResult.success ? statsResult.data : {};

      return {
        success: true,
        data: {
          projectRoot: context.projectRoot,
          projectLanguages: summary.languages,
          frameworks,
          dependencies,
          statistics,
          structure: {
            entryPoints: summary.entryPoints,
            configFiles: structure?.configFiles || [],
            directories: structure?.directories || [],
          },
          fileCount: summary.fileCount,
          recentActivity: summary.recentActivity,
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }
}
