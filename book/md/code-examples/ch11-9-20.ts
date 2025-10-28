/**
 * Comprehensive benchmarking suite
 */
export class BenchmarkSuite {
  private benchmarks: Benchmark[] = [];

  /**
   * Add benchmark
   */
  add(name: string, fn: () => Promise<void>): this {
    this.benchmarks.push({ name, fn });
    return this;
  }

  /**
   * Run all benchmarks
   */
  async run(iterations: number = 100): Promise<BenchmarkResults> {
    const results: BenchmarkResults = {};

    for (const benchmark of this.benchmarks) {
      console.log(`Running: ${benchmark.name}`);

      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await benchmark.fn();
        durations.push(performance.now() - start);
      }

      results[benchmark.name] = this.calculateStats(durations);
    }

    return results;
  }

  /**
   * Compare benchmarks
   */
  compare(
    baseline: string,
    comparison: string,
    results: BenchmarkResults
  ): Comparison {
    const baselineStats = results[baseline];
    const comparisonStats = results[comparison];

    if (!baselineStats || !comparisonStats) {
      throw new Error('Benchmark not found');
    }

    const improvement = (baselineStats.mean - comparisonStats.mean) / baselineStats.mean;

    return {
      baseline: baseline,
      comparison: comparison,
      baselineMean: baselineStats.mean,
      comparisonMean: comparisonStats.mean,
      improvement: improvement * 100,
      faster: improvement > 0
    };
  }

  private calculateStats(durations: number[]): ProfileStats {
    const sorted = durations.sort((a, b) => a - b);

    return {
      count: durations.length,
      mean: durations.reduce((a, b) => a + b) / durations.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
}

interface Benchmark {
  name: string;
  fn: () => Promise<void>;
}

type BenchmarkResults = Record<string, ProfileStats>;

interface Comparison {
  baseline: string;
  comparison: string;
  baselineMean: number;
  comparisonMean: number;
  improvement: number; // percentage
  faster: boolean;
}