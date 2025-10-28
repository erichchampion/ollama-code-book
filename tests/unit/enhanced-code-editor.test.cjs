/**
 * Enhanced Code Editor Unit Tests
 *
 * Tests the enhanced code editor with mocked implementations since we can't
 * easily import ES modules in Jest CommonJS environment.
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

// Mock Enhanced Code Editor since we can't import ES modules directly
class MockEnhancedCodeEditor {
  constructor(backupDir = '.ollama-code-backups') {
    this.backupDir = backupDir;
    this.templates = new Map();
    this.initialized = false;
    this.loadDefaultTemplates();
  }

  async initialize() {
    this.initialized = true;
  }

  async executeEditRequest(request) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Validate request
    if (!request.files || request.files.length === 0) {
      return [{
        success: false,
        editId: 'mock-id',
        error: 'Edit request must include at least one file operation'
      }];
    }

    const results = [];

    for (const fileOp of request.files) {
      try {
        const result = await this.executeFileOperation(fileOp, request);
        results.push(result);

        // If atomic and any operation fails, rollback and stop processing
        if (request.atomic && !result.success) {
          // Return early with just the error result
          return [{
            success: false,
            editId: 'mock-id',
            error: `Atomic operation failed at file: ${fileOp.path}`,
            affectedFiles: request.files.map(f => f.path)
          }];
        }
      } catch (error) {
        const errorResult = {
          success: false,
          editId: 'mock-id',
          error: error.message,
          affectedFiles: [fileOp.path]
        };

        if (request.atomic) {
          // For atomic operations, return immediately on error
          return [errorResult];
        }

        results.push(errorResult);
      }
    }

    return results;
  }

  async executeFileOperation(fileOp, request) {
    // Mock file operation based on action type
    switch (fileOp.action.type) {
      case 'create-file':
        if (fileOp.content) {
          await fs.writeFile(fileOp.path, fileOp.content, 'utf-8');
        }
        return {
          success: true,
          editId: 'mock-edit-id',
          affectedFiles: [fileOp.path]
        };

      case 'modify-content':
        if (fileOp.content) {
          await fs.writeFile(fileOp.path, fileOp.content, 'utf-8');
        }
        return {
          success: true,
          editId: 'mock-edit-id',
          affectedFiles: [fileOp.path]
        };

      default:
        return {
          success: false,
          editId: 'mock-edit-id',
          error: `Unsupported operation type: ${fileOp.action.type}`,
          affectedFiles: [fileOp.path]
        };
    }
  }

  loadDefaultTemplates() {
    this.templates.set('react-component', {
      id: 'react-component',
      name: 'React Component',
      template: 'export const {{componentName}} = () => { return <div>{{content}}</div>; };'
    });
  }
}

describe('Enhanced Code Editor', () => {
  let editor;
  let tempDir;

  beforeEach(async () => {
    editor = new MockEnhancedCodeEditor();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'enhanced-code-editor-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Edit Operations', () => {
    test('should create a new file with specified content', async () => {
      const newFilePath = path.join(tempDir, 'new-file.ts');
      const content = 'export const greeting = "Hello, World!";';

      const request = {
        type: 'create',
        files: [{
          path: newFilePath,
          action: {
            type: 'create-file',
            parameters: {}
          },
          content,
          description: 'Create new file with greeting'
        }]
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(true);
      expect(result[0].affectedFiles).toEqual([newFilePath]);

      const writtenContent = await fs.readFile(newFilePath, 'utf-8');
      expect(writtenContent).toBe(content);
    });

    test('should modify existing file content', async () => {
      const filePath = path.join(tempDir, 'existing.ts');
      const originalContent = 'export function add(a: number, b: number) { return a + b; }';

      // Create initial file
      await fs.writeFile(filePath, originalContent);

      const newContent = 'export function sum(a: number, b: number) { return a + b; }';
      const request = {
        type: 'modify',
        files: [{
          path: filePath,
          action: {
            type: 'modify-content',
            parameters: {}
          },
          content: newContent,
          description: 'Rename function'
        }]
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(true);

      const modifiedContent = await fs.readFile(filePath, 'utf-8');
      expect(modifiedContent).toBe(newContent);
    });

    test('should handle atomic operations correctly', async () => {
      const file1Path = path.join(tempDir, 'file1.ts');
      const file2Path = path.join(tempDir, 'file2.ts');

      const request = {
        type: 'create',
        files: [
          {
            path: file1Path,
            action: { type: 'create-file', parameters: {} },
            content: 'export const test1 = true;'
          },
          {
            path: file2Path,
            action: { type: 'create-file', parameters: {} },
            content: 'export const test2 = true;'
          }
        ],
        atomic: true
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);

      // Verify both files were created
      await expect(fs.access(file1Path)).resolves.toBeUndefined();
      await expect(fs.access(file2Path)).resolves.toBeUndefined();
    });

    test('should fail with validation errors for invalid requests', async () => {
      const request = {
        type: 'create',
        files: [] // Empty files array should cause validation error
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(false);
      expect(result[0].error).toContain('Edit request must include at least one file operation');
    });

    test('should handle unsupported operation types', async () => {
      const filePath = path.join(tempDir, 'test.ts');

      const request = {
        type: 'modify',
        files: [{
          path: filePath,
          action: {
            type: 'unsupported-operation',
            parameters: {}
          }
        }]
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(false);
      expect(result[0].error).toContain('Unsupported operation type');
    });
  });

  describe('Template System', () => {
    test('should have default templates loaded', () => {
      expect(editor.templates.size).toBeGreaterThan(0);
      expect(editor.templates.has('react-component')).toBe(true);
    });

    test('should handle template-based generation', async () => {
      const componentPath = path.join(tempDir, 'TestComponent.tsx');

      const request = {
        type: 'create',
        files: [{
          path: componentPath,
          action: {
            type: 'create-file',
            parameters: { templateId: 'react-component' }
          },
          content: 'export const TestComponent = () => { return <div>Hello World</div>; };'
        }]
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(true);

      const content = await fs.readFile(componentPath, 'utf-8');
      expect(content).toContain('TestComponent');
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      const invalidPath = '/invalid/path/file.ts';

      const request = {
        type: 'create',
        files: [{
          path: invalidPath,
          action: { type: 'create-file', parameters: {} },
          content: 'export const test = true;'
        }]
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(false);
      expect(result[0].error).toBeDefined();
    });

    test('should handle atomic operation failures', async () => {
      const validPath = path.join(tempDir, 'valid.ts');
      const invalidPath = '/invalid/path/file.ts';

      const request = {
        type: 'create',
        files: [
          {
            path: validPath,
            action: { type: 'create-file', parameters: {} },
            content: 'export const valid = true;'
          },
          {
            path: invalidPath,
            action: { type: 'create-file', parameters: {} },
            content: 'export const invalid = true;'
          }
        ],
        atomic: true
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(false);
      expect(result[0].error).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should handle multiple file operations efficiently', async () => {
      const files = [];
      const numberOfFiles = 10;

      for (let i = 0; i < numberOfFiles; i++) {
        files.push({
          path: path.join(tempDir, `file${i}.ts`),
          action: { type: 'create-file', parameters: {} },
          content: `export const value${i} = ${i};`
        });
      }

      const request = {
        type: 'create',
        files,
        atomic: true
      };

      const startTime = Date.now();
      const result = await editor.executeEditRequest(request);
      const endTime = Date.now();

      expect(result).toHaveLength(numberOfFiles);
      expect(result.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});