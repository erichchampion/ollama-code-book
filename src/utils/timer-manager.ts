/**
 * Timer Management Utilities
 *
 * Provides centralized timer management to prevent memory leaks and ensure
 * proper cleanup of setTimeout/setInterval operations.
 */

export interface TimerConfig {
  id?: string;
  autoCleanup?: boolean;
  onCancel?: () => void;
}

export interface ManagedTimer {
  id: string;
  type: 'timeout' | 'interval';
  timerId: NodeJS.Timeout;
  createdAt: Date;
  config: TimerConfig;
}

/**
 * Timer Manager for centralized timer lifecycle management
 */
export class TimerManager {
  private timers = new Map<string, ManagedTimer>();
  private nextId = 1;

  /**
   * Create a managed timeout
   */
  setTimeout(
    callback: () => void,
    delay: number,
    config: TimerConfig = {}
  ): string {
    const id = config.id || this.generateId();

    const timerId = setTimeout(() => {
      callback();
      if (config.autoCleanup !== false) {
        this.clearTimer(id);
      }
    }, delay);

    this.timers.set(id, {
      id,
      type: 'timeout',
      timerId,
      createdAt: new Date(),
      config
    });

    return id;
  }

  /**
   * Create a managed interval
   */
  setInterval(
    callback: () => void,
    interval: number,
    config: TimerConfig = {}
  ): string {
    const id = config.id || this.generateId();

    const timerId = setInterval(callback, interval);

    this.timers.set(id, {
      id,
      type: 'interval',
      timerId,
      createdAt: new Date(),
      config
    });

    return id;
  }

  /**
   * Clear a specific timer
   */
  clearTimer(id: string): boolean {
    const timer = this.timers.get(id);
    if (!timer) return false;

    if (timer.type === 'timeout') {
      clearTimeout(timer.timerId);
    } else {
      clearInterval(timer.timerId);
    }

    timer.config.onCancel?.();
    this.timers.delete(id);
    return true;
  }

  /**
   * Clear all timers
   */
  clearAll(): void {
    for (const [id] of this.timers) {
      this.clearTimer(id);
    }
  }

  /**
   * Get active timer count
   */
  getActiveCount(): number {
    return this.timers.size;
  }

  /**
   * Get timer information for debugging
   */
  getTimerInfo(): Array<{
    id: string;
    type: string;
    age: number;
    hasConfig: boolean;
  }> {
    const now = Date.now();
    return Array.from(this.timers.values()).map(timer => ({
      id: timer.id,
      type: timer.type,
      age: now - timer.createdAt.getTime(),
      hasConfig: Object.keys(timer.config).length > 0
    }));
  }

  /**
   * Cleanup old timers (for debugging memory leaks)
   */
  cleanupOldTimers(maxAgeMs: number = 5 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;

    for (const [id, timer] of this.timers) {
      if (timer.createdAt.getTime() < cutoff) {
        console.warn(`Cleaning up old timer: ${id} (${timer.type})`);
        this.clearTimer(id);
      }
    }
  }

  private generateId(): string {
    return `timer_${this.nextId++}_${Date.now()}`;
  }
}

/**
 * Global timer manager instance
 */
export const globalTimerManager = new TimerManager();

/**
 * Convenience functions using global timer manager
 */
export const managedSetTimeout = (
  callback: () => void,
  delay: number,
  config?: TimerConfig
): string => globalTimerManager.setTimeout(callback, delay, config);

export const managedSetInterval = (
  callback: () => void,
  interval: number,
  config?: TimerConfig
): string => globalTimerManager.setInterval(callback, interval, config);

export const clearManagedTimer = (id: string): boolean =>
  globalTimerManager.clearTimer(id);

/**
 * Promise-based timeout with automatic cleanup
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    managedSetTimeout(resolve, ms, { autoCleanup: true });
  });
}

/**
 * Cancellable timeout using AbortController
 */
export function cancellableTimeout(
  callback: () => void,
  delay: number,
  abortController?: AbortController
): string {
  const timerId = managedSetTimeout(callback, delay, {
    onCancel: () => {
      abortController?.abort();
    }
  });

  // Cancel timer if abort signal is triggered
  abortController?.signal.addEventListener('abort', () => {
    clearManagedTimer(timerId);
  });

  return timerId;
}

/**
 * Resource cleanup mixin for classes
 */
export interface Disposable {
  dispose(): void;
}

export class DisposableBase implements Disposable {
  private timerManager = new TimerManager();

  protected setTimeout(
    callback: () => void,
    delay: number,
    config?: TimerConfig
  ): string {
    return this.timerManager.setTimeout(callback, delay, config);
  }

  protected setInterval(
    callback: () => void,
    interval: number,
    config?: TimerConfig
  ): string {
    return this.timerManager.setInterval(callback, interval, config);
  }

  protected clearTimer(id: string): boolean {
    return this.timerManager.clearTimer(id);
  }

  dispose(): void {
    this.timerManager.clearAll();
  }
}