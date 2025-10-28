/**
 * Dispose multiple objects
 */
export async function disposeAll(objects: any[]): Promise<void> {
  const errors: Error[] = [];

  for (const obj of objects) {
    try {
      if (isDisposable(obj)) {
        await obj.dispose();
      }
    } catch (error) {
      errors.push(error as Error);
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'One or more disposals failed');
  }
}

/**
 * Using statement (C# style)
 */
export async function using<T extends IDisposable, R>(
  resource: T,
  fn: (resource: T) => Promise<R>
): Promise<R> {
  try {
    return await fn(resource);
  } finally {
    await resource.dispose();
  }
}

// Usage
await using(new Logger({ file: 'app.log' }), async (logger) => {
  logger.info('Processing...');
  // Logger automatically disposed after this block
});

/**
 * Disposable scope
 */
export class DisposableScope implements IDisposable {
  private disposables: IDisposable[] = [];

  /**
   * Add a disposable to this scope
   */
  add<T extends IDisposable>(disposable: T): T {
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Dispose all in reverse order
   */
  async dispose(): Promise<void> {
    const errors: Error[] = [];

    // Dispose in reverse order (LIFO)
    for (let i = this.disposables.length - 1; i >= 0; i--) {
      try {
        await this.disposables[i].dispose();
      } catch (error) {
        errors.push(error as Error);
      }
    }

    this.disposables = [];

    if (errors.length > 0) {
      throw new AggregateError(errors, 'One or more disposals failed');
    }
  }
}

// Usage
const scope = new DisposableScope();

const logger = scope.add(new Logger({ file: 'app.log' }));
const manager = scope.add(new ProviderManager(logger));
const router = scope.add(new IntelligentRouter(manager, logger));

// Use resources...

// Dispose all in reverse order
await scope.dispose();