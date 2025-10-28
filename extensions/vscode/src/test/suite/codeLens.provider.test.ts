/**
 * CodeLens Provider Tests
 * Comprehensive tests for AI-powered code lens functionality
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { CodeLensProvider } from '../../providers/codeLensProvider';
import { OllamaCodeClient } from '../../client/ollamaCodeClient';
import { Logger } from '../../utils/logger';
import { CODE_METRICS_THRESHOLDS } from '../../config/analysisConstants';
import {
  createTestFile,
  createTestWorkspace,
  cleanupTestWorkspace,
  openDocument,
  sleep
} from '../helpers/extensionTestHelper';
import { EXTENSION_TEST_CONSTANTS, PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import { createMockOllamaClient, createMockLogger, TEST_DATA_CONSTANTS } from '../helpers/providerTestHelper';

suite('CodeLens Provider Tests', () => {
  let codeLensProvider: CodeLensProvider;
  let mockClient: OllamaCodeClient;
  let mockLogger: Logger;
  let testWorkspacePath: string;
  let cancellationToken: vscode.CancellationToken;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);

    // Create mock client and logger using shared helpers
    mockClient = createMockOllamaClient();
    mockLogger = createMockLogger();

    // Create provider
    codeLensProvider = new CodeLensProvider(mockClient, mockLogger);

    // Create test workspace
    testWorkspacePath = await createTestWorkspace('codelens-tests');

    // Create cancellation token
    const tokenSource = new vscode.CancellationTokenSource();
    cancellationToken = tokenSource.token;
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    codeLensProvider.dispose();
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Complexity Warning CodeLens', () => {
    test('Should show high complexity warning for complex functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create function with complexity > HIGH_COMPLEXITY (10)
      const complexFunction = `
function complexFunction(a, b, c) {
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        while (a > b) {
          if (a % 2 === 0) {
            for (let i = 0; i < c; i++) {
              if (i % 2 === 0) {
                a--;
              } else if (i % 3 === 0) {
                b++;
              }
            }
          }
        }
      }
    }
  }
  return a + b + c;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'complex.js', complexFunction);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      assert.ok(lenses.length > 0, 'Should provide code lenses');

      const complexityLens = lenses.find(lens =>
        lens.command?.title.includes('⚠️ Complexity:') &&
        lens.command?.title.includes('Consider refactoring')
      );

      assert.ok(complexityLens, 'Should have high complexity warning lens');
      assert.strictEqual(
        complexityLens.command?.command,
        'ollama-code.refactor',
        'Should trigger refactor command'
      );
    });

    test('Should show medium complexity info for moderately complex functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create function with complexity between MEDIUM (5) and HIGH (10)
      const moderateFunction = `
function moderateFunction(x) {
  if (x > 0) {
    if (x < 10) {
      while (x > 5) {
        x--;
      }
    } else if (x > 20) {
      return x * 2;
    }
  }
  return x;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'moderate.js', moderateFunction);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      const complexityLens = lenses.find(lens =>
        lens.command?.title.includes('📊 Complexity:') &&
        !lens.command?.title.includes('Consider refactoring')
      );

      assert.ok(complexityLens, 'Should have medium complexity info lens');
      assert.strictEqual(
        complexityLens.command?.command,
        'ollama-code.analyze',
        'Should trigger analyze command'
      );
    });

    test('Should not show complexity lens for simple functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const simpleFunction = `
function simpleFunction(x) {
  return x * 2;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'simple.js', simpleFunction);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      const complexityLens = lenses.find(lens =>
        lens.command?.title.includes('Complexity:')
      );

      assert.strictEqual(complexityLens, undefined, 'Should not show complexity lens for simple functions');
    });
  });

  suite('Function Size CodeLens', () => {
    test('Should show line count warning for long functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create function with > LONG_FUNCTION_LINES (30) lines
      const lines = Array(TEST_DATA_CONSTANTS.LONG_FUNCTION_LINE_COUNT).fill('  console.log("line");').join('\n');
      const longFunction = `
function longFunction() {
${lines}
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'long.js', longFunction);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      const lineLens = lenses.find(lens =>
        lens.command?.title.includes('📏 Lines:') &&
        lens.command?.title.includes('Consider breaking down')
      );

      assert.ok(lineLens, 'Should have line count warning lens');
      assert.strictEqual(
        lineLens.command?.command,
        'ollama-code.refactor',
        'Should trigger refactor command'
      );
    });

    test('Should show parameter count warning for functions with too many params', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create function with > TOO_MANY_PARAMS (5) parameters
      const manyParamsFunction = `
function manyParams(a, b, c, d, e, f, g) {
  return a + b + c + d + e + f + g;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'params.js', manyParamsFunction);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      const paramLens = lenses.find(lens =>
        lens.command?.title.includes('📝 Parameters:') &&
        lens.command?.title.includes('Too many parameters')
      );

      assert.ok(paramLens, 'Should have parameter count warning lens');
      assert.strictEqual(
        paramLens.command?.command,
        'ollama-code.refactor',
        'Should trigger refactor command'
      );
    });
  });

  suite('AI Insights CodeLens', () => {
    test('Should show AI insights lens for every function', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const multipleFunctions = `
function first() {
  return 1;
}

function second() {
  return 2;
}

function third() {
  return 3;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'multiple.js', multipleFunctions);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      const aiLenses = lenses.filter(lens =>
        lens.command?.title.includes('🤖 Get AI insights')
      );

      assert.strictEqual(aiLenses.length, 3, 'Should have AI insights lens for each function');

      // Verify each has correct command
      aiLenses.forEach(lens => {
        assert.strictEqual(
          lens.command?.command,
          'ollama-code.analyzeFunction',
          'Should trigger analyzeFunction command'
        );
      });
    });
  });

  suite('File-Level CodeLens', () => {
    test('Should show file complexity warning when average complexity is high', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create multiple complex functions to trigger file-level warning
      const complexFile = `
function complex1(x) {
  if (x > 0) {
    if (x < 10) {
      while (x > 5) {
        if (x % 2 === 0) {
          x--;
        } else if (x % 3 === 0) {
          x++;
        }
      }
    }
  }
  return x;
}

function complex2(y) {
  if (y > 0) {
    if (y < 10) {
      while (y > 5) {
        if (y % 2 === 0) {
          y--;
        } else if (y % 3 === 0) {
          y++;
        }
      }
    }
  }
  return y;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'complex-file.js', complexFile);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      const fileLens = lenses.find(lens =>
        lens.command?.title.includes('📊 File Complexity:') &&
        lens.command?.title.includes('Consider refactoring')
      );

      assert.ok(fileLens, 'Should have file complexity warning lens');
      assert.strictEqual(
        fileLens.command?.command,
        'ollama-code.analyzeFile',
        'Should trigger analyzeFile command'
      );

      // Verify it's at the top of the file
      assert.strictEqual(fileLens.range.start.line, 0, 'File lens should be at line 0');
    });

    test('Should show test generation lens for all files with functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const fileWithFunctions = `
function add(a, b) {
  return a + b;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'testable.js', fileWithFunctions);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      const testLens = lenses.find(lens =>
        lens.command?.title.includes('🧪 Generate tests')
      );

      assert.ok(testLens, 'Should have test generation lens');
      assert.strictEqual(
        testLens.command?.command,
        'ollama-code.generateTests',
        'Should trigger generateTests command'
      );
      assert.strictEqual(testLens.range.start.line, 0, 'Test lens should be at line 0');
    });

    test('Should show security analysis lens for all files with functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const fileWithFunctions = `
function processData(input) {
  return input.toLowerCase();
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'secure.js', fileWithFunctions);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      const securityLens = lenses.find(lens =>
        lens.command?.title.includes('🔒 Run security analysis')
      );

      assert.ok(securityLens, 'Should have security analysis lens');
      assert.strictEqual(
        securityLens.command?.command,
        'ollama-code.securityAnalysis',
        'Should trigger securityAnalysis command'
      );
      assert.strictEqual(securityLens.range.start.line, 0, 'Security lens should be at line 0');
    });
  });

  suite('Multi-Language Support', () => {
    test('Should provide CodeLens for TypeScript files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const tsFunction = `
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'test.ts', tsFunction);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      assert.ok(lenses.length > 0, 'Should provide lenses for TypeScript');

      const aiLens = lenses.find(lens =>
        lens.command?.title.includes('🤖 Get AI insights')
      );
      assert.ok(aiLens, 'Should have AI insights lens for TypeScript');
    });

    test('Should provide CodeLens for Python files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const pyFunction = `
def calculate(x, y):
    if x > 0:
        if y > 0:
            return x + y
    return 0
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'test.py', pyFunction);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      assert.ok(lenses.length > 0, 'Should provide lenses for Python');

      const aiLens = lenses.find(lens =>
        lens.command?.title.includes('🤖 Get AI insights')
      );
      assert.ok(aiLens, 'Should have AI insights lens for Python');
    });

    test('Should not provide CodeLens for unsupported languages', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const textFile = `
This is just a plain text file.
It should not trigger any code lenses.
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'test.txt', textFile);
      const document = await openDocument(filePath);

      const lenses = await codeLensProvider.provideCodeLenses(document, cancellationToken);

      assert.strictEqual(lenses.length, 0, 'Should not provide lenses for unsupported languages');
    });
  });

  suite('Connection and Error Handling', () => {
    test('Should return empty array when client is disconnected', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create disconnected client
      const disconnectedClient = createMockOllamaClient(false);

      const provider = new CodeLensProvider(disconnectedClient, mockLogger);

      const simpleFunction = `
function test() {
  return 42;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'disconnected.js', simpleFunction);
      const document = await openDocument(filePath);

      const lenses = await provider.provideCodeLenses(document, cancellationToken);

      assert.strictEqual(lenses.length, 0, 'Should return empty array when disconnected');

      provider.dispose();
    });

    test('Should handle cancellation token gracefully', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const manyFunctions = Array(TEST_DATA_CONSTANTS.STRESS_TEST_FUNCTION_COUNT).fill(0).map((_, i) => `
function func${i}() {
  return ${i};
}
      `).join('\n');

      const filePath = await createTestFile(testWorkspacePath, 'cancel.js', manyFunctions);
      const document = await openDocument(filePath);

      // Create a token that will be cancelled
      const tokenSource = new vscode.CancellationTokenSource();

      // Start the provider
      const lensPromise = codeLensProvider.provideCodeLenses(document, tokenSource.token);

      // Cancel immediately
      tokenSource.cancel();

      const lenses = await lensPromise;

      // Should return partial results or empty array
      assert.ok(Array.isArray(lenses), 'Should return array even when cancelled');
    });
  });

  suite('CodeLens Refresh', () => {
    test('Should fire refresh event when refresh() is called', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      let refreshFired = false;

      const disposable = codeLensProvider.onDidChangeCodeLenses(() => {
        refreshFired = true;
      });

      codeLensProvider.refresh();

      await sleep(EXTENSION_TEST_CONSTANTS.POLLING_INTERVAL);

      assert.strictEqual(refreshFired, true, 'Should fire refresh event');

      disposable.dispose();
    });
  });
});
