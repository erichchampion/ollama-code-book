export class DIContainer implements IDisposable {
  // ... previous implementation ...

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
    instances.reverse();

    const errors: Error[] = [];

    for (const { key, instance, onDispose } of instances) {
      try {
        // Call lifecycle hook
        if (onDispose) {
          await onDispose(instance);
        }

        // Call IDisposable.dispose() if exists
        if (isDisposable(instance)) {
          await instance.dispose();
        }
      } catch (error) {
        console.error(`Error disposing service '${key}':`, error);
        errors.push(error as Error);
      }
    }

    // Clear state
    this.services.clear();
    this.resolving.clear();
    this.initialized.clear();

    if (errors.length > 0) {
      throw new AggregateError(errors, 'One or more service disposals failed');
    }
  }
}