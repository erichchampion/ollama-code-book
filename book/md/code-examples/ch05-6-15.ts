/**
 * Progress tracker for operations
 */
export class ProgressTracker {
  private current = 0;
  private total: number;
  private message = '';
  private startTime: Date;
  private stages: ProgressStage[] = [];
  private currentStageIndex = 0;

  constructor(total: number, stages?: ProgressStage[]) {
    this.total = total;
    this.startTime = new Date();
    this.stages = stages || [];
  }

  /**
   * Update progress
   */
  update(current: number, message?: string): ProgressUpdate {
    this.current = Math.min(current, this.total);
    if (message) {
      this.message = message;
    }

    return this.getProgress();
  }

  /**
   * Increment progress
   */
  increment(amount: number = 1, message?: string): ProgressUpdate {
    return this.update(this.current + amount, message);
  }

  /**
   * Start next stage
   */
  nextStage(): ProgressUpdate {
    if (this.currentStageIndex < this.stages.length - 1) {
      this.currentStageIndex++;
      this.message = this.stages[this.currentStageIndex].name;
    }
    return this.getProgress();
  }

  /**
   * Get current progress
   */
  getProgress(): ProgressUpdate {
    const elapsed = Date.now() - this.startTime.getTime();
    const percentage = (this.current / this.total) * 100;

    // Estimate remaining time
    let estimatedRemaining: number | undefined;
    if (this.current > 0) {
      const rate = this.current / elapsed; // items per ms
      const remaining = this.total - this.current;
      estimatedRemaining = remaining / rate;
    }

    return {
      current: this.current,
      total: this.total,
      percentage: Math.min(percentage, 100),
      message: this.message,
      elapsed,
      estimatedRemaining,
      stage: this.stages[this.currentStageIndex]
    };
  }

  /**
   * Mark as complete
   */
  complete(message?: string): ProgressUpdate {
    this.current = this.total;
    if (message) {
      this.message = message;
    }
    return this.getProgress();
  }

  /**
   * Check if complete
   */
  isComplete(): boolean {
    return this.current >= this.total;
  }
}

interface ProgressStage {
  name: string;
  weight: number; // Relative weight (for multi-stage progress)
}

interface ProgressUpdate {
  current: number;
  total: number;
  percentage: number;
  message: string;
  elapsed: number;
  estimatedRemaining?: number;
  stage?: ProgressStage;
}