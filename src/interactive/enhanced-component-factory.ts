/**
 * Enhanced Component Factory with Dependency Injection
 *
 * Eliminates circular dependencies by using ServiceRegistry and LazyInitializers.
 * Provides robust component initialization with timeout protection and fallbacks.
 */

import { logger } from '../utils/logger.js';
import { ComponentType, ComponentConfig, LoadProgress } from './component-factory.js';
import { ServiceRegistry, getServiceRegistry } from './service-registry.js';
import { LazyInitializers } from './lazy-initializers.js';
import { InitializationStateMachine, InitState } from './initialization-state-machine.js';
import { EnhancedIntentAnalyzer } from '../ai/enhanced-intent-analyzer.js';
import { TaskPlanner } from '../ai/task-planner.js';
import { AdvancedContextManager } from '../ai/advanced-context-manager.js';
import { QueryDecompositionEngine } from '../ai/query-decomposition-engine.js';
import { CodeKnowledgeGraph } from '../ai/code-knowledge-graph.js';
import { MultiStepQueryProcessor } from '../ai/multi-step-query-processor.js';
import { ConversationManager } from '../ai/conversation-manager.js';
import { NaturalLanguageRouter } from '../routing/nl-router.js';
import { LazyProjectContext } from './lazy-project-context.js';
import { OllamaClient } from '../ai/ollama-client.js';
import { EnhancedClient } from '../ai/enhanced-client.js';
import { ProjectContext } from '../ai/context.js';
import { TIMEOUT_CONFIG, getComponentTimeout } from './timeout-config.js';
import { ComponentFactoryRegistry, ComponentDependencies } from './component-factory-registry.js';
import { getCurrentWorkingDirectory } from './working-directory-provider.js';
import { CONSTANTS, SERVICE_PREFIXES, SHARED_SERVICES } from './constants.js';
import { InteractiveErrorHandler, normalizeError, handleComponentError } from './error-handler.js';
import { BaseComponentFactory, IEnhancedComponentFactory } from './component-factory-interface.js';

export class EnhancedComponentFactory extends BaseComponentFactory implements IEnhancedComponentFactory {
  private registry: ServiceRegistry;
  private stateMachine: InitializationStateMachine;
  private activeTimeouts = new Map<ComponentType, NodeJS.Timeout>();

  // Legacy compatibility properties
  public components = new Map<ComponentType, any>();
  public initPromises = new Map<ComponentType, Promise<any>>();
  public loadProgress = new Map<ComponentType, LoadProgress>();

  /**
   * Generate service name for a component type
   */
  private getServiceName(type: ComponentType): string {
    return `${SERVICE_PREFIXES.COMPONENT}${type}`;
  }

  constructor() {
    super();
    this.registry = getServiceRegistry();
    this.stateMachine = new InitializationStateMachine();

    // Add state machine listeners to track progress
    this.stateMachine.addGlobalStateListener((component, state) => {
      this.updateProgress(component, this.mapStateToProgress(state));
    });

    logger.debug('EnhancedComponentFactory initialized');
  }

  /**
   * Get a component with enhanced dependency management
   */
  async getComponent<T>(
    type: ComponentType,
    config: ComponentConfig = {}
  ): Promise<T> {
    // Validate component type first
    if (!ComponentFactoryRegistry.hasComponent(type)) {
      // Track the failure
      this.stateMachine.failInitialization(type, new Error(`Unknown component type: ${type}`));
      
      // Try fallback if available
      if (config.fallback) {
        logger.warn(`Component ${type} is unknown, using fallback`);
        const fallbackComponent = config.fallback();
        this.stateMachine.degradeComponent(type);
        return fallbackComponent;
      }
      
      throw new Error(`Unknown component type: ${type}`);
    }

    const serviceName = this.getServiceName(type);
    const options = {
      timeout: config.timeout || getComponentTimeout(type),
      retries: TIMEOUT_CONFIG.DEFAULT_RETRIES,
      description: `Component: ${type}`
    };

    try {
      // If component is already ready, just get it from registry
      const currentState = this.stateMachine.getState(type);
      if (currentState === InitState.READY || currentState === InitState.DEGRADED) {
        // Component already initialized, return from registry
        const component = await this.registry.getService<T>(
          serviceName,
          () => this.createComponentSafe<T>(type, config),
          options
        );
        return component;
      }

      // Check if we can start initialization
      if (!this.stateMachine.startInitialization(type)) {
        // Dependencies not ready, initialize them first
        const requiredDeps = ComponentFactoryRegistry.getComponentDependencies(type);

        // Filter out non-component dependencies (like 'workingDirectory')
        const componentDeps = requiredDeps.filter(dep =>
          dep !== 'workingDirectory'
        ) as ComponentType[];

        // Initialize component dependencies concurrently
        await Promise.all(componentDeps.map(async (dep) => {
          const depState = this.stateMachine.getState(dep);
          if (depState !== InitState.READY && depState !== InitState.DEGRADED) {
            // Recursively initialize dependency
            await this.getComponent(dep, { timeout: config.timeout });
          }
        }));

        // Now dependencies should be ready, start initialization
        if (!this.stateMachine.startInitialization(type)) {
          // If still can't start, throw error
          throw new Error(`Cannot initialize ${type} - dependencies still not satisfied after initialization`);
        }
      }

      const component = await this.registry.getService<T>(
        serviceName,
        () => this.createComponentSafe<T>(type, config),
        options
      );

      // Update legacy compatibility maps
      this.components.set(type, component);
      if (this.initPromises.has(type)) {
        this.initPromises.delete(type);
      }

      this.stateMachine.completeInitialization(type);
      return component;

    } catch (error) {
      const normalizedErr = normalizeError(error);
      this.stateMachine.failInitialization(type, normalizedErr);

      // Try fallback if available
      if (config.fallback) {
        logger.warn(`Component ${type} failed, using fallback`);
        try {
          const fallbackComponent = config.fallback();
          this.stateMachine.degradeComponent(type);
          return fallbackComponent;
        } catch (fallbackError) {
          handleComponentError(fallbackError, 'EnhancedComponentFactory', `fallback-${type}`, { componentType: type });
        }
      }

      handleComponentError(error, 'EnhancedComponentFactory', `create-${type}`, { componentType: type });
    }
  }

  /**
   * Wait for component dependencies to be ready
   */
  private async waitForDependencies(component: ComponentType, timeout: number): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Clear any existing timeout for this component
      const existingTimeout = this.activeTimeouts.get(component);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const checkDependencies = () => {
        if (this.stateMachine.canInitialize(component)) {
          // Clear timeout before resolving
          this.activeTimeouts.delete(component);
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          // Clear timeout before rejecting
          this.activeTimeouts.delete(component);
          reject(new Error(`Dependency timeout for ${component} after ${timeout}ms`));
          return;
        }

        // Schedule next check and store timeout ID
        const timeoutId = setTimeout(checkDependencies, CONSTANTS.DEPENDENCY_CHECK_INTERVAL_MS);
        this.activeTimeouts.set(component, timeoutId);
      };

      checkDependencies();
    });
  }

  /**
   * Safe component creation with proper error handling
   */
  private async createComponentSafe<T>(
    type: ComponentType,
    config: ComponentConfig
  ): Promise<T> {
    logger.debug(`Creating component: ${type}`);

    try {
      // Build dependencies for the component
      const dependencies: ComponentDependencies = {
        workingDirectory: config.workingDirectory || getCurrentWorkingDirectory()
      };

      // Get required dependencies from the registry
      const requiredDeps = ComponentFactoryRegistry.getComponentDependencies(type);

      // For base components, create them directly to avoid circular dependencies
      if (['aiClient', 'enhancedClient', 'projectContext'].includes(type)) {
        // These components should be created directly without dependency resolution
        // to avoid infinite recursion in the service registry
        const component = await ComponentFactoryRegistry.createComponent<T>(type, dependencies);
        return component;
      }

      // Special handling for naturalLanguageRouter to resolve its dependencies properly
      if (type === 'naturalLanguageRouter') {
        // Manually resolve required dependencies for naturalLanguageRouter
        if (!dependencies.aiClient) {
          dependencies.aiClient = await this.registry.getService<OllamaClient>(
            this.getServiceName('aiClient'),
            async () => await ComponentFactoryRegistry.createComponent<OllamaClient>('aiClient')
          );
        }
        if (!dependencies.enhancedClient) {
          dependencies.enhancedClient = await this.registry.getService<EnhancedClient>(
            this.getServiceName('enhancedClient'),
            async () => await ComponentFactoryRegistry.createComponent<EnhancedClient>('enhancedClient')
          );
        }
        if (!dependencies.projectContext) {
          dependencies.projectContext = await this.registry.getService(
            SHARED_SERVICES.PROJECT_CONTEXT,
            async () => new LazyProjectContext(dependencies.workingDirectory!)
          );
        }

        // Now create naturalLanguageRouter directly with all dependencies resolved
        const component = await ComponentFactoryRegistry.createComponent<T>(type, dependencies);
        return component;
      }

      // Resolve dependencies that need to come from other components
      for (const dep of requiredDeps) {
        switch (dep) {
          case 'aiClient':
            if (!dependencies.aiClient) {
              // For aiClient, use the registry directly to avoid circular dependency
              dependencies.aiClient = await this.registry.getService<OllamaClient>(
                this.getServiceName('aiClient'),
                async () => await ComponentFactoryRegistry.createComponent<OllamaClient>('aiClient')
              );
            }
            break;
          case 'enhancedClient':
            if (!dependencies.enhancedClient) {
              // For enhancedClient, use the registry directly to avoid circular dependency
              dependencies.enhancedClient = await this.registry.getService<EnhancedClient>(
                this.getServiceName('enhancedClient'),
                async () => await ComponentFactoryRegistry.createComponent<EnhancedClient>('enhancedClient')
              );
            }
            break;
          case 'projectContext':
            if (!dependencies.projectContext) {
              // Use shared project context from registry for consistency
              dependencies.projectContext = await this.registry.getService(
                SHARED_SERVICES.PROJECT_CONTEXT,
                async () => new LazyProjectContext(dependencies.workingDirectory!)
              );
            }
            break;
        }
      }

      // Create component using centralized factory
      const component = await ComponentFactoryRegistry.createComponent<T>(type, dependencies);
      return component;

    } catch (error) {
      handleComponentError(error, 'EnhancedComponentFactory', `createSafe-${type}`, { componentType: type });
    }
  }

  /**
   * Check if component is available (ready)
   */
  hasComponent(type: ComponentType): boolean {
    const serviceName = this.getServiceName(type);
    return this.registry.hasService(serviceName) &&
           this.stateMachine.getState(type) === InitState.READY;
  }

  /**
   * Get component state
   */
  getComponentState(type: ComponentType): InitState {
    return this.stateMachine.getState(type);
  }

  /**
   * Get all component states
   */
  getAllComponentStates(): Map<ComponentType, InitState> {
    const states = new Map<ComponentType, InitState>();
    const allComponents: ComponentType[] = [
      'aiClient', 'enhancedClient', 'projectContext', 'intentAnalyzer',
      'conversationManager', 'taskPlanner', 'advancedContextManager',
      'queryDecompositionEngine', 'codeKnowledgeGraph', 'multiStepQueryProcessor',
      'naturalLanguageRouter'
    ];

    allComponents.forEach(component => {
      states.set(component, this.stateMachine.getState(component));
    });

    return states;
  }

  /**
   * Get components ready for initialization
   */
  getReadyToInitialize(): ComponentType[] {
    return this.stateMachine.getReadyToInitialize();
  }

  /**
   * Get initialization summary
   */
  getInitializationSummary(): {
    total: number;
    ready: number;
    failed: number;
    initializing: number;
    successRate: number;
  } {
    return this.stateMachine.getSummary();
  }

  /**
   * Clear a component (useful for testing)
   */
  async clearComponent(type: ComponentType): Promise<void> {
    const serviceName = this.getServiceName(type);
    await this.registry.clearService(serviceName);
    this.stateMachine.setState(type, InitState.NOT_STARTED);
  }

  /**
   * Clear all components
   */
  async clearAllComponents(): Promise<void> {
    await this.registry.clearAll();
    this.stateMachine.reset();
  }

  /**
   * Get diagnostic information
   */
  async getDiagnostics(): Promise<{
    registry: string;
    stateMachine: string;
    aiSystem: string;
  }> {
    const aiSystem = await LazyInitializers.getHealthReport().catch(() => 'Health check failed');

    return {
      registry: this.registry.getDiagnosticReport(),
      stateMachine: this.stateMachine.getDiagnosticReport(),
      aiSystem
    };
  }

  /**
   * Generate comprehensive diagnostic report
   */
  async getComprehensiveDiagnostics(): Promise<string> {
    let report = '🔧 Enhanced Component Factory Diagnostics\n\n';

    // Initialization summary
    const summary = this.getInitializationSummary();
    report += '📊 Initialization Summary:\n';
    report += `  Total Components: ${summary.total}\n`;
    report += `  Ready: ${summary.ready}\n`;
    report += `  Failed: ${summary.failed}\n`;
    report += `  Initializing: ${summary.initializing}\n`;
    report += `  Success Rate: ${(summary.successRate * 100).toFixed(1)}%\n\n`;

    // Component states
    const states = this.getAllComponentStates();
    report += '🏗️  Component States:\n';
    for (const [component, state] of states) {
      const icon = {
        [InitState.NOT_STARTED]: '⚪',
        [InitState.PENDING_DEPENDENCIES]: '🔶',
        [InitState.INITIALIZING]: '🔄',
        [InitState.READY]: '✅',
        [InitState.FAILED]: '❌',
        [InitState.DEGRADED]: '⚠️'
      }[state];
      report += `  ${icon} ${component}: ${state}\n`;
    }

    // Service registry info
    report += '\n' + this.registry.getDiagnosticReport();

    // State machine info
    report += '\n' + this.stateMachine.getDiagnosticReport();

    // AI system health
    try {
      const aiHealth = await LazyInitializers.getHealthReport();
      report += '\n' + aiHealth;
    } catch (error) {
      report += '\n❌ AI System Health Check Failed\n';
    }

    return report;
  }

  /**
   * Map state machine states to progress states
   */
  private mapStateToProgress(state: InitState): 'loading' | 'ready' | 'failed' {
    switch (state) {
      case InitState.INITIALIZING:
      case InitState.PENDING_DEPENDENCIES:
        return 'loading';
      case InitState.READY:
      case InitState.DEGRADED:
        return 'ready';
      case InitState.FAILED:
        return 'failed';
      default:
        return 'loading';
    }
  }

  /**
   * Update progress tracking
   */
  private updateProgress(
    component: ComponentType,
    status: 'loading' | 'ready' | 'failed',
    error?: Error
  ): void {
    const componentInfo = this.stateMachine.getComponentInfo(component);
    if (!componentInfo) return;

    const progress: LoadProgress = {
      component,
      status,
      startTime: componentInfo.startTime || Date.now(),
      endTime: componentInfo.endTime,
      error
    };

    // Re-enabled with async event queuing to prevent circular dependency
    this.notifyProgress(progress);
  }

  /**
   * Check if component is ready (legacy compatibility)
   */
  isReady(type: ComponentType): boolean {
    return this.hasComponent(type);
  }

  /**
   * Clear components (legacy compatibility)
   */
  async clear(): Promise<void> {
    await this.clearAllComponents();
  }

  /**
   * Get component without initializing (legacy compatibility)
   */
  getComponentSync(type: ComponentType): any {
    const serviceName = this.getServiceName(type);
    if (this.registry.hasService(serviceName)) {
      // This is a bit of a hack, but needed for legacy compatibility
      return this.components.get(type);
    }
    return undefined;
  }

  /**
   * Check if component has failed (legacy compatibility)
   */
  hasFailed(type: ComponentType): boolean {
    return this.getComponentState(type) === InitState.FAILED;
  }

  /**
   * Get component error (legacy compatibility)
   */
  getComponentError(type: ComponentType): Error | undefined {
    const info = this.stateMachine.getComponentInfo(type);
    return info?.error;
  }

  /**
   * Get status of all components (legacy compatibility)
   */
  getStatus(): { [key in ComponentType]?: 'loading' | 'ready' | 'failed' } {
    const status: { [key in ComponentType]?: 'loading' | 'ready' | 'failed' } = {};
    const states = this.getAllComponentStates();

    for (const [component, state] of states) {
      status[component] = this.mapStateToProgress(state);
    }

    return status;
  }

  /**
   * Get all progress information (legacy compatibility)
   */
  getAllProgress(): LoadProgress[] {
    const progress: LoadProgress[] = [];
    const states = this.getAllComponentStates();

    for (const [component, state] of states) {
      const info = this.stateMachine.getComponentInfo(component);
      progress.push({
        component,
        status: this.mapStateToProgress(state),
        startTime: info?.startTime || Date.now(),
        endTime: info?.endTime,
        error: info?.error
      });
    }

    return progress;
  }

  /**
   * Preload components (legacy compatibility)
   */
  async preloadComponents(types: ComponentType[]): Promise<void> {
    await Promise.all(types.map(type => this.getComponent(type)));
  }

  /**
   * Create component (legacy compatibility - delegates to getComponent)
   */
  async createComponent<T>(type: ComponentType, config: ComponentConfig = {}): Promise<T> {
    return this.getComponent<T>(type, config);
  }

  /**
   * Create component internal (legacy compatibility - delegates to createComponentSafe)
   */
  async createComponentInternal<T>(type: ComponentType, config: ComponentConfig = {}): Promise<T> {
    return this.createComponentSafe<T>(type, config);
  }

  /**
   * Dispose of the factory
   */
  async dispose(): Promise<void> {
    // Clear all active timeouts
    for (const [component, timeoutId] of this.activeTimeouts) {
      clearTimeout(timeoutId);
    }
    this.activeTimeouts.clear();

    await this.registry.dispose();
    this.stateMachine.dispose();
    logger.debug('EnhancedComponentFactory disposed');
  }

  /**
   * Get factory capabilities
   */
  getCapabilities(): string[] {
    return [
      'Enhanced component lazy loading',
      'State machine-based initialization',
      'Dependency injection with timeout protection',
      'Advanced progress tracking',
      'Component lifecycle management',
      'Diagnostic and monitoring support',
      'Fallback and degradation handling'
    ];
  }

  /**
   * Get factory type identifier
   */
  getFactoryType(): 'basic' | 'enhanced' {
    return 'enhanced';
  }
}

/**
 * Global enhanced component factory instance
 */
let globalEnhancedFactory: EnhancedComponentFactory | null = null;

export function getEnhancedComponentFactory(): EnhancedComponentFactory {
  if (!globalEnhancedFactory) {
    globalEnhancedFactory = new EnhancedComponentFactory();
  }
  return globalEnhancedFactory;
}

export async function resetEnhancedComponentFactory(): Promise<void> {
  if (globalEnhancedFactory) {
    await globalEnhancedFactory.dispose();
  }
  globalEnhancedFactory = null;
}