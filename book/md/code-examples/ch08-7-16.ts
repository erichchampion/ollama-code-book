/**
 * Lazy-loading command loader
 */
export class LazyCommandLoader {
  private loadedCommands = new Map<string, RoutableCommand>();
  private loadPromises = new Map<string, Promise<RoutableCommand>>();
  private logger: Logger;

  constructor(
    private registry: CommandRegistry,
    logger: Logger
  ) {
    this.logger = logger;
  }

  /**
   * Load command (with deduplication)
   */
  async load(className: string): Promise<RoutableCommand | null> {
    // Return cached instance
    if (this.loadedCommands.has(className)) {
      return this.loadedCommands.get(className)!;
    }

    // Return in-flight promise (prevents duplicate loads)
    if (this.loadPromises.has(className)) {
      return this.loadPromises.get(className)!;
    }

    // Start new load
    const loadPromise = this.loadCommand(className);
    this.loadPromises.set(className, loadPromise);

    try {
      const command = await loadPromise;

      if (command) {
        this.loadedCommands.set(className, command);
      }

      return command;

    } finally {
      this.loadPromises.delete(className);
    }
  }

  private async loadCommand(className: string): Promise<RoutableCommand | null> {
    const startTime = performance.now();

    const command = await this.registry.get(className);

    const loadTime = performance.now() - startTime;
    this.logger.debug(`Loaded ${className} in ${loadTime.toFixed(2)}ms`);

    return command;
  }

  /**
   * Preload commonly used commands in background
   */
  async preloadCommon(classNames: string[]): Promise<void> {
    const promises = classNames.map(name => this.load(name));
    await Promise.allSettled(promises);
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.loadedCommands.clear();
  }
}