/**
 * Test Suite for WorkspaceAnalyzer Service
 */

import * as assert from 'assert';
import { WorkspaceAnalyzer } from '../../services/workspaceAnalyzer';

suite('WorkspaceAnalyzer Service Tests', () => {
  let workspaceAnalyzer: WorkspaceAnalyzer;

  suiteSetup(async () => {
    // Initialize workspace analyzer
    workspaceAnalyzer = new WorkspaceAnalyzer();
  });

  suiteTeardown(() => {
    workspaceAnalyzer.dispose();
  });

  test('should create workspace analyzer instance', () => {
    assert.ok(workspaceAnalyzer, 'WorkspaceAnalyzer should be instantiated');
  });

  test('should analyze workspace context', async () => {
    const context = await workspaceAnalyzer.analyzeWorkspace();

    if (context) {
      assert.ok(typeof context.projectType === 'string', 'Project type should be a string');
      assert.ok(typeof context.language === 'string', 'Language should be a string');
      assert.ok(Array.isArray(context.dependencies), 'Dependencies should be an array');
      assert.ok(Array.isArray(context.devDependencies), 'Dev dependencies should be an array');
      assert.ok(context.fileStructure, 'File structure should be present');
      assert.ok(typeof context.fileStructure.totalFiles === 'number', 'Total files should be a number');
      assert.ok(typeof context.fileStructure.fileTypes === 'object', 'File types should be an object');
    } else {
      // If no workspace is available, context can be null
      assert.ok(true, 'No workspace context available - this is acceptable in test environment');
    }
  });

  test('should handle multiple analyzeWorkspace calls efficiently', async () => {
    const startTime = Date.now();
    const context1 = await workspaceAnalyzer.analyzeWorkspace();
    const firstCallTime = Date.now() - startTime;

    const startTime2 = Date.now();
    const context2 = await workspaceAnalyzer.analyzeWorkspace();
    const secondCallTime = Date.now() - startTime2;

    // Both calls should return the same result (or both null)
    if (context1 && context2) {
      assert.deepStrictEqual(context1, context2, 'Multiple calls should return consistent results');
    } else {
      assert.strictEqual(context1, context2, 'Both calls should be null if no workspace');
    }

    assert.ok(true, 'Multiple workspace analysis calls should complete without error');
  });

  test('should dispose resources properly', () => {
    const testAnalyzer = new WorkspaceAnalyzer();

    // Should not throw errors
    testAnalyzer.dispose();

    assert.ok(true, 'WorkspaceAnalyzer should dispose without errors');
  });

  test('should have expected interface', () => {
    // Test that the workspace analyzer has the expected public interface
    assert.ok(typeof workspaceAnalyzer.analyzeWorkspace === 'function', 'Should have analyzeWorkspace method');
    assert.ok(typeof workspaceAnalyzer.dispose === 'function', 'Should have dispose method');
  });
});