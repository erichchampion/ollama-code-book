export class DIContainer {
  // ... previous code ...

  /**
   * Dispose all singleton instances
   */
  async dispose(): Promise<void> {
    const instances: Array<{ key: string; instance: any; onDispose?: Function }> = [];

    // Collect all singleton instances
    for (const [key, definition] of this.services) {
      if (definition.instance) {
        instances.push({
          key,
          instance: definition.instance,
          onDispose: definition.options.lifecycle?.onDispose
        });
      }
    }

    // Dispose in reverse order of initialization
    // (dependents before dependencies)
    instances.reverse();

    for (const { key, instance, onDispose } of instances) {
      try {
        // Call lifecycle hook
        if (onDispose) {
          await onDispose(instance);
        }

        // Call IDisposable.dispose() if exists
        if (typeof instance.dispose === 'function') {
          await instance.dispose();
        }
      } catch (error) {
        console.error(`Error disposing service '${key}':`, error);
      }
    }

    // Clear state
    this.services.clear();
    this.resolving.clear();
    this.initialized.clear();
  }

  /**
   * Create a child container (for scoping)
   */
  createScope(): DIContainer {
    const scope = new DIContainer();

    // Copy service definitions (but not instances)
    for (const [key, definition] of this.services) {
      scope.services.set(key, {
        ...definition,
        instance: undefined // New scope gets new instances
      });
    }

    return scope;
  }
}