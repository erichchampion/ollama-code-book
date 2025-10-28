/**
 * Memory profiler for detecting leaks
 */
export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];

  /**
   * Take memory snapshot
   */
  snapshot(label: string): MemorySnapshot {
    const usage = process.memoryUsage();

    const snapshot: MemorySnapshot = {
      label,
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    };

    this.snapshots.push(snapshot);

    return snapshot;
  }

  /**
   * Compare two snapshots
   */
  compare(label1: string, label2: string): MemoryComparison {
    const snap1 = this.snapshots.find(s => s.label === label1);
    const snap2 = this.snapshots.find(s => s.label === label2);

    if (!snap1 || !snap2) {
      throw new Error('Snapshot not found');
    }

    return {
      heapUsedDelta: snap2.heapUsed - snap1.heapUsed,
      heapTotalDelta: snap2.heapTotal - snap1.heapTotal,
      externalDelta: snap2.external - snap1.external,
      rssDelta: snap2.rss - snap1.rss,
      durationMs: snap2.timestamp - snap1.timestamp
    };
  }

  /**
   * Detect memory leak
   */
  detectLeak(threshold: number = 10 * 1024 * 1024): boolean {
    if (this.snapshots.length < 2) {
      return false;
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    const delta = last.heapUsed - first.heapUsed;

    return delta > threshold;
  }

  /**
   * Get memory trend
   */
  getTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.snapshots.length < 3) {
      return 'stable';
    }

    const recent = this.snapshots.slice(-5);

    const deltas = recent.slice(1).map((snap, i) => {
      return snap.heapUsed - recent[i].heapUsed;
    });

    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    if (avgDelta > 1024 * 1024) {
      return 'increasing';
    } else if (avgDelta < -1024 * 1024) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }
}

interface MemorySnapshot {
  label: string;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

interface MemoryComparison {
  heapUsedDelta: number;
  heapTotalDelta: number;
  externalDelta: number;
  rssDelta: number;
  durationMs: number;
}