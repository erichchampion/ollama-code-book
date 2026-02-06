/**
 * Unit Tests for Plan Display Module
 *
 * TDD: Tests define expected formatting for plan summary, progress bar,
 * dependency display, and results view.
 */

import { describe, it, expect } from '@jest/globals';
import {
  formatPlanSummary,
  formatProgressBar,
  formatDependencyDisplay,
  formatPlanResults,
  formatPlanForTerminal,
} from '../../../src/interactive/plan-display.js';
import type { TaskPlan, Task } from '../../../src/ai/task-planner.js';

function createMockPlan(overrides: Partial<TaskPlan> = {}): TaskPlan {
  return {
    id: 'plan-1',
    title: 'Test Plan',
    description: 'A test plan',
    tasks: [
      {
        id: 'task-1',
        title: 'Task 1',
        description: 'First task',
        type: 'implementation',
        priority: 'high',
        status: 'completed',
        dependencies: [],
        estimatedDuration: 5,
        toolsRequired: ['filesystem'],
        filesInvolved: ['a.js'],
        acceptance_criteria: [],
        created: new Date(),
        result: 'Done',
      },
      {
        id: 'task-2',
        title: 'Task 2',
        description: 'Second task',
        type: 'testing',
        priority: 'medium',
        status: 'pending',
        dependencies: ['task-1'],
        estimatedDuration: 3,
        toolsRequired: [],
        filesInvolved: [],
        acceptance_criteria: [],
        created: new Date(),
      },
    ],
    dependencies: new Map([
      ['task-1', []],
      ['task-2', ['task-1']],
    ]),
    estimatedDuration: 8,
    status: 'executing',
    progress: { completed: 1, total: 2, percentage: 50 },
    created: new Date(),
    metadata: { complexity: 'moderate', confidence: 0.85, adaptations: 0 },
    riskLevel: 'low',
    ...overrides,
  };
}

describe('plan-display', () => {
  describe('formatPlanSummary', () => {
    it('formats plan title, description, and metadata', () => {
      const plan = createMockPlan();
      const out = formatPlanSummary(plan);
      expect(out).toContain('Test Plan');
      expect(out).toContain('A test plan');
      expect(out).toContain('moderate');
      expect(out).toContain('85');
    });

    it('handles missing metadata gracefully', () => {
      const plan = createMockPlan({ metadata: undefined as any });
      const out = formatPlanSummary(plan);
      expect(out).toContain(plan.title);
      expect(() => formatPlanSummary(plan)).not.toThrow();
    });
  });

  describe('formatProgressBar', () => {
    it('returns a visual bar with percentage', () => {
      const out = formatProgressBar({ completed: 2, total: 5, percentage: 40 });
      expect(out).toMatch(/\d+%|40/);
      expect(out.length).toBeGreaterThan(5);
    });

    it('handles 0%', () => {
      const out = formatProgressBar({ completed: 0, total: 5, percentage: 0 });
      expect(out).toContain('0');
    });

    it('handles 100%', () => {
      const out = formatProgressBar({ completed: 5, total: 5, percentage: 100 });
      expect(out).toContain('100');
    });
  });

  describe('formatDependencyDisplay', () => {
    it('shows task IDs and their dependencies', () => {
      const plan = createMockPlan();
      const out = formatDependencyDisplay(plan);
      expect(out).toContain('task-1');
      expect(out).toContain('task-2');
      expect(out).toMatch(/task-2.*task-1|task-1.*task-2|dependency|depends/i);
    });

    it('handles empty dependencies', () => {
      const plan = createMockPlan({ dependencies: new Map(), tasks: [] });
      const out = formatDependencyDisplay(plan);
      expect(typeof out).toBe('string');
      expect(() => formatDependencyDisplay(plan)).not.toThrow();
    });

    it('infers dependencies from task.dependencies when plan.dependencies is empty', () => {
      const plan = createMockPlan({ dependencies: new Map() });
      const out = formatDependencyDisplay(plan);
      expect(out).toContain('task-2');
      expect(out).toContain('task-1');
    });
  });

  describe('formatPlanResults', () => {
    it('formats completed and failed tasks with status and duration', () => {
      const plan = createMockPlan({
        status: 'completed',
        started: new Date(Date.now() - 60000),
        completed: new Date(),
      });
      const out = formatPlanResults(plan);
      expect(out).toContain('Completed');
      expect(out).toContain('Task 1');
      expect(out).toContain('Done');
    });

    it('includes failed tasks when present', () => {
      const plan = createMockPlan({
        tasks: [
          {
            id: 't1',
            title: 'Fail Task',
            description: 'Fails',
            type: 'implementation',
            priority: 'high',
            status: 'failed',
            dependencies: [],
            estimatedDuration: 1,
            toolsRequired: [],
            filesInvolved: [],
            acceptance_criteria: [],
            created: new Date(),
            error: 'Something broke',
          },
        ],
      });
      const out = formatPlanResults(plan);
      expect(out).toContain('Fail');
      expect(out).toContain('Something broke');
    });

    it('handles empty tasks', () => {
      const plan = createMockPlan({ tasks: [] });
      const out = formatPlanResults(plan);
      expect(out).toContain(plan.title || '');
      expect(typeof out).toBe('string');
    });

    it('handles null/undefined plan', () => {
      const out = formatPlanResults(null as any);
      expect(out).toContain('not available');
    });
  });

  describe('formatPlanForTerminal', () => {
    it('composes summary, progress bar, dependency display, and task list', () => {
      const plan = createMockPlan();
      const out = formatPlanForTerminal(plan);
      expect(out).toContain(plan.title);
      expect(out).toContain('50');
      expect(out).toContain('task-1');
      expect(out).toContain('Task 1');
    });

    it('accepts options to include or omit sections', () => {
      const plan = createMockPlan();
      const out = formatPlanForTerminal(plan, { includeDependencies: false });
      expect(out).toContain(plan.title);
    });
  });
});
