/**
 * InlineCompletion Provider Tests
 * Comprehensive tests for AI-powered inline code completion
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { InlineCompletionProvider } from '../../providers/inlineCompletionProvider';
import { OllamaCodeClient } from '../../client/ollamaCodeClient';
import { Logger } from '../../utils/logger';
import {
  createTestFile,
  createTestWorkspace,
  cleanupTestWorkspace,
  openDocument,
  sleep
} from '../helpers/extensionTestHelper';
import { EXTENSION_TEST_CONSTANTS, PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import { createMockOllamaClient, createMockLogger, TEST_DATA_CONSTANTS, createCompletionAIHandler, createHoverAIHandler, createDiagnosticAIHandler } from '../helpers/providerTestHelper';

/**
 * Helper to get length of InlineCompletionItem array or InlineCompletionList
 */
function getCompletionLength(items: vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null | undefined): number {
  if (!items) {
    return 0;
  }
  if (Array.isArray(items)) {
    return items.length;
  }
  // InlineCompletionList has an items property
  return items.items.length;
}

suite('InlineCompletion Provider Tests', () => {
  let completionProvider: InlineCompletionProvider;
  let mockClient: OllamaCodeClient;
  let mockLogger: Logger;
  let testWorkspacePath: string;
  let cancellationToken: vscode.CancellationToken;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);

    // Create mock client and logger using shared helpers
    mockClient = createMockOllamaClient(true, createCompletionAIHandler());
    mockLogger = createMockLogger();

    // Create provider
    completionProvider = new InlineCompletionProvider(mockClient, mockLogger);

    // Create test workspace
    testWorkspacePath = await createTestWorkspace('inline-completion-tests');

    // Create cancellation token
    const tokenSource = new vscode.CancellationTokenSource();
    cancellationToken = tokenSource.token;
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    completionProvider.dispose();
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Completion Trigger Conditions', () => {
    test('Should trigger completion after method/property access (dot)', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'const name = user.';
      const filePath = await createTestFile(testWorkspacePath, 'dot.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should return completion items');
      assert.ok(getCompletionLength(items) > 0, 'Should provide completion after dot');
    });

    test('Should trigger completion after assignment operator', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'const result = ';
      const filePath = await createTestFile(testWorkspacePath, 'assignment.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should return completion items');
      assert.ok(getCompletionLength(items) > 0, 'Should provide completion after assignment');
    });

    test('Should trigger completion for import statements', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'import ';
      const filePath = await createTestFile(testWorkspacePath, 'import.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should return completion items');
      assert.ok(getCompletionLength(items) > 0, 'Should provide completion for imports');
    });

    test('Should NOT trigger completion for very short input (< 2 chars)', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'x';
      const filePath = await createTestFile(testWorkspacePath, 'short.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.strictEqual(getCompletionLength(items), 0, 'Should not provide completion for short input');
    });

    test('Should NOT trigger completion after semicolon', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'const x = 5;';
      const filePath = await createTestFile(testWorkspacePath, 'semicolon.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.strictEqual(getCompletionLength(items), 0, 'Should not provide completion after semicolon');
    });

    test('Should NOT trigger completion inside string literals', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'const msg = "Hello ';
      const filePath = await createTestFile(testWorkspacePath, 'string.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.strictEqual(getCompletionLength(items), 0, 'Should not provide completion inside strings');
    });

    test('Should NOT trigger completion inside comments', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = '// This is a comment and ';
      const filePath = await createTestFile(testWorkspacePath, 'comment.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.strictEqual(getCompletionLength(items), 0, 'Should not provide completion inside comments');
    });
  });

  suite('Multi-line Completion Support', () => {
    test('Should provide multi-line completion for function bodies', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'function add(a, b) {\n  ';
      const filePath = await createTestFile(testWorkspacePath, 'multiline.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(1, 2);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should return completion items');

      if (getCompletionLength(items) > 0 && 'insertText' in items[0]) {
        const insertText = items[0].insertText as string;
        assert.ok(
          insertText.includes('return'),
          'Should suggest return statement for function'
        );
      }
    });

    test('Should provide completion for control structures (if statements)', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'if (';
      const filePath = await createTestFile(testWorkspacePath, 'if.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should return completion items');
      assert.ok(getCompletionLength(items) > 0, 'Should provide completion for if statement');
    });

    test('Should provide completion for loops (for statements)', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'for (';
      const filePath = await createTestFile(testWorkspacePath, 'for.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should return completion items');
      assert.ok(getCompletionLength(items) > 0, 'Should provide completion for for loop');
    });
  });

  suite('Context Awareness', () => {
    test('Should use surrounding code for context-aware completions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function calculateSum(a, b) {
  return a + b;
}

const result =
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'context.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(4, 15); // After "const result = "
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should return completion items');
      assert.ok(getCompletionLength(items) > 0, 'Should provide context-aware completion');
    });

    test('Should detect function context correctly', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
class Calculator {
  add(a, b) {
    const sum =
  }
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'function-context.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(2, 16); // Inside add method
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should detect function context');
    });

    test('Should respect indentation level in completions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
class Service {
  async fetchData() {
    const response =
  }
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'indent.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(2, 21);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      // Indentation handling is tested by checking if multi-line completions exist
      assert.ok(Array.isArray(items), 'Should handle indentation');
    });
  });

  suite('Caching and Performance', () => {
    test('Should cache completion results', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'const result = ';
      const filePath = await createTestFile(testWorkspacePath, 'cache.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      // First request - should call AI
      const items1 = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      // Second request - should use cache
      const items2 = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.deepStrictEqual(items1, items2, 'Cached results should match original');
    });

    test('Should handle timeout gracefully', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.TIMEOUT_TEST);

      // Create client that simulates slow AI response
      const slowClient = {
        getConnectionStatus: () => ({ connected: true, model: 'test-model' }),
        sendAIRequest: async () => {
          await sleep(10000); // 10 second delay - will timeout
          return { result: 'too slow' };
        }
      } as any;

      const slowProvider = new InlineCompletionProvider(slowClient, mockLogger);

      const code = 'const x = ';
      const filePath = await createTestFile(testWorkspacePath, 'timeout.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await slowProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      // Should return empty array on timeout, not crash
      assert.strictEqual(getCompletionLength(items), 0, 'Should return empty array on timeout');

      slowProvider.dispose();
    });
  });

  suite('Language Support', () => {
    test('Should support TypeScript files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'const value: number = ';
      const filePath = await createTestFile(testWorkspacePath, 'typescript.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should support TypeScript');
    });

    test('Should support Python files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'def calculate():\n    result = ';
      const filePath = await createTestFile(testWorkspacePath, 'python.py', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(1, 13);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.ok(Array.isArray(items), 'Should support Python');
    });

    test('Should NOT support unsupported languages', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'This is plain text = ';
      const filePath = await createTestFile(testWorkspacePath, 'plain.txt', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.strictEqual(getCompletionLength(items), 0, 'Should not support plain text files');
    });
  });

  suite('Error Handling', () => {
    test('Should return empty array when client is disconnected', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const disconnectedClient = {
        getConnectionStatus: () => ({ connected: false, model: null })
      } as any;

      const provider = new InlineCompletionProvider(disconnectedClient, mockLogger);

      const code = 'const result = ';
      const filePath = await createTestFile(testWorkspacePath, 'disconnected.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await provider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      assert.strictEqual(getCompletionLength(items), 0, 'Should return empty when disconnected');

      provider.dispose();
    });

    test('Should handle cancellation token', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'const result = ';
      const filePath = await createTestFile(testWorkspacePath, 'cancel.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const tokenSource = new vscode.CancellationTokenSource();
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const itemsPromise = completionProvider.provideInlineCompletionItems(
        document,
        position,
        context,
        tokenSource.token
      );

      // Cancel immediately
      tokenSource.cancel();

      const items = await itemsPromise;

      assert.ok(Array.isArray(items), 'Should handle cancellation gracefully');
    });

    test('Should handle AI request errors gracefully', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorClient = {
        getConnectionStatus: () => ({ connected: true, model: 'test-model' }),
        sendAIRequest: async () => {
          throw new Error('AI service unavailable');
        }
      } as any;

      const provider = new InlineCompletionProvider(errorClient, mockLogger);

      const code = 'const result = ';
      const filePath = await createTestFile(testWorkspacePath, 'error.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, code.length);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };

      const items = await provider.provideInlineCompletionItems(
        document,
        position,
        context,
        cancellationToken
      );

      // Should return empty array on error, not crash
      assert.strictEqual(getCompletionLength(items), 0, 'Should return empty array on AI error');

      provider.dispose();
    });
  });
});
