/**
 * Code Quality Analysis Tests
 * Tests for automated code review system - code quality detection
 *
 * Tests production SecurityAnalyzer for code quality issue detection
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import {
  testMagicNumberDetection,
  testLargeFunctionDetection,
  testDeepNestingDetection,
  testMissingErrorHandlingDetection,
  testMissingInputValidationDetection,
  testNoVulnerabilitiesDetected,
  assertSecurityMetadata,
} from '../helpers/securityTestHelper';
import {
  CWE_IDS,
  SEVERITY_LEVELS,
  VULNERABILITY_CATEGORIES,
  VULNERABILITY_CODE_TEMPLATES,
} from '../helpers/securityTestConstants';

suite('Code Quality Analysis Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('code-quality-analysis-tests');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Magic Number Detection', () => {
    test('Should detect magic number in setTimeout', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.MAGIC_NUMBER_TIMEOUT();
      const vulnerabilities = await testMagicNumberDetection(
        testWorkspacePath,
        'quality-magic-timeout.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify CWE mapping
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.MAGIC_NUMBER);
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.CODE_QUALITY);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.MEDIUM);
      assert.ok(vulnerabilities[0].references.length > 0);
    });

    test('Should detect magic numbers in calculations', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.MAGIC_NUMBER_CALCULATION();
      const vulnerabilities = await testMagicNumberDetection(
        testWorkspacePath,
        'quality-magic-calc.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect magic numbers');
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('magic'));
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('constant'));
    });
  });

  suite('Large Function Detection', () => {
    test('Should detect function exceeding 50 lines', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.LARGE_FUNCTION_50_LINES();
      const vulnerabilities = await testLargeFunctionDetection(
        testWorkspacePath,
        'quality-large-function.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify CWE mapping
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.LARGE_FUNCTION);
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.CODE_QUALITY);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.MEDIUM);
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('function'));
    });
  });

  suite('Deep Nesting Detection', () => {
    test('Should detect nesting exceeding 4 levels', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.DEEP_NESTING_5_LEVELS();
      const vulnerabilities = await testDeepNestingDetection(
        testWorkspacePath,
        'quality-deep-nesting.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify CWE mapping
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.DEEP_NESTING);
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.CODE_QUALITY);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.MEDIUM);
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('nesting'));
    });
  });

  suite('Missing Error Handling Detection', () => {
    test('Should detect async/await without try-catch', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.MISSING_ERROR_HANDLING_ASYNC();
      const vulnerabilities = await testMissingErrorHandlingDetection(
        testWorkspacePath,
        'quality-no-error-async.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify CWE mapping
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.MISSING_ERROR_HANDLING);
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.CODE_QUALITY);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('error'));
    });

    test('Should detect promise without .catch()', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.MISSING_ERROR_HANDLING_PROMISE();
      const vulnerabilities = await testMissingErrorHandlingDetection(
        testWorkspacePath,
        'quality-no-catch.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect missing error handling');
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('error'));
    });
  });

  suite('Missing Input Validation Detection', () => {
    test('Should detect unvalidated req.body in API endpoint', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.MISSING_INPUT_VALIDATION_API();
      const vulnerabilities = await testMissingInputValidationDetection(
        testWorkspacePath,
        'quality-no-validation-api.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify CWE mapping
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.MISSING_INPUT_VALIDATION);
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.CODE_QUALITY);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('validat'));
    });

    test('Should detect missing division-by-zero check', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.MISSING_INPUT_VALIDATION_FUNCTION();
      const vulnerabilities = await testMissingInputValidationDetection(
        testWorkspacePath,
        'quality-divide-by-zero.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect missing validation');
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('validation'));
    });
  });

  suite('Negative Tests - Good Code Quality', () => {
    test('Should NOT detect named constants', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.SAFE_NAMED_CONSTANT();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'quality-safe-constants.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CODE_QUALITY
      );
    });

    test('Should NOT detect small, focused functions', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.SAFE_SMALL_FUNCTION();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'quality-safe-small-function.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CODE_QUALITY
      );
    });

    test('Should NOT detect flat logic with early returns', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.SAFE_FLAT_LOGIC();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'quality-safe-flat.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CODE_QUALITY
      );
    });

    test('Should NOT detect proper error handling', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.SAFE_ERROR_HANDLING_ASYNC();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'quality-safe-errors.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CODE_QUALITY
      );
    });

    test('Should NOT detect validated inputs', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.CODE_QUALITY.SAFE_INPUT_VALIDATION();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'quality-safe-validation.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CODE_QUALITY
      );
    });
  });
});
