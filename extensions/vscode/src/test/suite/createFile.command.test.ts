/**
 * create-file Command Tests
 * Comprehensive E2E tests for AI-powered file creation command
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
  detectLanguageFromExtension,
  FILE_GENERATION_TEMPLATES,
  createFileGenerationHandler,
  assertCommandSuccess,
  assertFileExists,
  assertFileContains,
  TEST_DATA_CONSTANTS
} from '../helpers/providerTestHelper';

/**
 * Mock create-file command handler
 * Simulates the CLI create-file command behavior
 */
class CreateFileCommand {
  private client: OllamaCodeClient;
  private logger: Logger;

  constructor(client: OllamaCodeClient, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Execute create-file command
   * @param filePath - Path to create the file
   * @param description - AI description of file content to generate
   * @param options - Command options
   */
  async execute(
    filePath: string,
    description: string,
    options: {
      overwrite?: boolean;
      template?: string;
      language?: string;
    } = {}
  ): Promise<{ success: boolean; filePath: string; content?: string; error?: string }> {
    try {
      // Validate file path
      if (!filePath || filePath.trim() === '') {
        throw new Error('File path is required');
      }

      // Check for path traversal attacks (check BEFORE normalization)
      if (filePath.includes('..')) {
        const normalizedPath = path.normalize(filePath);
        const resolvedPath = path.resolve(normalizedPath);
        const workingDir = process.cwd();

        // Ensure resolved path is within working directory
        if (!resolvedPath.startsWith(workingDir)) {
          throw new Error('Path traversal attack detected');
        }
      }

      // Check if file already exists
      if (fs.existsSync(filePath) && !options.overwrite) {
        throw new Error(`File already exists: ${filePath}`);
      }

      // Check client connection
      const status = this.client.getConnectionStatus();
      if (!status.connected) {
        throw new Error('AI client not connected');
      }

      // Generate content using AI
      const fileExtension = path.extname(filePath);
      const language = options.language || this.detectLanguage(fileExtension);

      const aiResponse = await (this.client as any).sendAIRequest?.({
        type: 'generate',
        prompt: `Create ${language} file: ${description}`,
        context: {
          filePath,
          language,
          template: options.template
        }
      });

      const content = aiResponse?.result || this.generateFallbackContent(filePath, description, language);

      // Ensure parent directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, content, 'utf8');

      return {
        success: true,
        filePath,
        content
      };
    } catch (error: any) {
      return {
        success: false,
        filePath,
        error: error.message
      };
    }
  }

  private detectLanguage(extension: string): string {
    return detectLanguageFromExtension(extension);
  }

  private generateFallbackContent(filePath: string, description: string, language: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));

    if (language === 'JavaScript') {
      return FILE_GENERATION_TEMPLATES.javascript.fallback(fileName, description);
    } else if (language === 'TypeScript') {
      return FILE_GENERATION_TEMPLATES.typescript.fallback(fileName, description);
    } else if (language === 'React TSX') {
      const componentName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
      return FILE_GENERATION_TEMPLATES.reactTsx.fallback(componentName, description);
    } else if (language === 'Python') {
      return FILE_GENERATION_TEMPLATES.python.fallback(fileName, description);
    } else {
      return FILE_GENERATION_TEMPLATES.generic.fallback(description);
    }
  }
}

suite('create-file Command Tests', () => {
  let createFileCmd: CreateFileCommand;
  let mockClient: OllamaCodeClient;
  let mockLogger: Logger;
  let testWorkspacePath: string;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);

    // Use centralized file generation handler
    mockClient = createMockOllamaClient(true, createFileGenerationHandler());
    mockLogger = createMockLogger();
    createFileCmd = new CreateFileCommand(mockClient, mockLogger);

    testWorkspacePath = await createTestWorkspace('create-file-tests');
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Basic Creation', () => {
    test('Should create simple JavaScript file with AI content generation', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'example.js');
      const result = await createFileCmd.execute(filePath, 'A simple utility function');

      assertCommandSuccess(result, filePath);
      assertFileExists(filePath);
      assertFileContains(filePath, ['function', 'module.exports']);
    });

    test('Should create TypeScript file with type definitions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'example.ts');
      const result = await createFileCmd.execute(filePath, 'A typed utility function');

      assertCommandSuccess(result, filePath);
      assertFileExists(filePath);
      assertFileContains(filePath, ['export', 'function']);

      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('void') || content.includes(':'), 'Should have type annotations');
    });

    test('Should create React component with props', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'Button.tsx');
      const result = await createFileCmd.execute(filePath, 'A reusable button component');

      assertCommandSuccess(result, filePath);
      assertFileExists(filePath);
      assertFileContains(filePath, ['React', 'Props']);

      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('interface') || content.includes('type'), 'Should have prop types');
      assert.ok(content.includes('FC') || content.includes('FunctionComponent'), 'Should use FC type');
    });

    test('Should create test file with boilerplate', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'example.test.ts');
      const result = await createFileCmd.execute(filePath, 'Unit tests for example module', {
        template: 'test'
      });

      assertCommandSuccess(result, filePath);
      assertFileExists(filePath);

      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('describe') || content.includes('test') || content.includes('it'), 'Should have test structure');
      assert.ok(content.includes('expect') || content.includes('assert'), 'Should have assertions');
    });

    test('Should create with explicit file path and description', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'utils', 'helper.js');
      const description = 'Helper functions for data processing';

      const result = await createFileCmd.execute(filePath, description);

      assertCommandSuccess(result, filePath);
      assertFileExists(filePath);

      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.length > 0, 'File should have content');
    });
  });

  suite('Directory Handling', () => {
    test('Should automatically create parent directory', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'src', 'utils.js');
      const result = await createFileCmd.execute(filePath, 'Utility functions');

      assertCommandSuccess(result, filePath);
      assert.ok(fs.existsSync(path.dirname(filePath)), 'Parent directory should be created');
      assertFileExists(filePath);
    });

    test('Should handle nested directory creation', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'src', 'components', 'ui', 'Button.tsx');
      const result = await createFileCmd.execute(filePath, 'UI Button component');

      assertCommandSuccess(result, filePath);

      const expectedDir = path.join(testWorkspacePath, 'src', 'components', 'ui');
      assert.ok(fs.existsSync(expectedDir), 'Nested directories should be created');
      assertFileExists(filePath);
    });

    test('Should handle creation in non-existent paths with error handling', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'deep', 'nested', 'path', 'file.js');
      const result = await createFileCmd.execute(filePath, 'File in deep path');

      assertCommandSuccess(result, filePath);
      assertFileExists(filePath);

      const dirDepth = filePath.split(path.sep).length - testWorkspacePath.split(path.sep).length;
      assert.ok(dirDepth >= TEST_DATA_CONSTANTS.FILE_OPERATION_CONSTANTS.MIN_DEEP_PATH_DEPTH, 'Should create multiple nested directories');
    });

    test('Should prevent path traversal attacks', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const maliciousPath = path.join(testWorkspacePath, '..', '..', 'etc', 'passwd');
      const result = await createFileCmd.execute(maliciousPath, 'Malicious file');

      assert.strictEqual(result.success, false, 'Command should fail');
      assert.ok(result.error, 'Should return error message');
      assert.ok(result.error!.includes('traversal') || result.error!.includes('invalid'), 'Error should mention security issue');
      assert.ok(!fs.existsSync(maliciousPath), 'Malicious file should not be created');
    });

    test('Should normalize paths correctly', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'src', '.', 'utils', '..', 'helpers.js');
      const result = await createFileCmd.execute(filePath, 'Helper utilities');

      assert.strictEqual(result.success, true, 'Command should succeed with normalized path');

      // Path should be normalized to testWorkspacePath/src/helpers.js
      const expectedPath = path.join(testWorkspacePath, 'src', 'helpers.js');
      assertFileExists(expectedPath);
    });
  });

  suite('Error Handling', () => {
    test('Should handle file already exists error', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'existing.js');

      // Create file first
      await createFileCmd.execute(filePath, 'First file');
      assertFileExists(filePath);

      // Try to create again without overwrite
      const result = await createFileCmd.execute(filePath, 'Second file');

      assert.strictEqual(result.success, false, 'Command should fail');
      assert.ok(result.error, 'Should return error message');
      assert.ok(result.error!.includes('already exists'), 'Error should mention file exists');
    });

    test('Should allow overwrite with explicit flag', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const filePath = path.join(testWorkspacePath, 'overwrite.js');

      // Create file first
      await createFileCmd.execute(filePath, 'Original content');
      const originalContent = fs.readFileSync(filePath, 'utf8');

      // Overwrite with flag
      const result = await createFileCmd.execute(filePath, 'New content', { overwrite: true });

      assertCommandSuccess(result, filePath);
      const newContent = fs.readFileSync(filePath, 'utf8');
      assert.notStrictEqual(newContent, originalContent, 'Content should be different');
    });

    test('Should handle invalid file name error', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Test various invalid file names
      const invalidNames = [
        '',
        '   ',
        path.join(testWorkspacePath, 'file<>.js'),  // Invalid characters on Windows
      ];

      for (const invalidPath of invalidNames) {
        const result = await createFileCmd.execute(invalidPath, 'Test file');
        assert.strictEqual(result.success, false, `Should fail for invalid path: ${invalidPath}`);
        assert.ok(result.error, 'Should return error message');
      }
    });

    test('Should handle AI generation failure with fallback', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create client that fails AI requests
      const failingClient = createMockOllamaClient(true, async () => {
        throw new Error('AI service unavailable');
      });

      const failingCmd = new CreateFileCommand(failingClient, mockLogger);
      const filePath = path.join(testWorkspacePath, 'fallback.js');

      const result = await failingCmd.execute(filePath, 'Test file');

      // Should succeed using fallback content
      assertCommandSuccess(result, filePath);
      assertFileExists(filePath);
      assertFileContains(filePath, 'TODO', 'Fallback content should include TODO');
    });

    test('Should handle client disconnection error', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const disconnectedClient = createMockOllamaClient(false);
      const disconnectedCmd = new CreateFileCommand(disconnectedClient, mockLogger);

      const filePath = path.join(testWorkspacePath, 'test.js');
      const result = await disconnectedCmd.execute(filePath, 'Test file');

      assert.strictEqual(result.success, false, 'Command should fail when client disconnected');
      assert.ok(result.error, 'Should return error message');
      assert.ok(result.error!.includes('not connected'), 'Error should mention connection issue');
      assert.ok(!fs.existsSync(filePath), 'File should not be created');
    });
  });
});
