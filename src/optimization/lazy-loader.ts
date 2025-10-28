/**
 * Lazy Loading System
 *
 * Optimizes startup time by deferring expensive initialization
 * until actually needed by specific commands
 */

import { logger } from '../utils/logger.js';

interface LazyInitializer<T> {
  key: string;
  initializer: () => Promise<T>;
  instance?: T;
  loading?: Promise<T>;
}

export class LazyLoader {
  private initializers = new Map<string, LazyInitializer<any>>();
  private initialized = new Set<string>();

  /**
   * Register a lazy initializer
   */
  register<T>(key: string, initializer: () => Promise<T>): void {
    this.initializers.set(key, {
      key,
      initializer
    });
  }

  /**
   * Get or initialize a component
   */
  async get<T>(key: string): Promise<T> {
    const init = this.initializers.get(key);
    if (!init) {
      throw new Error(`Lazy initializer not found for key: ${key}`);
    }

    // Return cached instance if available
    if (init.instance) {
      return init.instance;
    }

    // Return loading promise if already in progress
    if (init.loading) {
      return init.loading;
    }

    // Start initialization
    logger.debug(`Lazy loading: ${key}`);
    init.loading = init.initializer();

    try {
      init.instance = await init.loading;
      this.initialized.add(key);
      logger.debug(`Lazy loaded successfully: ${key}`);
      return init.instance;
    } catch (error) {
      logger.error(`Failed to lazy load ${key}:`, error);
      throw error;
    } finally {
      delete init.loading;
    }
  }

  /**
   * Check if a component is loaded
   */
  isLoaded(key: string): boolean {
    return this.initialized.has(key);
  }

  /**
   * Preload specific components
   */
  async preload(keys: string[]): Promise<void> {
    const promises = keys.map(key => this.get(key).catch(error => {
      logger.warn(`Failed to preload ${key}:`, error);
    }));

    await Promise.all(promises);
  }

  /**
   * Get loading status
   */
  getStatus(): { loaded: string[]; available: string[] } {
    return {
      loaded: Array.from(this.initialized),
      available: Array.from(this.initializers.keys())
    };
  }

  /**
   * Dispose of the lazy loader and clean up resources
   */
  async dispose(): Promise<void> {
    this.initializers.clear();
    this.initialized.clear();
    logger.debug('Lazy loader disposed');
  }
}

/**
 * Command categorization for startup optimization
 */
export const CommandRequirements = {
  // Commands that don't need AI initialization
  BASIC: ['help', 'version', 'commands', 'config-show', 'config-set', 'config-get', 'list-models'],

  // Commands that need AI but not project context
  AI_ONLY: [] as string[],

  // Commands that need project context
  PROJECT_AWARE: ['ask', 'explain', 'generate', 'fix', 'git-status', 'git-commit', 'search', 'refactor-analyze'],

  // Commands that need full initialization
  FULL_INIT: ['tutorial-start', 'onboarding', 'test-generate', 'refactor-extract']
};

/**
 * Determine what needs to be initialized for a command
 */
export function getCommandRequirements(commandName: string): {
  needsAI: boolean;
  needsProject: boolean;
  needsTools: boolean;
} {
  if (CommandRequirements.BASIC.includes(commandName)) {
    return { needsAI: false, needsProject: false, needsTools: false };
  }

  if (CommandRequirements.AI_ONLY.includes(commandName)) {
    return { needsAI: true, needsProject: false, needsTools: false };
  }

  if (CommandRequirements.PROJECT_AWARE.includes(commandName)) {
    return { needsAI: true, needsProject: true, needsTools: true };
  }

  // Default to full initialization for unknown commands
  return { needsAI: true, needsProject: true, needsTools: true };
}

// Legacy export - use dependency injection instead
// export const lazyLoader = LazyLoader.getInstance();