/**
 * Component Factory Interface
 *
 * Defines the common interface that all component factories must implement.
 * This eliminates the need for type casting between different factory implementations.
 */

import { ComponentType, LoadProgress, ComponentConfig } from './component-factory.js';

/**
 * Base interface for all component factories
 */
export interface IComponentFactory {
  /**
   * Get or create a component
   */
  getComponent<T>(type: ComponentType, config?: ComponentConfig): Promise<T>;

  /**
   * Set callback for progress updates
   */
  onProgress(callback: (progress: LoadProgress) => void): void;

  /**
   * Check if a component is ready
   */
  isReady(type: ComponentType): boolean;

  /**
   * Clear components
   */
  clear(): Promise<void> | void;

  /**
   * Preload components (optional - not all factories may support this)
   */
  preloadComponents?(types: ComponentType[]): Promise<void> | void;
}

/**
 * Enhanced component factory interface with additional capabilities
 */
export interface IEnhancedComponentFactory extends IComponentFactory {
  /**
   * Get component state
   */
  getComponentState(type: ComponentType): string;

  /**
   * Get all component states
   */
  getAllComponentStates(): Map<ComponentType, string>;

  /**
   * Clear a specific component
   */
  clearComponent(type: ComponentType): Promise<void> | void;

  /**
   * Get diagnostic information
   */
  getDiagnostics(): Promise<{
    registry: string;
    stateMachine: string;
    aiSystem: string;
  }>;

  /**
   * Dispose of the factory
   */
  dispose(): Promise<void> | void;
}

/**
 * Factory creation options
 */
export interface ComponentFactoryOptions {
  /**
   * Enable enhanced features
   */
  enhanced?: boolean;

  /**
   * Working directory for context
   */
  workingDirectory?: string;

  /**
   * Enable performance monitoring
   */
  monitoring?: boolean;

  /**
   * Fallback mode for degraded operation
   */
  fallbackMode?: boolean;
}

/**
 * Factory creation result
 */
export interface ComponentFactoryResult {
  factory: IComponentFactory;
  type: 'basic' | 'enhanced';
  capabilities: string[];
}

/**
 * Abstract base class for component factories
 */
export abstract class BaseComponentFactory implements IComponentFactory {
  protected onProgressCallback?: (progress: LoadProgress) => void;

  abstract getComponent<T>(type: ComponentType, config?: ComponentConfig): Promise<T>;
  abstract isReady(type: ComponentType): boolean;
  abstract clear(): Promise<void> | void;

  onProgress(callback: (progress: LoadProgress) => void): void {
    this.onProgressCallback = callback;
  }

  protected notifyProgress(progress: LoadProgress): void {
    if (this.onProgressCallback) {
      // Use setTimeout to break potential circular dependency chains
      // This ensures progress notifications are processed asynchronously
      setTimeout(() => {
        try {
          this.onProgressCallback!(progress);
        } catch (error) {
          // Log but don't throw - progress notification failures shouldn't break component loading
          console.warn('Progress notification failed:', error);
        }
      }, 0);
    }
  }

  /**
   * Get factory capabilities
   */
  abstract getCapabilities(): string[];

  /**
   * Get factory type identifier
   */
  abstract getFactoryType(): 'basic' | 'enhanced';
}

/**
 * Type guard to check if factory is enhanced
 */
export function isEnhancedFactory(factory: IComponentFactory): factory is IEnhancedComponentFactory {
  return 'getComponentState' in factory &&
         'getAllComponentStates' in factory &&
         'clearComponent' in factory;
}

/**
 * Type guard to check if factory supports preloading
 */
export function supportsPreloading(factory: IComponentFactory): factory is IComponentFactory & { preloadComponents: (types: ComponentType[]) => Promise<void> | void } {
  return 'preloadComponents' in factory && typeof factory.preloadComponents === 'function';
}

/**
 * Create a component factory based on options
 */
export async function createComponentFactory(options: ComponentFactoryOptions = {}): Promise<ComponentFactoryResult> {
  if (options.enhanced) {
    const { getEnhancedComponentFactory } = await import('./enhanced-component-factory.js');
    const factory = getEnhancedComponentFactory();
    return {
      factory,
      type: 'enhanced',
      capabilities: factory.getCapabilities()
    };
  } else {
    const { getComponentFactory } = await import('./component-factory.js');
    const factory = getComponentFactory();
    return {
      factory,
      type: 'basic',
      capabilities: factory.getCapabilities()
    };
  }
}