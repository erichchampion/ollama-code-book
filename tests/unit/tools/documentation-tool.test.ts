/**
 * Unit Tests for Documentation Tool
 *
 * TDD: Metadata (name documentation, operations readme, jsdoc, comments),
 * execute readme/jsdoc/comments with fixtures, validation and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { DocumentationTool } from '../../../src/tools/documentation-tool.js';
import { createDefaultContext } from '../../../src/tools/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('DocumentationTool', () => {
  let tool: DocumentationTool;
  let tempDir: string;
  let ctx: ReturnType<typeof createDefaultContext>;

  beforeEach(async () => {
    tool = new DocumentationTool();
    tempDir = await fs.mkdtemp(path.join(__dirname, '../../fixtures/docs-tmp-'));
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
    it('has name documentation', () => {
      expect(tool.metadata.name).toBe('documentation');
    });

    it('declares operations: readme, jsdoc, comments', () => {
      const param = tool.metadata.parameters.find((p) => p.name === 'operation');
      expect(param?.enum).toContain('readme');
      expect(param?.enum).toContain('jsdoc');
      expect(param?.enum).toContain('comments');
    });
  });

  describe('execute readme', () => {
    it('returns or writes a README snippet for a path', async () => {
      const result = await tool.execute(
        { operation: 'readme', path: '.' },
        ctx
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.path !== undefined || result.data?.content !== undefined || result.data?.summary !== undefined).toBe(true);
    });
  });

  describe('execute jsdoc', () => {
    it('adds JSDoc to a function in a file', async () => {
      const filePath = path.join(tempDir, 'sample.js');
      await fs.writeFile(
        filePath,
        'function add(a, b) { return a + b; }\n',
        'utf-8'
      );

      const result = await tool.execute(
        { operation: 'jsdoc', path: 'sample.js', functionName: 'add' },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toMatch(/\/\*\*|@param|@returns|add/);
    });

    it('returns error when file not found', async () => {
      const result = await tool.execute(
        { operation: 'jsdoc', path: 'nonexistent.js', functionName: 'foo' },
        ctx
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('execute comments', () => {
    it('adds block comments to a file or section', async () => {
      const filePath = path.join(tempDir, 'code.js');
      await fs.writeFile(filePath, 'const x = 1;\n', 'utf-8');

      const result = await tool.execute(
        { operation: 'comments', path: 'code.js', comment: 'Module-level constants.' },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
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
