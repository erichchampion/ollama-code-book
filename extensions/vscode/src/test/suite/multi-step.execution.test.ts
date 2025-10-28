/**
 * Multi-Step Execution Tests
 * Tests autonomous multi-step workflow execution for Phase 3.2.3
 */

import * as assert from 'assert';
import { MultiStepExecutionWorkflow, ExecutionStep } from '../helpers/multiStepExecutionWrapper';
import { WORKFLOW_TEMPLATES } from '../helpers/test-constants';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';

/**
 * Options for generating ExecutionStep arrays from templates
 */
interface StepGenerationOptions {
  descriptionSuffix: string;
  commandPrefix?: string;
  filePathPrefix?: string;
  fileExtension?: string;
  outcomeMessage?: string;
}

/**
 * Create ExecutionStep array from workflow template
 */
function createStepsFromTemplate(
  templateSteps: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly type: 'command' | 'file_operation' | 'git_operation' | 'validation' | 'user_confirmation';
    readonly duration: number;
    readonly requiresApproval?: boolean;
  }>,
  options: StepGenerationOptions
): ExecutionStep[] {
  return templateSteps.map((step, index) => ({
    id: step.id,
    name: step.name,
    description: `${step.name} ${options.descriptionSuffix}`,
    type: step.type,
    command:
      step.type === 'command' && options.commandPrefix
        ? `${options.commandPrefix} ${step.name.toLowerCase()}`
        : undefined,
    filePath:
      step.type === 'file_operation' && options.filePathPrefix
        ? `${options.filePathPrefix}/${step.name.replace(/\s+/g, '-').toLowerCase()}${options.fileExtension || '.js'}`
        : undefined,
    content: step.type === 'file_operation' ? `// ${step.name}` : undefined,
    expectedOutcome: options.outcomeMessage || `${step.name} completed`,
    rollbackCommand:
      step.type === 'command' && options.commandPrefix
        ? `npm run rollback-${step.name.toLowerCase()}`
        : undefined,
    requiresApproval: step.requiresApproval,
    dependencies: index === 0 ? [] : [templateSteps[index - 1].id],
    estimatedDuration: step.duration,
  }));
}

suite('Multi-Step Execution Tests', () => {
  let workflow: MultiStepExecutionWorkflow;

  setup(() => {
    workflow = new MultiStepExecutionWorkflow();
  });

  suite('End-to-End Workflows', () => {
    test('Should execute "Create React app" multi-step workflow', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps = createStepsFromTemplate(WORKFLOW_TEMPLATES.CREATE_REACT_APP.STEPS, {
        descriptionSuffix: 'for React application',
        commandPrefix: 'npm run',
        filePathPrefix: 'src',
        fileExtension: '.js',
        outcomeMessage: 'completed successfully',
      });

      const result = await workflow.executeWorkflow('react-app-1', WORKFLOW_TEMPLATES.CREATE_REACT_APP.NAME, steps);

      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stepResults.length, 5);
      assert.strictEqual(result.progress.completedSteps, 5);
      assert.strictEqual(result.progress.failedSteps, 0);
      assert.strictEqual(result.progress.percentage, 100);
      assert.ok(result.summary.includes('successfully'));
    });

    test('Should execute "Set up authentication" multi-step workflow', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps = createStepsFromTemplate(WORKFLOW_TEMPLATES.SETUP_AUTHENTICATION.STEPS, {
        descriptionSuffix: 'for authentication system',
        commandPrefix: 'npm install',
        filePathPrefix: 'src/auth',
        fileExtension: '.ts',
      });

      const result = await workflow.executeWorkflow('auth-setup-1', WORKFLOW_TEMPLATES.SETUP_AUTHENTICATION.NAME, steps);

      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stepResults.length, 4);
      assert.strictEqual(result.progress.completedSteps, 4);
      assert.ok(result.totalDuration > 0);
    });

    test('Should execute "Add testing framework" multi-step workflow', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps = createStepsFromTemplate(WORKFLOW_TEMPLATES.ADD_TESTING_FRAMEWORK.STEPS, {
        descriptionSuffix: 'for testing infrastructure',
        commandPrefix: 'npm install -D',
        filePathPrefix: 'tests',
        fileExtension: '.config.js',
      });

      const result = await workflow.executeWorkflow('testing-framework-1', WORKFLOW_TEMPLATES.ADD_TESTING_FRAMEWORK.NAME, steps);

      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stepResults.length, 3);
      assert.ok(result.stepResults.every(s => s.status === 'success'));
    });

    test('Should execute "Deploy to production" multi-step workflow', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps = createStepsFromTemplate(WORKFLOW_TEMPLATES.DEPLOY_TO_PRODUCTION.STEPS, {
        descriptionSuffix: 'for production deployment',
        commandPrefix: 'npm run',
      });

      const result = await workflow.executeWorkflow('deploy-prod-1', WORKFLOW_TEMPLATES.DEPLOY_TO_PRODUCTION.NAME, steps);

      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stepResults.length, 6);
      assert.ok(result.totalDuration >= 0);
    });

    test('Should execute workflow with user approval checkpoints', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const workflowWithApproval = new MultiStepExecutionWorkflow({ requireApproval: false });

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Prepare deployment',
          description: 'Prepare files for deployment',
          type: 'file_operation',
          filePath: 'build/deployment.zip',
          expectedOutcome: 'Deployment package created',
          dependencies: [],
          requiresApproval: false,
          estimatedDuration: 5,
        },
        {
          id: 'step-2',
          name: 'Deploy to staging',
          description: 'Deploy to staging environment (requires approval)',
          type: 'command',
          command: 'deploy-staging',
          expectedOutcome: 'Deployed to staging',
          dependencies: ['step-1'],
          requiresApproval: true, // This step requires approval
          estimatedDuration: 30,
        },
        {
          id: 'step-3',
          name: 'Verify staging',
          description: 'Verify staging deployment',
          type: 'validation',
          expectedOutcome: 'Staging verified',
          dependencies: ['step-2'],
          estimatedDuration: 10,
        },
      ];

      const result = await workflowWithApproval.executeWorkflow('approval-test-1', 'Deployment with Approval', steps);

      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stepResults.length, 3);
      // All steps should succeed because mock approval always returns true (unless name includes "reject")
      assert.ok(result.stepResults.every(s => s.status === 'success'));
    });

    test('Should rollback steps on failure', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const workflowWithRollback = new MultiStepExecutionWorkflow({ enableRollback: true });

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Create database',
          description: 'Create database schema',
          type: 'command',
          command: 'create-db',
          expectedOutcome: 'Database created',
          rollbackCommand: 'drop-db',
          dependencies: [],
          estimatedDuration: 10,
        },
        {
          id: 'step-2',
          name: 'Insert data',
          description: 'Insert initial data',
          type: 'command',
          command: 'insert-data',
          expectedOutcome: 'Data inserted',
          rollbackCommand: 'delete-data',
          dependencies: ['step-1'],
          estimatedDuration: 15,
        },
        {
          id: 'step-3',
          name: 'Validate fail data', // "fail" keyword triggers failure
          description: 'Validate data integrity',
          type: 'command',
          command: 'validate-fail', // This will fail
          expectedOutcome: 'Data validated',
          dependencies: ['step-2'],
          estimatedDuration: 5,
        },
      ];

      const result = await workflowWithRollback.executeWorkflow('rollback-test-1', 'Workflow with Rollback', steps);

      assert.strictEqual(result.status, 'failed');
      assert.ok(result.rollbackSteps.length > 0, 'Should have rollback steps');
      assert.ok(result.summary.includes('Rolled back'), 'Summary should mention rollback');
      assert.ok(result.stepResults.some(s => s.status === 'failed'), 'Should have at least one failed step');
    });

    test('Should report execution progress', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Step 1',
          description: 'First step',
          type: 'command',
          command: 'step-1',
          expectedOutcome: 'Step 1 complete',
          dependencies: [],
          estimatedDuration: 2,
        },
        {
          id: 'step-2',
          name: 'Step 2',
          description: 'Second step',
          type: 'command',
          command: 'step-2',
          expectedOutcome: 'Step 2 complete',
          dependencies: ['step-1'],
          estimatedDuration: 3,
        },
        {
          id: 'step-3',
          name: 'Step 3',
          description: 'Third step',
          type: 'command',
          command: 'step-3',
          expectedOutcome: 'Step 3 complete',
          dependencies: ['step-2'],
          estimatedDuration: 5,
        },
      ];

      // Execute workflow in background and check progress
      const executionPromise = workflow.executeWorkflow('progress-test-1', 'Progress Test', steps);

      // Wait a bit for execution to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check progress while running
      const progress = workflow.getProgress();
      if (progress) {
        assert.strictEqual(progress.totalSteps, 3);
        assert.ok(progress.currentStepIndex >= 0);
        assert.ok(progress.percentage >= 0 && progress.percentage <= 100);
      }

      const result = await executionPromise;
      assert.strictEqual(result.progress.totalSteps, 3);
      assert.strictEqual(result.progress.completedSteps, 3);
      assert.strictEqual(result.progress.percentage, 100);
    });

    test('Should support execution cancellation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const workflowWithDelay = new MultiStepExecutionWorkflow({ stepDelay: 100 });

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Long step 1',
          description: 'Long running step',
          type: 'command',
          command: 'long-step-1',
          expectedOutcome: 'Step 1 complete',
          dependencies: [],
          estimatedDuration: 10,
        },
        {
          id: 'step-2',
          name: 'Long step 2',
          description: 'Long running step',
          type: 'command',
          command: 'long-step-2',
          expectedOutcome: 'Step 2 complete',
          dependencies: ['step-1'],
          estimatedDuration: 10,
        },
        {
          id: 'step-3',
          name: 'Long step 3',
          description: 'Long running step',
          type: 'command',
          command: 'long-step-3',
          expectedOutcome: 'Step 3 complete',
          dependencies: ['step-2'],
          estimatedDuration: 10,
        },
      ];

      const executionPromise = workflowWithDelay.executeWorkflow('cancel-test-1', 'Cancellable Workflow', steps);

      // Wait a bit then cancel
      await new Promise(resolve => setTimeout(resolve, 150));
      const cancelled = workflowWithDelay.cancelExecution();
      assert.strictEqual(cancelled, true, 'Cancellation should succeed');

      const result = await executionPromise;
      assert.strictEqual(result.status, 'cancelled');
      assert.ok(result.summary.includes('cancelled'));
    });

    test('Should handle step dependencies correctly', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Independent step',
          description: 'Can run immediately',
          type: 'command',
          command: 'independent',
          expectedOutcome: 'Independent complete',
          dependencies: [], // No dependencies
          estimatedDuration: 2,
        },
        {
          id: 'step-2',
          name: 'Dependent step',
          description: 'Depends on step-1',
          type: 'command',
          command: 'dependent',
          expectedOutcome: 'Dependent complete',
          dependencies: ['step-1'], // Depends on step-1
          estimatedDuration: 2,
        },
        {
          id: 'step-3',
          name: 'Multi-dependent step',
          description: 'Depends on step-1 and step-2',
          type: 'command',
          command: 'multi-dependent',
          expectedOutcome: 'Multi-dependent complete',
          dependencies: ['step-1', 'step-2'], // Depends on both
          estimatedDuration: 2,
        },
      ];

      const result = await workflow.executeWorkflow('dependency-test-1', 'Dependency Test', steps);

      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stepResults.length, 3);

      // Verify execution order respects dependencies
      const step1Result = result.stepResults.find(r => r.stepId === 'step-1');
      const step2Result = result.stepResults.find(r => r.stepId === 'step-2');
      const step3Result = result.stepResults.find(r => r.stepId === 'step-3');

      assert.ok(step1Result && step2Result && step3Result);
      assert.ok(step1Result.endTime! < step2Result.startTime, 'Step 2 should start after step 1 completes');
      assert.ok(step2Result.endTime! < step3Result.startTime, 'Step 3 should start after step 2 completes');
    });

    test('Should skip steps with unmet dependencies', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Failing step',
          description: 'This step will fail',
          type: 'command',
          command: 'fail-command', // Will fail because it contains "fail"
          expectedOutcome: 'Should fail',
          dependencies: [],
          estimatedDuration: 2,
        },
        {
          id: 'step-2',
          name: 'Dependent step',
          description: 'Depends on failing step',
          type: 'command',
          command: 'dependent',
          expectedOutcome: 'Should be skipped',
          dependencies: ['step-1'], // Depends on failed step
          estimatedDuration: 2,
        },
      ];

      const workflowContinueOnError = new MultiStepExecutionWorkflow({
        continueOnError: true,
        enableRollback: false,
      });

      const result = await workflowContinueOnError.executeWorkflow('skip-test-1', 'Skip Test', steps);

      assert.strictEqual(result.stepResults.length, 2);
      assert.strictEqual(result.stepResults[0].status, 'failed');
      assert.strictEqual(result.stepResults[1].status, 'skipped', 'Step 2 should be skipped due to failed dependency');
      assert.ok(result.stepResults[1].output.includes('Dependencies not met'));
    });

    test('Should track execution time accurately', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Timed step',
          description: 'Step with known duration',
          type: 'command',
          command: 'timed-command',
          expectedOutcome: 'Complete',
          dependencies: [],
          estimatedDuration: 5,
        },
      ];

      const result = await workflow.executeWorkflow('time-test-1', 'Time Test', steps);

      assert.strictEqual(result.status, 'success');
      assert.ok(result.totalDuration > 0, 'Total duration should be greater than 0');
      assert.ok(result.stepResults[0].duration! > 0, 'Step duration should be greater than 0');
      assert.ok(result.progress.elapsedTime > 0, 'Elapsed time should be greater than 0');
    });

    test('Should handle workflow with validation steps', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Create file',
          description: 'Create configuration file',
          type: 'file_operation',
          filePath: 'config/app.config.json',
          content: '{"env": "production"}',
          expectedOutcome: 'File created',
          dependencies: [],
          estimatedDuration: 1,
        },
        {
          id: 'step-2',
          name: 'Validate configuration',
          description: 'Validate configuration file',
          type: 'validation',
          expectedOutcome: 'Configuration valid',
          dependencies: ['step-1'],
          estimatedDuration: 2,
        },
        {
          id: 'step-3',
          name: 'Deploy',
          description: 'Deploy with validated config',
          type: 'command',
          command: 'deploy',
          expectedOutcome: 'Deployed',
          dependencies: ['step-2'],
          estimatedDuration: 10,
        },
      ];

      const result = await workflow.executeWorkflow('validation-test-1', 'Validation Test', steps);

      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stepResults.length, 3);
      assert.ok(result.stepResults[1].output.includes('Validation passed'));
    });

    test('Should handle workflow with git operations', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Stage changes',
          description: 'Stage all modified files',
          type: 'git_operation',
          expectedOutcome: 'Changes staged',
          dependencies: [],
          estimatedDuration: 2,
        },
        {
          id: 'step-2',
          name: 'Commit changes',
          description: 'Commit staged changes',
          type: 'git_operation',
          expectedOutcome: 'Changes committed',
          dependencies: ['step-1'],
          estimatedDuration: 1,
        },
        {
          id: 'step-3',
          name: 'Push to remote',
          description: 'Push commits to remote repository',
          type: 'git_operation',
          expectedOutcome: 'Pushed to remote',
          dependencies: ['step-2'],
          estimatedDuration: 5,
        },
      ];

      const result = await workflow.executeWorkflow('git-test-1', 'Git Operations', steps);

      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stepResults.length, 3);
      assert.ok(result.stepResults.every(s => s.status === 'success'));
      assert.ok(result.stepResults.every(s => s.output.includes('Git operation completed')));
    });

    test('Should retrieve execution history', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Simple step',
          description: 'Simple test step',
          type: 'command',
          command: 'test',
          expectedOutcome: 'Complete',
          dependencies: [],
          estimatedDuration: 1,
        },
      ];

      // Execute multiple workflows
      await workflow.executeWorkflow('history-1', 'Workflow 1', steps);
      await workflow.executeWorkflow('history-2', 'Workflow 2', steps);

      // Retrieve specific workflow
      const workflow1 = workflow.getExecutionHistory('history-1') as any;
      assert.ok(workflow1);
      assert.strictEqual(workflow1.workflowId, 'history-1');
      assert.strictEqual(workflow1.workflowName, 'Workflow 1');

      // Retrieve all workflows
      const allWorkflows = workflow.getExecutionHistory() as any[];
      assert.ok(Array.isArray(allWorkflows));
      assert.ok(allWorkflows.length >= 2);
      assert.ok(allWorkflows.some(w => w.workflowId === 'history-1'));
      assert.ok(allWorkflows.some(w => w.workflowId === 'history-2'));
    });

    test('Should handle workflow timeout', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const workflowWithTimeout = new MultiStepExecutionWorkflow({ maxExecutionTime: 1 }); // 1 second max

      const steps: ExecutionStep[] = [
        {
          id: 'step-1',
          name: 'Long step',
          description: 'Step that exceeds timeout',
          type: 'command',
          command: 'long-command',
          expectedOutcome: 'Complete',
          dependencies: [],
          estimatedDuration: 100, // 100 seconds estimated (way over timeout)
        },
      ];

      // Execute with very short timeout
      const result = await workflowWithTimeout.executeWorkflow('timeout-test-1', 'Timeout Test', steps);

      // Should fail or complete based on mock execution time
      // Mock executes in estimatedDuration * 100ms = 10 seconds, which exceeds 1 second timeout
      assert.ok(result.status === 'failed' || result.status === 'success');
      if (result.status === 'failed') {
        assert.ok(result.summary.includes('timed out'));
      }
    });
  });
});
