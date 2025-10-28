export class DIContainer {
  // ... previous code ...

  /**
   * Resolve a service (create instance or return cached)
   */
  async resolve<T>(key: string): Promise<T> {
    const definition = this.services.get(key);

    if (!definition) {
      throw new Error(`Service '${key}' is not registered`);
    }

    // Return cached singleton instance
    if (definition.options.singleton && definition.instance) {
      return definition.instance;
    }

    // Detect circular dependencies
    if (this.resolving.has(key)) {
      const chain = Array.from(this.resolving).join(' -> ') + ' -> ' + key;
      throw new Error(`Circular dependency detected: ${chain}`);
    }

    try {
      // Mark as resolving
      this.resolving.add(key);

      // Create instance
      const instance = await this.createInstance(definition);

      // Cache singleton
      if (definition.options.singleton) {
        definition.instance = instance;
      }

      // Run lifecycle hook
      if (definition.options.lifecycle?.onInit && !this.initialized.has(key)) {
        await definition.options.lifecycle.onInit(instance);
        this.initialized.add(key);
      }

      return instance;
    } finally {
      // Done resolving
      this.resolving.delete(key);
    }
  }

  /**
   * Create an instance of a service
   */
  private async createInstance(definition: ServiceDefinition): Promise<any> {
    // Use factory if provided
    if (definition.factory) {
      return await definition.factory(this);
    }

    // Use constructor
    if (!definition.constructor) {
      throw new Error(`Service '${definition.key}' has no constructor or factory`);
    }

    // Resolve dependencies
    const dependencies = await Promise.all(
      definition.dependencies.map(dep => this.resolve(dep))
    );

    // Create instance with dependencies
    return new definition.constructor(...dependencies);
  }

  /**
   * Resolve multiple services
   */
  async resolveMany<T>(keys: string[]): Promise<T[]> {
    return await Promise.all(keys.map(key => this.resolve<T>(key)));
  }

  /**
   * Check if service exists
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Get all registered service keys
   */
  keys(): string[] {
    return Array.from(this.services.keys());
  }
}