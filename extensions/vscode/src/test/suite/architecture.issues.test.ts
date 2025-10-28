/**
 * Architecture Issues Tests
 * Tests for automated code review system - architecture detection
 *
 * Tests production SecurityAnalyzer for architecture issue detection
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import {
  testLargeClassDetection,
  testTightCouplingDetection,
  testMissingAbstractionDetection,
  testCircularDependencyDetection,
  testNoVulnerabilitiesDetected,
  assertSecurityMetadata,
} from '../helpers/securityTestHelper';
import {
  CWE_IDS,
  SEVERITY_LEVELS,
  VULNERABILITY_CATEGORIES,
  VULNERABILITY_CODE_TEMPLATES,
} from '../helpers/securityTestConstants';

suite('Architecture Issues Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('architecture-issues-tests');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Large Class Detection', () => {
    test('Should detect class with more than 10 methods', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.LARGE_CLASS_15_METHODS();
      const vulnerabilities = await testLargeClassDetection(
        testWorkspacePath,
        'arch-large-class.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify CWE mapping
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.LARGE_CLASS);
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.ARCHITECTURE);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.MEDIUM);
      assert.ok(vulnerabilities[0].references.length > 0);
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('class'));
    });

    test('Should detect TypeScript class with return type annotations', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.LARGE_CLASS_15_METHODS_TYPESCRIPT();
      const vulnerabilities = await testLargeClassDetection(
        testWorkspacePath,
        'arch-large-class-typescript.ts',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect TypeScript large class');
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.LARGE_CLASS);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.MEDIUM);
    });
  });

  suite('Tight Coupling Detection', () => {
    test('Should detect excessive imports indicating tight coupling', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.TIGHT_COUPLING_MANY_IMPORTS();
      const vulnerabilities = await testTightCouplingDetection(
        testWorkspacePath,
        'arch-tight-coupling.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify CWE mapping
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.TIGHT_COUPLING);
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.ARCHITECTURE);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.MEDIUM);
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('coupling'));
    });
  });

  suite('Missing Abstraction Detection', () => {
    test('Should detect direct database access without abstraction layer', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.MISSING_ABSTRACTION_DIRECT_ACCESS();
      const vulnerabilities = await testMissingAbstractionDetection(
        testWorkspacePath,
        'arch-missing-abstraction.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify CWE mapping
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.MISSING_ABSTRACTION);
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.ARCHITECTURE);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.MEDIUM);
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('abstraction'));
    });
  });

  suite('Circular Dependency Detection', () => {
    test('Should detect circular dependency pattern (file A imports B)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.CIRCULAR_DEPENDENCY_A_TO_B();
      const vulnerabilities = await testCircularDependencyDetection(
        testWorkspacePath,
        'arch-circular-a.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify CWE mapping
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.CIRCULAR_DEPENDENCY);
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.ARCHITECTURE);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('circular'));
    });

    test('Should detect circular dependency pattern (file B imports A)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.CIRCULAR_DEPENDENCY_B_TO_A();
      const vulnerabilities = await testCircularDependencyDetection(
        testWorkspacePath,
        'arch-circular-b.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect circular dependency');
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('circular'));
    });
  });

  suite('Negative Tests - Good Architecture', () => {
    test('Should NOT detect small classes with few methods', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.SAFE_SMALL_CLASS();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'arch-safe-small-class.js',
        safeCode,
        VULNERABILITY_CATEGORIES.ARCHITECTURE
      );
    });

    test('Should NOT detect loose coupling with dependency injection', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.SAFE_LOOSE_COUPLING_INTERFACES();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'arch-safe-loose-coupling.js',
        safeCode,
        VULNERABILITY_CATEGORIES.ARCHITECTURE
      );
    });

    test('Should NOT detect proper abstraction with repository pattern', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.SAFE_PROPER_ABSTRACTION();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'arch-safe-abstraction.js',
        safeCode,
        VULNERABILITY_CATEGORIES.ARCHITECTURE
      );
    });

    test('Should NOT detect hierarchical dependencies without cycles', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.ARCHITECTURE.SAFE_NO_CIRCULAR_DEPS();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'arch-safe-no-circular.js',
        safeCode,
        VULNERABILITY_CATEGORIES.ARCHITECTURE
      );
    });
  });
});
