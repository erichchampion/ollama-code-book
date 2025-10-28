/**
 * Progress Indicator System
 *
 * Provides comprehensive progress tracking for long-running operations:
 * - Visual progress indicators with ETA
 * - Cancellation support
 * - Background task monitoring
 * - Multi-step operation tracking
 */

import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';

interface ProgressStep {
  id: string;
  name: string;
  weight: number; // Relative weight for progress calculation
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  progress?: number; // 0-100 for step-specific progress
}

interface ProgressOptions {
  title: string;
  steps?: ProgressStep[];
  estimatedDuration?: number; // milliseconds
  showPercentage?: boolean;
  showETA?: boolean;
  cancellable?: boolean;
}

interface ProgressUpdateEvent {
  stepId?: string;
  progress?: number;
  message?: string;
  details?: Record<string, any>;
}

export class ProgressManager {
  private activeOperations = new Map<string, ProgressOperation>();

  /**
   * Start a new progress operation
   */
  startProgress(id: string, options: ProgressOptions): ProgressOperation {
    if (this.activeOperations.has(id)) {
      throw new Error(`Progress operation ${id} already exists`);
    }

    const operation = new ProgressOperation(id, options);
    this.activeOperations.set(id, operation);

    logger.debug(`Started progress tracking for: ${id}`);
    return operation;
  }

  /**
   * Get active progress operation
   */
  getProgress(id: string): ProgressOperation | null {
    return this.activeOperations.get(id) || null;
  }

  /**
   * Complete and remove progress operation
   */
  completeProgress(id: string): void {
    const operation = this.activeOperations.get(id);
    if (operation) {
      operation.complete();
      this.activeOperations.delete(id);
      logger.debug(`Completed progress tracking for: ${id}`);
    }
  }

  /**
   * Cancel progress operation
   */
  cancelProgress(id: string): void {
    const operation = this.activeOperations.get(id);
    if (operation) {
      operation.cancel();
      this.activeOperations.delete(id);
      logger.debug(`Cancelled progress tracking for: ${id}`);
    }
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): ProgressOperation[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Cleanup completed operations
   */
  cleanup(): void {
    const completed = Array.from(this.activeOperations.entries())
      .filter(([_, op]) => op.isCompleted())
      .map(([id, _]) => id);

    for (const id of completed) {
      this.activeOperations.delete(id);
    }

    logger.debug(`Cleaned up ${completed.length} completed operations`);
  }

  /**
   * Dispose of the progress manager and clean up resources
   */
  async dispose(): Promise<void> {
    // Cancel all active operations
    for (const operation of this.activeOperations.values()) {
      operation.cancel();
    }
    this.activeOperations.clear();
    logger.debug('Progress manager disposed');
  }
}

export class ProgressOperation {
  private id: string;
  private options: ProgressOptions;
  private steps: Map<string, ProgressStep>;
  private startTime: number;
  private currentStep?: string;
  private cancelled = false;
  private completed = false;
  private spinner: any;
  private abortController?: AbortController;

  constructor(id: string, options: ProgressOptions) {
    this.id = id;
    this.options = options;
    this.steps = new Map();
    this.startTime = Date.now();

    if (options.steps) {
      for (const step of options.steps) {
        this.steps.set(step.id, { ...step });
      }
    }

    if (options.cancellable) {
      this.abortController = new AbortController();
    }

    this.initializeDisplay();
  }

  /**
   * Update progress
   */
  updateProgress(event: ProgressUpdateEvent): void {
    if (this.cancelled || this.completed) return;

    if (event.stepId) {
      const step = this.steps.get(event.stepId);
      if (step) {
        step.progress = event.progress || step.progress;
        if (event.progress === 100) {
          step.status = 'completed';
          step.endTime = Date.now();
        }
        this.currentStep = event.stepId;
      }
    }

    this.updateDisplay(event.message);
  }

  /**
   * Start a specific step
   */
  startStep(stepId: string): void {
    const step = this.steps.get(stepId);
    if (step) {
      step.status = 'running';
      step.startTime = Date.now();
      this.currentStep = stepId;
      this.updateDisplay(`Starting: ${step.name}`);
    }
  }

  /**
   * Complete a specific step
   */
  completeStep(stepId: string): void {
    const step = this.steps.get(stepId);
    if (step) {
      step.status = 'completed';
      step.endTime = Date.now();
      step.progress = 100;
      this.updateDisplay(`Completed: ${step.name}`);
    }
  }

  /**
   * Fail a specific step
   */
  failStep(stepId: string, error?: string): void {
    const step = this.steps.get(stepId);
    if (step) {
      step.status = 'failed';
      step.endTime = Date.now();
      this.updateDisplay(`Failed: ${step.name}${error ? ` - ${error}` : ''}`);
    }
  }

  /**
   * Set overall progress message
   */
  setMessage(message: string): void {
    this.updateDisplay(message);
  }

  /**
   * Complete the entire operation
   */
  complete(): void {
    if (this.completed) return;

    this.completed = true;

    // Mark remaining steps as completed
    for (const step of this.steps.values()) {
      if (step.status === 'pending' || step.status === 'running') {
        step.status = 'completed';
        step.endTime = Date.now();
      }
    }

    this.finalizeDisplay('✅ Completed');
  }

  /**
   * Cancel the operation
   */
  cancel(): void {
    if (this.cancelled) return;

    this.cancelled = true;

    if (this.abortController) {
      this.abortController.abort();
    }

    this.finalizeDisplay('❌ Cancelled');
  }

  /**
   * Get abort signal for cancellation
   */
  getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }

  /**
   * Check if operation is completed
   */
  isCompleted(): boolean {
    return this.completed || this.cancelled;
  }

  /**
   * Get current progress percentage
   */
  getProgressPercentage(): number {
    if (this.steps.size === 0) return 0;

    const totalWeight = Array.from(this.steps.values())
      .reduce((sum, step) => sum + step.weight, 0);

    if (totalWeight === 0) return 0;

    const completedWeight = Array.from(this.steps.values())
      .filter(step => step.status === 'completed')
      .reduce((sum, step) => sum + step.weight, 0);

    const runningProgress = Array.from(this.steps.values())
      .filter(step => step.status === 'running')
      .reduce((sum, step) => sum + ((step.progress || 0) / 100) * step.weight, 0);

    return Math.round(((completedWeight + runningProgress) / totalWeight) * 100);
  }

  /**
   * Get estimated time remaining
   */
  getETA(): number | null {
    const elapsed = Date.now() - this.startTime;
    const progress = this.getProgressPercentage();

    if (progress === 0) {
      return this.options.estimatedDuration || null;
    }

    if (progress >= 100) return 0;

    const totalEstimated = (elapsed / progress) * 100;
    return Math.max(0, totalEstimated - elapsed);
  }

  /**
   * Get operation summary
   */
  getSummary(): {
    id: string;
    title: string;
    progress: number;
    eta: number | null;
    elapsed: number;
    steps: ProgressStep[];
    status: 'running' | 'completed' | 'cancelled';
  } {
    return {
      id: this.id,
      title: this.options.title,
      progress: this.getProgressPercentage(),
      eta: this.getETA(),
      elapsed: Date.now() - this.startTime,
      steps: Array.from(this.steps.values()),
      status: this.cancelled ? 'cancelled' : this.completed ? 'completed' : 'running'
    };
  }

  /**
   * Initialize progress display
   */
  private initializeDisplay(): void {
    this.spinner = createSpinner(this.options.title);
    this.spinner.start();
  }

  /**
   * Update progress display
   */
  private updateDisplay(message?: string): void {
    if (!this.spinner) return;

    let displayText = this.options.title;

    if (this.options.showPercentage) {
      const percentage = this.getProgressPercentage();
      displayText += ` (${percentage}%)`;
    }

    if (this.options.showETA) {
      const eta = this.getETA();
      if (eta !== null) {
        const etaSeconds = Math.round(eta / 1000);
        displayText += ` [ETA: ${etaSeconds}s]`;
      }
    }

    if (message) {
      displayText += ` - ${message}`;
    }

    this.spinner.text = displayText;
  }

  /**
   * Finalize progress display
   */
  private finalizeDisplay(message: string): void {
    if (this.spinner) {
      if (this.completed) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
    }
  }
}

/**
 * Utility function to wrap async operations with progress tracking
 */
export async function withProgress<T>(
  id: string,
  options: ProgressOptions,
  operation: (progress: ProgressOperation) => Promise<T>
): Promise<T> {
  // This will be injected by the container
  const { getProgressManager } = await import('../core/services.js');
  const progressManager = await getProgressManager();
  const progressOp = (progressManager as any).startProgress(id, options);

  try {
    const result = await operation(progressOp);
    progressOp.complete();
    return result;
  } catch (error) {
    progressOp.cancel();
    throw error;
  } finally {
    (progressManager as any).completeProgress(id);
  }
}

/**
 * Utility for AI operations with progress tracking
 */
export async function withAIProgress<T>(
  operation: string,
  task: (progress: ProgressOperation) => Promise<T>
): Promise<T> {
  return withProgress(
    `ai-${Date.now()}`,
    {
      title: `${operation}...`,
      showPercentage: true,
      showETA: true,
      cancellable: true,
      steps: [
        { id: 'init', name: 'Initializing', weight: 10, status: 'pending' },
        { id: 'process', name: 'Processing', weight: 70, status: 'pending' },
        { id: 'finalize', name: 'Finalizing', weight: 20, status: 'pending' }
      ]
    },
    task
  );
}

// Legacy export - use dependency injection instead
// export const progressManager = ProgressManager.getInstance();