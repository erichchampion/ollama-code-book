/**
 * Command registry with lazy loading
 */
export class LazyCommandRegistry {
  private loaders: Map<string, LazyModuleLoader<RoutableCommand>> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register command with lazy loader
   */
  register(
    name: string,
    loader: () => Promise<new () => RoutableCommand>,
    dependencies?: any
  ): void {
    const moduleLoader = new LazyModuleLoader(
      async () => {
        const CommandClass = await loader();
        return new CommandClass(dependencies);
      },
      this.logger
    );

    this.loaders.set(name, moduleLoader);
  }

  /**
   * Get command (loads if needed)
   */
  async get(name: string): Promise<RoutableCommand | null> {
    const loader = this.loaders.get(name);

    if (!loader) {
      return null;
    }

    return loader.get();
  }

  /**
   * Preload commonly used commands
   */
  async preload(commandNames: string[]): Promise<void> {
    this.logger.info('Preloading commands', { commands: commandNames });

    await Promise.all(
      commandNames.map(name => this.get(name))
    );
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    total: number;
    loaded: number;
    notLoaded: number;
  } {
    let loaded = 0;

    for (const loader of this.loaders.values()) {
      if (loader.isLoaded()) {
        loaded++;
      }
    }

    return {
      total: this.loaders.size,
      loaded,
      notLoaded: this.loaders.size - loaded
    };
  }
}