/**
 * Plan Executor
 *
 * Executes task plans step-by-step, respecting dependencies and handling failures.
 * Supports retry logic, pause/resume, and progress tracking.
 */

import { TaskPlan, Task } from '../ai/task-planner.js';
import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';

export interface PlanExecutorOptions {
  maxRetries?: number;
  parallel?: boolean;
  onProgress?: (percentage: number) => void;
}

export type TaskExecutor = (task: Task, plan: TaskPlan) => Promise<void>;

export class PlanExecutor {
  private paused = false;
  private pausedResolve: (() => void) | null = null;
  private options: Required<PlanExecutorOptions>;

  constructor(options: PlanExecutorOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 0,
      parallel: options.parallel ?? false,
      onProgress: options.onProgress ?? (() => {}),
    };
  }

  /**
   * Execute a plan, running tasks in dependency order
   */
  async executePlan(plan: TaskPlan, taskExecutor: TaskExecutor): Promise<void> {
    logger.info(`Starting execution of plan: ${plan.title}`);

    plan.status = 'executing';
    plan.started = plan.started || new Date();

    try {
      // Resolve execution order based on dependencies
      const executionOrder = this.resolveExecutionOrder(plan);

      if (this.options.parallel) {
        await this.executeParallel(plan, executionOrder, taskExecutor);
      } else {
        await this.executeSequential(plan, executionOrder, taskExecutor);
      }

      // Check if all tasks completed
      const allCompleted = plan.tasks.every((t) => t.status === 'completed');
      plan.status = allCompleted ? 'completed' : 'failed';
      plan.completed = new Date();

      if (allCompleted) {
        logger.info(`Plan execution completed successfully: ${plan.title}`);
      } else {
        logger.warn(`Plan execution completed with failures: ${plan.title}`);
      }
    } catch (error) {
      logger.error('Plan execution failed:', error);
      plan.status = 'failed';
      throw error;
    }
  }

  /**
   * Resolve execution order using topological sort
   */
  private resolveExecutionOrder(plan: TaskPlan): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string): void => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving task: ${taskId}`);
      }

      if (visited.has(taskId)) {
        return;
      }

      visiting.add(taskId);

      // Visit dependencies first
      const dependencies = plan.dependencies.get(taskId) || [];
      for (const depId of dependencies) {
        visit(depId);
      }

      visiting.delete(taskId);
      visited.add(taskId);
      order.push(taskId);
    };

    // Visit all tasks
    for (const task of plan.tasks) {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    }

    return order;
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequential(
    plan: TaskPlan,
    executionOrder: string[],
    taskExecutor: TaskExecutor
  ): Promise<void> {
    for (const taskId of executionOrder) {
      // Wait if paused
      await this.waitIfPaused();

      const task = plan.tasks.find((t) => t.id === taskId);
      if (!task) {
        logger.warn(`Task not found: ${taskId}`);
        continue;
      }

      // Check if dependencies are completed
      if (!this.areDependenciesCompleted(task, plan)) {
        task.status = 'blocked';
        logger.debug(`Task blocked due to incomplete dependencies: ${task.title}`);
        // Don't execute this task, but continue to next
        continue;
      }

      // Skip if already completed or blocked
      if (task.status === 'completed' || task.status === 'blocked') {
        continue;
      }

      // Execute task with retries
      await this.executeTaskWithRetries(task, plan, taskExecutor);

      // Update progress
      this.updateProgress(plan);
    }
  }

  /**
   * Execute independent tasks in parallel
   */
  private async executeParallel(
    plan: TaskPlan,
    executionOrder: string[],
    taskExecutor: TaskExecutor
  ): Promise<void> {
    const executed = new Set<string>();
    const executing = new Set<string>();

    while (executed.size < executionOrder.length) {
      // Wait if paused
      await this.waitIfPaused();

      // Find tasks ready to execute (dependencies completed, not yet executed)
      const readyTasks = executionOrder.filter(
        (taskId) =>
          !executed.has(taskId) &&
          !executing.has(taskId) &&
          this.canExecuteTask(taskId, plan, executed)
      );

      if (readyTasks.length === 0) {
        // No tasks ready, wait a bit
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      // Execute ready tasks in parallel
      const executionPromises = readyTasks.map(async (taskId) => {
        executing.add(taskId);
        const task = plan.tasks.find((t) => t.id === taskId);
        if (task) {
          try {
            await this.executeTaskWithRetries(task, plan, taskExecutor);
            this.updateProgress(plan);
          } finally {
            executing.delete(taskId);
            executed.add(taskId);
          }
        }
      });

      await Promise.all(executionPromises);
    }
  }

  /**
   * Check if a task can be executed (dependencies completed)
   */
  private canExecuteTask(taskId: string, plan: TaskPlan, executed: Set<string>): boolean {
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    const dependencies = plan.dependencies.get(taskId) || [];
    return dependencies.every((depId) => executed.has(depId));
  }

  /**
   * Execute a task with retry logic
   */
  private async executeTaskWithRetries(
    task: Task,
    plan: TaskPlan,
    taskExecutor: TaskExecutor
  ): Promise<void> {
    let lastError: Error | null = null;
    let attempts = 0;
    const maxAttempts = this.options.maxRetries + 1; // Initial attempt + retries

    while (attempts < maxAttempts) {
      attempts++;
      task.status = 'in_progress';
      task.started = task.started || new Date();

      try {
        const statusBefore = task.status;
        await taskExecutor(task, plan);
        // If taskExecutor left the task in 'in_progress', don't override it
        // (allows for long-running or async tasks)
        if (task.status === 'in_progress') {
          return; // Task is still running, don't mark as completed
        }
        // If taskExecutor didn't set a status, mark as completed
        if (task.status === statusBefore || task.status === 'pending') {
          task.status = 'completed';
          task.completed = new Date();
        }
        return; // Success
      } catch (error) {
        lastError = normalizeError(error);
        task.status = 'failed';
        task.error = lastError.message;
        logger.warn(`Task execution failed (attempt ${attempts}/${maxAttempts}): ${task.title}`, error);

        if (attempts < maxAttempts) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    task.status = 'failed';
    task.error = lastError?.message || 'Task execution failed after retries';
    throw lastError || new Error(`Task execution failed: ${task.title}`);
  }

  /**
   * Check if all dependencies of a task are completed
   */
  private areDependenciesCompleted(task: Task, plan: TaskPlan): boolean {
    const dependencies = plan.dependencies.get(task.id) || [];
    if (dependencies.length === 0) {
      return true;
    }

    return dependencies.every((depId) => {
      const depTask = plan.tasks.find((t) => t.id === depId);
      return depTask?.status === 'completed';
    });
  }

  /**
   * Update plan progress
   */
  private updateProgress(plan: TaskPlan): void {
    const completed = plan.tasks.filter((t) => t.status === 'completed').length;
    plan.progress.completed = completed;
    plan.progress.total = plan.tasks.length;
    plan.progress.percentage = Math.round((completed / plan.tasks.length) * 100);

    // Call progress callback
    this.options.onProgress(plan.progress.percentage);
  }

  /**
   * Pause execution
   */
  pause(): void {
    this.paused = true;
    logger.info('Plan execution paused');
  }

  /**
   * Resume execution
   */
  resume(): void {
    this.paused = false;
    if (this.pausedResolve) {
      this.pausedResolve();
      this.pausedResolve = null;
    }
    logger.info('Plan execution resumed');
  }

  /**
   * Check if execution is paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Wait if execution is paused
   */
  private async waitIfPaused(): Promise<void> {
    if (this.paused) {
      return new Promise<void>((resolve) => {
        this.pausedResolve = resolve;
      });
    }
  }
}
