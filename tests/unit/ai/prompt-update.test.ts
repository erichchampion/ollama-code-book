/**
 * Unit Tests for Prompt Update Integration
 *
 * TDD Phase: RED - Tests written before implementation
 * These tests define the expected behavior of prompt updates to suggest planning.
 */

import { describe, it, expect } from '@jest/globals';
import { enhanceSystemPromptWithPlanning } from '../../../src/ai/prompts.js';
import { shouldSuggestPlanning, detectComplexity } from '../../../src/tools/complexity-detection.js';

describe('Prompt Update Integration', () => {
  describe('enhanceSystemPromptWithPlanning', () => {
    it('should add planning suggestion for complex requests', () => {
      const userRequest = 'Build a full-stack application with authentication, database, and API endpoints';
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      
      expect(enhanced).toContain('planning');
      expect(enhanced).toContain('planning tool');
      expect(shouldSuggestPlanning(userRequest)).toBe(true);
    });

    it('should not add planning suggestion for simple requests', () => {
      const userRequest = 'What is JavaScript?';
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      
      // Should not contain planning suggestions for simple requests
      expect(enhanced).not.toContain('planning tool');
      expect(shouldSuggestPlanning(userRequest)).toBe(false);
    });

    it('should include complexity level in enhanced prompt', () => {
      const userRequest = 'Create a microservices architecture';
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      const complexity = detectComplexity(userRequest);
      
      expect(enhanced).toContain(complexity.level);
    });

    it('should preserve original prompt content', () => {
      const userRequest = 'Build a REST API';
      const basePrompt = 'You are an AI coding assistant with access to tools.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      
      expect(enhanced).toContain('You are an AI coding assistant');
      expect(enhanced).toContain('access to tools');
    });

    it('should suggest planning tool usage instructions', () => {
      const userRequest = 'Refactor the entire authentication module';
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      
      expect(enhanced).toMatch(/planning.*tool/i);
      expect(enhanced).toMatch(/create.*plan/i);
    });

    it('should handle empty or undefined requests gracefully', () => {
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced1 = enhanceSystemPromptWithPlanning(basePrompt, '');
      const enhanced2 = enhanceSystemPromptWithPlanning(basePrompt, undefined as any);
      
      expect(enhanced1).toBe(basePrompt);
      expect(enhanced2).toBe(basePrompt);
    });

    it('should include planning tool operations in suggestion', () => {
      const userRequest = 'Design a scalable backend architecture';
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      
      // Should mention planning tool operations like create, view, execute
      expect(enhanced).toMatch(/create.*plan|view.*plan|execute.*plan/i);
    });

    it('should suggest planning for multi-file requests', () => {
      const userRequest = 'Create user.js, auth.js, and middleware.js';
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      
      expect(enhanced).toContain('planning');
      expect(shouldSuggestPlanning(userRequest)).toBe(true);
    });

    it('should suggest planning for architecture requests', () => {
      const userRequest = 'Design a microservices architecture';
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      
      expect(enhanced).toContain('planning');
      expect(shouldSuggestPlanning(userRequest)).toBe(true);
    });

    it('should suggest planning for multi-phase workflows', () => {
      const userRequest = 'Set up project, implement features, add tests, and deploy';
      const basePrompt = 'You are an AI coding assistant.';
      
      const enhanced = enhanceSystemPromptWithPlanning(basePrompt, userRequest);
      
      expect(enhanced).toContain('planning');
      expect(shouldSuggestPlanning(userRequest)).toBe(true);
    });
  });
});
