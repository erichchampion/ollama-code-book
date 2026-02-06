/**
 * Tools Module
 *
 * Main entry point for the tool system that provides sophisticated
 * multi-tool orchestration capabilities for coding tasks.
 */

export * from './types.js';
export { ToolRegistry, toolRegistry } from './registry.js';
export * from './orchestrator.js';

// Tool implementations
export * from './filesystem.js';
export * from './search.js';
export * from './execution.js';
export * from './advanced-git-tool.js';
export * from './advanced-code-analysis-tool.js';
export * from './advanced-testing-tool.js';
export * from './planning-tool.js';
export * from './project-context-tool.js';
export * from './dependency-analysis-tool.js';
export * from './refactoring-tool.js';
export * from './documentation-tool.js';

import { ToolRegistry, toolRegistry } from './registry.js';
import { FileSystemTool } from './filesystem.js';
import { SearchTool } from './search.js';
import { ExecutionTool } from './execution.js';
import { AdvancedGitTool } from './advanced-git-tool.js';
import { AdvancedCodeAnalysisTool } from './advanced-code-analysis-tool.js';
import { AdvancedTestingTool } from './advanced-testing-tool.js';
import { PlanningTool } from './planning-tool.js';
import { ProjectContextTool } from './project-context-tool.js';
import { DependencyAnalysisTool } from './dependency-analysis-tool.js';
import { RefactoringTool } from './refactoring-tool.js';
import { DocumentationTool } from './documentation-tool.js';
import { logger } from '../utils/logger.js';

// Track if tool system has been initialized
let toolSystemInitialized = false;

/**
 * Initialize the tool system by registering all available tools
 */
export function initializeToolSystem(): void {
  // Skip if already initialized
  if (toolSystemInitialized) {
    logger.debug('Tool system already initialized, skipping');
    return;
  }

  try {
    // Register core tools
    toolRegistry.register(new FileSystemTool());
    toolRegistry.register(new SearchTool());
    toolRegistry.register(new ExecutionTool());

    // Register advanced tools for Phase 7
    toolRegistry.register(new AdvancedGitTool());
    toolRegistry.register(new AdvancedCodeAnalysisTool());
    toolRegistry.register(new AdvancedTestingTool());

    // Register planning tool (lazy-loads TaskPlanner when needed)
    toolRegistry.register(new PlanningTool());

    // Register project context tool (lazy-loads ProjectContext when needed)
    toolRegistry.register(new ProjectContextTool());

    // Register dependency analysis tool (graph, circular, impact)
    toolRegistry.register(new DependencyAnalysisTool());

    // Register refactoring tool (rename, extract, inline)
    toolRegistry.register(new RefactoringTool());

    // Register documentation tool (readme, jsdoc, comments)
    toolRegistry.register(new DocumentationTool());

    toolSystemInitialized = true;
    logger.info('Tool system initialized successfully');
    logger.debug(`Registered ${toolRegistry.list().length} tools`);

  } catch (error) {
    logger.error(`Failed to initialize tool system: ${error}`);
    throw error;
  }
}

/**
 * Reset tool system initialization state (mainly for testing)
 */
export function resetToolSystem(): void {
  toolSystemInitialized = false;
  logger.debug('Tool system initialization state reset');
}

/**
 * Get the tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
  return toolRegistry;
}

/**
 * Get information about all available tools
 */
export function getAvailableTools() {
  return toolRegistry.list().map(metadata => ({
    name: metadata.name,
    description: metadata.description,
    category: metadata.category,
    version: metadata.version,
    parametersCount: metadata.parameters.length,
    hasExamples: metadata.examples.length > 0
  }));
}

/**
 * Create a default tool execution context
 */
export function createDefaultContext(options: {
  projectRoot?: string;
  workingDirectory?: string;
  timeout?: number;
} = {}): import('./types.js').ToolExecutionContext {
  return {
    projectRoot: options.projectRoot || process.cwd(),
    workingDirectory: options.workingDirectory || process.cwd(),
    environment: process.env as Record<string, string>,
    timeout: options.timeout || 30000
  };
}