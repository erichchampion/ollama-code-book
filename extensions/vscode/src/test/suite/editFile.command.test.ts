/**
 * edit-file Command Tests
 * Comprehensive E2E tests for AI-powered file editing command
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { OllamaCodeClient } from '../../client/ollamaCodeClient';
import { Logger } from '../../utils/logger';
import {
  createTestWorkspace,
  cleanupTestWorkspace
} from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import {
  createMockOllamaClient,
  createMockLogger,
  createEditHandler,
  assertCommandSuccess,
  assertFileExists,
  assertFileContains,
  assertFileDoesNotContain,
  TEST_DATA_CONSTANTS
} from '../helpers/providerTestHelper';

/**
 * Mock edit-file command handler
 * Simulates the CLI edit-file command behavior
 */
class EditFileCommand {
  private client: OllamaCodeClient;
  private logger: Logger;

  constructor(client: OllamaCodeClient, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Execute edit-file command
   * @param filePath - Path to the file to edit
   * @param instruction - Natural language instruction for the edit
   * @param options - Command options
   */
  async execute(
    filePath: string,
    instruction: string,
    options: {
      preview?: boolean;
    } = {}
  ): Promise<{ success: boolean; filePath: string; content?: string; preview?: string; error?: string }> {
    try {
      // Validate file path
      if (!filePath || filePath.trim() === '') {
        throw new Error('File path is required');
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      // Check if file is readable
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch {
        throw new Error(`File is not readable: ${filePath}`);
      }

      // Check if file is writable (unless preview mode)
      if (!options.preview) {
        try {
          fs.accessSync(filePath, fs.constants.W_OK);
        } catch {
          throw new Error(`File is read-only: ${filePath}`);
        }
      }

      // Read current content
      const originalContent = fs.readFileSync(filePath, 'utf8');

      // Check client connection
      const status = this.client.getConnectionStatus();
      if (!status.connected) {
        throw new Error('AI client not connected');
      }

      // Generate edited content using AI
      const aiResponse = await (this.client as any).sendAIRequest?.({
        type: 'edit',
        prompt: instruction,
        context: {
          filePath,
          originalContent
        }
      });

      const editedContent = aiResponse?.result || originalContent;

      // Preview mode - generate diff
      if (options.preview) {
        const diff = this.generateUnifiedDiff(originalContent, editedContent, filePath);
        return {
          success: true,
          filePath,
          preview: diff
        };
      }

      // Write edited content
      fs.writeFileSync(filePath, editedContent, 'utf8');

      return {
        success: true,
        filePath,
        content: editedContent
      };
    } catch (error: any) {
      return {
        success: false,
        filePath,
        error: error.message
      };
    }
  }

  /**
   * Generate unified diff format
   */
  private generateUnifiedDiff(original: string, edited: string, filePath: string): string {
    const originalLines = original.split('\n');
    const editedLines = edited.split('\n');

    let diff = `--- ${filePath}\n+++ ${filePath}\n`;

    // Simple line-by-line diff (in real implementation, use diff library)
    let lineNum = 1;
    for (let i = 0; i < Math.max(originalLines.length, editedLines.length); i++) {
      const origLine = originalLines[i];
      const editLine = editedLines[i];

      if (origLine !== editLine) {
        diff += `@@ -${lineNum},1 +${lineNum},1 @@\n`;
        if (origLine !== undefined) {
          diff += `-${origLine}\n`;
        }
        if (editLine !== undefined) {
          diff += `+${editLine}\n`;
        }
      }
      lineNum++;
    }

    return diff;
  }
}

suite('edit-file Command Tests', () => {
  let editFileCmd: EditFileCommand;
  let mockClient: OllamaCodeClient;
  let mockLogger: Logger;
  let testWorkspacePath: string;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);

    // Use centralized edit handler
    mockClient = createMockOllamaClient(true, createEditHandler());
    mockLogger = createMockLogger();
    editFileCmd = new EditFileCommand(mockClient, mockLogger);

    testWorkspacePath = await createTestWorkspace('edit-file-tests');
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Content Modification', () => {
    test('Should edit file with simple natural language instruction', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'example.js');
      fs.writeFileSync(filePath, 'const x = 1;\n', 'utf8');

      const result = await editFileCmd.execute(filePath, 'Add comment at top');

      assertCommandSuccess(result, filePath);
      assertFileExists(filePath);
      assertFileContains(filePath, '// Edited by AI');
      assertFileContains(filePath, 'const x = 1;');
    });

    test('Should add function to existing file', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'math.js');
      fs.writeFileSync(filePath, 'const PI = 3.14159;\n', 'utf8');

      const result = await editFileCmd.execute(filePath, 'Add function calculateSum');

      assertCommandSuccess(result, filePath);
      assertFileContains(filePath, ['calculateSum', 'function', 'return a + b']);
      assertFileContains(filePath, 'const PI = 3.14159;', 'Should preserve original content');
    });

    test('Should add JSDoc comments to functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'utils.js');
      const originalContent = 'function helper(x) {\n  return x * 2;\n}\n';
      fs.writeFileSync(filePath, originalContent, 'utf8');

      const result = await editFileCmd.execute(filePath, 'Add JSDoc comments');

      assertCommandSuccess(result, filePath);
      assertFileContains(filePath, '/**');
      assertFileContains(filePath, 'Description for helper');
      assertFileContains(filePath, 'return x * 2;', 'Should preserve function logic');
    });

    test('Should convert JavaScript to TypeScript', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'convert.js');
      fs.writeFileSync(filePath, 'function greet(name) {\n  return "Hello " + name;\n}\nmodule.exports = { greet };\n', 'utf8');

      const result = await editFileCmd.execute(filePath, 'Convert to TypeScript');

      assertCommandSuccess(result, filePath);
      assertFileContains(filePath, ': void', 'Should add type annotations');
      assertFileContains(filePath, 'export', 'Should convert to ES6 exports');
      assertFileDoesNotContain(filePath, 'module.exports', 'Should remove CommonJS exports');
    });

    test('Should refactor function with new logic', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'refactor.js');
      fs.writeFileSync(filePath, 'function debug() {\n  console.log("Debug");\n}\n', 'utf8');

      const result = await editFileCmd.execute(filePath, 'Refactor to use logger');

      assertCommandSuccess(result, filePath);
      assertFileContains(filePath, 'logger.info', 'Should replace console.log with logger');
      assertFileDoesNotContain(filePath, 'console.log', 'Should remove console.log');
    });

    test('Should preserve existing formatting and style', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'formatted.js');
      const originalContent = 'const x = 1;\nconst y = 2;\n\nfunction test() {\n  return x + y;\n}\n';
      fs.writeFileSync(filePath, originalContent, 'utf8');

      const result = await editFileCmd.execute(filePath, 'Add comment at top');

      assertCommandSuccess(result, filePath);

      const editedContent = fs.readFileSync(filePath, 'utf8');
      // Check that function structure is preserved
      assert.ok(editedContent.includes('function test()'), 'Should preserve function declaration');
      assert.ok(editedContent.includes('return x + y;'), 'Should preserve function body');
    });
  });

  suite('Preview Mode', () => {
    test('Should show changes with --preview flag without applying', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'preview.js');
      const originalContent = 'const x = 1;\n';
      fs.writeFileSync(filePath, originalContent, 'utf8');

      const result = await editFileCmd.execute(filePath, 'Add comment', { preview: true });

      assert.strictEqual(result.success, true, 'Command should succeed');
      assert.ok(result.preview, 'Should return preview diff');
      assert.ok(result.preview!.includes('---'), 'Should include unified diff header');

      // Verify file was NOT modified
      const fileContent = fs.readFileSync(filePath, 'utf8');
      assert.strictEqual(fileContent, originalContent, 'File should not be modified in preview mode');
    });

    test('Should generate unified diff format output', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'diff.js');
      fs.writeFileSync(filePath, 'const x = 1;\n', 'utf8');

      const result = await editFileCmd.execute(filePath, 'Add comment', { preview: true });

      assert.strictEqual(result.success, true);
      assert.ok(result.preview, 'Should return diff');
      assertFileContains(filePath, 'const x = 1;', 'Original file should be unchanged');
    });

    test('Should handle preview with large files (>1000 lines)', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'large.js');
      // Generate large file content
      let largeContent = '';
      for (let i = 0; i < TEST_DATA_CONSTANTS.FILE_OPERATION_CONSTANTS.LARGE_FILE_LINE_COUNT; i++) {
        largeContent += `const var${i} = ${i};\n`;
      }
      fs.writeFileSync(filePath, largeContent, 'utf8');

      const result = await editFileCmd.execute(filePath, 'Add comment', { preview: true });

      assert.strictEqual(result.success, true, 'Should handle large files');
      assert.ok(result.preview, 'Should generate preview for large file');

      // Verify file unchanged
      const currentContent = fs.readFileSync(filePath, 'utf8');
      assert.strictEqual(currentContent.split('\n').length, largeContent.split('\n').length, 'File should not be modified');
    });

    test('Should support preview cancellation (no changes applied)', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'cancel.js');
      const originalContent = 'function test() { return true; }\n';
      fs.writeFileSync(filePath, originalContent, 'utf8');

      // Generate preview
      const previewResult = await editFileCmd.execute(filePath, 'Refactor function', { preview: true });
      assert.strictEqual(previewResult.success, true);

      // Verify no changes were applied
      const fileContent = fs.readFileSync(filePath, 'utf8');
      assert.strictEqual(fileContent, originalContent, 'Preview should not modify file');
    });
  });

  suite('Edge Cases', () => {
    test('Should handle edit non-existent file error', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'nonexistent.js');

      const result = await editFileCmd.execute(filePath, 'Add function');

      assert.strictEqual(result.success, false, 'Command should fail');
      assert.ok(result.error, 'Should return error message');
      assert.ok(result.error!.includes('does not exist'), 'Error should mention file does not exist');
    });

    test('Should handle edit read-only file error', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'readonly.js');
      fs.writeFileSync(filePath, 'const x = 1;\n', 'utf8');

      // Make file read-only
      fs.chmodSync(filePath, TEST_DATA_CONSTANTS.FILE_OPERATION_CONSTANTS.PERMISSIONS.READ_ONLY);

      const result = await editFileCmd.execute(filePath, 'Add function');

      assert.strictEqual(result.success, false, 'Command should fail for read-only file');
      assert.ok(result.error, 'Should return error message');
      assert.ok(result.error!.includes('read-only'), 'Error should mention read-only');

      // Restore permissions for cleanup
      fs.chmodSync(filePath, TEST_DATA_CONSTANTS.FILE_OPERATION_CONSTANTS.PERMISSIONS.READ_WRITE);
    });

    test('Should handle client disconnection error', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const disconnectedClient = createMockOllamaClient(false);
      const disconnectedCmd = new EditFileCommand(disconnectedClient, mockLogger);

      const filePath = path.join(testWorkspacePath, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;\n', 'utf8');

      const result = await disconnectedCmd.execute(filePath, 'Add function');

      assert.strictEqual(result.success, false, 'Command should fail when client disconnected');
      assert.ok(result.error, 'Should return error message');
      assert.ok(result.error!.includes('not connected'), 'Error should mention connection issue');
    });
  });
});
