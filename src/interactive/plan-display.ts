/**
 * Plan Display Module
 *
 * Formats task plans for terminal: summary, progress bar, dependency display,
 * and results view. Used by enhanced-mode for displayTaskPlan / displayPlanResults.
 */

import type { TaskPlan, Task } from '../ai/task-planner.js';

export interface PlanDisplayOptions {
  includeSummary?: boolean;
  includeProgress?: boolean;
  includeDependencies?: boolean;
  includeTaskList?: boolean;
}

const DEFAULT_OPTIONS: Required<PlanDisplayOptions> = {
  includeSummary: true,
  includeProgress: true,
  includeDependencies: true,
  includeTaskList: true,
};

/**
 * Format plan title, description, and metadata for display.
 */
export function formatPlanSummary(plan: TaskPlan): string {
  if (!plan) return '';
  const lines: string[] = [];
  lines.push(`# ${plan.title || 'Untitled Plan'}`);
  if (plan.description) lines.push(plan.description);
  const meta = plan.metadata;
  if (meta) {
    lines.push(`Complexity: ${meta.complexity ?? 'N/A'}`);
    if (typeof meta.confidence === 'number') {
      lines.push(`Confidence: ${Math.round(meta.confidence * 100)}%`);
    }
    if (typeof meta.adaptations === 'number') {
      lines.push(`Adaptations: ${meta.adaptations}`);
    }
  }
  return lines.join('\n');
}

/**
 * Format a progress bar string (e.g. [====    ] 40%).
 */
export function formatProgressBar(progress: {
  completed: number;
  total: number;
  percentage: number;
}): string {
  if (!progress || progress.total <= 0) return '[          ] 0%';
  const pct = Math.min(100, Math.max(0, progress.percentage));
  const filled = Math.round((pct / 100) * 10);
  const bar = '='.repeat(filled) + ' '.repeat(10 - filled);
  return `[${bar}] ${Math.round(pct)}%`;
}

/**
 * Get dependencies for a task: from plan.dependencies (Map) or task.dependencies.
 */
function getDepsForTask(plan: TaskPlan, taskId: string): string[] {
  const map = plan.dependencies;
  if (map && typeof (map as Map<string, string[]>).get === 'function') {
    const list = (map as Map<string, string[]>).get(taskId);
    if (Array.isArray(list)) return list;
  }
  const task = plan.tasks?.find((t: Task) => t.id === taskId);
  return (task?.dependencies as string[]) ?? [];
}

/**
 * Format task IDs and their dependencies (e.g. "Task A -> Task B" or tree/list).
 */
export function formatDependencyDisplay(plan: TaskPlan): string {
  if (!plan || !plan.tasks || plan.tasks.length === 0) return 'No tasks.';
  const lines: string[] = ['Dependencies:'];
  for (const task of plan.tasks) {
    const deps = getDepsForTask(plan, task.id);
    if (deps.length > 0) {
      lines.push(`  ${task.id} -> ${deps.join(', ')}`);
    } else {
      lines.push(`  ${task.id} (no dependencies)`);
    }
  }
  return lines.join('\n');
}

/**
 * Format completed/failed tasks with status and duration (mirror displayPlanResults).
 */
export function formatPlanResults(plan: TaskPlan | null | undefined): string {
  if (!plan) return 'Task plan completed but results not available.';
  const tasks = plan.tasks ?? [];
  const completed = tasks.filter((t: Task) => t.status === 'completed');
  const failed = tasks.filter((t: Task) => t.status === 'failed');
  const lines: string[] = [`Task Plan Results: ${plan.title || 'Untitled Plan'}`, ''];

  if (completed.length > 0) {
    lines.push(`✅ Completed ${completed.length}/${tasks.length} tasks:\n`);
    for (const task of completed) {
      lines.push(`## ${task.title}`);
      if (task.result != null) {
        const result =
          typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2);
        lines.push(result);
      } else {
        lines.push('Task completed successfully.');
      }
      lines.push('');
    }
  }

  if (failed.length > 0) {
    lines.push(`❌ Failed ${failed.length} tasks:`);
    for (const task of failed) {
      lines.push(`- ${task.title}: ${task.error || 'Unknown error'}`);
    }
    lines.push('');
  }

  const duration =
    plan.completed && plan.started
      ? ((new Date(plan.completed).getTime() - new Date(plan.started).getTime()) / (1000 * 60)).toFixed(
          1
        )
      : 'N/A';
  lines.push(`Execution completed in ${duration} minutes`);
  return lines.join('\n');
}

/**
 * Compose full plan output for terminal (summary + progress + dependencies + task list).
 */
export function formatPlanForTerminal(
  plan: TaskPlan,
  options: PlanDisplayOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parts: string[] = [];

  if (opts.includeSummary) {
    parts.push(formatPlanSummary(plan));
  }
  if (opts.includeProgress && plan.progress) {
    parts.push(formatProgressBar(plan.progress));
  }
  if (opts.includeDependencies) {
    parts.push(formatDependencyDisplay(plan));
  }
  if (opts.includeTaskList && plan.tasks?.length) {
    parts.push(
      'Tasks:\n' +
        plan.tasks
          .map(
            (t: Task) =>
              `  - [${t.status}] ${t.id}: ${t.title}`
          )
          .join('\n')
    );
  }

  return parts.join('\n\n');
}
