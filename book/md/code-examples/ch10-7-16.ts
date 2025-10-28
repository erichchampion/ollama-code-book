/**
 * Performance test utilities
 */
export class PerformanceTest {
  /**
   * Measure execution time
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();

    const result = await fn();

    const duration = performance.now() - start;

    console.log(`${name}: ${duration.toFixed(2)}ms`);

    return { result, duration };
  }

  /**
   * Run benchmark with multiple iterations
   */
  static async benchmark(
    name: string,
    fn: () => Promise<void>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      durations.push(performance.now() - start);
    }

    const sorted = durations.sort((a, b) => a - b);

    const result = {
      name,
      iterations,
      mean: durations.reduce((a, b) => a + b) / iterations,
      median: sorted[Math.floor(iterations / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(iterations * 0.95)],
      p99: sorted[Math.floor(iterations * 0.99)]
    };

    console.table(result);

    return result;
  }

  /**
   * Assert performance requirement
   */
  static assertPerformance(
    duration: number,
    maxMs: number,
    operation: string
  ): void {
    if (duration > maxMs) {
      throw new Error(
        `Performance requirement failed: ${operation} took ${duration.toFixed(2)}ms (max: ${maxMs}ms)`
      );
    }
  }
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}