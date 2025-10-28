/**
 * Quality Assessment Integration Tests
 * Tests for code quality metrics calculation and assessment
 *
 * Tests production SecurityAnalyzer quality assessment capabilities
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import { testQualityMetrics } from '../helpers/securityTestHelper';
import { QUALITY_ASSESSMENT_TEMPLATES } from '../helpers/securityTestConstants';

suite('Quality Assessment Integration Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('quality-assessment-tests');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Complexity Metrics Calculation', () => {
    test('Should calculate high cyclomatic complexity for nested conditions', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.HIGH_COMPLEXITY();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'high-complexity.js',
        code
      );

      assert.ok(metrics.complexity, 'Should have complexity metrics');
      assert.ok(
        metrics.complexity.cyclomaticComplexity > 5,
        `Cyclomatic complexity should be high, got ${metrics.complexity.cyclomaticComplexity}`
      );
      assert.ok(
        metrics.complexity.cognitiveComplexity > 10,
        `Cognitive complexity should be high, got ${metrics.complexity.cognitiveComplexity}`
      );
      assert.ok(
        metrics.complexity.maxNestingDepth >= 4,
        `Max nesting depth should be >= 4, got ${metrics.complexity.maxNestingDepth}`
      );
      assert.ok(
        ['C', 'D', 'F'].includes(metrics.complexity.grade),
        `Grade should be C, D, or F for high complexity, got ${metrics.complexity.grade}`
      );
    });

    test('Should calculate low complexity for simple, well-structured code', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.LOW_COMPLEXITY();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'low-complexity.js',
        code
      );

      assert.ok(metrics.complexity, 'Should have complexity metrics');
      assert.ok(
        metrics.complexity.cyclomaticComplexity <= 10,
        `Cyclomatic complexity should be low, got ${metrics.complexity.cyclomaticComplexity}`
      );
      assert.ok(
        metrics.complexity.cognitiveComplexity <= 15,
        `Cognitive complexity should be low, got ${metrics.complexity.cognitiveComplexity}`
      );
      assert.ok(
        metrics.complexity.maxNestingDepth <= 3,
        `Max nesting depth should be <= 3, got ${metrics.complexity.maxNestingDepth}`
      );
      assert.ok(
        ['A', 'B'].includes(metrics.complexity.grade),
        `Grade should be A or B for low complexity, got ${metrics.complexity.grade}`
      );
    });
  });

  suite('Best Practice Validation', () => {
    test('Should detect naming convention violations', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.POOR_NAMING();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'poor-naming.js',
        code
      );

      assert.ok(metrics.bestPractices, 'Should have best practices metrics');
      assert.ok(
        metrics.bestPractices.namingConventions.violations.length > 0,
        'Should detect naming violations'
      );
      assert.ok(
        metrics.bestPractices.namingConventions.score < 100,
        'Naming score should be less than perfect'
      );
    });

    test('Should validate good naming conventions', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.GOOD_NAMING();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'good-naming.js',
        code
      );

      assert.ok(metrics.bestPractices, 'Should have best practices metrics');
      assert.ok(
        metrics.bestPractices.namingConventions.violations.length === 0,
        'Should have no naming violations'
      );
      assert.strictEqual(
        metrics.bestPractices.namingConventions.score,
        100,
        'Naming score should be perfect'
      );
    });

    test('Should detect missing error handling in async functions', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.MISSING_ERROR_HANDLING();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'missing-error-handling.js',
        code
      );

      assert.ok(metrics.bestPractices, 'Should have best practices metrics');
      assert.ok(
        metrics.bestPractices.errorHandling.missingCatches > 0,
        `Should detect missing error handling, got ${metrics.bestPractices.errorHandling.missingCatches} missing catches`
      );
      assert.ok(
        metrics.bestPractices.errorHandling.score < 100,
        'Error handling score should be less than perfect'
      );
    });

    test('Should validate proper error handling', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.GOOD_ERROR_HANDLING();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'good-error-handling.js',
        code
      );

      assert.ok(metrics.bestPractices, 'Should have best practices metrics');
      assert.strictEqual(
        metrics.bestPractices.errorHandling.missingCatches,
        0,
        'Should have no missing error handling'
      );
      assert.strictEqual(
        metrics.bestPractices.errorHandling.score,
        100,
        'Error handling score should be perfect'
      );
    });

    test('Should detect missing input validation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.MISSING_VALIDATION();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'missing-validation.js',
        code
      );

      assert.ok(metrics.bestPractices, 'Should have best practices metrics');
      assert.ok(
        metrics.bestPractices.inputValidation.missingValidations > 0,
        'Should detect missing input validation'
      );
      assert.ok(
        metrics.bestPractices.inputValidation.score < 100,
        'Input validation score should be less than perfect'
      );
    });

    test('Should validate proper input validation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.GOOD_VALIDATION();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'good-validation.js',
        code
      );

      assert.ok(metrics.bestPractices, 'Should have best practices metrics');
      assert.strictEqual(
        metrics.bestPractices.inputValidation.missingValidations,
        0,
        'Should have no missing input validation'
      );
      assert.strictEqual(
        metrics.bestPractices.inputValidation.score,
        100,
        'Input validation score should be perfect'
      );
    });
  });

  suite('Maintainability Index Calculation', () => {
    test('Should calculate low maintainability index for poor code', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.POOR_MAINTAINABILITY();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'poor-maintainability.js',
        code
      );

      assert.ok(metrics.maintainability, 'Should have maintainability metrics');
      assert.ok(
        metrics.maintainability.maintainabilityIndex < 70,
        `Maintainability index should be low, got ${metrics.maintainability.maintainabilityIndex}`
      );
      assert.ok(
        metrics.maintainability.codeSmells > 0,
        'Should detect code smells'
      );
      assert.ok(
        ['C', 'D', 'F'].includes(metrics.maintainability.grade),
        `Grade should be C, D, or F for poor maintainability, got ${metrics.maintainability.grade}`
      );
    });

    test('Should calculate high maintainability index for well-documented code', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.GOOD_MAINTAINABILITY();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'good-maintainability.js',
        code
      );

      assert.ok(metrics.maintainability, 'Should have maintainability metrics');
      assert.ok(
        metrics.maintainability.maintainabilityIndex >= 70,
        `Maintainability index should be high, got ${metrics.maintainability.maintainabilityIndex}`
      );
      assert.ok(
        ['A', 'B', 'C'].includes(metrics.maintainability.grade),
        `Grade should be A, B, or C for good maintainability, got ${metrics.maintainability.grade}`
      );
    });
  });

  suite('Documentation Coverage Check', () => {
    test('Should detect missing documentation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.MISSING_DOCUMENTATION();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'missing-documentation.js',
        code
      );

      assert.ok(metrics.documentation, 'Should have documentation metrics');
      assert.ok(
        metrics.documentation.functionDocumentation < 50,
        'Function documentation should be low'
      );
      assert.ok(
        metrics.documentation.moduleDocumentation === 0,
        'Module documentation should be missing'
      );
      assert.ok(
        ['C', 'D', 'F'].includes(metrics.documentation.grade),
        `Grade should be C, D, or F for missing documentation, got ${metrics.documentation.grade}`
      );
    });

    test('Should validate comprehensive documentation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.GOOD_DOCUMENTATION();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'good-documentation.js',
        code
      );

      assert.ok(metrics.documentation, 'Should have documentation metrics');
      assert.ok(
        metrics.documentation.functionDocumentation >= 50,
        `Function documentation should be good, got ${metrics.documentation.functionDocumentation}%`
      );
      assert.strictEqual(
        metrics.documentation.moduleDocumentation,
        100,
        'Module documentation should be present'
      );
      assert.ok(
        ['A', 'B', 'C'].includes(metrics.documentation.grade),
        `Grade should be A, B, or C for good documentation, got ${metrics.documentation.grade}`
      );
    });
  });

  suite('Type Safety Evaluation', () => {
    test('Should detect poor type safety in TypeScript (any types)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.POOR_TYPE_SAFETY();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'poor-type-safety.ts',
        code
      );

      assert.ok(metrics.typeSafety, 'Should have type safety metrics');
      assert.ok(
        metrics.typeSafety.anyTypeUsage > 0,
        'Should detect any type usage'
      );
      assert.ok(
        metrics.typeSafety.typeAnnotationCoverage < 100,
        'Type annotation coverage should be incomplete'
      );
      assert.ok(
        ['C', 'D', 'F'].includes(metrics.typeSafety.grade),
        `Grade should be C, D, or F for poor type safety, got ${metrics.typeSafety.grade}`
      );
    });

    test('Should validate strong type safety in TypeScript', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.GOOD_TYPE_SAFETY();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'good-type-safety.ts',
        code
      );

      assert.ok(metrics.typeSafety, 'Should have type safety metrics');
      assert.strictEqual(
        metrics.typeSafety.anyTypeUsage,
        0,
        'Should have no any type usage'
      );
      assert.ok(
        metrics.typeSafety.typeAnnotationCoverage >= 80,
        `Type annotation coverage should be high, got ${metrics.typeSafety.typeAnnotationCoverage}%`
      );
      assert.ok(
        ['A', 'B'].includes(metrics.typeSafety.grade),
        `Grade should be A or B for good type safety, got ${metrics.typeSafety.grade}`
      );
    });
  });

  suite('Overall Quality Score', () => {
    test('Should calculate overall quality score with proper weighting', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = QUALITY_ASSESSMENT_TEMPLATES.GOOD_DOCUMENTATION();
      const metrics = await testQualityMetrics(
        testWorkspacePath,
        'overall-score.js',
        code
      );

      assert.ok(metrics.overallScore, 'Should have overall score');
      assert.ok(
        typeof metrics.overallScore === 'number',
        'Overall score should be a number'
      );
      assert.ok(
        metrics.overallScore >= 0 && metrics.overallScore <= 100,
        'Overall score should be between 0 and 100'
      );
      assert.ok(metrics.grade, 'Should have overall grade');
      assert.ok(
        ['A', 'B', 'C', 'D', 'F'].includes(metrics.grade),
        'Grade should be valid (A-F)'
      );
    });

    test('Should assign grades consistently based on scores', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const goodCode = QUALITY_ASSESSMENT_TEMPLATES.GOOD_DOCUMENTATION();
      const poorCode = QUALITY_ASSESSMENT_TEMPLATES.POOR_MAINTAINABILITY();

      const goodMetrics = await testQualityMetrics(
        testWorkspacePath,
        'good-overall.js',
        goodCode
      );

      const poorMetrics = await testQualityMetrics(
        testWorkspacePath,
        'poor-overall.js',
        poorCode
      );

      // Good code should have better grades
      assert.ok(
        goodMetrics.overallScore > poorMetrics.overallScore,
        `Good code score (${goodMetrics.overallScore}) should be higher than poor code score (${poorMetrics.overallScore})`
      );

      // Verify grade assignments
      const gradeOrder = { A: 5, B: 4, C: 3, D: 2, F: 1 };
      assert.ok(
        gradeOrder[goodMetrics.grade as keyof typeof gradeOrder] >
          gradeOrder[poorMetrics.grade as keyof typeof gradeOrder],
        `Good code grade (${goodMetrics.grade}) should be better than poor code grade (${poorMetrics.grade})`
      );
    });
  });
});
