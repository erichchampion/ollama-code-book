/**
 * Unit Tests for Project Context Tool
 *
 * TDD Phase: RED - Tests written before implementation
 * These tests define the expected behavior of the ProjectContextTool.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProjectContextTool } from '../../../src/tools/project-context-tool.js';
import { ProjectContext } from '../../../src/ai/context.js';
import { ToolExecutionContext } from '../../../src/tools/types.js';

describe('ProjectContextTool', () => {
  let mockProjectContext: jest.Mocked<ProjectContext>;
  let mockContext: ToolExecutionContext;
  let contextTool: ProjectContextTool;

  beforeEach(() => {
    // Create mock ProjectContext with actual API
    mockProjectContext = {
      root: '/test/project',
      getProjectSummary: jest.fn(() => ({
        fileCount: 3,
        languages: ['TypeScript', 'JavaScript'],
        structure: 'Monorepo structure',
        entryPoints: ['src/index.ts'],
        recentActivity: ['src/index.ts'],
      })),
      structure: {
        files: new Map([
          ['src/index.ts', { path: 'src/index.ts', language: 'typescript', size: 1000 }],
          ['src/utils.ts', { path: 'src/utils.ts', language: 'typescript', size: 500 }],
          ['package.json', { path: 'package.json', language: 'json', size: 200 }],
        ]),
        directories: ['src'],
        configFiles: ['package.json'],
        testFiles: [],
        entryPoints: ['src/index.ts'],
        documentationFiles: [],
        dependencies: new Map(),
      },
      initialize: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Create mock execution context
    mockContext = {
      projectRoot: '/test/project',
      workingDirectory: '/test/project',
      environment: {},
      timeout: 30000,
    };

    // Create ProjectContextTool instance
    contextTool = new ProjectContextTool(mockProjectContext);
  });

  describe('operation: analyze', () => {
    it('should analyze project structure', async () => {
      const result = await contextTool.execute(
        {
          operation: 'analyze',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.structure).toBeDefined();
      expect(result.data.entryPoints).toBeDefined();
      expect(mockProjectContext.getProjectSummary).toHaveBeenCalled();
    });
  });

  describe('operation: dependencies', () => {
    it('should detect dependencies', async () => {
      // Note: This test will work if package.json exists in test context
      // Otherwise it will return empty dependencies, which is also valid
      const result = await contextTool.execute(
        {
          operation: 'dependencies',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.dependencies).toBeDefined();
      expect(result.data.devDependencies).toBeDefined();
      expect(typeof result.data.dependencies).toBe('object');
      expect(typeof result.data.devDependencies).toBe('object');
    });
  });

  describe('operation: frameworks', () => {
    it('should identify frameworks', async () => {
      const result = await contextTool.execute(
        {
          operation: 'frameworks',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.frameworks).toBeDefined();
      expect(Array.isArray(result.data.frameworks)).toBe(true);
    });
  });

  describe('operation: statistics', () => {
    it('should gather codebase statistics', async () => {
      const result = await contextTool.execute(
        {
          operation: 'statistics',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.totalFiles).toBeDefined();
      expect(result.data.totalLines).toBeDefined();
      expect(result.data.languages).toBeDefined();
      expect(mockProjectContext.getProjectSummary).toHaveBeenCalled();
    });
  });

  describe('operation: export', () => {
    it('should export context for planning', async () => {
      const result = await contextTool.execute(
        {
          operation: 'export',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.projectRoot).toBe('/test/project');
      expect(result.data.projectLanguages).toBeDefined();
      expect(result.data.frameworks).toBeDefined();
      expect(result.data.dependencies).toBeDefined();
      expect(result.data.statistics).toBeDefined();
    });
  });

  describe('parameter validation', () => {
    it('should validate required operation parameter', async () => {
      const result = await contextTool.execute({} as any, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('operation');
    });

    it('should validate operation enum', async () => {
      const result = await contextTool.execute(
        {
          operation: 'invalid-operation',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid operation|operation/);
    });
  });

  describe('error handling', () => {
    it('should handle missing package.json gracefully', async () => {
      // Use a context with a non-existent directory
      const nonExistentContext: ToolExecutionContext = {
        projectRoot: '/nonexistent/project',
        workingDirectory: '/nonexistent/project',
        environment: {},
        timeout: 30000,
      };

      const result = await contextTool.execute(
        {
          operation: 'dependencies',
        },
        nonExistentContext
      );

      // Should still succeed but with empty dependencies
      expect(result.success).toBe(true);
      expect(result.data.dependencies).toBeDefined();
      expect(result.data.devDependencies).toBeDefined();
    });
  });
});
