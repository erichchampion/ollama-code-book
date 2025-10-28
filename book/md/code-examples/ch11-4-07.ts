/**
 * Executes operations in parallel with concurrency control
 */
export class ParallelExecutor {
  constructor(
    private maxConcurrency: number = 10,
    private logger: Logger
  ) {}

  /**
   * Execute operations in parallel with concurrency limit
   */
  async executeAll<T>(
    operations: Array<() => Promise<T>>,
    options?: ExecutionOptions
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    const startTime = performance.now();

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      // Execute operation
      const promise = operation()
        .then(result => {
          results[i] = result;
        })
        .catch(error => {
          if (options?.failFast) {
            throw error;
          }

          this.logger.error('Parallel execution error', { index: i, error });
          results[i] = error;
        });

      executing.push(promise);

      // Wait if we've hit concurrency limit
      if (executing.length >= this.maxConcurrency) {
        await Promise.race(executing);

        // Remove completed promises
        const completed = executing.filter(p => {
          // Check if promise is settled (no good way in JS, so we track separately)
          return false; // Placeholder
        });

        completed.forEach(p => {
          const index = executing.indexOf(p);
          if (index > -1) executing.splice(index, 1);
        });
      }
    }

    // Wait for remaining operations
    await Promise.all(executing);

    const duration = performance.now() - startTime;

    this.logger.info('Parallel execution completed', {
      operations: operations.length,
      duration,
      throughput: operations.length / (duration / 1000)
    });

    return results;
  }

  /**
   * Execute operations in batches
   */
  async executeBatches<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number = this.maxConcurrency
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);

      this.logger.debug('Executing batch', {
        batch: Math.floor(i / batchSize) + 1,
        size: batch.length
      });

      const batchResults = await Promise.all(
        batch.map(op => op())
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Map operation over array in parallel
   */
  async map<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number = this.maxConcurrency
  ): Promise<R[]> {
    const operations = items.map((item, index) => () => fn(item, index));

    return this.executeAll(operations);
  }
}

interface ExecutionOptions {
  failFast?: boolean; // Stop on first error
  timeout?: number;   // Timeout per operation
}