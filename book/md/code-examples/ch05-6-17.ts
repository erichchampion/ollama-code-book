/**
 * Terminal progress bar
 */
export class ProgressBar {
  private width: number;
  private lastRendered = '';

  constructor(width: number = 40) {
    this.width = width;
  }

  /**
   * Render progress bar
   */
  render(progress: ProgressUpdate): string {
    const percentage = Math.min(progress.percentage, 100);
    const filled = Math.floor((percentage / 100) * this.width);
    const empty = this.width - filled;

    // Build bar
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    // Build line
    const line = [
      `[${bar}]`,
      `${percentage.toFixed(1)}%`,
      progress.message
    ];

    // Add time estimates
    if (progress.estimatedRemaining) {
      const seconds = Math.ceil(progress.estimatedRemaining / 1000);
      line.push(`~${seconds}s remaining`);
    }

    const rendered = line.join(' ');

    // Clear previous line and render new one
    if (this.lastRendered) {
      process.stdout.write('\r' + ' '.repeat(this.lastRendered.length) + '\r');
    }

    process.stdout.write(rendered);
    this.lastRendered = rendered;

    return rendered;
  }

  /**
   * Clear progress bar
   */
  clear(): void {
    if (this.lastRendered) {
      process.stdout.write('\r' + ' '.repeat(this.lastRendered.length) + '\r');
      this.lastRendered = '';
    }
  }

  /**
   * Complete and show final state
   */
  complete(message?: string): void {
    this.render({
      current: 100,
      total: 100,
      percentage: 100,
      message: message || 'Complete',
      elapsed: 0
    });
    process.stdout.write('\n');
    this.lastRendered = '';
  }
}