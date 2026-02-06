/**
 * Unit Tests for Dependency Analysis Tool
 *
 * TDD: Tests define tool metadata, operations (graph, circular, impact),
 * parameter validation, and error handling. Uses fixture project for integration-style tests.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DependencyAnalysisTool } from '../../../src/tools/dependency-analysis-tool.js';
import { createDefaultContext } from '../../../src/tools/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('DependencyAnalysisTool', () => {
  let tool: DependencyAnalysisTool;
  const fixtureRoot = path.resolve(
    __dirname,
    '../../fixtures/projects/small'
  );

  beforeEach(() => {
    tool = new DependencyAnalysisTool();
  });

  describe('metadata', () => {
    it('has name dependency-analysis and category context', () => {
      expect(tool.metadata.name).toBe('dependency-analysis');
      expect(tool.metadata.category).toBe('context');
    });

    it('declares operations: graph, circular, impact', () => {
      const param = tool.metadata.parameters.find((p) => p.name === 'operation');
      expect(param).toBeDefined();
      expect(param?.enum).toContain('graph');
      expect(param?.enum).toContain('circular');
      expect(param?.enum).toContain('impact');
    });
  });

  describe('execute', () => {
    const ctx = createDefaultContext({ projectRoot: fixtureRoot, timeout: 10000 });

    it('graph: returns dependency structure from package.json and optional file imports', async () => {
      const result = await tool.execute({ operation: 'graph' }, ctx);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.graph).toBeDefined();
      // package.json deps
      const graph = result.data.graph;
      expect(graph.dependencies || graph.package || graph).toBeDefined();
    });

    it('circular: returns list of cycles (or empty array)', async () => {
      const result = await tool.execute({ operation: 'circular' }, ctx);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.circular)).toBe(true);
    });

    it('impact: returns affected modules for a given file path', async () => {
      const result = await tool.execute({
        operation: 'impact',
        path: 'index.js',
      }, ctx);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.impact !== undefined).toBe(true);
    });
  });

  describe('parameter validation and errors', () => {
    const ctx = createDefaultContext({ projectRoot: fixtureRoot });

    it('returns error when operation is missing', async () => {
      const result = await tool.execute({}, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/operation|required/i);
    });

    it('returns error for invalid operation', async () => {
      const result = await tool.execute({ operation: 'invalid-op' }, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('impact with invalid path still returns a result or clear error', async () => {
      const result = await tool.execute({
        operation: 'impact',
        path: 'nonexistent/file.js',
      }, ctx);
      expect(result.success === false ? result.error : result.data).toBeDefined();
    });
  });
});
