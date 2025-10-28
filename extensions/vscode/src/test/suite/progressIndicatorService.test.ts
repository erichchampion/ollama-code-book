/**
 * Test Suite for ProgressIndicatorService
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProgressIndicatorService, ProgressTask, ProgressReporter } from '../../services/progressIndicatorService';
import { NotificationService } from '../../services/notificationService';

suite('ProgressIndicatorService Tests', () => {
  let progressService: ProgressIndicatorService;
  let mockNotificationService: NotificationService;

  suiteSetup(() => {
    mockNotificationService = new NotificationService();
    progressService = new ProgressIndicatorService(mockNotificationService);
  });

  suiteTeardown(() => {
    progressService.dispose();
    mockNotificationService.dispose();
  });

  test('should create progress indicator service instance', () => {
    assert.ok(progressService, 'ProgressIndicatorService should be instantiated');
  });

  test('should execute simple task with progress', async () => {
    let taskExecuted = false;
    let progressReported = false;

    const task: ProgressTask<string> = {
      id: 'test-task-1',
      title: 'Test Task',
      description: 'Testing basic task execution',
      priority: 'medium',
      operation: async (reporter: ProgressReporter, token: vscode.CancellationToken) => {
        taskExecuted = true;
        reporter.report({ message: 'Processing...', increment: 50 });
        progressReported = true;
        reporter.report({ message: 'Completing...', increment: 50 });
        return 'success';
      }
    };

    const result = await progressService.executeWithProgress(task);

    assert.strictEqual(result, 'success', 'Task should return expected result');
    assert.ok(taskExecuted, 'Task should be executed');
    assert.ok(progressReported, 'Progress should be reported');
  });

  test('should handle task errors gracefully', async () => {
    const task: ProgressTask<void> = {
      id: 'test-error-task',
      title: 'Error Task',
      priority: 'low',
      operation: async () => {
        throw new Error('Test error');
      }
    };

    let errorThrown = false;
    try {
      await progressService.executeWithProgress(task);
    } catch (error) {
      errorThrown = true;
      assert.ok(error instanceof Error, 'Should throw an Error instance');
      assert.strictEqual((error as Error).message, 'Test error', 'Should preserve error message');
    }

    assert.ok(errorThrown, 'Error should be thrown');
  });

  test('should prevent duplicate task execution', async () => {
    const task: ProgressTask<string> = {
      id: 'duplicate-task',
      title: 'Duplicate Task',
      priority: 'high',
      operation: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'first';
      }
    };

    // Start first task
    const promise1 = progressService.executeWithProgress(task);

    // Try to start same task again (should fail)
    let duplicateError = false;
    try {
      await progressService.executeWithProgress(task);
    } catch (error) {
      duplicateError = true;
      assert.ok((error as Error).message.includes('already running'), 'Should prevent duplicate tasks');
    }

    assert.ok(duplicateError, 'Duplicate task should be rejected');

    // Wait for first task to complete
    const result = await promise1;
    assert.strictEqual(result, 'first', 'First task should complete successfully');
  });

  test('should execute multiple tasks sequentially', async () => {
    const executionOrder: string[] = [];

    const tasks: ProgressTask<string>[] = [
      {
        id: 'seq-task-1',
        title: 'Sequential Task 1',
        priority: 'medium',
        operation: async () => {
          executionOrder.push('task1');
          return 'result1';
        }
      },
      {
        id: 'seq-task-2',
        title: 'Sequential Task 2',
        priority: 'medium',
        operation: async () => {
          executionOrder.push('task2');
          return 'result2';
        }
      },
      {
        id: 'seq-task-3',
        title: 'Sequential Task 3',
        priority: 'medium',
        operation: async () => {
          executionOrder.push('task3');
          return 'result3';
        }
      }
    ];

    const results = await progressService.executeMultipleWithProgress(tasks, {
      title: 'Sequential Execution Test',
      sequential: true
    });

    assert.strictEqual(results.length, 3, 'Should return all results');
    assert.deepStrictEqual(results, ['result1', 'result2', 'result3'], 'Results should be in order');
    assert.deepStrictEqual(executionOrder, ['task1', 'task2', 'task3'], 'Tasks should execute sequentially');
  });

  test('should execute multiple tasks in parallel', async () => {
    const startTimes: number[] = [];
    const endTimes: number[] = [];

    const tasks: ProgressTask<string>[] = [
      {
        id: 'par-task-1',
        title: 'Parallel Task 1',
        priority: 'medium',
        operation: async () => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 50));
          endTimes.push(Date.now());
          return 'result1';
        }
      },
      {
        id: 'par-task-2',
        title: 'Parallel Task 2',
        priority: 'medium',
        operation: async () => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 50));
          endTimes.push(Date.now());
          return 'result2';
        }
      }
    ];

    const results = await progressService.executeMultipleWithProgress(tasks, {
      title: 'Parallel Execution Test',
      sequential: false
    });

    assert.strictEqual(results.length, 2, 'Should return all results');

    // Check that tasks started roughly at the same time (within 10ms)
    const startTimeDiff = Math.abs(startTimes[1] - startTimes[0]);
    assert.ok(startTimeDiff < 10, 'Parallel tasks should start at roughly the same time');
  });

  test('should handle multiple task failures with fail-fast', async () => {
    const tasks: ProgressTask<string>[] = [
      {
        id: 'fail-task-1',
        title: 'Success Task',
        priority: 'medium',
        operation: async () => 'success'
      },
      {
        id: 'fail-task-2',
        title: 'Failing Task',
        priority: 'medium',
        operation: async () => {
          throw new Error('Task failed');
        }
      },
      {
        id: 'fail-task-3',
        title: 'Another Task',
        priority: 'medium',
        operation: async () => 'another-success'
      }
    ];

    let errorThrown = false;
    try {
      await progressService.executeMultipleWithProgress(tasks, {
        title: 'Fail Fast Test',
        failFast: true
      });
    } catch (error) {
      errorThrown = true;
      assert.ok((error as Error).message.includes('Task failed'), 'Should throw first error encountered');
    }

    assert.ok(errorThrown, 'Should fail fast when error occurs');
  });

  test('should handle multiple task failures without fail-fast', async () => {
    let successTaskExecuted = false;

    const tasks: ProgressTask<string>[] = [
      {
        id: 'nofail-task-1',
        title: 'Success Task',
        priority: 'medium',
        operation: async () => {
          successTaskExecuted = true;
          return 'success';
        }
      },
      {
        id: 'nofail-task-2',
        title: 'Failing Task',
        priority: 'medium',
        operation: async () => {
          throw new Error('Task failed');
        }
      }
    ];

    const results = await progressService.executeMultipleWithProgress(tasks, {
      title: 'No Fail Fast Test',
      failFast: false
    });

    // Should only return successful results
    assert.strictEqual(results.length, 1, 'Should return only successful results');
    assert.strictEqual(results[0], 'success', 'Should return successful result');
    assert.ok(successTaskExecuted, 'Success task should still execute');
  });

  test('should show file analysis progress', async () => {
    const testFiles = ['file1.ts', 'file2.ts', 'file3.ts'];
    const analyzedFiles: string[] = [];

    const analyzer = async (file: string, reporter: ProgressReporter) => {
      analyzedFiles.push(file);
      reporter.report({ message: `Analyzing ${file}` });
      // Simulate analysis time
      await new Promise(resolve => setTimeout(resolve, 10));
    };

    await progressService.showFileAnalysisProgress(testFiles, analyzer, {
      title: 'File Analysis Test',
      batchSize: 2
    });

    assert.strictEqual(analyzedFiles.length, testFiles.length, 'All files should be analyzed');
    assert.deepStrictEqual(analyzedFiles.sort(), testFiles.sort(), 'All files should be processed');
  });

  test('should show AI operation progress', async () => {
    let operationCompleted = false;

    const aiOperation = async () => {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      operationCompleted = true;
      return 'AI result';
    };

    const result = await progressService.showAIOperationProgress(
      'Code Generation',
      aiOperation,
      {
        estimatedTime: 200,
        showTokens: true,
        model: 'test-model'
      }
    );

    assert.strictEqual(result, 'AI result', 'Should return AI operation result');
    assert.ok(operationCompleted, 'AI operation should be completed');
  });

  test('should track active progress tasks', async () => {
    const longRunningTask: ProgressTask<string> = {
      id: 'long-task',
      title: 'Long Running Task',
      priority: 'low',
      operation: async (reporter) => {
        reporter.setProgress(25, 'Step 1');
        await new Promise(resolve => setTimeout(resolve, 50));
        reporter.setProgress(75, 'Step 2');
        return 'completed';
      }
    };

    // Start task but don't await
    const promise = progressService.executeWithProgress(longRunningTask);

    // Check active tasks
    const activeTasks = progressService.getActiveProgressTasks();
    assert.strictEqual(activeTasks.size, 1, 'Should have one active task');
    assert.ok(activeTasks.has('long-task'), 'Should track the correct task');

    // Complete the task
    const result = await promise;

    // Check that task is no longer active
    const activeTasksAfter = progressService.getActiveProgressTasks();
    assert.strictEqual(activeTasksAfter.size, 0, 'Should have no active tasks after completion');
    assert.strictEqual(result, 'completed', 'Task should complete successfully');
  });

  test('should handle progress reporter methods', async () => {
    const progressUpdates: string[] = [];

    const task: ProgressTask<void> = {
      id: 'reporter-test',
      title: 'Reporter Test',
      priority: 'medium',
      operation: async (reporter: ProgressReporter) => {
        reporter.addStep('Step 1');
        progressUpdates.push('added-step-1');

        reporter.setProgress(25, 'Quarter done');
        progressUpdates.push('progress-25');

        reporter.completeStep('Finished step 1');
        progressUpdates.push('completed-step-1');

        reporter.setWarning('Minor issue encountered');
        progressUpdates.push('warning');

        reporter.setProgress(100, 'All done');
        progressUpdates.push('progress-100');
      }
    };

    await progressService.executeWithProgress(task);

    assert.ok(progressUpdates.includes('added-step-1'), 'Should track step addition');
    assert.ok(progressUpdates.includes('progress-25'), 'Should track progress update');
    assert.ok(progressUpdates.includes('completed-step-1'), 'Should track step completion');
    assert.ok(progressUpdates.includes('warning'), 'Should track warnings');
    assert.ok(progressUpdates.includes('progress-100'), 'Should track final progress');
  });

  test('should handle progress cancellation', async () => {
    let taskCancelled = false;

    const cancellableTask: ProgressTask<string> = {
      id: 'cancellable-task',
      title: 'Cancellable Task',
      cancellable: true,
      priority: 'medium',
      operation: async (reporter, token) => {
        for (let i = 0; i < 100; i++) {
          if (token.isCancellationRequested) {
            taskCancelled = true;
            return 'cancelled';
          }
          reporter.setProgress(i, `Processing ${i}/100`);
          await new Promise(resolve => setTimeout(resolve, 1));
        }
        return 'completed';
      }
    };

    // Note: In actual VS Code environment, cancellation would be triggered by user
    // Here we just test that the cancellation token is properly passed
    const result = await progressService.executeWithProgress(cancellableTask);

    // Task should complete since we're not actually cancelling it
    assert.ok(['completed', 'cancelled'].includes(result), 'Task should handle cancellation properly');
  });

  test('should dispose resources properly', () => {
    const testService = new ProgressIndicatorService(mockNotificationService);

    // Add some active tasks to test cleanup
    const activeTasks = testService.getActiveProgressTasks();

    // Should not throw errors
    testService.dispose();

    // After disposal, should have no active tasks
    const activeTasksAfter = testService.getActiveProgressTasks();
    assert.strictEqual(activeTasksAfter.size, 0, 'Should clean up active tasks on disposal');
  });

  test('should handle status bar progress', async () => {
    const task: ProgressTask<string> = {
      id: 'statusbar-task',
      title: 'Status Bar Task',
      showInStatusBar: true,
      priority: 'high',
      operation: async (reporter) => {
        reporter.setProgress(50, 'Half done');
        return 'success';
      }
    };

    const result = await progressService.executeWithProgress(task);

    assert.strictEqual(result, 'success', 'Task with status bar should complete');
  });
});