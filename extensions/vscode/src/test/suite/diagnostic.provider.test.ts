/**
 * Diagnostic Provider Tests
 * Comprehensive tests for AI-powered code diagnostics and issue detection
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { DiagnosticProvider } from '../../providers/diagnosticProvider';
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
import { createMockOllamaClient, createMockLogger, TEST_DATA_CONSTANTS, createDiagnosticAIHandler } from '../helpers/providerTestHelper';

suite('Diagnostic Provider Tests', () => {
  let diagnosticProvider: DiagnosticProvider;
  let mockClient: OllamaCodeClient;
  let mockLogger: Logger;
  let testWorkspacePath: string;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);

    // Create mock client and logger using shared helpers
    mockClient = createMockOllamaClient(true, createDiagnosticAIHandler());
    mockLogger = createMockLogger();

    // Create provider
    diagnosticProvider = new DiagnosticProvider(mockClient, mockLogger);

    // Create test workspace
    testWorkspacePath = await createTestWorkspace('diagnostic-provider-tests');
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    diagnosticProvider.dispose();
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Security Issue Detection', () => {
    test('Should detect eval() usage', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function processInput(userInput) {
  const result = eval(userInput);
  return result;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'eval.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const evalDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('eval')
      );

      assert.ok(evalDiagnostic, 'Should detect eval() usage');
      assert.strictEqual(
        evalDiagnostic.severity,
        vscode.DiagnosticSeverity.Warning,
        'Should be a warning'
      );
      assert.strictEqual(
        evalDiagnostic.source,
        'ollama-code-static',
        'Should be from static analysis'
      );
    });

    test('Should detect innerHTML assignment', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function updateContent(html) {
  document.getElementById('output').innerHTML = html;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'innerHTML.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const innerHTMLDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('innerhtml')
      );

      assert.ok(innerHTMLDiagnostic, 'Should detect innerHTML assignment');
      assert.strictEqual(
        innerHTMLDiagnostic.severity,
        vscode.DiagnosticSeverity.Warning,
        'Should be a warning'
      );
    });

    test('Should detect document.write() usage', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function render(content) {
  document.write(content);
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'docwrite.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const writeDignostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('document.write')
      );

      assert.ok(writeDignostic, 'Should detect document.write() usage');
    });
  });

  suite('Performance Issue Detection', () => {
    test('Should detect console.log in production code', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function debugInfo(data) {
  console.log('Debug:', data);
  return data;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'console.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const consoleDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('console')
      );

      assert.ok(consoleDiagnostic, 'Should detect console.log statement');
      assert.strictEqual(
        consoleDiagnostic.severity,
        vscode.DiagnosticSeverity.Information,
        'Should be informational'
      );
    });

    test('Should suggest caching array length in loops', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function processArray(items) {
  for (var i = 0; i < items.length; i++) {
    process(items[i]);
  }
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'loop.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const loopDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('array length') ||
        d.message.toLowerCase().includes('caching')
      );

      assert.ok(loopDiagnostic, 'Should suggest caching array length');
    });
  });

  suite('Style Issue Detection', () => {
    test('Should suggest using let/const instead of var', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function oldStyle() {
  var counter = 0;
  var name = 'test';
  return counter;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'var.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const varDiagnostics = diagnostics.filter(d =>
        d.message.toLowerCase().includes('var') &&
        (d.message.toLowerCase().includes('let') || d.message.toLowerCase().includes('const'))
      );

      assert.ok(varDiagnostics.length >= 2, 'Should detect multiple var usages');
      assert.strictEqual(
        varDiagnostics[0].severity,
        vscode.DiagnosticSeverity.Hint,
        'Should be a hint'
      );
    });

    test('Should suggest using === instead of ==', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function compare(a, b) {
  if (a == b) {
    return true;
  }
  return false;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'equality.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const equalityDiagnostic = diagnostics.find(d =>
        d.message.includes('===') || d.message.toLowerCase().includes('strict equality')
      );

      assert.ok(equalityDiagnostic, 'Should suggest strict equality');
    });
  });

  suite('Logic Issue Detection', () => {
    test('Should detect always-true conditions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function alwaysTrue() {
  if (true) {
    return 'always executed';
  }
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'true.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const trueDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('always true')
      );

      assert.ok(trueDiagnostic, 'Should detect always-true condition');
      assert.strictEqual(
        trueDiagnostic.severity,
        vscode.DiagnosticSeverity.Warning,
        'Should be a warning'
      );
    });

    test('Should detect dead code (always-false conditions)', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function deadCode() {
  if (false) {
    return 'never executed';
  }
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'false.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const falseDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('always false') ||
        d.message.toLowerCase().includes('dead code')
      );

      assert.ok(falseDiagnostic, 'Should detect dead code');
      assert.strictEqual(
        falseDiagnostic.severity,
        vscode.DiagnosticSeverity.Error,
        'Should be an error'
      );
    });
  });

  suite('Complexity-Based Diagnostics', () => {
    test('Should detect high complexity functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const complexCode = `
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

      const filePath = await createTestFile(testWorkspacePath, 'complex.ts', complexCode);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const complexityDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('complexity') &&
        d.source === 'ollama-code-complexity'
      );

      assert.ok(complexityDiagnostic, 'Should detect high complexity');
      assert.strictEqual(
        complexityDiagnostic.severity,
        vscode.DiagnosticSeverity.Warning,
        'Should be a warning'
      );
      assert.strictEqual(
        complexityDiagnostic.code,
        'high-complexity',
        'Should have high-complexity code'
      );
    });

    test('Should detect long functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const lines = Array(35).fill('  console.log("line");').join('\n');
      const longCode = `function long() {\n${lines}\n}`;

      const filePath = await createTestFile(testWorkspacePath, 'long.ts', longCode);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const longDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('too long') &&
        d.code === 'long-function'
      );

      assert.ok(longDiagnostic, 'Should detect long function');
      assert.strictEqual(
        longDiagnostic.severity,
        vscode.DiagnosticSeverity.Hint,
        'Should be a hint'
      );
    });

    test('Should detect too many parameters', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = `
function manyParams(a, b, c, d, e, f, g) {
  return a + b + c + d + e + f + g;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'params.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      const paramsDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('too many parameters') &&
        d.code === 'too-many-params'
      );

      assert.ok(paramsDiagnostic, 'Should detect too many parameters');
      assert.strictEqual(
        paramsDiagnostic.severity,
        vscode.DiagnosticSeverity.Hint,
        'Should be a hint'
      );
    });
  });

  suite('Diagnostic Management', () => {
    test('Should cache diagnostic results', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'function test() { var x = 5; }';
      const filePath = await createTestFile(testWorkspacePath, 'cache.ts', code);
      const document = await openDocument(filePath);

      // First analysis
      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics1 = diagnosticProvider.getDiagnostics(document.uri);

      // Second analysis (should use cache)
      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics2 = diagnosticProvider.getDiagnostics(document.uri);

      assert.strictEqual(
        diagnostics1.length,
        diagnostics2.length,
        'Cached diagnostics should match'
      );
    });

    test('Should clear diagnostics for a specific document', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'function test() { var x = 5; }';
      const filePath = await createTestFile(testWorkspacePath, 'clear.ts', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      let diagnostics = diagnosticProvider.getDiagnostics(document.uri);
      assert.ok(diagnostics.length > 0, 'Should have diagnostics');

      // Clear diagnostics
      diagnosticProvider.clearDiagnostics(document.uri);
      await sleep(100);

      diagnostics = diagnosticProvider.getDiagnostics(document.uri);
      assert.strictEqual(diagnostics.length, 0, 'Diagnostics should be cleared');
    });

    test('Should clear all diagnostics', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code1 = 'function test1() { var x = 5; }';
      const code2 = 'function test2() { var y = 10; }';

      const filePath1 = await createTestFile(testWorkspacePath, 'clear1.ts', code1);
      const filePath2 = await createTestFile(testWorkspacePath, 'clear2.ts', code2);

      const doc1 = await openDocument(filePath1);
      const doc2 = await openDocument(filePath2);

      await diagnosticProvider.analyzeDiagnostics(doc1);
      await diagnosticProvider.analyzeDiagnostics(doc2);
      await sleep(100);

      diagnosticProvider.clearAllDiagnostics();
      await sleep(100);

      const diag1 = diagnosticProvider.getDiagnostics(doc1.uri);
      const diag2 = diagnosticProvider.getDiagnostics(doc2.uri);

      assert.strictEqual(diag1.length, 0, 'All diagnostics should be cleared');
      assert.strictEqual(diag2.length, 0, 'All diagnostics should be cleared');
    });
  });

  suite('Language and File Type Filtering', () => {
    test('Should only apply language-specific rules to matching files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'var x = 5;';

      // TypeScript file should get var diagnostic
      const tsPath = await createTestFile(testWorkspacePath, 'ts.ts', code);
      const tsDoc = await openDocument(tsPath);

      await diagnosticProvider.analyzeDiagnostics(tsDoc);
      await sleep(100);

      const tsDiagnostics = diagnosticProvider.getDiagnostics(tsDoc.uri);
      const hasVarWarning = tsDiagnostics.some(d =>
        d.message.toLowerCase().includes('var')
      );

      assert.ok(hasVarWarning, 'TypeScript should get var diagnostic');
    });

    test('Should skip analysis for unsupported languages', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'This is plain text with var keyword';
      const filePath = await createTestFile(testWorkspacePath, 'plain.txt', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      // Should have no diagnostics for unsupported language
      assert.strictEqual(diagnostics.length, 0, 'Should skip unsupported languages');
    });

    test('Should skip analysis for minified files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = 'function test(){var x=5;}';
      const filePath = await createTestFile(testWorkspacePath, 'bundle.min.js', code);
      const document = await openDocument(filePath);

      await diagnosticProvider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = diagnosticProvider.getDiagnostics(document.uri);

      // Minified files should be skipped
      assert.strictEqual(diagnostics.length, 0, 'Should skip minified files');
    });
  });

  suite('Error Handling', () => {
    test('Should handle disconnected client gracefully', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const disconnectedClient = {
        getConnectionStatus: () => ({ connected: false, model: null })
      } as any;

      const provider = new DiagnosticProvider(disconnectedClient, mockLogger);

      const code = 'function test() { var x = 5; }';
      const filePath = await createTestFile(testWorkspacePath, 'disconnected.ts', code);
      const document = await openDocument(filePath);

      await provider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = provider.getDiagnostics(document.uri);

      // Should return no diagnostics when disconnected, not crash
      assert.strictEqual(diagnostics.length, 0, 'Should handle disconnection gracefully');

      provider.dispose();
    });

    test('Should handle AI analysis errors gracefully', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorClient = {
        getConnectionStatus: () => ({ connected: true, model: 'test-model' }),
        sendAIRequest: async () => {
          throw new Error('AI service error');
        }
      } as any;

      const provider = new DiagnosticProvider(errorClient, mockLogger);

      const code = 'function test() { eval("code"); }';
      const filePath = await createTestFile(testWorkspacePath, 'error.ts', code);
      const document = await openDocument(filePath);

      await provider.analyzeDiagnostics(document);
      await sleep(100);

      const diagnostics = provider.getDiagnostics(document.uri);

      // Should still perform static analysis even if AI fails
      const evalDiagnostic = diagnostics.find(d =>
        d.message.toLowerCase().includes('eval')
      );

      assert.ok(evalDiagnostic, 'Should still perform static analysis on AI error');

      provider.dispose();
    });
  });
});
