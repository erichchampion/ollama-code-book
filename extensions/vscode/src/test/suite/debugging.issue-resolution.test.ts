/**
 * Debugging & Issue Resolution Tests
 * Tests autonomous debugging capabilities for Phase 3.2.2
 *
 * Test Coverage:
 * - Root Cause Analysis (10 tests)
 * - Solution Generation (10 tests)
 */

import * as assert from 'assert';
import { DebuggingIssueResolutionWorkflow, ErrorContext } from '../helpers/debuggingIssueResolutionWrapper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';

suite('Debugging & Issue Resolution Tests', () => {
  let workflow: DebuggingIssueResolutionWorkflow;

  setup(() => {
    workflow = new DebuggingIssueResolutionWorkflow();
  });

  suite('Root Cause Analysis', () => {
    test('Should parse error stack trace correctly', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Cannot read property "id" of undefined',
        stackTrace: [
          'at getUserData (src/users/userService.ts:45:12)',
          'at processUser (src/users/userProcessor.ts:23:15)',
          'at main (src/index.ts:10:3)',
        ],
        filePath: 'src/users/userService.ts',
        lineNumber: 45,
        codeContext: 'const userId = user.id;',
        errorType: 'TypeError',
      };

      const diagnosis = await workflow.diagnoseRootCause(errorContext);

      assert.ok(diagnosis, 'Should return diagnosis');
      assert.strictEqual(diagnosis.category, 'null_pointer', 'Should categorize as null_pointer error');
      assert.ok(diagnosis.relatedLocations.length >= 3, 'Should identify multiple related locations from stack trace');
      assert.ok(
        diagnosis.relatedLocations.some((loc) => loc.file.includes('userService.ts')),
        'Should include error location'
      );
      assert.ok(
        diagnosis.relatedLocations.some((loc) => loc.file.includes('userProcessor.ts')),
        'Should include calling location'
      );
    });

    test('Should diagnose null pointer errors', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Cannot read property "name" of null',
        stackTrace: ['at getUserName (src/utils.ts:10:5)'],
        filePath: 'src/utils.ts',
        lineNumber: 10,
        codeContext: 'return user.name;',
        errorType: 'TypeError',
      };

      const diagnosis = await workflow.diagnoseRootCause(errorContext);

      assert.strictEqual(diagnosis.category, 'null_pointer');
      assert.ok(diagnosis.primaryCause.includes('null'), 'Primary cause should mention null');
      assert.ok(diagnosis.confidence > 50, 'Should have reasonable confidence');
      assert.ok(diagnosis.evidence.length > 0, 'Should provide evidence');
    });

    test('Should diagnose type errors', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'user.getData is not a function',
        stackTrace: ['at fetchUserData (src/api.ts:25:10)'],
        filePath: 'src/api.ts',
        lineNumber: 25,
        codeContext: 'const data = user.getData();',
        errorType: 'TypeError',
      };

      const diagnosis = await workflow.diagnoseRootCause(errorContext);

      assert.strictEqual(diagnosis.category, 'type_error');
      assert.ok(diagnosis.primaryCause.includes('not a function') || diagnosis.primaryCause.includes('type_error'));
      assert.ok(diagnosis.confidence >= 50);
    });

    test('Should diagnose async/await errors', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Unhandled promise rejection: Failed to fetch data',
        stackTrace: ['at fetchData (src/api.ts:15:5)', 'at async loadData (src/data.ts:30:10)'],
        filePath: 'src/api.ts',
        lineNumber: 15,
        codeContext: 'const response = fetch(url);',
        errorType: 'UnhandledPromiseRejection',
      };

      const diagnosis = await workflow.diagnoseRootCause(errorContext);

      assert.strictEqual(diagnosis.category, 'async_error');
      assert.ok(diagnosis.primaryCause.toLowerCase().includes('async') || diagnosis.primaryCause.toLowerCase().includes('promise'));
      assert.ok(
        diagnosis.contributingFactors.some((f) => f.toLowerCase().includes('await') || f.toLowerCase().includes('promise')),
        'Should identify missing await as contributing factor'
      );
    });

    test('Should detect memory leak patterns', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'JavaScript heap out of memory',
        stackTrace: ['at allocateMemory (src/memory.ts:100:5)'],
        filePath: 'src/memory.ts',
        lineNumber: 100,
        codeContext: 'const largeArray = new Array(1000000);',
        errorType: 'RangeError',
      };

      const diagnosis = await workflow.diagnoseRootCause(errorContext);

      assert.strictEqual(diagnosis.category, 'memory_leak');
      assert.ok(diagnosis.primaryCause.toLowerCase().includes('memory'));
    });

    test('Should identify contributing factors', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Cannot read property "data" of undefined',
        stackTrace: Array(15).fill('at someFunction (src/deep.ts:50:10)'), // Deep stack
        filePath: 'src/api.ts',
        lineNumber: 20,
        codeContext: 'async function getData() {\n  const result = fetchData();\n  return result.data;\n}',
        errorType: 'TypeError',
      };

      const diagnosis = await workflow.diagnoseRootCause(errorContext);

      assert.ok(diagnosis.contributingFactors.length > 0, 'Should identify contributing factors');
      assert.ok(
        diagnosis.contributingFactors.some((f) => f.toLowerCase().includes('await') || f.toLowerCase().includes('stack')),
        'Should identify deep stack or missing await'
      );
    });

    test('Should calculate confidence scores', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const highConfidenceContext: ErrorContext = {
        message: 'Cannot read property "id" of undefined',
        stackTrace: ['at function1 (file1.ts:10:5)', 'at function2 (file2.ts:20:5)'],
        filePath: 'file1.ts',
        lineNumber: 10,
        codeContext: 'const longCodeContextThatProvidesGoodInformation = user.id; // More than 50 chars',
        errorType: 'TypeError',
      };

      const diagnosis = await workflow.diagnoseRootCause(highConfidenceContext);

      assert.ok(diagnosis.confidence >= 70, `Confidence should be high with good context, got ${diagnosis.confidence}`);
      assert.ok(diagnosis.confidence <= 95, 'Confidence should not exceed maximum');
    });

    test('Should provide evidence for diagnosis', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'null reference',
        stackTrace: ['at method (file.ts:10:5)'],
        filePath: 'file.ts',
        lineNumber: 10,
        codeContext: 'const value = null; return value.property;',
        errorType: 'TypeError',
      };

      const diagnosis = await workflow.diagnoseRootCause(errorContext);

      assert.ok(diagnosis.evidence.length > 0, 'Should provide evidence');
      assert.ok(
        diagnosis.evidence.some((e) => e.includes('TypeError') || e.includes('error message')),
        'Evidence should include error details'
      );
    });

    test('Should find related code locations', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Error in processing',
        stackTrace: [
          'at processData (src/processor.ts:25:10)',
          'at handleData (src/handler.ts:40:5)',
          'at main (src/index.ts:15:3)',
        ],
        filePath: 'src/processor.ts',
        lineNumber: 25,
        codeContext: 'processData(data);',
        errorType: 'Error',
      };

      const diagnosis = await workflow.diagnoseRootCause(errorContext);

      assert.ok(diagnosis.relatedLocations.length >= 2, 'Should find multiple related locations');
      assert.strictEqual(diagnosis.relatedLocations[0].file, errorContext.filePath, 'First location should be error site');
      assert.strictEqual(diagnosis.relatedLocations[0].line, errorContext.lineNumber);
    });

    test('Should handle errors with minimal context', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const minimalContext: ErrorContext = {
        message: 'Unknown error',
        stackTrace: [],
        filePath: 'unknown.ts',
        lineNumber: 1,
        codeContext: '',
        errorType: 'Error',
      };

      const diagnosis = await workflow.diagnoseRootCause(minimalContext);

      assert.ok(diagnosis, 'Should still provide diagnosis with minimal context');
      assert.ok(diagnosis.confidence < 70, 'Confidence should be lower with minimal context');
      assert.strictEqual(diagnosis.category, 'logic_error', 'Should default to logic_error for unknown errors');
    });
  });

  suite('Solution Generation', () => {
    test('Should generate multiple fix alternatives', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Cannot read property "id" of undefined',
        stackTrace: ['at getUserId (src/user.ts:10:5)'],
        filePath: 'src/user.ts',
        lineNumber: 10,
        codeContext: 'return user.id;',
        errorType: 'TypeError',
      };

      const workflow3Solutions = new DebuggingIssueResolutionWorkflow({ maxSolutions: 3 });
      const result = await workflow3Solutions.resolveIssue(errorContext);

      assert.strictEqual(result.solutions.length, 3, 'Should generate 3 solutions');
      assert.ok(result.solutions[0].id, 'Each solution should have an ID');
      assert.ok(result.solutions[1].id, 'Each solution should have an ID');
      assert.ok(result.solutions[2].id, 'Each solution should have an ID');
      assert.notStrictEqual(result.solutions[0].id, result.solutions[1].id, 'Solutions should have unique IDs');
    });

    test('Should rank solutions by safety and effectiveness', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Cannot read property "name" of null',
        stackTrace: ['at getName (src/utils.ts:15:5)'],
        filePath: 'src/utils.ts',
        lineNumber: 15,
        codeContext: 'return obj.name;',
        errorType: 'TypeError',
      };

      const result = await workflow.resolveIssue(errorContext);

      assert.ok(result.solutions.length > 0, 'Should generate at least one solution');

      // Verify solutions are ranked (first should have highest score)
      for (let i = 0; i < result.solutions.length - 1; i++) {
        assert.ok(
          result.solutions[i].score >= result.solutions[i + 1].score,
          `Solution ${i} score should be >= solution ${i + 1} score`
        );
      }

      // Verify score is calculated from safety and effectiveness
      const firstSolution = result.solutions[0];
      const expectedScore = (firstSolution.safetyRating + firstSolution.effectivenessRating) / 2;
      assert.strictEqual(firstSolution.score, expectedScore, 'Score should be average of safety and effectiveness');
    });

    test('Should generate rollback plans', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Type error',
        stackTrace: ['at func (file.ts:10:5)'],
        filePath: 'file.ts',
        lineNumber: 10,
        codeContext: 'code;',
        errorType: 'TypeError',
      };

      const result = await workflow.resolveIssue(errorContext);

      assert.ok(result.solutions[0].rollbackPlan, 'Should provide rollback plan');
      assert.ok(result.solutions[0].rollbackPlan.length > 10, 'Rollback plan should have meaningful content');
      assert.ok(result.solutions[0].rollbackPlan.toLowerCase().includes('revert'), 'Rollback plan should mention reverting');
    });

    test('Should generate validation criteria', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'async error',
        stackTrace: ['at asyncFunc (file.ts:10:5)'],
        filePath: 'file.ts',
        lineNumber: 10,
        codeContext: 'const result = fetch(url);',
        errorType: 'UnhandledPromiseRejection',
      };

      const result = await workflow.resolveIssue(errorContext);

      assert.ok(result.solutions[0].validationCriteria, 'Should provide validation criteria');
      assert.ok(result.solutions[0].validationCriteria.length > 0, 'Should have at least one validation criterion');
      assert.ok(
        result.solutions[0].validationCriteria.some((c) => c.toLowerCase().includes('test') || c.toLowerCase().includes('verify')),
        'Validation criteria should include testing or verification steps'
      );
    });

    test('Should suggest relevant tests', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'null pointer',
        stackTrace: ['at func (file.ts:10:5)'],
        filePath: 'file.ts',
        lineNumber: 10,
        codeContext: 'return obj.prop;',
        errorType: 'TypeError',
      };

      const result = await workflow.resolveIssue(errorContext);

      assert.ok(result.solutions[0].suggestedTests, 'Should suggest tests');
      assert.ok(result.solutions[0].suggestedTests.length > 0, 'Should suggest at least one test');
      assert.ok(
        result.solutions[0].suggestedTests.some((t) => t.toLowerCase().includes('test') || t.toLowerCase().includes('null')),
        'Suggested tests should be relevant to the error'
      );
    });

    test('Should include code changes in solutions', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Cannot read property',
        stackTrace: ['at func (file.ts:10:5)'],
        filePath: 'file.ts',
        lineNumber: 10,
        codeContext: 'return user.name;',
        errorType: 'TypeError',
      };

      const result = await workflow.resolveIssue(errorContext);

      assert.ok(result.solutions[0].codeChanges, 'Solution should include code changes');
      assert.ok(result.solutions[0].codeChanges.length > 0, 'Should have at least one code change');

      const change = result.solutions[0].codeChanges[0];
      assert.strictEqual(change.file, errorContext.filePath, 'Code change should target error file');
      assert.ok(change.oldCode, 'Should show old code');
      assert.ok(change.newCode, 'Should show new code');
      assert.notStrictEqual(change.oldCode, change.newCode, 'Old and new code should be different');
      assert.ok(change.reasoning, 'Should provide reasoning for change');
    });

    test('Should estimate time to fix', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const simpleError: ErrorContext = {
        message: 'Simple null check',
        stackTrace: ['at func (file.ts:10:5)'],
        filePath: 'file.ts',
        lineNumber: 10,
        codeContext: 'return obj.prop;',
        errorType: 'TypeError',
      };

      const result = await workflow.resolveIssue(simpleError);

      assert.ok(typeof result.estimatedTimeToFix === 'number', 'Should provide time estimate');
      assert.ok(result.estimatedTimeToFix > 0, 'Time estimate should be positive');
      assert.ok(result.estimatedTimeToFix < 100, 'Time estimate should be reasonable');
    });

    test('Should assess risk level', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const criticalError: ErrorContext = {
        message: 'JavaScript heap out of memory',
        stackTrace: ['at allocate (memory.ts:10:5)'],
        filePath: 'memory.ts',
        lineNumber: 10,
        codeContext: 'const arr = new Array(1000000);',
        errorType: 'RangeError',
      };

      const result = await workflow.resolveIssue(criticalError);

      assert.ok(['low', 'medium', 'high', 'critical'].includes(result.riskLevel), 'Should provide valid risk level');
      assert.strictEqual(result.riskLevel, 'critical', 'Memory leak should be critical risk');
    });

    test('Should handle configuration options for max solutions', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const errorContext: ErrorContext = {
        message: 'Error',
        stackTrace: ['at func (file.ts:10:5)'],
        filePath: 'file.ts',
        lineNumber: 10,
        codeContext: 'code;',
        errorType: 'Error',
      };

      const workflow1Solution = new DebuggingIssueResolutionWorkflow({ maxSolutions: 1 });
      const result = await workflow1Solution.resolveIssue(errorContext);

      assert.strictEqual(result.solutions.length, 1, 'Should respect maxSolutions configuration');
    });

    test('Should provide comprehensive resolution for complex errors', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const complexError: ErrorContext = {
        message: 'Unhandled promise rejection in async operation',
        stackTrace: [
          'at fetchUserData (src/api/users.ts:45:12)',
          'at processUser (src/services/userService.ts:78:5)',
          'at async handleRequest (src/controllers/userController.ts:120:10)',
          'at Router.handle (src/router.ts:55:3)',
        ],
        filePath: 'src/api/users.ts',
        lineNumber: 45,
        codeContext: 'async function fetchUserData(userId: string) {\n  const response = fetch(`/api/users/${userId}`);\n  return response.json();\n}',
        errorType: 'UnhandledPromiseRejection',
        metadata: {
          userId: '12345',
          timestamp: Date.now(),
        },
      };

      const result = await workflow.resolveIssue(complexError);

      // Verify comprehensive diagnosis
      assert.ok(result.diagnosis, 'Should provide diagnosis');
      assert.strictEqual(result.diagnosis.category, 'async_error');
      assert.ok(result.diagnosis.confidence > 60, 'Should have good confidence for known pattern');
      assert.ok(result.diagnosis.relatedLocations.length >= 3, 'Should identify multiple related locations');

      // Verify solution quality
      assert.ok(result.solutions.length >= 2, 'Should provide multiple solutions for complex error');
      assert.ok(result.solutions[0].safetyRating >= 50, 'Solutions should have reasonable safety rating');
      assert.ok(result.solutions[0].effectivenessRating >= 50, 'Solutions should have reasonable effectiveness rating');
      assert.ok(result.solutions[0].codeChanges.length > 0, 'Should provide specific code changes');
      assert.ok(result.solutions[0].validationCriteria.length > 0, 'Should provide validation criteria');
      assert.ok(result.solutions[0].suggestedTests.length > 0, 'Should suggest tests');

      // Verify risk assessment
      assert.ok(['medium', 'high'].includes(result.riskLevel), 'Async errors should be medium-high risk');
      assert.ok(result.estimatedTimeToFix > 0, 'Should estimate time to fix');
    });
  });
});
