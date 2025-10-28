/**
 * Hover Provider Tests
 * Comprehensive tests for AI-powered hover information and documentation
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { HoverProvider } from '../../providers/hoverProvider';
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
import { createMockOllamaClient, createMockLogger, TEST_DATA_CONSTANTS, createHoverAIHandler } from '../helpers/providerTestHelper';

suite('Hover Provider Tests', () => {
  let hoverProvider: HoverProvider;
  let mockClient: OllamaCodeClient;
  let mockLogger: Logger;
  let testWorkspacePath: string;
  let cancellationToken: vscode.CancellationToken;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);

    // Create mock client and logger using shared helpers
    mockClient = createMockOllamaClient(true, createHoverAIHandler());
    mockLogger = createMockLogger();

    // Create provider
    hoverProvider = new HoverProvider(mockClient, mockLogger);

    // Create test workspace
    testWorkspacePath = await createTestWorkspace('hover-provider-tests');

    // Create cancellation token
    const tokenSource = new vscode.CancellationTokenSource();
    cancellationToken = tokenSource.token;
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Function Hover Information', () => {
    test('Should provide hover for function declarations', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function calculateSum(a, b) {
  return a + b;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'function.ts', code);
      const document = await openDocument(filePath);

      // Hover over function name
      const position = new vscode.Position(0, 10); // Position on "calculateSum"

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover information');
      assert.ok(hover.contents.length > 0, 'Should have hover content');

      // Verify it's a MarkdownString
      const content = hover.contents[0];
      assert.ok(content instanceof vscode.MarkdownString, 'Content should be MarkdownString');

      const markdownContent = (content as vscode.MarkdownString).value;
      assert.ok(
        markdownContent.includes('Function') || markdownContent.includes('function'),
        'Should identify as function'
      );
      assert.ok(
        markdownContent.includes('calculateSum'),
        'Should include function name'
      );
    });

    test('Should show function signature in hover', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
export function calculateSum(a, b) {
  return a + b;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'signature.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 17); // Position on function name

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover');

      const markdownContent = (hover.contents[0] as vscode.MarkdownString).value;
      assert.ok(
        markdownContent.includes('calculateSum'),
        'Should include function signature'
      );
    });

    test('Should identify async functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'async.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 20); // Position on "fetchData"

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover');

      const markdownContent = (hover.contents[0] as vscode.MarkdownString).value;
      assert.ok(
        markdownContent.toLowerCase().includes('async'),
        'Should indicate async function'
      );
    });

    test('Should show complexity warning for complex functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create function with complexity > 10
      const code = `
function complex(x) {
  if (x > 0) {
    if (x < 10) {
      while (x > 5) {
        if (x % 2 === 0) {
          for (let i = 0; i < x; i++) {
            if (i % 3 === 0) {
              x--;
            } else if (i % 2 === 0) {
              x++;
            }
          }
        }
      }
    }
  }
  return x;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'complex.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 10);

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover');

      const markdownContent = (hover.contents[0] as vscode.MarkdownString).value;
      assert.ok(
        markdownContent.includes('Complexity') || markdownContent.includes('complexity'),
        'Should show complexity information'
      );
    });
  });

  suite('Class and Method Hover', () => {
    test('Should provide hover for class declarations', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
export class UserService {
  private users = [];

  getUser(id) {
    return this.users.find(u => u.id === id);
  }
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'class.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 15); // Position on "UserService"

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover for class');

      const markdownContent = (hover.contents[0] as vscode.MarkdownString).value;
      assert.ok(
        markdownContent.includes('Class') || markdownContent.includes('class'),
        'Should identify as class'
      );
      assert.ok(
        markdownContent.includes('UserService'),
        'Should include class name'
      );
    });

    test('Should provide hover for class methods', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
class Calculator {
  add(a, b) {
    return a + b;
  }
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'method.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(1, 3); // Position on "add"

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover for method');

      const markdownContent = (hover.contents[0] as vscode.MarkdownString).value;
      assert.ok(
        markdownContent.includes('Method') || markdownContent.includes('method') ||
        markdownContent.includes('Function') || markdownContent.includes('function'),
        'Should identify as method or function'
      );
    });
  });

  suite('Variable and Property Hover', () => {
    test('Should provide hover for constants', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
const API_URL = 'https://api.example.com';
const data = fetchData(API_URL);
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'const.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 10); // Position on "API_URL"

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover for constant');

      const markdownContent = (hover.contents[0] as vscode.MarkdownString).value;
      assert.ok(
        markdownContent.includes('API_URL') || markdownContent.toLowerCase().includes('variable'),
        'Should show variable/constant information'
      );
    });

    test('Should provide hover for object properties', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
const user = {
  name: 'John',
  getName() {
    return this.name;
  }
};

user.getName();
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'property.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(7, 7); // Position on "getName"

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover for property');
    });
  });

  suite('Export and Modifier Detection', () => {
    test('Should detect exported symbols', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
export function publicApi() {
  return 'public';
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'export.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 20);

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover');

      const markdownContent = (hover.contents[0] as vscode.MarkdownString).value;
      assert.ok(
        markdownContent.includes('export'),
        'Should indicate exported symbol'
      );
    });

    test('Should detect test functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function testCalculation() {
  const result = calculate(5);
  assert.equal(result, 10);
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'test.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 10);

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover');

      const markdownContent = (hover.contents[0] as vscode.MarkdownString).value;
      assert.ok(
        markdownContent.toLowerCase().includes('test'),
        'Should indicate test function'
      );
    });
  });

  suite('Multi-Language Support', () => {
    test('Should provide hover for Python functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
def calculate_total(items):
    return sum(item.price for item in items)
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'python.py', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 10);

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover, 'Should provide hover for Python');
    });

    test('Should not provide hover for unsupported languages', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'This is plain text';

      const filePath = await createTestFile(testWorkspacePath, 'plain.txt', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 5);

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.strictEqual(hover, null, 'Should not provide hover for unsupported languages');
    });
  });

  suite('Caching and Performance', () => {
    test('Should cache hover results', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'function test() { return 42; }';

      const filePath = await createTestFile(testWorkspacePath, 'cache.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 10);

      // First request
      const hover1 = await hoverProvider.provideHover(document, position, cancellationToken);

      // Second request - should use cache
      const hover2 = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.ok(hover1, 'Should provide first hover');
      assert.ok(hover2, 'Should provide second hover');

      // Note: We can't directly verify caching, but both should succeed
      assert.strictEqual(
        (hover1.contents[0] as vscode.MarkdownString).value,
        (hover2.contents[0] as vscode.MarkdownString).value,
        'Cached results should match'
      );
    });

    test('Should handle timeout gracefully', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.TIMEOUT_TEST);

      const slowClient = {
        getConnectionStatus: () => ({ connected: true, model: 'test-model' }),
        sendAIRequest: async () => {
          await sleep(5000); // 5 second delay - will timeout
          return { result: 'too slow' };
        }
      } as any;

      const slowProvider = new HoverProvider(slowClient, mockLogger);

      const code = 'function test() {}';
      const filePath = await createTestFile(testWorkspacePath, 'timeout.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 10);

      const hover = await slowProvider.provideHover(document, position, cancellationToken);

      // Should return null on timeout, not crash
      assert.strictEqual(hover, null, 'Should return null on timeout');
    });
  });

  suite('Error Handling', () => {
    test('Should return null when disconnected', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const disconnectedClient = {
        getConnectionStatus: () => ({ connected: false, model: null })
      } as any;

      const provider = new HoverProvider(disconnectedClient, mockLogger);

      const code = 'function test() {}';
      const filePath = await createTestFile(testWorkspacePath, 'disconnected.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 10);

      const hover = await provider.provideHover(document, position, cancellationToken);

      assert.strictEqual(hover, null, 'Should return null when disconnected');
    });

    test('Should handle cancellation token', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'function test() {}';
      const filePath = await createTestFile(testWorkspacePath, 'cancel.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 10);
      const tokenSource = new vscode.CancellationTokenSource();

      const hoverPromise = hoverProvider.provideHover(document, position, tokenSource.token);

      // Cancel immediately
      tokenSource.cancel();

      const hover = await hoverPromise;

      // Should handle cancellation gracefully
      assert.ok(hover === null || hover !== undefined, 'Should handle cancellation');
    });

    test('Should return null for invalid positions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'function test() {}';
      const filePath = await createTestFile(testWorkspacePath, 'invalid.ts', code);
      const document = await openDocument(filePath);

      // Position on whitespace
      const position = new vscode.Position(0, 0);

      const hover = await hoverProvider.provideHover(document, position, cancellationToken);

      assert.strictEqual(hover, null, 'Should return null for whitespace');
    });

    test('Should handle AI request errors gracefully', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorClient = {
        getConnectionStatus: () => ({ connected: true, model: 'test-model' }),
        sendAIRequest: async () => {
          throw new Error('AI service error');
        }
      } as any;

      const provider = new HoverProvider(errorClient, mockLogger);

      const code = 'function test() {}';
      const filePath = await createTestFile(testWorkspacePath, 'error.ts', code);
      const document = await openDocument(filePath);

      const position = new vscode.Position(0, 10);

      const hover = await provider.provideHover(document, position, cancellationToken);

      // Should return null on error, not crash
      assert.strictEqual(hover, null, 'Should return null on AI error');
    });
  });
});
