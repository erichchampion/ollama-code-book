/**
 * Working Directory Provider
 *
 * Provides centralized working directory management with dependency injection
 * to eliminate hardcoded process.cwd() references throughout the codebase.
 */

import { logger } from '../utils/logger.js';

export interface WorkingDirectoryConfig {
  defaultDirectory?: string;
  allowOverride?: boolean;
}

export class WorkingDirectoryProvider {
  private static instance: WorkingDirectoryProvider;
  private currentDirectory: string;
  private readonly config: Required<WorkingDirectoryConfig>;

  private constructor(config: WorkingDirectoryConfig = {}) {
    this.config = {
      defaultDirectory: process.cwd(),
      allowOverride: true,
      ...config
    };
    this.currentDirectory = this.config.defaultDirectory;

    logger.debug(`WorkingDirectoryProvider initialized with: ${this.currentDirectory}`);
  }

  /**
   * Get the singleton instance
   */
  static getInstance(config?: WorkingDirectoryConfig): WorkingDirectoryProvider {
    if (!WorkingDirectoryProvider.instance) {
      WorkingDirectoryProvider.instance = new WorkingDirectoryProvider(config);
    }
    return WorkingDirectoryProvider.instance;
  }

  /**
   * Get the current working directory
   */
  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  /**
   * Set the working directory (if allowed)
   */
  setCurrentDirectory(directory: string): void {
    if (!this.config.allowOverride) {
      throw new Error('Working directory override is not allowed');
    }

    const previousDirectory = this.currentDirectory;
    this.currentDirectory = directory;

    logger.debug(`Working directory changed from ${previousDirectory} to ${directory}`);
  }

  /**
   * Temporarily use a different directory for a specific operation
   */
  async withDirectory<T>(directory: string, operation: () => Promise<T>): Promise<T> {
    const originalDirectory = this.currentDirectory;

    try {
      this.setCurrentDirectory(directory);
      return await operation();
    } finally {
      this.setCurrentDirectory(originalDirectory);
    }
  }

  /**
   * Get project-relative path
   */
  getProjectPath(...segments: string[]): string {
    return require('path').join(this.currentDirectory, ...segments);
  }

  /**
   * Check if directory exists and is accessible
   */
  async validateDirectory(directory?: string): Promise<boolean> {
    const targetDir = directory || this.currentDirectory;

    try {
      const fs = await import('fs/promises');
      const stat = await fs.stat(targetDir);
      return stat.isDirectory();
    } catch (error) {
      logger.warn(`Directory validation failed for ${targetDir}:`, error);
      return false;
    }
  }

  /**
   * Reset to default directory
   */
  resetToDefault(): void {
    this.currentDirectory = this.config.defaultDirectory;
    logger.debug(`Reset to default directory: ${this.currentDirectory}`);
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<Required<WorkingDirectoryConfig>> {
    return { ...this.config };
  }

  /**
   * Create a scoped provider for a specific directory
   */
  createScoped(directory: string): ScopedWorkingDirectoryProvider {
    return new ScopedWorkingDirectoryProvider(directory, this);
  }
}

/**
 * Scoped working directory provider for component-specific directories
 */
export class ScopedWorkingDirectoryProvider {
  constructor(
    private readonly scopedDirectory: string,
    private readonly parentProvider: WorkingDirectoryProvider
  ) {}

  getCurrentDirectory(): string {
    return this.scopedDirectory;
  }

  getProjectPath(...segments: string[]): string {
    return require('path').join(this.scopedDirectory, ...segments);
  }

  async validateDirectory(): Promise<boolean> {
    return this.parentProvider.validateDirectory(this.scopedDirectory);
  }

  getParentProvider(): WorkingDirectoryProvider {
    return this.parentProvider;
  }
}

/**
 * Global working directory provider instance
 */
let globalProvider: WorkingDirectoryProvider | null = null;

/**
 * Get the global working directory provider
 */
export function getWorkingDirectoryProvider(config?: WorkingDirectoryConfig): WorkingDirectoryProvider {
  if (!globalProvider) {
    globalProvider = WorkingDirectoryProvider.getInstance(config);
  }
  return globalProvider;
}

/**
 * Reset the global provider (useful for testing)
 */
export function resetWorkingDirectoryProvider(): void {
  globalProvider = null;
}

/**
 * Convenience function to get current working directory
 */
export function getCurrentWorkingDirectory(): string {
  return getWorkingDirectoryProvider().getCurrentDirectory();
}

/**
 * Convenience function to get project path
 */
export function getProjectPath(...segments: string[]): string {
  return getWorkingDirectoryProvider().getProjectPath(...segments);
}

/**
 * Convenience function for directory-scoped operations
 */
export async function withWorkingDirectory<T>(
  directory: string,
  operation: () => Promise<T>
): Promise<T> {
  return getWorkingDirectoryProvider().withDirectory(directory, operation);
}