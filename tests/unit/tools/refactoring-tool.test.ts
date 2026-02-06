/**
 * Unit Tests for Refactoring Tool
 *
 * TDD: Metadata (name refactoring, operations rename, extract, inline),
 * execute rename with file path and old/new name, parameter validation, errors.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { RefactoringTool } from '../../../src/tools/refactoring-tool.js';
import { createDefaultContext } from '../../../src/tools/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('RefactoringTool', () => {
  let tool: RefactoringTool;
  let tempDir: string;
  let ctx: ReturnType<typeof createDefaultContext>;

  beforeEach(async () => {
    tool = new RefactoringTool();
    tempDir = await fs.mkdtemp(path.join(__dirname, '../../fixtures/refactor-tmp-'));
    ctx = createDefaultContext({ projectRoot: tempDir, timeout: 10000 });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('metadata', () => {
    it('has name refactoring', () => {
      expect(tool.metadata.name).toBe('refactoring');
    });

    it('declares operations: rename, extract, inline', () => {
      const param = tool.metadata.parameters.find((p) => p.name === 'operation');
      expect(param?.enum).toContain('rename');
      expect(param?.enum).toContain('extract');
      expect(param?.enum).toContain('inline');
    });
  });

  describe('execute rename', () => {
    it('renames symbol in file and returns success and summary', async () => {
      const filePath = path.join(tempDir, 'sample.js');
      await fs.writeFile(
        filePath,
        'function oldName() { return 1; }\nconst x = oldName();\n',
        'utf-8'
      );

      const result = await tool.execute(
        {
          operation: 'rename',
          path: 'sample.js',
          oldName: 'oldName',
          newName: 'newName',
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.replacements !== undefined || result.data?.summary !== undefined).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('newName');
      expect(content).not.toContain('oldName');
    });

    it('returns error when file is missing', async () => {
      const result = await tool.execute(
        {
          operation: 'rename',
          path: 'nonexistent.js',
          oldName: 'foo',
          newName: 'bar',
        },
        ctx
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error when old name not found in file', async () => {
      const filePath = path.join(tempDir, 'sample.js');
      await fs.writeFile(filePath, 'function onlyFunc() {}', 'utf-8');

      const result = await tool.execute(
        {
          operation: 'rename',
          path: 'sample.js',
          oldName: 'neverExists',
          newName: 'other',
        },
        ctx
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('parameter validation', () => {
    it('returns error when operation is missing', async () => {
      const result = await tool.execute({}, ctx);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/operation|required/i);
    });

    it('returns error for invalid operation', async () => {
      const result = await tool.execute({ operation: 'invalid' }, ctx);
      expect(result.success).toBe(false);
    });
  });
});
