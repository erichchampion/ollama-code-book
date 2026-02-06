/**
 * Unit Tests for Plan Executor
 *
 * TDD Phase: RED - Tests written before implementation
 * These tests define the expected behavior of the PlanExecutor.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PlanExecutor } from '../../../src/tools/plan-executor.js';
import { TaskPlan, Task } from '../../../src/ai/task-planner.js';

describe('PlanExecutor', () => {
  let executor: PlanExecutor;
  let mockPlan: TaskPlan;

  beforeEach(() => {
    executor = new PlanExecutor();

    // Create a mock plan with tasks and dependencies
    mockPlan = {
      id: 'test-plan',
      title: 'Test Plan',
      description: 'Test plan for executor',
      tasks: [
        {
          id: 'task-1',
          title: 'Task 1 (no dependencies)',
          description: 'First task',
          type: 'implementation',
          priority: 'high',
          status: 'pending',
          dependencies: [],
          estimatedDuration: 10,
          toolsRequired: ['filesystem'],
          filesInvolved: [],
          acceptance_criteria: [],
          created: new Date(),
        },
        {
          id: 'task-2',
          title: 'Task 2 (depends on task-1)',
          description: 'Second task',
          type: 'implementation',
          priority: 'high',
          status: 'pending',
          dependencies: ['task-1'],
          estimatedDuration: 15,
          toolsRequired: ['filesystem'],
          filesInvolved: [],
          acceptance_criteria: [],
          created: new Date(),
        },
        {
          id: 'task-3',
          title: 'Task 3 (depends on task-1)',
          description: 'Third task',
          type: 'testing',
          priority: 'medium',
          status: 'pending',
          dependencies: ['task-1'],
          estimatedDuration: 20,
          toolsRequired: [],
          filesInvolved: [],
          acceptance_criteria: [],
          created: new Date(),
        },
      ],
      dependencies: new Map([
        ['task-2', ['task-1']],
        ['task-3', ['task-1']],
      ]),
      estimatedDuration: 45,
      status: 'planning',
      progress: {
        completed: 0,
        total: 3,
        percentage: 0,
      },
      created: new Date(),
      metadata: {
        complexity: 'moderate',
        confidence: 0.8,
        adaptations: 0,
      },
      riskLevel: 'medium',
    };
  });

  describe('dependency resolution', () => {
    it('should execute tasks in dependency order', async () => {
      const executionOrder: string[] = [];
      const taskExecutor = jest.fn(async (task: Task) => {
        executionOrder.push(task.id);
        task.status = 'completed';
        task.completed = new Date();
      });

      await executor.executePlan(mockPlan, taskExecutor);

      // Task 1 should execute first (no dependencies)
      expect(executionOrder[0]).toBe('task-1');
      // Tasks 2 and 3 should execute after task-1 (they depend on it)
      expect(executionOrder).toContain('task-2');
      expect(executionOrder).toContain('task-3');
      expect(executionOrder.length).toBe(3);
    });

    it('should handle tasks with no dependencies', async () => {
      const simplePlan: TaskPlan = {
        ...mockPlan,
        tasks: [mockPlan.tasks[0]], // Only task-1
        dependencies: new Map(),
        progress: { completed: 0, total: 1, percentage: 0 },
      };

      const executionOrder: string[] = [];
      const taskExecutor = jest.fn(async (task: Task) => {
        executionOrder.push(task.id);
        task.status = 'completed';
      });

      await executor.executePlan(simplePlan, taskExecutor);

      expect(executionOrder).toEqual(['task-1']);
    });

    it('should detect circular dependencies', async () => {
      const circularPlan: TaskPlan = {
        ...mockPlan,
        tasks: [
          {
            ...mockPlan.tasks[0],
            dependencies: ['task-2'], // task-1 depends on task-2
          },
          {
            ...mockPlan.tasks[1],
            dependencies: ['task-1'], // task-2 depends on task-1
          },
        ],
        dependencies: new Map([
          ['task-1', ['task-2']],
          ['task-2', ['task-1']],
        ]),
        progress: { completed: 0, total: 2, percentage: 0 },
      };

      const taskExecutor = jest.fn(async (task: Task) => {
        task.status = 'completed';
      });

      await expect(executor.executePlan(circularPlan, taskExecutor)).rejects.toThrow(
        /circular dependency/i
      );
    });
  });

  describe('task execution', () => {
    it('should track task completion status', async () => {
      const taskExecutor = jest.fn(async (task: Task) => {
        task.status = 'completed';
        task.completed = new Date();
      });

      await executor.executePlan(mockPlan, taskExecutor);

      expect(mockPlan.tasks[0].status).toBe('completed');
      expect(mockPlan.tasks[0].completed).toBeDefined();
    });

    it('should handle task failures', async () => {
      const taskExecutor = jest.fn(async (task: Task) => {
        if (task.id === 'task-1') {
          task.status = 'failed';
          task.error = 'Task execution failed';
          throw new Error('Task execution failed');
        }
        task.status = 'completed';
      });

      await expect(executor.executePlan(mockPlan, taskExecutor)).rejects.toThrow();

      expect(mockPlan.tasks[0].status).toBe('failed');
      expect(mockPlan.tasks[0].error).toBeDefined();
    });

    it('should not execute tasks with uncompleted dependencies', async () => {
      const executionOrder: string[] = [];
      const taskExecutor = jest.fn(async (task: Task) => {
        executionOrder.push(task.id);
        if (task.id === 'task-1') {
          // Don't complete task-1, so task-2 and task-3 should be blocked
          task.status = 'in_progress';
          // Don't throw error, just leave it in_progress
          return;
        }
        task.status = 'completed';
      });

      await executor.executePlan(mockPlan, taskExecutor);

      // Only task-1 should execute
      expect(executionOrder).toEqual(['task-1']);
      expect(executionOrder).not.toContain('task-2');
      expect(executionOrder).not.toContain('task-3');
      // task-2 and task-3 should be blocked or remain pending
      expect(['blocked', 'pending']).toContain(mockPlan.tasks[1].status);
      expect(['blocked', 'pending']).toContain(mockPlan.tasks[2].status);
    });
  });

  describe('retry logic', () => {
    it('should retry failed tasks', async () => {
      let attemptCount = 0;
      const taskExecutor = jest.fn(async (task: Task) => {
        attemptCount++;
        if (attemptCount === 1) {
          task.status = 'failed';
          task.error = 'First attempt failed';
          throw new Error('First attempt failed');
        }
        task.status = 'completed';
      });

      const executorWithRetry = new PlanExecutor({ maxRetries: 2 });
      await executorWithRetry.executePlan(
        {
          ...mockPlan,
          tasks: [mockPlan.tasks[0]], // Only task-1
          progress: { completed: 0, total: 1, percentage: 0 },
        },
        taskExecutor
      );

      expect(attemptCount).toBe(2); // Should retry once
      expect(mockPlan.tasks[0].status).toBe('completed');
    });

    it('should stop retrying after max retries', async () => {
      let attemptCount = 0;
      const taskExecutor = jest.fn(async (task: Task) => {
        attemptCount++;
        task.status = 'failed';
        task.error = `Attempt ${attemptCount} failed`;
        throw new Error(`Attempt ${attemptCount} failed`);
      });

      const executorWithRetry = new PlanExecutor({ maxRetries: 1 }); // 1 retry = 2 total attempts

      await expect(
        executorWithRetry.executePlan(
          {
            ...mockPlan,
            tasks: [mockPlan.tasks[0]],
            progress: { completed: 0, total: 1, percentage: 0 },
          },
          taskExecutor
        )
      ).rejects.toThrow();

      expect(attemptCount).toBe(2); // Initial attempt + 1 retry
    });
  });

  describe('pause and resume', () => {
    it('should support pausing execution', async () => {
      const executionOrder: string[] = [];
      const taskExecutor = jest.fn(async (task: Task) => {
        executionOrder.push(task.id);
        if (task.id === 'task-1') {
          executor.pause();
          return;
        }
        task.status = 'completed';
      });

      const executionPromise = executor.executePlan(mockPlan, taskExecutor);

      // Wait a bit for task-1 to execute and pause
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(executor.isPaused()).toBe(true);
      expect(executionOrder).toContain('task-1');

      // Resume execution
      executor.resume();
      await executionPromise;

      expect(executor.isPaused()).toBe(false);
    });

    it('should resume execution from where it paused', async () => {
      const executionOrder: string[] = [];
      let pauseAfterFirst = true;
      const taskExecutor = jest.fn(async (task: Task) => {
        executionOrder.push(task.id);
        if (task.id === 'task-1' && pauseAfterFirst) {
          pauseAfterFirst = false;
          executor.pause();
          task.status = 'completed';
          return;
        }
        task.status = 'completed';
      });

      const executionPromise = executor.executePlan(mockPlan, taskExecutor);

      // Wait for pause
      await new Promise((resolve) => setTimeout(resolve, 100));
      executor.resume();
      await executionPromise;

      // Should execute all tasks
      expect(executionOrder.length).toBe(3);
    });
  });

  describe('progress reporting', () => {
    it('should report progress during execution', async () => {
      const progressUpdates: number[] = [];
      const onProgress = jest.fn((progress: number) => {
        progressUpdates.push(progress);
      });

      const executorWithProgress = new PlanExecutor({ onProgress });
      const taskExecutor = jest.fn(async (task: Task) => {
        task.status = 'completed';
        task.completed = new Date();
      });

      await executorWithProgress.executePlan(mockPlan, taskExecutor);

      expect(onProgress).toHaveBeenCalled();
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100); // Should end at 100%
    });

    it('should update plan progress correctly', async () => {
      const taskExecutor = jest.fn(async (task: Task) => {
        task.status = 'completed';
        task.completed = new Date();
      });

      await executor.executePlan(mockPlan, taskExecutor);

      expect(mockPlan.progress.completed).toBe(3);
      expect(mockPlan.progress.total).toBe(3);
      expect(mockPlan.progress.percentage).toBe(100);
    });
  });

  describe('parallel execution', () => {
    it('should execute independent tasks in parallel', async () => {
      const independentPlan: TaskPlan = {
        ...mockPlan,
        tasks: [
          mockPlan.tasks[0], // task-1 (no deps)
          {
            ...mockPlan.tasks[1],
            id: 'task-2-independent',
            dependencies: [], // No dependencies
          },
        ],
        dependencies: new Map(),
        progress: { completed: 0, total: 2, percentage: 0 },
      };

      const executionTimes: Map<string, number> = new Map();
      const taskExecutor = jest.fn(async (task: Task) => {
        const startTime = Date.now();
        executionTimes.set(task.id, startTime);
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 50));
        task.status = 'completed';
      });

      const executorWithParallel = new PlanExecutor({ parallel: true });
      await executorWithParallel.executePlan(independentPlan, taskExecutor);

      // Both tasks should have started around the same time (within 10ms)
      const time1 = executionTimes.get('task-1')!;
      const time2 = executionTimes.get('task-2-independent')!;
      expect(Math.abs(time1 - time2)).toBeLessThan(50);
    });
  });
});
