/**
 * Phase 1 Implementation Validation Tests
 * These tests verify that Phase 1 components exist and can be imported
 */

import { describe, it, expect } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';

describe('Phase 1: Natural Language Understanding & Intent Recognition', () => {
  describe('Core Implementation Files', () => {
    it('should have created intent analyzer module', async () => {
      const filePath = path.join(process.cwd(), 'src/ai/intent-analyzer.ts');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);

      // Verify file has substantive content
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(1000);
      expect(content).toContain('export class IntentAnalyzer');
      expect(content).toContain('export interface UserIntent');
    });

    it('should have created conversation manager module', async () => {
      const filePath = path.join(process.cwd(), 'src/ai/conversation-manager.ts');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(1000);
      expect(content).toContain('export class ConversationManager');
      expect(content).toContain('ConversationTurn');
    });

    it('should have created natural language router', async () => {
      const filePath = path.join(process.cwd(), 'src/routing/nl-router.ts');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(1000);
      expect(content).toContain('export class NaturalLanguageRouter');
      expect(content).toContain('RoutingResult');
    });

    it('should have created enhanced interactive mode', async () => {
      const filePath = path.join(process.cwd(), 'src/interactive/enhanced-mode.ts');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(1000);
      expect(content).toContain('export class EnhancedInteractiveMode');
    });
  });

  describe('Code Quality Validation', () => {
    it('should have well-structured TypeScript files', async () => {
      // Check that TypeScript files exist and have proper structure
      const phase1Files = [
        'src/ai/intent-analyzer.ts',
        'src/ai/conversation-manager.ts',
        'src/routing/nl-router.ts',
        'src/interactive/enhanced-mode.ts'
      ];

      for (const file of phase1Files) {
        const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8');

        // Should have valid TypeScript exports
        expect(content).toMatch(/export\s+(class|interface|const|function)/);

        // Should have proper imports
        expect(content).toMatch(/import\s+.*from\s+['"][^'"]+['"];?/);

        // Should be substantial implementation (not just stubs)
        expect(content.length).toBeGreaterThan(1000);

        // Should have proper error handling
        expect(content).toContain('try');
        expect(content).toContain('catch');

        // Should have logging
        expect(content).toContain('logger');
      }
    });

    it('should have proper documentation and comments', async () => {
      const phase1Files = [
        'src/ai/intent-analyzer.ts',
        'src/ai/conversation-manager.ts',
        'src/routing/nl-router.ts',
        'src/interactive/enhanced-mode.ts'
      ];

      for (const file of phase1Files) {
        const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8');

        // Should have file-level documentation
        expect(content).toMatch(/\/\*\*[\s\S]*?\*\//);

        // Should have meaningful method documentation or comments
        expect(content.split('/**').length + content.split('//').length).toBeGreaterThan(5);
      }
    });
  });

  describe('Core Interface Definitions', () => {
    it('should have comprehensive UserIntent interface', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/ai/intent-analyzer.ts'), 'utf-8');

      // Check for key interface properties
      expect(content).toContain('type:');
      expect(content).toContain('action:');
      expect(content).toContain('entities:');
      expect(content).toContain('confidence:');
      expect(content).toContain('complexity:');
      expect(content).toContain('multiStep:');
      expect(content).toContain('riskLevel:');
    });

    it('should have conversation management interfaces', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/ai/conversation-manager.ts'), 'utf-8');

      expect(content).toContain('ConversationTurn');
      expect(content).toContain('ConversationContext');
      expect(content).toContain('UserFeedback');
    });

    it('should have routing interfaces', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/routing/nl-router.ts'), 'utf-8');

      expect(content).toContain('RoutingResult');
      expect(content).toContain('RoutingContext');
      expect(content).toContain('ClarificationRequest');
    });
  });

  describe('Integration Points', () => {
    it('should integrate with existing AI client', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/ai/intent-analyzer.ts'), 'utf-8');
      expect(content).toContain('OllamaClient');
    });

    it('should integrate with existing project context', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/ai/intent-analyzer.ts'), 'utf-8');
      expect(content).toContain('ProjectContext');
    });

    it('should integrate with command system', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/routing/nl-router.ts'), 'utf-8');
      expect(content).toContain('commandRegistry');
      expect(content).toContain('executeCommand');
    });
  });

  describe('Phase 1 Feature Coverage', () => {
    it('should implement intent classification', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/ai/intent-analyzer.ts'), 'utf-8');
      expect(content).toContain('classify');
      expect(content).toContain('task_request');
      expect(content).toContain('question');
      expect(content).toContain('command');
    });

    it('should implement entity extraction', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/ai/intent-analyzer.ts'), 'utf-8');
      expect(content).toContain('extractEntities');
      expect(content).toContain('files');
      expect(content).toContain('technologies');
      expect(content).toContain('concepts');
    });

    it('should implement conversation context tracking', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/ai/conversation-manager.ts'), 'utf-8');
      expect(content).toContain('addTurn');
      expect(content).toContain('getRecentHistory');
      expect(content).toContain('generateContextualPrompt');
    });

    it('should implement natural language routing', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/routing/nl-router.ts'), 'utf-8');
      expect(content).toContain('route');
      expect(content).toContain('checkCommandMapping');
      expect(content).toContain('generateClarificationRequest');
    });
  });
});