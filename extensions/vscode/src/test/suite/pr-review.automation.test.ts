/**
 * Pull Request Review Automation Tests
 * Tests for automated PR review across GitHub, GitLab, and Bitbucket
 *
 * Tests production PR review automation capabilities
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS, PR_REVIEW_TEST_CONSTANTS } from '../helpers/test-constants';
import { createPRReviewConfig } from '../helpers/gitHooksTestHelper';
import {
  PRReviewAutomation,
  type PRReviewConfig,
  type PRMetadata,
  type PRSecurityAnalysis,
  type PRQualityMetrics,
  type PRPlatform,
} from '../helpers/prReviewAutomationWrapper';

suite('Pull Request Review Automation Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('pr-review-automation-tests');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Multi-Platform Support', () => {
    test('Should integrate with GitHub PR review', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');
      const automation = new PRReviewAutomation(config);
      const metadata = await automation.extractPRMetadata(PR_REVIEW_TEST_CONSTANTS.DEFAULT_PR_ID);

      assert.strictEqual(metadata.platform, 'github');
      assert.ok(metadata.id === PR_REVIEW_TEST_CONSTANTS.DEFAULT_PR_ID);
      assert.ok(metadata.title);
      assert.ok(metadata.files.length > 0);
    });

    test('Should integrate with GitLab MR review', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('gitlab');
      const automation = new PRReviewAutomation(config);
      const metadata = await automation.extractPRMetadata(456);

      assert.strictEqual(metadata.platform, 'gitlab');
      assert.ok(metadata.id === 456);
      assert.ok(metadata.sourceBranch);
      assert.ok(metadata.targetBranch);
    });

    test('Should integrate with Bitbucket PR review', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('bitbucket');
      const automation = new PRReviewAutomation(config);
      const metadata = await automation.extractPRMetadata(789);

      assert.strictEqual(metadata.platform, 'bitbucket');
      assert.ok(metadata.id === 789);
      assert.ok(metadata.author);
    });

    test('Should extract PR metadata (title, description, files)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');
      const automation = new PRReviewAutomation(config);
      const metadata = await automation.extractPRMetadata(100);

      // Verify all metadata fields
      assert.ok(metadata.title, 'Should have title');
      assert.ok(metadata.description, 'Should have description');
      assert.ok(metadata.author, 'Should have author');
      assert.ok(metadata.sourceBranch, 'Should have source branch');
      assert.ok(metadata.targetBranch, 'Should have target branch');
      assert.ok(Array.isArray(metadata.files), 'Should have files array');
      assert.ok(metadata.createdAt instanceof Date, 'Should have created date');
      assert.ok(metadata.updatedAt instanceof Date, 'Should have updated date');

      // Verify file metadata
      const file = metadata.files[0];
      assert.ok(file.path, 'File should have path');
      assert.ok(typeof file.additions === 'number', 'File should have additions count');
      assert.ok(typeof file.deletions === 'number', 'File should have deletions count');
      assert.ok(typeof file.changes === 'number', 'File should have changes count');
      assert.ok(file.status, 'File should have status');
    });

    test('Should post comment on PR', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');
      const automation = new PRReviewAutomation(config);
      const comment = await automation.postComment(PR_REVIEW_TEST_CONSTANTS.DEFAULT_PR_ID, 'This is a test comment');

      assert.ok(comment.id, 'Comment should have ID');
      assert.strictEqual(comment.body, 'This is a test comment');
      assert.strictEqual(comment.author, PR_REVIEW_TEST_CONSTANTS.BOT_AUTHOR_NAME);
      assert.ok(comment.createdAt instanceof Date);
    });

    test('Should post inline comment on specific file and line', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');
      const automation = new PRReviewAutomation(config);
      const comment = await automation.postComment(
        PR_REVIEW_TEST_CONSTANTS.DEFAULT_PR_ID,
        'Security issue detected',
        'src/auth.ts',
        42
      );

      assert.ok(comment.id);
      assert.strictEqual(comment.body, 'Security issue detected');
      assert.strictEqual(comment.path, 'src/auth.ts');
      assert.strictEqual(comment.line, 42);
    });

    test('Should update PR status (approve, request changes)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');
      const automation = new PRReviewAutomation(config);

      // Test approve
      const approveStatus = await automation.updateStatus(PR_REVIEW_TEST_CONSTANTS.DEFAULT_PR_ID, 'approve');
      assert.strictEqual(approveStatus, 'approved');

      // Test request changes
      const requestChangesStatus = await automation.updateStatus(PR_REVIEW_TEST_CONSTANTS.DEFAULT_PR_ID, 'request_changes');
      assert.strictEqual(requestChangesStatus, 'changes_requested');

      // Test comment
      const commentStatus = await automation.updateStatus(PR_REVIEW_TEST_CONSTANTS.DEFAULT_PR_ID, 'comment');
      assert.strictEqual(commentStatus, 'commented');
    });

    test('Should handle platform API errors with retry logic', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github', { apiToken: PR_REVIEW_TEST_CONSTANTS.INVALID_API_TOKEN });
      const automation = new PRReviewAutomation(config);

      // Should not throw error - retry logic handles failures gracefully
      const metadata = await automation.extractPRMetadata(PR_REVIEW_TEST_CONSTANTS.DEFAULT_PR_ID);
      assert.ok(metadata, 'Should return metadata even with retry');
    });

    test('Should support all three platforms interchangeably', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const platforms: PRPlatform[] = ['github', 'gitlab', 'bitbucket'];

      for (const platform of platforms) {
        const config = createPRReviewConfig(platform);
        const automation = new PRReviewAutomation(config);
        const metadata = await automation.extractPRMetadata(100);

        assert.strictEqual(metadata.platform, platform, `Should work with ${platform}`);
        assert.ok(metadata.files.length > 0, `${platform} should return files`);
      }
    });
  });

  suite('Security Analysis Integration', () => {
    test('Should detect security vulnerabilities in PR diff', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      // Create metadata with vulnerable code
      const metadata: PRMetadata = {
        id: 123,
        platform: 'github',
        title: 'feat: Add user input handling',
        description: 'Process user input',
        author: 'test-user',
        sourceBranch: 'feat/input',
        targetBranch: 'main',
        files: [
          {
            path: 'src/input.ts',
            additions: 10,
            deletions: 0,
            changes: 10,
            status: 'modified',
            patch: '+ element.innerHTML = userInput; // XSS vulnerability\n+ eval(userCode);',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const analysis = await automation.analyzeSecurityInDiff(metadata);

      assert.ok(analysis.vulnerabilities.length > 0, 'Should detect vulnerabilities');
      assert.ok(analysis.criticalCount > 0, 'Should detect critical vulnerabilities');
      assert.ok(analysis.score < 100, 'Security score should be reduced');
    });

    test('Should block PR on critical security issues', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      const analysis: PRSecurityAnalysis = {
        vulnerabilities: [
          {
            severity: 'critical',
            category: 'XSS',
            description: 'XSS vulnerability',
            file: 'src/input.ts',
            line: 10,
            code: 'innerHTML = userInput',
            recommendation: 'Sanitize input',
            cweId: 'CWE-79',
          },
        ],
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        score: 60,
        recommendation: 'block',
      };

      const shouldBlock = await automation.shouldBlockOnSecurity(analysis);
      assert.strictEqual(shouldBlock, true, 'Should block on critical issues');
    });

    test('Should post security recommendations as PR comments', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      const analysis: PRSecurityAnalysis = {
        vulnerabilities: [
          {
            severity: 'high',
            category: 'SQL Injection',
            description: 'SQL injection vulnerability detected',
            file: 'src/db.ts',
            line: 20,
            code: 'query = "SELECT * FROM users WHERE id = " + userId',
            recommendation: 'Use parameterized queries',
            cweId: 'CWE-89',
          },
        ],
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        score: 80,
        recommendation: 'request_changes',
      };

      const comments = await automation.postSecurityRecommendations(123, analysis);

      assert.ok(comments.length > 0, 'Should post comments');
      assert.ok(comments[0].body.includes('Security'), 'Comment should mention security');
      assert.ok(comments[0].body.includes('CWE-89'), 'Comment should include CWE ID');
      assert.strictEqual(comments[0].path, 'src/db.ts', 'Comment should be on correct file');
      assert.strictEqual(comments[0].line, 20, 'Comment should be on correct line');
    });

    test('Should calculate security score for PR', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      const analysis: PRSecurityAnalysis = {
        vulnerabilities: [],
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        score: 100,
        recommendation: 'approve',
      };

      const score = await automation.calculateSecurityScore(analysis);
      assert.strictEqual(score, 100, 'Clean code should have perfect security score');
    });

    test('Should handle diff parsing edge cases', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      // Metadata with no patch
      const metadata: PRMetadata = {
        id: 123,
        platform: 'github',
        title: 'chore: Update docs',
        description: 'Documentation update',
        author: 'test-user',
        sourceBranch: 'docs/update',
        targetBranch: 'main',
        files: [
          {
            path: 'README.md',
            additions: 5,
            deletions: 2,
            changes: 7,
            status: 'modified',
            // No patch - edge case
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const analysis = await automation.analyzeSecurityInDiff(metadata);

      assert.ok(analysis, 'Should handle missing patch gracefully');
      assert.strictEqual(analysis.vulnerabilities.length, 0, 'Should find no vulnerabilities');
      assert.strictEqual(analysis.score, 100, 'Should have perfect score for safe changes');
    });

    test('Should NOT block when blockOnCritical is false', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config: PRReviewConfig = {
        platform: 'github',
        repositoryUrl: 'https://github.com/test/repo',
        blockOnCritical: false, // Don't block
      };

      const automation = new PRReviewAutomation(config);

      const analysis: PRSecurityAnalysis = {
        vulnerabilities: [
          {
            severity: 'critical',
            category: 'XSS',
            description: 'XSS vulnerability',
            file: 'src/input.ts',
            line: 10,
            code: 'innerHTML = userInput',
            recommendation: 'Sanitize input',
          },
        ],
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        score: 60,
        recommendation: 'block',
      };

      const shouldBlock = await automation.shouldBlockOnSecurity(analysis);
      assert.strictEqual(shouldBlock, false, 'Should not block when config disabled');
    });

    test('Should categorize vulnerabilities by severity correctly', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      const metadata: PRMetadata = {
        id: 123,
        platform: 'github',
        title: 'feat: Multiple vulnerabilities',
        description: 'Test',
        author: 'test-user',
        sourceBranch: 'test',
        targetBranch: 'main',
        files: [
          {
            path: 'src/test.ts',
            additions: 20,
            deletions: 0,
            changes: 20,
            status: 'modified',
            patch: '+ eval(code);\n+ dangerouslySetInnerHTML={{__html: html}}',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const analysis = await automation.analyzeSecurityInDiff(metadata);

      // Verify counts
      const totalVulns = analysis.criticalCount + analysis.highCount + analysis.mediumCount + analysis.lowCount;
      assert.strictEqual(totalVulns, analysis.vulnerabilities.length, 'Counts should match vulnerability array');

      // Verify all vulnerabilities have severity
      for (const vuln of analysis.vulnerabilities) {
        assert.ok(['critical', 'high', 'medium', 'low'].includes(vuln.severity), 'Should have valid severity');
      }
    });
  });

  suite('Quality Assessment', () => {
    test('Should calculate code quality metrics for PR', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      const metadata: PRMetadata = {
        id: 123,
        platform: 'github',
        title: 'feat: New feature',
        description: 'Add new functionality',
        author: 'test-user',
        sourceBranch: 'feat/new',
        targetBranch: 'main',
        files: [
          {
            path: 'src/feature.ts',
            additions: 50,
            deletions: 10,
            changes: 60,
            status: 'modified',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const metrics = await automation.calculateQualityMetrics(metadata);

      assert.ok(typeof metrics.complexity === 'number', 'Should have complexity metric');
      assert.ok(typeof metrics.maintainability === 'number', 'Should have maintainability metric');
      assert.ok(typeof metrics.testCoverage === 'number', 'Should have test coverage metric');
      assert.ok(typeof metrics.documentationCoverage === 'number', 'Should have documentation coverage');
      assert.ok(typeof metrics.codeSmells === 'number', 'Should have code smells count');
      assert.ok(typeof metrics.overallScore === 'number', 'Should have overall score');

      // Verify score is in valid range
      assert.ok(metrics.overallScore >= 0 && metrics.overallScore <= 100, 'Overall score should be 0-100');
    });

    test('Should analyze test coverage changes in PR', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      const metadata: PRMetadata = {
        id: 123,
        platform: 'github',
        title: 'feat: Add feature with tests',
        description: 'New feature with test coverage',
        author: 'test-user',
        sourceBranch: 'feat/tested',
        targetBranch: 'main',
        files: [
          {
            path: 'src/feature.ts',
            additions: 50,
            deletions: 0,
            changes: 50,
            status: 'added',
          },
          {
            path: 'src/feature.test.ts',
            additions: 80,
            deletions: 0,
            changes: 80,
            status: 'added',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const coverageChange = await automation.analyzeTestCoverageChange(metadata);

      assert.ok(typeof coverageChange === 'number', 'Should return coverage change');
      assert.ok(coverageChange >= 0 && coverageChange <= 100, 'Coverage should be 0-100');
      assert.ok(coverageChange === 100, 'Should have high coverage with test files added');
    });

    test('Should analyze complexity changes in PR', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      const metadata: PRMetadata = {
        id: 123,
        platform: 'github',
        title: 'refactor: Simplify logic',
        description: 'Reduce complexity',
        author: 'test-user',
        sourceBranch: 'refactor/simplify',
        targetBranch: 'main',
        files: [
          {
            path: 'src/complex.ts',
            additions: 20,
            deletions: 50,
            changes: 70,
            status: 'modified',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const complexityChange = await automation.analyzeComplexityChange(metadata);

      assert.ok(typeof complexityChange === 'number', 'Should return complexity change');
      assert.ok(complexityChange >= 0 && complexityChange <= 100, 'Complexity should be 0-100');
    });

    test('Should calculate regression risk score for PR', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github');

      const automation = new PRReviewAutomation(config);

      const metadata: PRMetadata = {
        id: 123,
        platform: 'github',
        title: 'fix: Critical bug fix',
        description: 'Fix production issue',
        author: 'test-user',
        sourceBranch: 'fix/critical',
        targetBranch: 'main',
        files: [
          {
            path: 'src/auth.ts',
            additions: 5,
            deletions: 50, // Large deletion indicates high risk
            changes: 55,
            status: 'modified',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const regressionRisk = await automation.calculateRegressionRisk(metadata);

      assert.ok(typeof regressionRisk === 'number', 'Should return regression risk');
      assert.ok(regressionRisk >= 0 && regressionRisk <= 100, 'Risk should be 0-100');
      assert.ok(regressionRisk > 50, 'High deletion ratio should indicate higher risk');
    });

    test('Should provide complete PR review with all metrics', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github', { autoApprove: true, minimumQualityScore: 70 });

      const automation = new PRReviewAutomation(config);
      const result = await automation.reviewPR(123);

      assert.ok(result.status, 'Should have status');
      assert.ok(['approved', 'changes_requested', 'commented', 'pending'].includes(result.status), 'Should have valid status');
      assert.ok(Array.isArray(result.comments), 'Should have comments array');
      assert.ok(result.securityAnalysis, 'Should have security analysis');
      assert.ok(result.qualityMetrics, 'Should have quality metrics');
      assert.ok(result.recommendation, 'Should have recommendation');
      assert.ok(result.timestamp instanceof Date, 'Should have timestamp');
    });

    test('Should auto-approve PR when quality thresholds met', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github', { autoApprove: true, blockOnCritical: false, minimumQualityScore: 70 });

      const automation = new PRReviewAutomation(config);
      const result = await automation.reviewPR(123);

      // With clean code and good quality, should auto-approve
      if (result.securityAnalysis && result.securityAnalysis.score >= 80 &&
          result.qualityMetrics && result.qualityMetrics.overallScore >= 70) {
        assert.strictEqual(result.status, 'approved', 'Should auto-approve when thresholds met');
      }
    });

    test('Should request changes when quality below threshold', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const config = createPRReviewConfig('github', { autoApprove: true, minimumQualityScore: 90 });
      const automation = new PRReviewAutomation(config);
      const result = await automation.reviewPR(PR_REVIEW_TEST_CONSTANTS.DEFAULT_PR_ID);

      // With high threshold, typical PRs should request changes
      if (result.qualityMetrics && result.qualityMetrics.overallScore < 90) {
        assert.ok(['changes_requested', 'commented'].includes(result.status), 'Should request changes or comment when below threshold');
      }
    });
  });
});
