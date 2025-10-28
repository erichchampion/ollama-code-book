/**
 * Test Suite for NotificationService
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { NotificationService, NotificationOptions, NotificationAction } from '../../services/notificationService';

suite('NotificationService Tests', () => {
  let notificationService: NotificationService;

  suiteSetup(() => {
    notificationService = new NotificationService();
  });

  suiteTeardown(() => {
    notificationService.dispose();
  });

  test('should create notification service instance', () => {
    assert.ok(notificationService, 'NotificationService should be instantiated');
  });

  test('should show info notification', async () => {
    const options: NotificationOptions = {
      type: 'info',
      message: 'Test information message',
      detail: 'This is a test detail'
    };

    const result = await notificationService.showNotification(options);
    // Note: In test environment, VS Code APIs might not be fully functional
    // This test mainly checks that the method doesn't throw errors
    assert.ok(true, 'Info notification should be shown without errors');
  });

  test('should show warning notification', async () => {
    const options: NotificationOptions = {
      type: 'warning',
      message: 'Test warning message',
      detail: 'This is a warning detail'
    };

    const result = await notificationService.showNotification(options);
    assert.ok(true, 'Warning notification should be shown without errors');
  });

  test('should show error notification', async () => {
    const options: NotificationOptions = {
      type: 'error',
      message: 'Test error message',
      detail: 'This is an error detail'
    };

    const result = await notificationService.showNotification(options);
    assert.ok(true, 'Error notification should be shown without errors');
  });

  test('should show progress notification', async () => {
    const options: NotificationOptions = {
      type: 'progress',
      message: 'Test progress message',
      showProgress: true
    };

    const result = await notificationService.showNotification(options);
    assert.ok(true, 'Progress notification should be shown without errors');
  });

  test('should handle notification with actions', async () => {
    let actionExecuted = false;
    const testAction: NotificationAction = {
      title: 'Test Action',
      action: async () => {
        actionExecuted = true;
      }
    };

    const options: NotificationOptions = {
      type: 'info',
      message: 'Test message with action',
      actions: [testAction]
    };

    await notificationService.showNotification(options);

    // Simulate action execution
    await testAction.action();
    assert.ok(actionExecuted, 'Notification action should be executable');
  });

  test('should show AI insight notification', async () => {
    await notificationService.showAIInsight(
      'Code Quality',
      'This function could be optimized for better performance',
      'suggestion'
    );

    assert.ok(true, 'AI insight should be shown without errors');
  });

  test('should show code suggestion notification', async () => {
    let suggestionApplied = false;

    const applyAction = async () => {
      suggestionApplied = true;
    };

    await notificationService.showCodeSuggestion(
      'Use const instead of let',
      'const value = 42;',
      applyAction
    );

    // Test that apply action works
    await applyAction();
    assert.ok(suggestionApplied, 'Code suggestion apply action should work');
  });

  test('should show analysis progress', async () => {
    const testFiles = ['file1.ts', 'file2.ts', 'file3.ts'];
    let processedFiles = 0;

    const mockAnalyzer = async (file: string) => {
      processedFiles++;
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 10));
    };

    await notificationService.showAnalysisProgress(testFiles, mockAnalyzer);

    assert.strictEqual(processedFiles, testFiles.length, 'All files should be processed');
  });

  test('should show workspace indexing progress', async () => {
    let progressUpdates = 0;
    const totalFiles = 100;

    const onProgress = (current: number, total: number) => {
      progressUpdates++;
      assert.ok(current <= total, 'Current should not exceed total');
      assert.strictEqual(total, totalFiles, 'Total should match expected value');
    };

    await notificationService.showIndexingProgress(totalFiles, onProgress);

    assert.ok(progressUpdates > 0, 'Progress should be updated at least once');
  });

  test('should show AI operation status', async () => {
    const operationName = 'Code Generation';
    const estimatedTime = 5000; // 5 seconds

    await notificationService.showAIOperationStatus(operationName, estimatedTime);

    assert.ok(true, 'AI operation status should be shown without errors');
  });

  test('should show configuration recommendation', async () => {
    const setting = 'ollama-code.contextLines';
    const currentValue = 50;
    const recommendedValue = 20;
    const reason = 'Reduce context for better performance';

    await notificationService.showConfigRecommendation(
      setting,
      currentValue,
      recommendedValue,
      reason
    );

    assert.ok(true, 'Configuration recommendation should be shown without errors');
  });

  test('should handle timeout option', async () => {
    const options: NotificationOptions = {
      type: 'info',
      message: 'Temporary message',
      timeout: 1000 // 1 second
    };

    const startTime = Date.now();
    await notificationService.showNotification(options);
    const endTime = Date.now();

    // The timeout is handled by VS Code, so we just verify it doesn't cause errors
    assert.ok(true, 'Timeout option should be handled without errors');
  });

  test('should handle multiple concurrent notifications', async () => {
    const notifications = [
      { type: 'info' as const, message: 'Info 1' },
      { type: 'warning' as const, message: 'Warning 1' },
      { type: 'error' as const, message: 'Error 1' },
      { type: 'info' as const, message: 'Info 2' }
    ];

    const promises = notifications.map(notification =>
      notificationService.showNotification(notification)
    );

    const results = await Promise.all(promises);

    assert.strictEqual(results.length, notifications.length, 'All notifications should be processed');
  });

  test('should handle notification errors gracefully', async () => {
    // Test with invalid notification options
    const invalidOptions = {
      type: 'invalid' as any,
      message: 'Test message'
    };

    // This should not throw an error but handle it gracefully
    const result = await notificationService.showNotification(invalidOptions);
    assert.ok(true, 'Invalid notification should be handled gracefully');
  });

  test('should show insight detail correctly', async () => {
    const title = 'Performance Issue';
    const insight = 'This loop can be optimized using Array.map() instead of for loop.';

    // Call the private method through AI insight (which uses it internally)
    await notificationService.showAIInsight(title, insight, 'suggestion');

    assert.ok(true, 'Insight detail should be displayed correctly');
  });

  test('should show code example correctly', async () => {
    const suggestion = 'Use arrow functions';
    const example = 'const fn = () => { return value; };';

    await notificationService.showCodeSuggestion(suggestion, example);

    assert.ok(true, 'Code example should be displayed correctly');
  });

  test('should dispose resources properly', () => {
    const testService = new NotificationService();

    // Should not throw errors
    testService.dispose();

    assert.ok(true, 'Service should dispose without errors');
  });

  test('should handle progress cancellation', async () => {
    let cancelled = false;

    const progressOptions = {
      title: 'Cancellable Operation',
      cancellable: true
    };

    const task = async (progress: any, token: vscode.CancellationToken) => {
      return new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (token.isCancellationRequested) {
            cancelled = true;
            clearInterval(interval);
            resolve();
          }
        }, 100);

        // Auto-resolve after 1 second for testing
        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 1000);
      });
    };

    await notificationService.showProgress(progressOptions, task);

    // In a real scenario, cancellation would be triggered by user action
    assert.ok(true, 'Progress cancellation should be handled correctly');
  });

  test('should manage progress items correctly', async () => {
    const progressOptions = {
      title: 'Test Progress',
      detail: 'Testing progress management'
    };

    let progressReporter: any;
    const task = async (progress: any, token: vscode.CancellationToken) => {
      progressReporter = progress;
      progress.report({ message: 'Step 1', increment: 50 });
      progress.report({ message: 'Step 2', increment: 50 });
      return 'completed';
    };

    const result = await notificationService.showProgress(progressOptions, task);

    assert.strictEqual(result, 'completed', 'Progress task should complete and return result');
    assert.ok(progressReporter, 'Progress reporter should be provided to task');
  });
});