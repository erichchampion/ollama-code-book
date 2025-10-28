export class DIContainer {
  private services = new Map<string, ServiceDefinition>();
  private resolving = new Set<string>();
  private initialized = new Set<string>();

  /**
   * Register a service with the container
   */
  register<T>(
    key: string,
    constructor: new (...args: any[]) => T,
    options: ServiceOptions = {}
  ): void {
    if (this.services.has(key)) {
      throw new Error(`Service '${key}' is already registered`);
    }

    // Default to singleton
    const opts: ServiceOptions = {
      singleton: true,
      ...options
    };

    // Extract dependencies from constructor
    const dependencies = opts.dependencies || this.extractDependencies(constructor);

    const definition: ServiceDefinition = {
      key,
      constructor,
      factory: opts.factory,
      options: opts,
      dependencies
    };

    this.services.set(key, definition);
  }

  /**
   * Register a factory function
   */
  registerFactory<T>(
    key: string,
    factory: (container: DIContainer) => T | Promise<T>,
    options: ServiceOptions = {}
  ): void {
    if (this.services.has(key)) {
      throw new Error(`Service '${key}' is already registered`);
    }

    const opts: ServiceOptions = {
      singleton: true,
      ...options
    };

    const definition: ServiceDefinition = {
      key,
      factory,
      options: opts,
      dependencies: opts.dependencies || []
    };

    this.services.set(key, definition);
  }

  /**
   * Register an existing instance
   */
  registerInstance<T>(key: string, instance: T): void {
    if (this.services.has(key)) {
      throw new Error(`Service '${key}' is already registered`);
    }

    const definition: ServiceDefinition = {
      key,
      options: { singleton: true },
      instance,
      dependencies: []
    };

    this.services.set(key, definition);
    this.initialized.add(key);
  }

  /**
   * Extract dependencies from constructor parameters
   * This is simplified - in production, use reflect-metadata
   */
  private extractDependencies(constructor: new (...args: any[]) => any): string[] {
    // Get parameter names from function signature
    const funcStr = constructor.toString();
    const match = funcStr.match(/constructor\s*\(([^)]*)\)/);

    if (!match || !match[1].trim()) {
      return [];
    }

    // Parse parameter list
    const params = match[1]
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    // Extract parameter names (simplified - doesn't handle all cases)
    return params.map(param => {
      // Handle: "private router: IntelligentRouter"
      const parts = param.split(':');
      if (parts.length > 1) {
        const name = parts[0].trim().split(' ').pop()!;
        return name;
      }

      // Handle: "router"
      return param.split(' ').pop()!;
    });
  }
}