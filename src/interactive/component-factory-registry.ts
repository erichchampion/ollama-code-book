/**
 * Centralized Component Factory Registry
 *
 * Eliminates duplicate component creation logic by providing a single
 * registry of factory functions for all component types.
 */

import { logger } from '../utils/logger.js';
import { ComponentType } from './component-factory.js';
import { EnhancedIntentAnalyzer } from '../ai/enhanced-intent-analyzer.js';
import { TaskPlanner } from '../ai/task-planner.js';
import { AdvancedContextManager } from '../ai/advanced-context-manager.js';
import { QueryDecompositionEngine } from '../ai/query-decomposition-engine.js';
import { CodeKnowledgeGraph } from '../ai/code-knowledge-graph.js';
import { MultiStepQueryProcessor } from '../ai/multi-step-query-processor.js';
import { ConversationManager } from '../ai/conversation-manager.js';
import { NaturalLanguageRouter } from '../routing/nl-router.js';
import { LazyProjectContext } from './lazy-project-context.js';
import { LazyInitializers } from './lazy-initializers.js';
import { getCurrentWorkingDirectory } from './working-directory-provider.js';
import { OllamaClient } from '../ai/ollama-client.js';
import { EnhancedClient } from '../ai/enhanced-client.js';
import { ProjectContext } from '../ai/context.js';
import { InteractiveErrorHandler, handleComponentError } from './error-handler.js';

export interface ComponentDependencies {
  aiClient?: OllamaClient;
  enhancedClient?: EnhancedClient;
  projectContext?: ProjectContext | LazyProjectContext;
  workingDirectory?: string;
}

export type ComponentFactory<T = any> = (deps: ComponentDependencies) => Promise<T>;

/**
 * Registry of component factory functions
 */
export class ComponentFactoryRegistry {
  private static factories = new Map<ComponentType, ComponentFactory>();

  static {
    // Register all component factories
    this.registerFactories();
  }

  /**
   * Create a standardized dependency error
   */
  private static createDependencyError(component: string, deps: string[]): Error {
    return InteractiveErrorHandler.createDependencyError(
      deps.join(' and '),
      { component: 'ComponentFactoryRegistry', operation: `create-${component}` }
    );
  }

  /**
   * Register all component factory functions
   */
  private static registerFactories(): void {
    this.factories.set('aiClient', async () => {
      return await LazyInitializers.getAIClientLazy();
    });

    this.factories.set('enhancedClient', async () => {
      return await LazyInitializers.getEnhancedClientLazy();
    });

    this.factories.set('projectContext', async (deps) => {
      const workingDir = deps.workingDirectory || getCurrentWorkingDirectory();
      return new LazyProjectContext(workingDir);
    });

    this.factories.set('intentAnalyzer', async (deps) => {
      if (!deps.aiClient) {
        throw InteractiveErrorHandler.createDependencyError('aiClient', { component: 'ComponentFactoryRegistry', operation: 'create-intentAnalyzer' });
      }
      return new EnhancedIntentAnalyzer(deps.aiClient);
    });

    this.factories.set('conversationManager', async () => {
      return new ConversationManager();
    });

    this.factories.set('taskPlanner', async (deps) => {
      if (!deps.enhancedClient || !deps.projectContext) {
        throw InteractiveErrorHandler.createDependencyError('enhancedClient and projectContext', { component: 'ComponentFactoryRegistry', operation: 'create-taskPlanner' });
      }
      return new TaskPlanner(deps.enhancedClient, deps.projectContext);
    });

    this.factories.set('advancedContextManager', async (deps) => {
      if (!deps.aiClient || !deps.projectContext) {
        throw this.createDependencyError('advancedContextManager', ['aiClient', 'projectContext']);
      }
      const manager = new AdvancedContextManager(deps.aiClient, deps.projectContext);
      await manager.initialize();
      return manager;
    });

    this.factories.set('queryDecompositionEngine', async (deps) => {
      if (!deps.aiClient || !deps.projectContext) {
        throw this.createDependencyError('queryDecompositionEngine', ['aiClient', 'projectContext']);
      }
      const engine = new QueryDecompositionEngine(deps.aiClient, deps.projectContext);
      await engine.initialize();
      return engine;
    });

    this.factories.set('codeKnowledgeGraph', async (deps) => {
      if (!deps.aiClient || !deps.projectContext) {
        throw this.createDependencyError('codeKnowledgeGraph', ['aiClient', 'projectContext']);
      }
      const graph = new CodeKnowledgeGraph(deps.aiClient, deps.projectContext);
      await graph.initialize();
      return graph;
    });

    this.factories.set('multiStepQueryProcessor', async (deps) => {
      if (!deps.aiClient || !deps.projectContext) {
        throw this.createDependencyError('multiStepQueryProcessor', ['aiClient', 'projectContext']);
      }
      return new MultiStepQueryProcessor(deps.aiClient, deps.projectContext);
    });

    this.factories.set('naturalLanguageRouter', async (deps) => {
      if (!deps.aiClient || !deps.enhancedClient || !deps.projectContext) {
        throw this.createDependencyError('naturalLanguageRouter', ['aiClient', 'enhancedClient', 'projectContext']);
      }

      // Create dependencies inline to avoid circular calls
      const intentAnalyzer = new EnhancedIntentAnalyzer(deps.aiClient);
      const taskPlanner = new TaskPlanner(deps.enhancedClient, deps.projectContext);

      return new NaturalLanguageRouter(intentAnalyzer, taskPlanner);
    });

    logger.debug(`Registered ${this.factories.size} component factories`);
  }

  /**
   * Create a component using its registered factory
   */
  static async createComponent<T>(
    type: ComponentType,
    dependencies: ComponentDependencies = {}
  ): Promise<T> {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for component type: ${type}`);
    }

    logger.debug(`Creating component '${type}' with dependencies:`, {
      hasAiClient: !!dependencies.aiClient,
      hasEnhancedClient: !!dependencies.enhancedClient,
      hasProjectContext: !!dependencies.projectContext,
      workingDirectory: dependencies.workingDirectory
    });

    try {
      const component = await factory(dependencies);
      logger.debug(`Component '${type}' created successfully`);
      return component;
    } catch (error) {
      handleComponentError(error, 'ComponentFactoryRegistry', `create-${type}`, { componentType: type, dependencies: Object.keys(dependencies) });
    }
  }

  /**
   * Get the dependency requirements for a component
   */
  static getComponentDependencies(type: ComponentType): (keyof ComponentDependencies)[] {
    const dependencyMap: Record<ComponentType, (keyof ComponentDependencies)[]> = {
      aiClient: [],
      enhancedClient: [],
      projectContext: ['workingDirectory'],
      intentAnalyzer: ['aiClient'],
      conversationManager: [],
      taskPlanner: ['enhancedClient', 'projectContext'],
      advancedContextManager: ['aiClient', 'projectContext'],
      queryDecompositionEngine: ['aiClient', 'projectContext'],
      codeKnowledgeGraph: ['aiClient', 'projectContext'],
      multiStepQueryProcessor: ['aiClient', 'projectContext'],
      naturalLanguageRouter: ['aiClient', 'enhancedClient', 'projectContext']
    };

    return dependencyMap[type] || [];
  }

  /**
   * Check if a component type is registered
   */
  static hasComponent(type: ComponentType): boolean {
    return this.factories.has(type);
  }

  /**
   * Get all registered component types
   */
  static getRegisteredTypes(): ComponentType[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Validate that all required dependencies are provided
   */
  static validateDependencies(type: ComponentType, dependencies: ComponentDependencies): void {
    const required = this.getComponentDependencies(type);
    const missing = required.filter(dep => !(dep in dependencies) || dependencies[dep] === undefined);

    if (missing.length > 0) {
      throw new Error(`Component '${type}' missing required dependencies: ${missing.join(', ')}`);
    }
  }
}

/**
 * Convenience function to create a component
 */
export async function createComponent<T>(
  type: ComponentType,
  dependencies: ComponentDependencies = {}
): Promise<T> {
  return ComponentFactoryRegistry.createComponent<T>(type, dependencies);
}

/**
 * Resolve dependencies automatically for a component
 */
export async function createComponentWithAutoResolve<T>(
  type: ComponentType,
  baseDirectory?: string
): Promise<T> {
  const dependencies: ComponentDependencies = {};

  if (baseDirectory) {
    dependencies.workingDirectory = baseDirectory;
  }

  const required = ComponentFactoryRegistry.getComponentDependencies(type);

  // Auto-resolve common dependencies
  for (const dep of required) {
    switch (dep) {
      case 'aiClient':
        dependencies.aiClient = await LazyInitializers.getAIClientLazy();
        break;
      case 'enhancedClient':
        dependencies.enhancedClient = await LazyInitializers.getEnhancedClientLazy();
        break;
      case 'projectContext':
        dependencies.projectContext = new LazyProjectContext(baseDirectory || getCurrentWorkingDirectory());
        break;
    }
  }

  return ComponentFactoryRegistry.createComponent<T>(type, dependencies);
}