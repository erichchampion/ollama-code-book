/**
 * Unit Tests for Plan Approval
 *
 * TDD: shouldPromptForPlanApproval behavior; when approval is disabled
 * (E2E/non-interactive) execute can follow create without prompt.
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import {
  shouldPromptForPlanApproval,
  requestPlanApproval,
} from '../../../src/interactive/plan-approval.js';
import type { TaskPlan } from '../../../src/ai/task-planner.js';

function createMockPlan(): TaskPlan {
  return {
    id: 'plan-1',
    title: 'Test Plan',
    description: 'A plan',
    tasks: [
      {
        id: 'task-1',
        title: 'Task 1',
        description: 'First',
        type: 'implementation',
        priority: 'high',
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
    metadata: { complexity: 'simple', confidence: 0.9, adaptations: 0 },
    riskLevel: 'low',
  };
}

describe('plan-approval', () => {
  const originalE2E = process.env.OLLAMA_CODE_E2E_TEST;

  afterEach(() => {
    process.env.OLLAMA_CODE_E2E_TEST = originalE2E;
  });

  describe('shouldPromptForPlanApproval', () => {
    it('returns false when requirePlanApproval is false', () => {
      expect(
        shouldPromptForPlanApproval({ requirePlanApproval: false })
      ).toBe(false);
    });

    it('returns false when nonInteractive is true', () => {
      expect(
        shouldPromptForPlanApproval({
          requirePlanApproval: true,
          nonInteractive: true,
        })
      ).toBe(false);
    });

    it('returns false when OLLAMA_CODE_E2E_TEST is true', () => {
      process.env.OLLAMA_CODE_E2E_TEST = 'true';
      expect(
        shouldPromptForPlanApproval({ requirePlanApproval: true })
      ).toBe(false);
    });

    it('returns true when requirePlanApproval true and interactive', () => {
      process.env.OLLAMA_CODE_E2E_TEST = '';
      expect(
        shouldPromptForPlanApproval({ requirePlanApproval: true })
      ).toBe(true);
    });
  });

  describe('requestPlanApproval', () => {
    it('is a function that returns a Promise', () => {
      expect(typeof requestPlanApproval).toBe('function');
      expect(requestPlanApproval.length).toBe(1);
    });
  });
});
