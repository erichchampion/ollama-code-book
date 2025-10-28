/**
 * Component Factory for Lazy Initialization
 *
 * Manages lazy loading and dependency injection for interactive mode components
 * to improve startup performance and reliability.
 */

import { logger } from '../utils/logger.js';
import { ProjectContext } from '../ai/context.js';
import { EnhancedIntentAnalyzer } from '../ai/enhanced-intent-analyzer.js';
import { TaskPlanner } from '../ai/task-planner.js';
import { AdvancedContextManager } from '../ai/advanced-context-manager.js';
import { QueryDecompositionEngine } from '../ai/query-decomposition-engine.js';
import { CodeKnowledgeGraph } from '../ai/code-knowledge-graph.js';
import { MultiStepQueryProcessor } from '../ai/multi-step-query-processor.js';
import { ConversationManager } from '../ai/conversation-manager.js';
import { NaturalLanguageRouter } from '../routing/nl-router.js';
import { getAIClient, getEnhancedClient } from '../ai/index.js';
import { LazyProjectContext } from './lazy-project-context.js';
import { BaseComponentFactory, IComponentFactory } from './component-factory-interface.js';
import { getStatusTracker, resetStatusTracker } from './component-status.js';

export type ComponentType =
  | 'aiClient'
  | 'enhancedClient'
  | 'projectContext'
  | 'intentAnalyzer'
  | 'taskPlanner'
  | 'conversationManager'
  | 'advancedContextManager'
  | 'queryDecompositionEngine'
  | 'codeKnowledgeGraph'
  | 'multiStepQueryProcessor'
  | 'naturalLanguageRouter';

export interface ComponentConfig {
  timeout?: number;
  essential?: boolean;
  fallback?: () => any;
  workingDirectory?: string;
}

export interface LoadProgress {
  component: ComponentType;
  status: 'loading' | 'ready' | 'failed';
  startTime: number;
  endTime?: number;
  error?: Error;
}

export class ComponentFactory extends BaseComponentFactory {
  private components = new Map<ComponentType, any>();
  private initPromises = new Map<ComponentType, Promise<any>>();
  private loadProgress = new Map<ComponentType, LoadProgress>();
  private creationStack = new Set<ComponentType>(); // Track creation stack to prevent circular deps

  /**
   * Get a component, lazy loading if necessary
   */
  async getComponent<T>(
    type: ComponentType,
    config: ComponentConfig = {}
  ): Promise<T> {
    // Return existing component if available
    if (this.components.has(type)) {
      return this.components.get(type);
    }

    // Return existing promise if component is being loaded
    if (this.initPromises.has(type)) {
      return this.initPromises.get(type);
    }

    // Start loading the component
    const initPromise = this.createComponent<T>(type, config);
    this.initPromises.set(type, initPromise);

    try {
      const component = await initPromise;
      this.components.set(type, component);
      this.initPromises.delete(type);

      this.updateProgress(type, 'ready');
      return component;
    } catch (error) {
      this.initPromises.delete(type);
      this.updateProgress(type, 'failed', error instanceof Error ? error : new Error(String(error)));

      // Try fallback if available
      if (config.fallback) {
        logger.warn(`Component ${type} failed, using fallback`);
        const fallbackComponent = config.fallback();
        this.components.set(type, fallbackComponent);
        return fallbackComponent;
      }

      throw error;
    }
  }

  /**
   * Check if a component is ready (loaded)
   */
  isReady(type: ComponentType): boolean {
    return this.components.has(type);
  }

  /**
   * Get component load status
   */
  getStatus(type: ComponentType): 'not-loaded' | 'loading' | 'ready' | 'failed' {
    if (this.components.has(type)) return 'ready';
    if (this.initPromises.has(type)) return 'loading';

    const progress = this.loadProgress.get(type);
    if (progress?.status === 'failed') return 'failed';

    return 'not-loaded';
  }

  /**
   * Get all load progress information
   */
  getAllProgress(): LoadProgress[] {
    return Array.from(this.loadProgress.values());
  }

  /**
   * Pre-load components in background
   */
  preloadComponents(types: ComponentType[]): void {
    types.forEach(type => {
      if (!this.components.has(type) && !this.initPromises.has(type)) {
        this.getComponent(type).catch(error => {
          logger.debug(`Background preload failed for ${type}:`, error);
        });
      }
    });
  }

  /**
   * Clear all cached components
   */
  clear(): void {
    this.components.clear();
    this.initPromises.clear();
    this.loadProgress.clear();
    this.creationStack.clear();
  }

  /**
   * Dispose the component factory and clean up resources
   */
  dispose(): void {
    this.clear();
    // Clean up the global status tracker
    try {
      resetStatusTracker();
    } catch (error) {
      // Ignore if module not available
    }
  }

  /**
   * Helper method to get or create a component with caching
   * Eliminates DRY violation of repeated "components.get() || await getComponent()" pattern
   * FIXED: Prevents infinite recursion by checking creation stack before calling getComponent
   */
  private async getOrCreateComponent<T>(type: ComponentType): Promise<T> {
    const cached = this.components.get(type);
    if (cached) {
      return cached as T;
    }

    // Prevent infinite recursion if component is already being created
    if (this.creationStack.has(type)) {
      logger.warn(`Breaking circular dependency for ${type}, returning fallback`);
      return this.createFallbackComponent(type) as T;
    }

    return await this.getComponent<T>(type);
  }

  /**
   * Create a component instance
   */
  private async createComponent<T>(
    type: ComponentType,
    config: ComponentConfig
  ): Promise<T> {
    this.updateProgress(type, 'loading');

    const startTime = Date.now();
    logger.debug(`Loading component: ${type}`);

    let timeoutId: NodeJS.Timeout | undefined;
    try {
      // Add timeout protection
      const timeout = config.timeout || 10000; // 10 second default
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Component ${type} loading timeout after ${timeout}ms`)), timeout);
      });

      const componentPromise = this.createComponentInternal<T>(type);
      const component = await Promise.race([componentPromise, timeoutPromise]) as T;
      
      // Clear the timeout since component loaded successfully
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const loadTime = Date.now() - startTime;
      logger.debug(`Component ${type} loaded in ${loadTime}ms`);

      return component;
    } catch (error) {
      // Clear the timeout since component failed to load
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const loadTime = Date.now() - startTime;
      logger.error(`Component ${type} failed to load after ${loadTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Internal component creation logic
   */
  private async createComponentInternal<T>(type: ComponentType): Promise<T> {
    // Check for circular dependency
    if (this.creationStack.has(type)) {
      logger.warn(`Circular dependency detected for ${type}, returning cached component or creating fallback`);
      const existingComponent = this.components.get(type);
      if (existingComponent) {
        return existingComponent;
      }
      // Create a minimal fallback to break the cycle
      return this.createFallbackComponent(type) as T;
    }

    // Track this component in creation stack
    this.creationStack.add(type);

    try {
      return await this.createComponentInternalUnsafe<T>(type);
    } finally {
      // Always remove from creation stack when done
      this.creationStack.delete(type);
    }
  }

  /**
   * Internal component creation logic (without circular dependency protection)
   */
  private async createComponentInternalUnsafe<T>(type: ComponentType): Promise<T> {
    switch (type) {
      case 'aiClient':
        return getAIClient() as T;

      case 'enhancedClient':
        return getEnhancedClient() as T;

      case 'projectContext': {
        const lazyContext = new LazyProjectContext(process.cwd());
        // Initialize project context immediately to ensure files are available
        await lazyContext.initialize();
        logger.debug(`ComponentFactory: LazyProjectContext initialized with ${lazyContext.allFiles.length} files`);
        return lazyContext as T;
      }

      case 'intentAnalyzer': {
        const aiClient = getAIClient();
        return new EnhancedIntentAnalyzer(aiClient) as T;
      }

      case 'conversationManager':
        return new ConversationManager() as T;

      case 'taskPlanner': {
        const enhancedClient = this.components.get('enhancedClient') || getEnhancedClient();
        // Reuse cached projectContext to avoid circular dependencies
        const projectContext = await this.getOrCreateComponent<ProjectContext>('projectContext');
        return new TaskPlanner(enhancedClient, projectContext) as T;
      }

      case 'advancedContextManager': {
        const aiClient = this.components.get('aiClient') || getAIClient();
        // Reuse cached projectContext to avoid circular dependencies
        const projectContext = await this.getOrCreateComponent<ProjectContext>('projectContext');
        logger.debug(`ComponentFactory: Creating Advanced Context Manager with ${projectContext.allFiles.length} files`);
        const manager = new AdvancedContextManager(aiClient, projectContext);
        await manager.initialize();
        return manager as T;
      }

      case 'queryDecompositionEngine': {
        const aiClient = this.components.get('aiClient') || getAIClient();
        // Reuse cached projectContext to avoid circular dependencies
        const projectContext = await this.getOrCreateComponent<ProjectContext>('projectContext');
        const engine = new QueryDecompositionEngine(aiClient, projectContext);
        await engine.initialize();
        return engine as T;
      }

      case 'codeKnowledgeGraph': {
        const aiClient = this.components.get('aiClient') || getAIClient();
        // Reuse cached projectContext to avoid circular dependencies
        const projectContext = await this.getOrCreateComponent<ProjectContext>('projectContext');
        const graph = new CodeKnowledgeGraph(aiClient, projectContext);
        await graph.initialize();
        return graph as T;
      }

      case 'multiStepQueryProcessor': {
        const aiClient = this.components.get('aiClient') || getAIClient();
        // Reuse cached projectContext to avoid circular dependencies
        const projectContext = await this.getOrCreateComponent<ProjectContext>('projectContext');
        return new MultiStepQueryProcessor(aiClient, projectContext) as T;
      }

      case 'naturalLanguageRouter': {
        const aiClient = this.components.get('aiClient') || getAIClient();
        // Reuse cached components to avoid circular dependencies
        const intentAnalyzer = await this.getOrCreateComponent<EnhancedIntentAnalyzer>('intentAnalyzer');
        const enhancedClient = this.components.get('enhancedClient') || getEnhancedClient();
        const taskPlanner = await this.getOrCreateComponent<TaskPlanner>('taskPlanner');
        return new NaturalLanguageRouter(intentAnalyzer, taskPlanner) as T;
      }

      default:
        throw new Error(`Unknown component type: ${type}`);
    }
  }

  /**
   * Update component loading progress
   */
  private updateProgress(
    component: ComponentType,
    status: 'loading' | 'ready' | 'failed',
    error?: Error
  ): void {
    const progress: LoadProgress = {
      component,
      status,
      startTime: this.loadProgress.get(component)?.startTime || Date.now(),
      endTime: status !== 'loading' ? Date.now() : undefined,
      error
    };

    this.loadProgress.set(component, progress);

    // Update global status tracker for real-time monitoring
    try {
      const statusTracker = getStatusTracker();
      statusTracker.updateFromProgress(progress);
    } catch (error) {
      // Don't let status tracking errors break component loading
      logger.debug('Status tracker update failed:', error);
    }

    // Re-enabled with async event queuing to prevent circular dependency
    this.notifyProgress(progress);
  }

  /**
   * Get factory capabilities
   */
  getCapabilities(): string[] {
    return [
      'Component lazy loading',
      'Progress tracking',
      'Component caching',
      'Basic dependency injection'
    ];
  }

  /**
   * Get factory type identifier
   */
  getFactoryType(): 'basic' | 'enhanced' {
    return 'basic';
  }

  /**
   * Create fallback component when circular dependency detected
   */
  private createFallbackComponent(type: ComponentType): any {
    logger.warn(`Creating fallback for ${type} due to circular dependency`);

    switch (type) {
      case 'projectContext':
        // Return minimal project context
        return {
          root: process.cwd(),
          allFiles: [],
          projectLanguages: [],
          getQuickInfo: () => ({ root: process.cwd(), hasPackageJson: false, hasGit: false, estimatedFileCount: 0 }),
          initialize: async () => {}
        };

      case 'taskPlanner':
        // Return simple task execution
        return {
          planTasks: () => ({ needsApproval: false, plan: { tasks: [], estimatedTime: 0 } }),
          executePlan: () => ({ success: true, message: 'Task completed with basic functionality' })
        };

      case 'advancedContextManager':
        // Return basic context
        return {
          getEnhancedContext: () => ({ semanticMatches: [], relatedCode: [], suggestions: [] }),
          initialize: async () => {}
        };

      case 'intentAnalyzer':
        // Return simple intent analyzer
        return {
          analyzeIntent: () => ({ intent: 'general', confidence: 0.5, suggestions: [] })
        };

      case 'codeKnowledgeGraph':
        // Return basic knowledge graph
        return {
          getRelatedCode: () => ({ related: [], suggestions: [] }),
          analyzeCodeStructure: () => ({ structure: {}, insights: [] }),
          initialize: async () => {}
        };

      case 'queryDecompositionEngine':
        // Return basic query engine
        return {
          decomposeQuery: () => ({ steps: [], confidence: 0.5 }),
          initialize: async () => {}
        };

      case 'multiStepQueryProcessor':
        // Return basic processor
        return {
          processQuery: async () => ({ result: 'Query processed with basic functionality', steps: [] })
        };

      case 'naturalLanguageRouter':
        // Return simple router
        return {
          route: async () => ({ type: 'fallback', message: 'Using simplified routing' })
        };

      default:
        return null;
    }
  }
}

/**
 * Singleton factory instance
 */
let globalFactory: ComponentFactory | null = null;

export function getComponentFactory(): ComponentFactory {
  if (!globalFactory) {
    globalFactory = new ComponentFactory();
  }
  return globalFactory;
}

export function resetComponentFactory(): void {
  if (globalFactory) {
    globalFactory.clear();
  }
  globalFactory = null;
}

export function clearGlobalFactory(): void {
  if (globalFactory) {
    globalFactory.dispose();
  }
  globalFactory = null;
}