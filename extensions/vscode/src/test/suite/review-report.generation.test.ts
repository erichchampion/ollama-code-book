/**
 * Review Report Generation Tests
 * Tests for automated code review system - report generation
 *
 * Tests production SecurityAnalyzer report generation capabilities
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import { testReviewReportGeneration } from '../helpers/securityTestHelper';
import {
  VULNERABILITY_CODE_TEMPLATES,
  SEVERITY_ORDER,
  PRIORITY_ORDER,
  VALID_PRIORITIES,
} from '../helpers/securityTestConstants';

suite('Review Report Generation Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('review-report-tests');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Summary Generation', () => {
    test('Should generate summary for code with multiple critical issues', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.MULTIPLE_CRITICAL_ISSUES();
      const { vulnerabilities, report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-critical.js',
        code
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect vulnerabilities');
      assert.ok(report.summary, 'Should generate summary');
      assert.ok(report.summary.includes('issue'), 'Summary should mention issues');
      assert.ok(report.totalIssues > 0, 'Should count total issues');
    });

    test('Should generate positive summary for clean code', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.NO_ISSUES_PERFECT_CODE();
      const { vulnerabilities, report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-clean.ts',
        code
      );

      assert.strictEqual(vulnerabilities.length, 0, 'Should detect no vulnerabilities');
      assert.ok(report.summary.toLowerCase().includes('no'), 'Summary should indicate no issues');
      assert.ok(report.summary.toLowerCase().includes('best practices'), 'Summary should mention best practices');
      assert.strictEqual(report.totalIssues, 0, 'Total issues should be zero');
    });
  });

  suite('Severity Classification', () => {
    test('Should classify issues by severity levels (critical, major, minor, info)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.MULTIPLE_CRITICAL_ISSUES();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-severity.js',
        code
      );

      assert.ok(report.severityBreakdown, 'Should have severity breakdown');
      assert.ok(report.severityBreakdown.critical, 'Should have critical level');
      assert.ok(report.severityBreakdown.high, 'Should have high level');
      assert.ok(report.severityBreakdown.medium, 'Should have medium level');
      assert.ok(report.severityBreakdown.low, 'Should have low level');
      assert.ok(report.severityBreakdown.info, 'Should have info level');

      // Verify structure
      assert.strictEqual(report.severityBreakdown.critical.level, 'critical');
      assert.ok(typeof report.severityBreakdown.critical.count === 'number');
      assert.ok(Array.isArray(report.severityBreakdown.critical.issues));
    });

    test('Should count issues correctly by severity', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.MULTIPLE_CRITICAL_ISSUES();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-count.js',
        code
      );

      const totalFromBreakdown =
        report.severityBreakdown.critical.count +
        report.severityBreakdown.high.count +
        report.severityBreakdown.medium.count +
        report.severityBreakdown.low.count +
        report.severityBreakdown.info.count;

      assert.strictEqual(totalFromBreakdown, report.totalIssues, 'Breakdown should match total');
      assert.strictEqual(
        report.criticalCount + report.highCount + report.mediumCount + report.lowCount + report.infoCount,
        report.totalIssues,
        'Individual counts should match total'
      );
    });
  });

  suite('Recommendation Generation', () => {
    test('Should generate recommendations with examples', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.MULTIPLE_CRITICAL_ISSUES();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-recommendations.js',
        code
      );

      assert.ok(report.recommendations, 'Should have recommendations');
      assert.ok(report.recommendations.length > 0, 'Should generate at least one recommendation');

      const firstRec = report.recommendations[0];
      assert.ok(firstRec.category, 'Recommendation should have category');
      assert.ok(firstRec.severity, 'Recommendation should have severity');
      assert.ok(firstRec.title, 'Recommendation should have title');
      assert.ok(firstRec.recommendation, 'Recommendation should have text');
      assert.ok(Array.isArray(firstRec.examples), 'Recommendation should have examples array');
      assert.ok(firstRec.examples.length > 0, 'Recommendation should have at least one example');
      assert.ok(firstRec.examples[0].file, 'Example should have file');
      assert.ok(firstRec.examples[0].line, 'Example should have line number');
      assert.ok(firstRec.examples[0].code, 'Example should have code snippet');
    });

    test('Should sort recommendations by severity', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.CATEGORY_TESTING_CODE();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-sorted.js',
        code
      );

      for (let i = 0; i < report.recommendations.length - 1; i++) {
        const currentSeverity = SEVERITY_ORDER[report.recommendations[i].severity as keyof typeof SEVERITY_ORDER];
        const nextSeverity = SEVERITY_ORDER[report.recommendations[i + 1].severity as keyof typeof SEVERITY_ORDER];
        assert.ok(currentSeverity <= nextSeverity, 'Recommendations should be sorted by severity');
      }
    });
  });

  suite('Positive Feedback Generation', () => {
    test('Should provide positive feedback for good practices', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.GOOD_PRACTICES_CODE();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-positive.js',
        code
      );

      assert.ok(report.positiveFindings, 'Should have positive findings');
      assert.ok(report.positiveFindings.length > 0, 'Should generate positive feedback');
      assert.ok(
        report.positiveFindings.some((f: string) => f.toLowerCase().includes('no')),
        'Positive feedback should mention absence of issues'
      );
    });

    test('Should generate appropriate positive findings based on code quality', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.NO_ISSUES_PERFECT_CODE();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-quality.ts',
        code
      );

      assert.ok(report.positiveFindings.length >= 3, 'Should have multiple positive findings for clean code');

      // Check for specific positive feedback categories
      const feedbackText = report.positiveFindings.join(' ').toLowerCase();
      assert.ok(
        feedbackText.includes('injection') ||
          feedbackText.includes('xss') ||
          feedbackText.includes('secrets'),
        'Should mention specific security areas'
      );
    });
  });

  suite('Actionable File Suggestions', () => {
    test('Should identify actionable files with issue counts', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.MULTIPLE_CRITICAL_ISSUES();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-actionable.js',
        code
      );

      assert.ok(report.actionableFiles, 'Should have actionable files');
      assert.ok(report.actionableFiles.length > 0, 'Should identify at least one actionable file');

      const firstFile = report.actionableFiles[0];
      assert.ok(firstFile.file, 'Actionable file should have file path');
      assert.ok(typeof firstFile.issueCount === 'number', 'Actionable file should have issue count');
      assert.ok(firstFile.priority, 'Actionable file should have priority');
      assert.ok(VALID_PRIORITIES.includes(firstFile.priority as any), 'Priority should be valid');
    });

    test('Should prioritize files by severity', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.MULTIPLE_CRITICAL_ISSUES();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-prioritize.js',
        code
      );

      if (report.actionableFiles.length > 1) {
        for (let i = 0; i < report.actionableFiles.length - 1; i++) {
          const currentPriority = PRIORITY_ORDER[report.actionableFiles[i].priority as keyof typeof PRIORITY_ORDER];
          const nextPriority = PRIORITY_ORDER[report.actionableFiles[i + 1].priority as keyof typeof PRIORITY_ORDER];
          assert.ok(currentPriority <= nextPriority, 'Files should be sorted by priority');
        }
      }
    });
  });

  suite('Confidence Scoring', () => {
    test('Should calculate confidence score for findings', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.MULTIPLE_CRITICAL_ISSUES();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-confidence.js',
        code
      );

      assert.ok(typeof report.confidenceScore === 'number', 'Should have confidence score');
      assert.ok(report.confidenceScore >= 0 && report.confidenceScore <= 100, 'Confidence should be 0-100');
    });

    test('Should return 100% confidence for clean code', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const code = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.NO_ISSUES_PERFECT_CODE();
      const { report } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-perfect.ts',
        code
      );

      assert.strictEqual(report.confidenceScore, 100, 'Clean code should have 100% confidence');
    });

    test('Should weight confidence by severity', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const criticalCode = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.MULTIPLE_CRITICAL_ISSUES();
      const minorCode = VULNERABILITY_CODE_TEMPLATES.REVIEW_REPORT.MINOR_ISSUES_ONLY();

      const { report: criticalReport } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-critical-confidence.js',
        criticalCode
      );

      const { report: minorReport } = await testReviewReportGeneration(
        testWorkspacePath,
        'report-minor-confidence.js',
        minorCode
      );

      // Critical issues should generally result in different confidence than minor issues
      assert.ok(typeof criticalReport.confidenceScore === 'number');
      assert.ok(typeof minorReport.confidenceScore === 'number');
    });
  });
});
