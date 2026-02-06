/**
 * Integration Tests for Planning Tool with TaskPlanner
 *
 * TDD Phase: RED - Tests written before full integration
 * These tests verify that PlanningTool correctly integrates with TaskPlanner.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PlanningTool } from '../../../src/tools/planning-tool.js';
import { TaskPlanner, TaskPlan, PlanningContext } from '../../../src/ai/task-planner.js';
import { ToolExecutionContext } from '../../../src/tools/types.js';

describe('PlanningTool Integration with TaskPlanner', () => {
  let mockTaskPlanner: jest.Mocked<TaskPlanner>;
  let mockContext: ToolExecutionContext;
  let planningTool: PlanningTool;

  beforeEach(() => {
    // Create mock TaskPlanner with all methods
    mockTaskPlanner = {
      createPlan: jest.fn(),
      executePlan: jest.fn(),
      getPlan: jest.fn(),
      getActivePlans: jest.fn(),
      cancelPlan: jest.fn(),
    } as any;

    // Create mock execution context
    mockContext = {
      projectRoot: '/test/project',
      workingDirectory: '/test/project',
      environment: {},
      timeout: 30000,
    };

    // Create PlanningTool instance with mock TaskPlanner
    planningTool = new PlanningTool(mockTaskPlanner);
  });

  describe('TaskPlanner.createPlan integration', () => {
    it('should call TaskPlanner.createPlan when creating plan', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-integration-1',
        title: 'Integration Test Plan',
        description: 'Test plan for integration',
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
            toolsRequired: ['filesystem'],
            filesInvolved: [],
            acceptance_criteria: [],
            created: new Date(),
          },
        ],
        dependencies: new Map(),
        estimatedDuration: 10,
        status: 'planning',
        progress: { completed: 0, total: 1, percentage: 0 },
        created: new Date(),
        metadata: {
          complexity: 'simple',
          confidence: 0.9,
          adaptations: 0,
        },
        riskLevel: 'low',
      };

      mockTaskPlanner.createPlan.mockResolvedValue(mockPlan);

      const result = await planningTool.execute(
        {
          operation: 'create',
          request: 'Test integration request',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockTaskPlanner.createPlan).toHaveBeenCalledTimes(1);
      expect(mockTaskPlanner.createPlan).toHaveBeenCalledWith(
        'Test integration request',
        expect.objectContaining({
          projectRoot: '/test/project',
        })
      );
      expect(result.data.planId).toBe('plan-integration-1');
    });

    it('should pass correct PlanningContext to TaskPlanner.createPlan', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-context-test',
        title: 'Context Test',
        description: 'Test',
        tasks: [],
        dependencies: new Map(),
        estimatedDuration: 0,
        status: 'planning',
        progress: { completed: 0, total: 0, percentage: 0 },
        created: new Date(),
        metadata: {
          complexity: 'simple',
          confidence: 1.0,
          adaptations: 0,
        },
        riskLevel: 'low',
      };

      mockTaskPlanner.createPlan.mockResolvedValue(mockPlan);

      await planningTool.execute(
        {
          operation: 'create',
          request: 'Test request',
        },
        mockContext
      );

      const callArgs = mockTaskPlanner.createPlan.mock.calls[0];
      expect(callArgs[0]).toBe('Test request');
      expect(callArgs[1]).toMatchObject({
        projectRoot: '/test/project',
        codebaseSize: expect.any(String),
        userExperience: expect.any(String),
        qualityRequirements: expect.any(String),
      });
    });
  });

  describe('TaskPlanner.executePlan integration', () => {
    it('should call TaskPlanner.executePlan when executing plan', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-execute-integration',
        title: 'Execute Integration Test',
        description: 'Test execution',
        tasks: [
          {
            id: 'task-1',
            title: 'Task 1',
            description: 'Task',
            type: 'implementation',
            priority: 'medium',
            status: 'pending',
            dependencies: [],
            estimatedDuration: 5,
            toolsRequired: [],
            filesInvolved: [],
            acceptance_criteria: [],
            created: new Date(),
          },
        ],
        dependencies: new Map(),
        estimatedDuration: 5,
        status: 'planning',
        progress: { completed: 0, total: 1, percentage: 0 },
        created: new Date(),
        metadata: {
          complexity: 'simple',
          confidence: 1.0,
          adaptations: 0,
        },
        riskLevel: 'low',
      };

      const completedPlan: TaskPlan = {
        ...mockPlan,
        status: 'completed',
        progress: { completed: 1, total: 1, percentage: 100 },
        completed: new Date(),
      };

      mockTaskPlanner.getPlan.mockReturnValue(mockPlan);
      mockTaskPlanner.executePlan.mockResolvedValue(undefined);
      mockTaskPlanner.getPlan.mockReturnValueOnce(mockPlan).mockReturnValueOnce(completedPlan);

      const result = await planningTool.execute(
        {
          operation: 'execute',
          planId: 'plan-execute-integration',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockTaskPlanner.executePlan).toHaveBeenCalledTimes(1);
      expect(mockTaskPlanner.executePlan).toHaveBeenCalledWith('plan-execute-integration');
      expect(result.data.status).toBe('completed');
    });

    it('should handle TaskPlanner.executePlan errors gracefully', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-error-test',
        title: 'Error Test',
        description: 'Test',
        tasks: [],
        dependencies: new Map(),
        estimatedDuration: 0,
        status: 'planning',
        progress: { completed: 0, total: 0, percentage: 0 },
        created: new Date(),
        metadata: {
          complexity: 'simple',
          confidence: 1.0,
          adaptations: 0,
        },
        riskLevel: 'low',
      };

      mockTaskPlanner.getPlan.mockReturnValue(mockPlan);
      mockTaskPlanner.executePlan.mockRejectedValue(new Error('Execution failed'));

      const result = await planningTool.execute(
        {
          operation: 'execute',
          planId: 'plan-error-test',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Execution failed');
      expect(mockTaskPlanner.executePlan).toHaveBeenCalledTimes(1);
    });
  });

  describe('TaskPlanner.getPlan integration', () => {
    it('should call TaskPlanner.getPlan for view operation', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-view-integration',
        title: 'View Integration Test',
        description: 'Test view',
        tasks: [],
        dependencies: new Map(),
        estimatedDuration: 0,
        status: 'planning',
        progress: { completed: 0, total: 0, percentage: 0 },
        created: new Date(),
        metadata: {
          complexity: 'simple',
          confidence: 1.0,
          adaptations: 0,
        },
        riskLevel: 'low',
      };

      mockTaskPlanner.getPlan.mockReturnValue(mockPlan);

      const result = await planningTool.execute(
        {
          operation: 'view',
          planId: 'plan-view-integration',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockTaskPlanner.getPlan).toHaveBeenCalledTimes(1);
      expect(mockTaskPlanner.getPlan).toHaveBeenCalledWith('plan-view-integration');
      expect(result.data.planId).toBe('plan-view-integration');
    });

    it('should call TaskPlanner.getPlan for status operation', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-status-integration',
        title: 'Status Integration Test',
        description: 'Test status',
        tasks: [
          {
            id: 'task-1',
            title: 'Task 1',
            description: 'Task',
            type: 'implementation',
            priority: 'medium',
            status: 'in_progress',
            dependencies: [],
            estimatedDuration: 10,
            toolsRequired: [],
            filesInvolved: [],
            acceptance_criteria: [],
            created: new Date(),
            started: new Date(),
          },
        ],
        dependencies: new Map(),
        estimatedDuration: 10,
        status: 'executing',
        progress: { completed: 0, total: 1, percentage: 0 },
        created: new Date(),
        started: new Date(),
        metadata: {
          complexity: 'simple',
          confidence: 1.0,
          adaptations: 0,
        },
        riskLevel: 'low',
      };

      mockTaskPlanner.getPlan.mockReturnValue(mockPlan);

      const result = await planningTool.execute(
        {
          operation: 'status',
          planId: 'plan-status-integration',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockTaskPlanner.getPlan).toHaveBeenCalledTimes(1);
      expect(mockTaskPlanner.getPlan).toHaveBeenCalledWith('plan-status-integration');
      expect(result.data.status).toBe('executing');
      expect(result.data.progress.total).toBe(1);
    });
  });

  describe('Plan state tracking during execution', () => {
    it('should track plan state changes during execution', async () => {
      const initialPlan: TaskPlan = {
        id: 'plan-state-tracking',
        title: 'State Tracking Test',
        description: 'Test state tracking',
        tasks: [
          {
            id: 'task-1',
            title: 'Task 1',
            description: 'Task',
            type: 'implementation',
            priority: 'medium',
            status: 'pending',
            dependencies: [],
            estimatedDuration: 5,
            toolsRequired: [],
            filesInvolved: [],
            acceptance_criteria: [],
            created: new Date(),
          },
        ],
        dependencies: new Map(),
        estimatedDuration: 5,
        status: 'planning',
        progress: { completed: 0, total: 1, percentage: 0 },
        created: new Date(),
        metadata: {
          complexity: 'simple',
          confidence: 1.0,
          adaptations: 0,
        },
        riskLevel: 'low',
      };

      const executingPlan: TaskPlan = {
        ...initialPlan,
        status: 'executing',
        started: new Date(),
      };

      const completedPlan: TaskPlan = {
        ...executingPlan,
        status: 'completed',
        progress: { completed: 1, total: 1, percentage: 100 },
        completed: new Date(),
      };

      // First call (in handleExecute) returns initial plan to check existence
      // Second call (after executePlan) returns completed plan
      mockTaskPlanner.getPlan
        .mockReturnValueOnce(initialPlan) // First call: check if plan exists
        .mockReturnValueOnce(completedPlan); // Second call: get updated status after execution

      mockTaskPlanner.executePlan.mockResolvedValue(undefined);

      // Execute the plan
      const result = await planningTool.execute(
        {
          operation: 'execute',
          planId: 'plan-state-tracking',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockTaskPlanner.getPlan).toHaveBeenCalledTimes(2); // Once before execution, once after
      expect(result.data.status).toBe('completed');
      expect(result.data.progress.percentage).toBe(100);
    });
  });

  describe('Error propagation', () => {
    it('should propagate TaskPlanner errors correctly', async () => {
      const errorMessage = 'TaskPlanner internal error';
      mockTaskPlanner.createPlan.mockRejectedValue(new Error(errorMessage));

      const result = await planningTool.execute(
        {
          operation: 'create',
          request: 'Test request',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(errorMessage);
    });

    it('should handle TaskPlanner returning undefined for getPlan', async () => {
      mockTaskPlanner.getPlan.mockReturnValue(undefined);

      const result = await planningTool.execute(
        {
          operation: 'view',
          planId: 'nonexistent-plan',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
