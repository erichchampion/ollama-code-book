/**
 * Lazy loads modules on demand
 */
export class LazyModuleLoader<T> {
  private instance?: T;
  private loading?: Promise<T>;

  constructor(
    private loader: () => Promise<T>,
    private logger?: Logger
  ) {}

  /**
   * Get module instance (loads if needed)
   */
  async get(): Promise<T> {
    // Return cached instance
    if (this.instance) {
      return this.instance;
    }

    // Return in-flight loading promise
    if (this.loading) {
      return this.loading;
    }

    // Start loading
    this.logger?.debug('Lazy loading module');

    const startTime = performance.now();

    this.loading = this.loader();

    try {
      this.instance = await this.loading;

      const duration = performance.now() - startTime;

      this.logger?.debug('Module loaded', { duration });

      return this.instance;

    } finally {
      this.loading = undefined;
    }
  }

  /**
   * Check if module is loaded
   */
  isLoaded(): boolean {
    return this.instance !== undefined;
  }

  /**
   * Unload module (for memory management)
   */
  unload(): void {
    this.instance = undefined;
  }
}