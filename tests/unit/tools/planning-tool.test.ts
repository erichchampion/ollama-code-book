/**
 * Unit Tests for Planning Tool
 *
 * TDD Phase: RED - Tests written before implementation
 * These tests define the expected behavior of the PlanningTool.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PlanningTool } from '../../../src/tools/planning-tool.js';
import { TaskPlanner, TaskPlan, PlanningContext } from '../../../src/ai/task-planner.js';
import { ToolExecutionContext } from '../../../src/tools/types.js';

describe('PlanningTool', () => {
  let mockTaskPlanner: jest.Mocked<TaskPlanner>;
  let mockContext: ToolExecutionContext;
  let planningTool: PlanningTool;

  beforeEach(() => {
    // Create mock TaskPlanner
    mockTaskPlanner = {
      createPlan: jest.fn(),
      executePlan: jest.fn(),
      getPlan: jest.fn(),
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

  describe('operation: create', () => {
    it('should create plan from user request', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-123',
        title: 'Build REST API',
        description: 'Create a REST API with authentication',
        tasks: [
          {
            id: 'task-1',
            title: 'Set up project structure',
            description: 'Create directories and config files',
            type: 'implementation',
            priority: 'high',
            status: 'pending',
            dependencies: [],
            estimatedDuration: 15,
            toolsRequired: ['filesystem'],
            filesInvolved: [],
            acceptance_criteria: ['Project structure created'],
            created: new Date(),
          },
          {
            id: 'task-2',
            title: 'Implement authentication',
            description: 'Add JWT authentication',
            type: 'implementation',
            priority: 'high',
            status: 'pending',
            dependencies: ['task-1'],
            estimatedDuration: 30,
            toolsRequired: ['filesystem'],
            filesInvolved: [],
            acceptance_criteria: ['Auth implemented'],
            created: new Date(),
          },
        ],
        dependencies: new Map([['task-2', ['task-1']]]),
        estimatedDuration: 45,
        status: 'planning',
        progress: {
          completed: 0,
          total: 2,
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

      mockTaskPlanner.createPlan.mockResolvedValue(mockPlan);

      const result = await planningTool.execute(
        {
          operation: 'create',
          request: 'Build a REST API with authentication',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.planId).toBe('plan-123');
      expect(result.data.title).toBe('Build REST API');
      expect(result.data.tasks).toHaveLength(2);
      expect(mockTaskPlanner.createPlan).toHaveBeenCalledWith(
        'Build a REST API with authentication',
        expect.objectContaining({
          projectRoot: '/test/project',
        })
      );
    });

    it('should include context when includeContext is true', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-456',
        title: 'Test Plan',
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
          includeContext: true,
        },
        mockContext
      );

      expect(mockTaskPlanner.createPlan).toHaveBeenCalledWith(
        'Test request',
        expect.objectContaining({
          projectRoot: '/test/project',
        })
      );
    });

    it('should handle TaskPlanner errors gracefully', async () => {
      mockTaskPlanner.createPlan.mockRejectedValue(
        new Error('Failed to create plan')
      );

      const result = await planningTool.execute(
        {
          operation: 'create',
          request: 'Invalid request',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create plan');
    });
  });

  describe('operation: view', () => {
    it('should view existing plan', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-789',
        title: 'View Test Plan',
        description: 'Plan for viewing',
        tasks: [
          {
            id: 'task-1',
            title: 'Task 1',
            description: 'First task',
            type: 'implementation',
            priority: 'medium',
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
        progress: { completed: 0, total: 1, percentage: 0 },
        created: new Date(),
        metadata: {
          complexity: 'simple',
          confidence: 0.9,
          adaptations: 0,
        },
        riskLevel: 'low',
      };

      mockTaskPlanner.getPlan.mockReturnValue(mockPlan);

      const result = await planningTool.execute(
        {
          operation: 'view',
          planId: 'plan-789',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.planId).toBe('plan-789');
      expect(result.data.title).toBe('View Test Plan');
      expect(result.data.tasks).toHaveLength(1);
      expect(mockTaskPlanner.getPlan).toHaveBeenCalledWith('plan-789');
    });

    it('should handle invalid plan ID', async () => {
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

  describe('operation: update', () => {
    it('should update plan tasks', async () => {
      const existingPlan: TaskPlan = {
        id: 'plan-update',
        title: 'Original Plan',
        description: 'Original',
        tasks: [
          {
            id: 'task-1',
            title: 'Original Task',
            description: 'Original task description',
            type: 'implementation',
            priority: 'medium',
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
        progress: { completed: 0, total: 1, percentage: 0 },
        created: new Date(),
        metadata: {
          complexity: 'simple',
          confidence: 0.9,
          adaptations: 0,
        },
        riskLevel: 'low',
      };

      const updatedPlan: TaskPlan = {
        ...existingPlan,
        tasks: [
          {
            ...existingPlan.tasks[0],
            title: 'Updated Task',
            description: 'Updated task description',
          },
        ],
      };

      mockTaskPlanner.getPlan.mockReturnValue(existingPlan);
      // In real implementation, updatePlan would modify the plan
      // For now, we'll test that the operation is handled

      const result = await planningTool.execute(
        {
          operation: 'update',
          planId: 'plan-update',
          updates: {
            tasks: [
              {
                id: 'task-1',
                title: 'Updated Task',
                description: 'Updated task description',
              },
            ],
          },
        },
        mockContext
      );

      // The actual implementation will handle the update
      // For now, we expect it to be handled
      expect(result.success).toBe(true);
    });

    it('should handle update of non-existent plan', async () => {
      mockTaskPlanner.getPlan.mockReturnValue(undefined);

      const result = await planningTool.execute(
        {
          operation: 'update',
          planId: 'nonexistent',
          updates: {},
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('operation: execute', () => {
    it('should execute plan step-by-step', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-execute',
        title: 'Execution Plan',
        description: 'Plan to execute',
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

      mockTaskPlanner.getPlan.mockReturnValue(mockPlan);
      mockTaskPlanner.executePlan.mockResolvedValue(undefined);

      const result = await planningTool.execute(
        {
          operation: 'execute',
          planId: 'plan-execute',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockTaskPlanner.executePlan).toHaveBeenCalledWith('plan-execute');
    });

    it('should handle execution errors', async () => {
      mockTaskPlanner.getPlan.mockReturnValue({
        id: 'plan-error',
        title: 'Error Plan',
        description: 'Plan that will error',
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
      } as TaskPlan);

      mockTaskPlanner.executePlan.mockRejectedValue(
        new Error('Execution failed')
      );

      const result = await planningTool.execute(
        {
          operation: 'execute',
          planId: 'plan-error',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Execution failed');
    });
  });

  describe('operation: status', () => {
    it('should get plan status', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-status',
        title: 'Status Plan',
        description: 'Plan for status check',
        tasks: [
          {
            id: 'task-1',
            title: 'Completed Task',
            description: 'Task 1',
            type: 'implementation',
            priority: 'medium',
            status: 'completed',
            dependencies: [],
            estimatedDuration: 10,
            toolsRequired: [],
            filesInvolved: [],
            acceptance_criteria: [],
            created: new Date(),
            completed: new Date(),
          },
          {
            id: 'task-2',
            title: 'In Progress Task',
            description: 'Task 2',
            type: 'implementation',
            priority: 'medium',
            status: 'in_progress',
            dependencies: [],
            estimatedDuration: 20,
            toolsRequired: [],
            filesInvolved: [],
            acceptance_criteria: [],
            created: new Date(),
            started: new Date(),
          },
        ],
        dependencies: new Map(),
        estimatedDuration: 30,
        status: 'executing',
        progress: {
          completed: 1,
          total: 2,
          percentage: 50,
        },
        created: new Date(),
        started: new Date(),
        metadata: {
          complexity: 'moderate',
          confidence: 0.8,
          adaptations: 0,
        },
        riskLevel: 'medium',
      };

      mockTaskPlanner.getPlan.mockReturnValue(mockPlan);

      const result = await planningTool.execute(
        {
          operation: 'status',
          planId: 'plan-status',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.planId).toBe('plan-status');
      expect(result.data.status).toBe('executing');
      expect(result.data.progress.percentage).toBe(50);
      expect(result.data.progress.completed).toBe(1);
      expect(result.data.progress.total).toBe(2);
    });

    it('should handle status check for non-existent plan', async () => {
      mockTaskPlanner.getPlan.mockReturnValue(undefined);

      const result = await planningTool.execute(
        {
          operation: 'status',
          planId: 'nonexistent',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('parameter validation', () => {
    it('should validate required parameters', async () => {
      const result = await planningTool.execute(
        {
          // Missing operation
        } as any,
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('operation');
    });

    it('should validate operation enum', async () => {
      const result = await planningTool.execute(
        {
          operation: 'invalid-operation',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid operation');
    });

    it('should require planId for view operation', async () => {
      const result = await planningTool.execute(
        {
          operation: 'view',
          // Missing planId
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('planId');
    });

    it('should require request for create operation', async () => {
      const result = await planningTool.execute(
        {
          operation: 'create',
          // Missing request
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('request');
    });
  });
});
