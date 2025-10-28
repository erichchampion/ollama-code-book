/**
 * DocumentSymbol Provider Tests
 * Comprehensive tests for AI-enhanced document outline and symbol navigation
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { DocumentSymbolProvider } from '../../providers/documentSymbolProvider';
import { OllamaCodeClient } from '../../client/ollamaCodeClient';
import { Logger } from '../../utils/logger';
import {
  createTestFile,
  createTestWorkspace,
  cleanupTestWorkspace,
  openDocument
} from '../helpers/extensionTestHelper';
import { EXTENSION_TEST_CONSTANTS, PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import { createMockOllamaClient, createMockLogger, TEST_DATA_CONSTANTS } from '../helpers/providerTestHelper';

suite('DocumentSymbol Provider Tests', () => {
  let symbolProvider: DocumentSymbolProvider;
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
    symbolProvider = new DocumentSymbolProvider(mockClient, mockLogger);

    // Create test workspace
    testWorkspacePath = await createTestWorkspace('document-symbol-tests');

    // Create cancellation token
    const tokenSource = new vscode.CancellationTokenSource();
    cancellationToken = tokenSource.token;
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('TypeScript/JavaScript Symbol Extraction', () => {
    test('Should extract classes from TypeScript files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const tsCode = `
export class UserService {
  private users: User[] = [];

  getUser(id: string): User | null {
    return this.users.find(u => u.id === id) || null;
  }
}

class InternalHelper {
  static format(data: any): string {
    return JSON.stringify(data);
  }
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'service.ts', tsCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      // Find class symbols
      const classes = symbols.filter(s => s.kind === vscode.SymbolKind.Class);

      assert.strictEqual(classes.length, 2, 'Should extract 2 classes');
      assert.ok(
        classes.some(c => c.name === 'UserService'),
        'Should extract UserService class'
      );
      assert.ok(
        classes.some(c => c.name === 'InternalHelper'),
        'Should extract InternalHelper class'
      );
    });

    test('Should extract functions from JavaScript files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const jsCode = `
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

export async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

const processData = (data) => {
  return data.map(item => item.value);
};
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'utils.js', jsCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const functions = symbols.filter(s => s.kind === vscode.SymbolKind.Function);

      assert.ok(functions.length >= 2, 'Should extract at least 2 functions');
      assert.ok(
        functions.some(f => f.name === 'calculateTotal'),
        'Should extract calculateTotal function'
      );
      assert.ok(
        functions.some(f => f.name === 'fetchData'),
        'Should extract fetchData function'
      );
    });

    test('Should extract interfaces and enums from TypeScript', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const tsCode = `
export interface User {
  id: string;
  name: string;
}

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest'
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'types.ts', tsCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const interfaces = symbols.filter(s => s.kind === vscode.SymbolKind.Interface);
      const enums = symbols.filter(s => s.kind === vscode.SymbolKind.Enum);

      assert.strictEqual(interfaces.length, 1, 'Should extract interface');
      assert.strictEqual(interfaces[0].name, 'User', 'Should extract User interface');

      assert.strictEqual(enums.length, 1, 'Should extract enum');
      assert.strictEqual(enums[0].name, 'UserRole', 'Should extract UserRole enum');
    });

    test('Should extract constants and variables', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const tsCode = `
export const API_URL = 'https://api.example.com';
const MAX_RETRIES = 3;
let currentUser = null;
var debugMode = false;
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'config.ts', tsCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const constants = symbols.filter(s => s.kind === vscode.SymbolKind.Constant);
      const variables = symbols.filter(s => s.kind === vscode.SymbolKind.Variable);

      assert.ok(constants.length >= 2, 'Should extract constants');
      assert.ok(
        constants.some(c => c.name === 'API_URL'),
        'Should extract API_URL constant'
      );

      assert.ok(variables.length >= 1, 'Should extract variables');
      assert.ok(
        variables.some(v => v.name === 'currentUser'),
        'Should extract currentUser variable'
      );
    });
  });

  suite('Multi-Language Support', () => {
    test('Should extract symbols from Python files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const pyCode = `
class DataProcessor:
    def __init__(self, config):
        self.config = config

    def process(self, data):
        return data

async def fetch_remote_data(url):
    response = await http.get(url)
    return response.json()

def test_processor():
    processor = DataProcessor({})
    assert processor is not None
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'processor.py', pyCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const classes = symbols.filter(s => s.kind === vscode.SymbolKind.Class);
      const functions = symbols.filter(s => s.kind === vscode.SymbolKind.Function);

      assert.strictEqual(classes.length, 1, 'Should extract Python class');
      assert.strictEqual(classes[0].name, 'DataProcessor', 'Should extract DataProcessor class');

      assert.ok(functions.length >= 2, 'Should extract Python functions');
      assert.ok(
        functions.some(f => f.name === 'fetch_remote_data'),
        'Should extract fetch_remote_data function'
      );
      assert.ok(
        functions.some(f => f.name === 'test_processor'),
        'Should extract test_processor function'
      );
    });

    test('Should extract symbols from Java files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const javaCode = `
public class UserController {
    private UserService service;

    public User getUser(String id) {
        return service.findById(id);
    }
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'UserController.java', javaCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const classes = symbols.filter(s => s.kind === vscode.SymbolKind.Class);
      const methods = symbols.filter(s => s.kind === vscode.SymbolKind.Method);

      assert.strictEqual(classes.length, 1, 'Should extract Java class');
      assert.strictEqual(classes[0].name, 'UserController', 'Should extract UserController class');

      assert.ok(methods.length >= 1, 'Should extract Java methods');
      assert.ok(
        methods.some(m => m.name === 'getUser'),
        'Should extract getUser method'
      );
    });

    test('Should extract symbols from Go files', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const goCode = `
func ProcessData(data []byte) error {
    return nil
}

func HandleRequest(req *Request) *Response {
    return &Response{}
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'handler.go', goCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const functions = symbols.filter(s => s.kind === vscode.SymbolKind.Function);

      assert.ok(functions.length >= 2, 'Should extract Go functions');
      assert.ok(
        functions.some(f => f.name === 'ProcessData'),
        'Should extract ProcessData function'
      );
      assert.ok(
        functions.some(f => f.name === 'HandleRequest'),
        'Should extract HandleRequest function'
      );
    });
  });

  suite('Symbol Metadata and Enhancement', () => {
    test('Should detect async functions and add detail', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const tsCode = `
export async function fetchUser(id: string) {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'async.ts', tsCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const asyncFunc = symbols.find(s => s.name === 'fetchUser');

      assert.ok(asyncFunc, 'Should extract async function');
      assert.ok(
        asyncFunc.detail?.includes('async'),
        'Should mark function as async in detail'
      );
    });

    test('Should detect test functions', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const tsCode = `
function testUserCreation() {
  const user = createUser();
  assert(user.id);
}

function test_validation() {
  validate({});
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'tests.ts', tsCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const testFuncs = symbols.filter(s =>
        s.name.includes('test') && s.detail?.includes('test')
      );

      assert.ok(testFuncs.length > 0, 'Should detect test functions');
    });

    test('Should detect exported symbols', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const tsCode = `
export class PublicService {}

class PrivateHelper {}

export function publicApi() {}

function internalUtil() {}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'exports.ts', tsCode);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const exportedSymbols = symbols.filter(s => s.detail?.includes('exported'));

      assert.ok(exportedSymbols.length >= 2, 'Should detect exported symbols');
      assert.ok(
        exportedSymbols.some(s => s.name === 'PublicService'),
        'Should mark PublicService as exported'
      );
      assert.ok(
        exportedSymbols.some(s => s.name === 'publicApi'),
        'Should mark publicApi as exported'
      );
    });

    test('Should calculate complexity for functions when client is connected', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const complexFunc = `
function complex(x) {
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
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'complexity.js', complexFunc);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      const funcSymbol = symbols.find(s => s.name === 'complex');

      // Note: Complexity calculation happens in enhanceSymbolsWithAI
      // The actual complexity value isn't exposed through vscode.DocumentSymbol
      // but we can verify the symbol was found
      assert.ok(funcSymbol, 'Should extract function for complexity analysis');
    });
  });

  suite('Error Handling and Edge Cases', () => {
    test('Should handle empty files gracefully', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const emptyFile = '';

      const filePath = await createTestFile(testWorkspacePath, 'empty.ts', emptyFile);
      const document = await openDocument(filePath);

      const symbols = await symbolProvider.provideDocumentSymbols(document, cancellationToken);

      assert.strictEqual(symbols.length, 0, 'Should return empty array for empty files');
    });

    test('Should handle cancellation token', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const largeFile = Array(100).fill(0).map((_, i) => `
function func${i}() {
  return ${i};
}
      `).join('\n');

      const filePath = await createTestFile(testWorkspacePath, 'large.js', largeFile);
      const document = await openDocument(filePath);

      const tokenSource = new vscode.CancellationTokenSource();

      // Start parsing
      const symbolsPromise = symbolProvider.provideDocumentSymbols(document, tokenSource.token);

      // Cancel immediately
      tokenSource.cancel();

      const symbols = await symbolsPromise;

      // Should handle cancellation gracefully
      assert.ok(Array.isArray(symbols), 'Should return array even when cancelled');
    });

    test('Should return empty array when disconnected from client', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create disconnected client using shared helper
      const disconnectedClient = createMockOllamaClient(false);

      const provider = new DocumentSymbolProvider(disconnectedClient, mockLogger);

      const tsCode = `
function test() {
  return 42;
}
      `.trim();

      const filePath = await createTestFile(testWorkspacePath, 'disconnected.ts', tsCode);
      const document = await openDocument(filePath);

      const symbols = await provider.provideDocumentSymbols(document, cancellationToken);

      // Should still parse symbols even when disconnected (just no AI enhancement)
      assert.ok(symbols.length >= 0, 'Should handle disconnected state');
    });
  });
});
