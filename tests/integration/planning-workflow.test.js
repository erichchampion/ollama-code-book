/**
 * Integration Tests for Planning Workflow
 *
 * TDD Phase: RED - Tests written before implementation
 * These tests verify the integration of complexity detection, prompt enhancement,
 * and planning tool usage in the interactive workflow.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { enhanceSystemPromptWithPlanning } from '../../src/ai/prompts.js';
import { shouldSuggestPlanning, detectComplexity } from '../../src/tools/complexity-detection.js';
import { PlanningTool } from '../../src/tools/planning-tool.js';

describe('Planning Workflow Integration', () => {
  describe('Complexity Detection → Prompt Enhancement', () => {
    it('should enhance prompt when complexity suggests planning', () => {
      const complexRequest = 'Build a full-stack application with authentication';
      const basePrompt = 'You are an AI coding assistant.';
      
      expect(shouldSuggestPlanning(complexRequest)).toBe(true);
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, complexRequest);
      
      expect(enhanced).toContain('planning tool');
      expect(enhanced).toContain('complex');
    });

    it('should not enhance prompt for simple requests', () => {
      const simpleRequest = 'What is React?';
      const basePrompt = 'You are an AI coding assistant.';
      
      expect(shouldSuggestPlanning(simpleRequest)).toBe(false);
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, simpleRequest);
      
      expect(enhanced).toBe(basePrompt);
    });
  });

  describe('Planning Tool Integration', () => {
    let mockTaskPlanner;
    let planningTool;

    beforeEach(() => {
      // Ensure all methods are properly mocked
      mockTaskPlanner = {
        createPlan: jest.fn().mockResolvedValue({
          id: 'plan-default',
          title: 'Default Plan',
          description: 'Default description',
          tasks: [],
          dependencies: new Map(),
          estimatedDuration: 60,
          createdAt: new Date(),
          status: 'pending',
          progress: 0,
          metadata: {},
          riskLevel: 'medium',
        }),
        executePlan: jest.fn().mockResolvedValue(undefined),
        getPlan: jest.fn().mockReturnValue(null),
      };

      planningTool = new PlanningTool(mockTaskPlanner);
    });

    it('should create a plan for complex requests', async () => {
      // Reset mocks to ensure clean state
      mockTaskPlanner.createPlan.mockClear();
      const complexRequest = 'Create a REST API with endpoints for users, posts, and comments';
      const mockPlan = {
        id: 'plan-123',
        title: 'REST API Implementation',
        description: 'Create REST API with multiple endpoints',
        tasks: [],
        dependencies: new Map(),
        estimatedDuration: 60,
        createdAt: new Date(),
        status: 'pending',
        progress: 0,
        metadata: {},
        riskLevel: 'medium',
      };

      mockTaskPlanner.createPlan.mockResolvedValue(mockPlan);

      const context = {
        projectRoot: '/test',
        workingDirectory: '/test',
        environment: {},
        timeout: 30000,
      };

      const result = await planningTool.execute(
        {
          operation: 'create',
          request: complexRequest,
        },
        context
      );

      if (!result.success) {
        console.error('Create plan failed:', result.error);
      }
      expect(result.success).toBe(true);
      expect(mockTaskPlanner.createPlan).toHaveBeenCalledWith(
        complexRequest,
        expect.any(Object)
      );
    });

    it('should suggest planning tool usage in enhanced prompt', () => {
      const complexRequest = 'Design a microservices architecture';
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, complexRequest);
      
      // Should mention planning tool operations
      expect(enhanced).toMatch(/planning.*tool/i);
      expect(enhanced).toMatch(/operation.*create/i);
    });
  });

  describe('End-to-End Planning Workflow', () => {
    it('should detect complexity → enhance prompt → suggest planning → create plan', async () => {
      const userRequest = 'Build a complete e-commerce platform with user authentication, product catalog, shopping cart, checkout process, and payment integration';
      
      // Step 1: Detect complexity
      const complexity = detectComplexity(userRequest);
      // Should be complex or at least moderate with planning suggested
      expect(['complex', 'moderate']).toContain(complexity.level);
      expect(shouldSuggestPlanning(userRequest)).toBe(true);
      
      // Step 2: Enhance prompt
      const basePrompt = 'You are an AI coding assistant.';
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      expect(enhanced).toContain('planning tool');
      
      // Step 3: Planning tool should be available
      const mockTaskPlanner = {
        createPlan: jest.fn().mockResolvedValue({
          id: 'plan-456',
          title: 'E-commerce Platform',
          description: 'Build complete e-commerce platform',
          tasks: [],
          dependencies: new Map(),
          estimatedDuration: 120,
          createdAt: new Date(),
          status: 'pending',
          progress: 0,
          metadata: {},
          riskLevel: 'medium',
        }),
        executePlan: jest.fn().mockResolvedValue(undefined),
        getPlan: jest.fn().mockReturnValue(null),
      };
      
      const planningTool = new PlanningTool(mockTaskPlanner);
      
      // Step 4: Create plan
      const context = {
        projectRoot: '/test',
        workingDirectory: '/test',
        environment: {},
        timeout: 30000,
      };

      const result = await planningTool.execute(
        {
          operation: 'create',
          request: userRequest,
        },
        context
      );
      
      expect(result.success).toBe(true);
      expect(mockTaskPlanner.createPlan).toHaveBeenCalled();
    });

    it('should handle simple requests without planning workflow', () => {
      const simpleRequest = 'Explain what async/await does';
      
      const complexity = detectComplexity(simpleRequest);
      expect(complexity.level).toBe('simple');
      expect(shouldSuggestPlanning(simpleRequest)).toBe(false);
      
      const basePrompt = 'You are an AI coding assistant.';
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, simpleRequest);
      
      expect(enhanced).toBe(basePrompt); // No enhancement for simple requests
    });
  });

  describe('Planning Tool Operations', () => {
    let mockTaskPlanner;
    let planningTool;

    beforeEach(() => {
      // Ensure all methods are properly mocked
      mockTaskPlanner = {
        createPlan: jest.fn().mockResolvedValue({
          id: 'plan-default',
          title: 'Default Plan',
          description: 'Default description',
          tasks: [],
          dependencies: new Map(),
          estimatedDuration: 60,
          createdAt: new Date(),
          status: 'pending',
          progress: 0,
          metadata: {},
          riskLevel: 'medium',
        }),
        executePlan: jest.fn().mockResolvedValue(undefined),
        getPlan: jest.fn().mockReturnValue(null),
      };

      planningTool = new PlanningTool(mockTaskPlanner);
    });

    it('should support view operation to check plan status', async () => {
      const mockPlan = {
        id: 'plan-789',
        title: 'Test Plan',
        description: 'Test description',
        tasks: [],
        dependencies: new Map(),
        estimatedDuration: 60,
        createdAt: new Date(),
        status: 'in_progress',
        progress: 50,
        metadata: {},
        riskLevel: 'medium',
      };

      mockTaskPlanner.getPlan.mockReturnValue(mockPlan);

      const context = {
        projectRoot: '/test',
        workingDirectory: '/test',
        environment: {},
        timeout: 30000,
      };

      const result = await planningTool.execute(
        {
          operation: 'view',
          planId: 'plan-789',
        },
        context
      );

      if (!result.success) {
        console.error('View operation failed:', result.error);
      }
      expect(result.success).toBe(true);
      expect(mockTaskPlanner.getPlan).toHaveBeenCalledWith('plan-789');
    });

    it('should support execute operation to run a plan', async () => {
      // Mock plan must exist for execute to work
      const mockPlan = {
        id: 'plan-999',
        title: 'Test Plan',
        description: 'Test description',
        tasks: [],
        dependencies: new Map(),
        estimatedDuration: 60,
        createdAt: new Date(),
        status: 'pending',
        progress: 0,
        metadata: {},
        riskLevel: 'medium',
      };

      mockTaskPlanner.getPlan.mockReturnValue(mockPlan);
      mockTaskPlanner.executePlan.mockResolvedValue(undefined);

      const context = {
        projectRoot: '/test',
        workingDirectory: '/test',
        environment: {},
        timeout: 30000,
      };

      const result = await planningTool.execute(
        {
          operation: 'execute',
          planId: 'plan-999',
        },
        context
      );

      if (!result.success) {
        console.error('Execute operation failed:', result.error);
      }
      expect(result.success).toBe(true);
      expect(mockTaskPlanner.executePlan).toHaveBeenCalledWith('plan-999');
    });
  });
});
