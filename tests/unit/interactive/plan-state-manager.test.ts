/**
 * Unit Tests for Plan State Manager
 *
 * TDD Phase: RED - Tests written before implementation
 * These tests define the expected behavior of the PlanStateManager.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PlanStateManager } from '../../../src/interactive/plan-state-manager.js';
import { TaskPlan, Task } from '../../../src/ai/task-planner.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('PlanStateManager', () => {
  let manager: PlanStateManager;
  let tempDir: string;
  let mockPlan: TaskPlan;

  beforeEach(async () => {
    // Create temporary directory for test persistence
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-state-test-'));
    manager = new PlanStateManager({ persistencePath: tempDir });

    // Create a mock plan
    mockPlan = {
      id: 'test-plan-1',
      title: 'Test Plan',
      description: 'Test plan for state manager',
      tasks: [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'First task',
          type: 'implementation',
          priority: 'high',
          status: 'pending',
          dependencies: [],
          estimatedDuration: 10,
          toolsRequired: [],
          filesInvolved: [],
          acceptance_criteria: [],
          created: new Date(),
        },
      ],
      dependencies: new Map(),
      estimatedDuration: 10,
      status: 'planning',
      progress: {
        completed: 0,
        total: 1,
        percentage: 0,
      },
      created: new Date(),
      metadata: {
        complexity: 'simple',
        confidence: 0.9,
        adaptations: 0,
      },
      riskLevel: 'low',
    };
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('plan persistence', () => {
    it('should persist plans across sessions', async () => {
      await manager.savePlan(mockPlan);

      // Create a new manager instance to simulate new session
      const newManager = new PlanStateManager({ persistencePath: tempDir });
      const loadedPlan = await newManager.loadPlan(mockPlan.id);

      expect(loadedPlan).toBeDefined();
      expect(loadedPlan!.id).toBe(mockPlan.id);
      expect(loadedPlan!.title).toBe(mockPlan.title);
      expect(loadedPlan!.tasks).toHaveLength(1);
    });

    it('should persist plan state changes', async () => {
      await manager.savePlan(mockPlan);

      // Update plan state
      mockPlan.status = 'executing';
      mockPlan.started = new Date();
      mockPlan.tasks[0].status = 'in_progress';
      await manager.savePlan(mockPlan);

      // Load and verify
      const loadedPlan = await manager.loadPlan(mockPlan.id);
      expect(loadedPlan!.status).toBe('executing');
      expect(loadedPlan!.started).toBeDefined();
      expect(loadedPlan!.tasks[0].status).toBe('in_progress');
    });

    it('should handle missing plan files gracefully', async () => {
      const loadedPlan = await manager.loadPlan('nonexistent-plan');
      expect(loadedPlan).toBeUndefined();
    });
  });

  describe('plan execution state tracking', () => {
    it('should track plan execution state', async () => {
      await manager.savePlan(mockPlan);

      // Update execution state
      mockPlan.status = 'executing';
      mockPlan.progress.completed = 1;
      mockPlan.progress.percentage = 100;
      await manager.updatePlanState(mockPlan.id, {
        status: 'executing',
        progress: mockPlan.progress,
      });

      const state = await manager.getPlanState(mockPlan.id);
      expect(state).toBeDefined();
      expect(state!.status).toBe('executing');
      expect(state!.progress.percentage).toBe(100);
    });

    it('should track individual task states', async () => {
      await manager.savePlan(mockPlan);

      // Update task state
      await manager.updateTaskState(mockPlan.id, 'task-1', {
        status: 'completed',
        completed: new Date(),
      });

      const plan = await manager.loadPlan(mockPlan.id);
      expect(plan!.tasks[0].status).toBe('completed');
      expect(plan!.tasks[0].completed).toBeDefined();
    });
  });

  describe('plan modification', () => {
    it('should support plan modification', async () => {
      await manager.savePlan(mockPlan);

      // Modify plan
      const updates = {
        title: 'Updated Plan Title',
        description: 'Updated description',
        tasks: [
          {
            ...mockPlan.tasks[0],
            title: 'Updated Task Title',
          },
        ],
      };

      await manager.updatePlan(mockPlan.id, updates);

      const updatedPlan = await manager.loadPlan(mockPlan.id);
      expect(updatedPlan!.title).toBe('Updated Plan Title');
      expect(updatedPlan!.description).toBe('Updated description');
      expect(updatedPlan!.tasks[0].title).toBe('Updated Task Title');
    });

    it('should handle partial plan updates', async () => {
      await manager.savePlan(mockPlan);

      await manager.updatePlan(mockPlan.id, {
        title: 'Partially Updated',
      });

      const updatedPlan = await manager.loadPlan(mockPlan.id);
      expect(updatedPlan!.title).toBe('Partially Updated');
      expect(updatedPlan!.description).toBe(mockPlan.description); // Unchanged
    });
  });

  describe('plan results storage', () => {
    it('should store plan results', async () => {
      await manager.savePlan(mockPlan);

      const results = {
        success: true,
        artifacts: ['file1.js', 'file2.js'],
        metrics: {
          executionTime: 5000,
          tasksCompleted: 1,
        },
      };

      await manager.savePlanResults(mockPlan.id, results);

      const storedResults = await manager.getPlanResults(mockPlan.id);
      expect(storedResults).toBeDefined();
      expect(storedResults!.success).toBe(true);
      expect(storedResults!.artifacts).toHaveLength(2);
      expect(storedResults!.metrics.executionTime).toBe(5000);
    });

    it('should handle plans without results', async () => {
      await manager.savePlan(mockPlan);

      const results = await manager.getPlanResults(mockPlan.id);
      expect(results).toBeUndefined();
    });
  });

  describe('resume interrupted plans', () => {
    it('should resume interrupted plans', async () => {
      // Save plan in executing state
      mockPlan.status = 'executing';
      mockPlan.started = new Date();
      mockPlan.tasks[0].status = 'in_progress';
      await manager.savePlan(mockPlan);

      // Simulate resuming
      const resumedPlan = await manager.resumePlan(mockPlan.id);
      expect(resumedPlan).toBeDefined();
      expect(resumedPlan!.status).toBe('executing');
      expect(resumedPlan!.tasks[0].status).toBe('in_progress');
    });

    it('should return undefined for completed plans', async () => {
      mockPlan.status = 'completed';
      mockPlan.completed = new Date();
      await manager.savePlan(mockPlan);

      const resumedPlan = await manager.resumePlan(mockPlan.id);
      expect(resumedPlan).toBeUndefined(); // Can't resume completed plans
    });

    it('should return undefined for non-existent plans', async () => {
      const resumedPlan = await manager.resumePlan('nonexistent-plan');
      expect(resumedPlan).toBeUndefined();
    });
  });

  describe('concurrent plan access', () => {
    it('should handle concurrent plan access', async () => {
      await manager.savePlan(mockPlan);

      // Simulate concurrent updates
      const update1 = manager.updatePlan(mockPlan.id, { title: 'Update 1' });
      const update2 = manager.updatePlan(mockPlan.id, { title: 'Update 2' });

      await Promise.all([update1, update2]);

      const plan = await manager.loadPlan(mockPlan.id);
      expect(plan).toBeDefined();
      // One of the updates should have succeeded
      expect(['Update 1', 'Update 2']).toContain(plan!.title);
    });

    it('should list all active plans', async () => {
      await manager.savePlan(mockPlan);

      const plan2: TaskPlan = {
        ...mockPlan,
        id: 'test-plan-2',
        title: 'Plan 2',
      };
      await manager.savePlan(plan2);

      const activePlans = await manager.listActivePlans();
      expect(activePlans.length).toBeGreaterThanOrEqual(2);
      expect(activePlans.some((p) => p.id === mockPlan.id)).toBe(true);
      expect(activePlans.some((p) => p.id === plan2.id)).toBe(true);
    });
  });

  describe('plan versioning', () => {
    it('should track plan versions', async () => {
      await manager.savePlan(mockPlan);

      // Update plan multiple times
      await manager.updatePlan(mockPlan.id, { title: 'Version 2' });
      await manager.updatePlan(mockPlan.id, { title: 'Version 3' });

      const plan = await manager.loadPlan(mockPlan.id);
      expect(plan).toBeDefined();
      expect(plan!.title).toBe('Version 3');
    });
  });
});
