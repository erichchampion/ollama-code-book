export class DIContainer {
  private resolving = new Set<string>();

  async resolve<T>(key: string): Promise<T> {
    // Detect circular dependency
    if (this.resolving.has(key)) {
      const chain = Array.from(this.resolving).join(' -> ') + ' -> ' + key;
      throw new Error(`Circular dependency detected: ${chain}`);
    }

    try {
      this.resolving.add(key);
      // ... resolution logic ...
    } finally {
      this.resolving.delete(key);
    }
  }
}