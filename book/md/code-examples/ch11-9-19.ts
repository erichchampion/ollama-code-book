/**
 * Profiles code execution to find bottlenecks
 */
export class PerformanceProfiler {
  private measurements: Map<string, Measurement[]> = new Map();

  /**
   * Start timing an operation
   */
  start(label: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;

      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }

      this.measurements.get(label)!.push({
        duration,
        timestamp: Date.now()
      });
    };
  }

  /**
   * Measure async operation
   */
  async measure<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const end = this.start(label);

    try {
      return await fn();
    } finally {
      end();
    }
  }

  /**
   * Get statistics for label
   */
  getStats(label: string): ProfileStats | null {
    const measurements = this.measurements.get(label);

    if (!measurements || measurements.length === 0) {
      return null;
    }

    const durations = measurements.map(m => m.duration).sort((a, b) => a - b);

    return {
      count: measurements.length,
      mean: durations.reduce((a, b) => a + b) / measurements.length,
      median: durations[Math.floor(durations.length / 2)],
      min: durations[0],
      max: durations[durations.length - 1],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)]
    };
  }

  /**
   * Get report of all measurements
   */
  getReport(): ProfileReport {
    const report: ProfileReport = {};

    for (const [label, measurements] of this.measurements.entries()) {
      const stats = this.getStats(label);
      if (stats) {
        report[label] = stats;
      }
    }

    return report;
  }

  /**
   * Print report to console
   */
  printReport(): void {
    console.log('\n📊 Performance Profile Report\n');
    console.table(this.getReport());
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }
}

interface Measurement {
  duration: number;
  timestamp: number;
}

interface ProfileStats {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}

type ProfileReport = Record<string, ProfileStats>;