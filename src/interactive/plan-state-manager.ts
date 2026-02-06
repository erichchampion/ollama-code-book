/**
 * Plan State Manager
 *
 * Manages plan persistence, state tracking, and resumption capabilities.
 * Provides file-based persistence for plans across sessions.
 */

import { TaskPlan, Task } from '../ai/task-planner.js';
import { logger } from '../utils/logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import { normalizeError } from '../utils/error-utils.js';

export interface PlanStateManagerOptions {
  persistencePath?: string;
}

export interface PlanState {
  planId: string;
  status: TaskPlan['status'];
  progress: TaskPlan['progress'];
  started?: Date;
  completed?: Date;
}

export interface PlanResults {
  success: boolean;
  artifacts?: string[];
  metrics?: {
    executionTime?: number;
    tasksCompleted?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export class PlanStateManager {
  private persistencePath: string;
  private plansCache: Map<string, TaskPlan> = new Map();
  private resultsCache: Map<string, PlanResults> = new Map();
  private locks: Map<string, Promise<any>> = new Map();

  constructor(options: PlanStateManagerOptions = {}) {
    this.persistencePath =
      options.persistencePath || path.join(process.cwd(), '.ollama-code', 'plans');
  }

  /**
   * Save a plan to disk
   */
  async savePlan(plan: TaskPlan): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.persistencePath, { recursive: true });

      // Serialize plan
      const planFile = this.getPlanFilePath(plan.id);
      const planData = JSON.stringify(plan, this.dateReplacer, 2);

      await fs.writeFile(planFile, planData, 'utf8');

      // Update cache
      this.plansCache.set(plan.id, plan);

      logger.debug(`Plan saved: ${plan.id}`);
    } catch (error) {
      logger.error(`Failed to save plan ${plan.id}:`, error);
      throw error;
    }
  }

  /**
   * Load a plan from disk
   */
  async loadPlan(planId: string): Promise<TaskPlan | undefined> {
    // Check cache first
    if (this.plansCache.has(planId)) {
      return this.plansCache.get(planId);
    }

    try {
      const planFile = this.getPlanFilePath(planId);
      const planData = await fs.readFile(planFile, 'utf8');
      const plan = JSON.parse(planData, this.dateReviver) as TaskPlan;

      // Update cache
      this.plansCache.set(planId, plan);

      return plan;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist
        return undefined;
      }
      logger.error(`Failed to load plan ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Update plan state
   */
  async updatePlanState(planId: string, state: Partial<PlanState>): Promise<void> {
    const plan = await this.loadPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    // Update plan state
    if (state.status !== undefined) {
      plan.status = state.status;
    }
    if (state.progress !== undefined) {
      plan.progress = state.progress;
    }
    if (state.started !== undefined) {
      plan.started = state.started instanceof Date ? state.started : new Date(state.started);
    }
    if (state.completed !== undefined) {
      plan.completed =
        state.completed instanceof Date ? state.completed : new Date(state.completed);
    }

    await this.savePlan(plan);
  }

  /**
   * Update task state within a plan
   */
  async updateTaskState(
    planId: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<void> {
    const plan = await this.loadPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId} in plan ${planId}`);
    }

    // Apply updates
    Object.assign(task, updates);

    // Rebuild dependencies if tasks changed
    plan.dependencies = this.buildDependencyMap(plan.tasks);

    await this.savePlan(plan);
  }

  /**
   * Update plan (modify plan properties)
   */
  async updatePlan(planId: string, updates: Partial<TaskPlan>): Promise<void> {
    const plan = await this.loadPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    // Apply updates
    if (updates.title !== undefined) {
      plan.title = updates.title;
    }
    if (updates.description !== undefined) {
      plan.description = updates.description;
    }
    if (updates.tasks !== undefined) {
      plan.tasks = updates.tasks;
      plan.dependencies = this.buildDependencyMap(plan.tasks);
      plan.progress.total = plan.tasks.length;
    }
    if (updates.metadata !== undefined) {
      plan.metadata = { ...plan.metadata, ...updates.metadata };
    }

    await this.savePlan(plan);
  }

  /**
   * Get plan state
   */
  async getPlanState(planId: string): Promise<PlanState | undefined> {
    const plan = await this.loadPlan(planId);
    if (!plan) {
      return undefined;
    }

    return {
      planId: plan.id,
      status: plan.status,
      progress: plan.progress,
      started: plan.started,
      completed: plan.completed,
    };
  }

  /**
   * Save plan results
   */
  async savePlanResults(planId: string, results: PlanResults): Promise<void> {
    try {
      await fs.mkdir(this.persistencePath, { recursive: true });

      const resultsFile = this.getResultsFilePath(planId);
      const resultsData = JSON.stringify(results, this.dateReplacer, 2);

      await fs.writeFile(resultsFile, resultsData, 'utf8');

      // Update cache
      this.resultsCache.set(planId, results);

      logger.debug(`Plan results saved: ${planId}`);
    } catch (error) {
      logger.error(`Failed to save plan results ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Get plan results
   */
  async getPlanResults(planId: string): Promise<PlanResults | undefined> {
    // Check cache first
    if (this.resultsCache.has(planId)) {
      return this.resultsCache.get(planId);
    }

    try {
      const resultsFile = this.getResultsFilePath(planId);
      const resultsData = await fs.readFile(resultsFile, 'utf8');
      const results = JSON.parse(resultsData, this.dateReviver) as PlanResults;

      // Update cache
      this.resultsCache.set(planId, results);

      return results;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      logger.error(`Failed to load plan results ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Resume an interrupted plan
   */
  async resumePlan(planId: string): Promise<TaskPlan | undefined> {
    const plan = await this.loadPlan(planId);
    if (!plan) {
      return undefined;
    }

    // Only resume plans that are executing or planning (not completed/failed)
    if (plan.status === 'completed' || plan.status === 'failed') {
      return undefined;
    }

    return plan;
  }

  /**
   * List all active plans
   */
  async listActivePlans(): Promise<TaskPlan[]> {
    try {
      await fs.mkdir(this.persistencePath, { recursive: true });
      const files = await fs.readdir(this.persistencePath);

      const planFiles = files.filter((f) => f.endsWith('.plan.json'));
      const plans: TaskPlan[] = [];

      for (const file of planFiles) {
        const planId = file.replace('.plan.json', '');
        try {
          const plan = await this.loadPlan(planId);
          if (plan) {
            plans.push(plan);
          }
        } catch (error) {
          logger.warn(`Failed to load plan from file ${file}:`, error);
        }
      }

      return plans;
    } catch (error) {
      logger.error('Failed to list active plans:', error);
      return [];
    }
  }

  /**
   * Get plan file path
   */
  private getPlanFilePath(planId: string): string {
    return path.join(this.persistencePath, `${planId}.plan.json`);
  }

  /**
   * Get results file path
   */
  private getResultsFilePath(planId: string): string {
    return path.join(this.persistencePath, `${planId}.results.json`);
  }

  /**
   * Build dependency map from tasks
   */
  private buildDependencyMap(tasks: Task[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    for (const task of tasks) {
      dependencies.set(task.id, task.dependencies || []);
    }
    return dependencies;
  }

  /**
   * Date replacer for JSON serialization
   */
  private dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', __value: value.toISOString() };
    }
    return value;
  }

  /**
   * Date reviver for JSON deserialization
   */
  private dateReviver(key: string, value: any): any {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.__value);
    }
    return value;
  }

  // Locking removed for now - can be added back if needed for production
  // File system operations provide some level of atomicity
}
