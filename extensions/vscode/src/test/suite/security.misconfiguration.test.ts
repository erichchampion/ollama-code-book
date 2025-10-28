/**
 * Security - Configuration Vulnerabilities Tests
 * OWASP Top 10 - A05:2021 Security Misconfiguration Tests
 *
 * Tests production SecurityAnalyzer for security misconfiguration detection
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import {
  testDebugModeDetection,
  testCorsMisconfigurationDetection,
  testDefaultCredentialsDetection,
  testInsecureHttpDetection,
  testNoVulnerabilitiesDetected,
  assertSecurityMetadata,
} from '../helpers/securityTestHelper';
import {
  CWE_IDS,
  SEVERITY_LEVELS,
  VULNERABILITY_CATEGORIES,
  VULNERABILITY_CODE_TEMPLATES,
} from '../helpers/securityTestConstants';

suite('Security - Configuration Vulnerabilities Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('security-misconfiguration-tests');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Debug Mode Detection', () => {
    test('Should detect debug mode enabled in production', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.DEBUG_MODE_ENABLED();
      const vulnerabilities = await testDebugModeDetection(
        testWorkspacePath,
        'config-debug-enabled.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify OWASP and CWE mappings
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.DEBUG_MODE_PRODUCTION);
      assert.ok(vulnerabilities[0].owaspCategory?.includes('A05:2021'));
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.CONFIGURATION);
      assert.ok(vulnerabilities[0].references.length > 0);
    });

    test('Should detect NODE_ENV production with debug mode', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.DEBUG_MODE_NODE_ENV();
      const vulnerabilities = await testDebugModeDetection(
        testWorkspacePath,
        'config-node-env-debug.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect debug mode in production');
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('debug'));
    });
  });

  suite('CORS Misconfiguration Detection', () => {
    test('Should detect CORS wildcard with credentials', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.CORS_WILDCARD();
      const vulnerabilities = await testCorsMisconfigurationDetection(
        testWorkspacePath,
        'config-cors-wildcard.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify OWASP and CWE mappings
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.CORS_MISCONFIGURATION);
      assert.ok(vulnerabilities[0].owaspCategory?.includes('A05:2021'));
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
    });

    test('Should detect CORS null origin vulnerability', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.CORS_NULL_ORIGIN();
      const vulnerabilities = await testCorsMisconfigurationDetection(
        testWorkspacePath,
        'config-cors-null.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect CORS null origin');
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('cors'));
    });
  });

  suite('Default Credentials Detection', () => {
    test('Should detect default admin credentials', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.DEFAULT_ADMIN_PASSWORD();
      const vulnerabilities = await testDefaultCredentialsDetection(
        testWorkspacePath,
        'config-default-admin.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify OWASP and CWE mappings
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.DEFAULT_CREDENTIALS);
      assert.ok(vulnerabilities[0].owaspCategory?.includes('A05:2021'));
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.CRITICAL);
    });

    test('Should detect default database credentials', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.DEFAULT_DATABASE_CREDS();
      const vulnerabilities = await testDefaultCredentialsDetection(
        testWorkspacePath,
        'config-db-defaults.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect default database credentials');
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('credential'));
    });
  });

  suite('Insecure HTTP Detection', () => {
    test('Should detect HTTP URLs for sensitive data transmission', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.HTTP_URL();
      const vulnerabilities = await testInsecureHttpDetection(
        testWorkspacePath,
        'config-http-url.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify OWASP and CWE mappings
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.INSECURE_TRANSPORT);
      assert.ok(vulnerabilities[0].owaspCategory?.includes('A05:2021'));
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
    });

    test('Should detect insecure cookie transmission over HTTP', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.HTTP_COOKIE();
      const vulnerabilities = await testInsecureHttpDetection(
        testWorkspacePath,
        'config-http-cookie.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect HTTP cookie transmission');
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('https'));
    });
  });

  suite('Negative Tests - Safe Configurations', () => {
    test('Should NOT detect debug disabled in production', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.SAFE_DEBUG_DISABLED();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'config-safe-debug.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CONFIGURATION
      );
    });

    test('Should NOT detect proper CORS whitelist configuration', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.SAFE_CORS_WHITELIST();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'config-safe-cors.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CONFIGURATION
      );
    });

    test('Should NOT detect environment-based credentials', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.SAFE_ENV_CREDENTIALS();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'config-safe-env.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CONFIGURATION
      );
    });

    test('Should NOT detect HTTPS URLs', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.SAFE_HTTPS_URL();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'config-safe-https.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CONFIGURATION
      );
    });

    test('Should NOT detect secure cookie configuration', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.MISCONFIGURATION.SAFE_SECURE_COOKIE();
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'config-safe-cookie.js',
        safeCode,
        VULNERABILITY_CATEGORIES.CONFIGURATION
      );
    });
  });

  suite('Security Metadata Validation', () => {
    test('All misconfiguration vulnerabilities should have proper OWASP A05:2021 mapping', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const config = {
  debug: true,
  env: 'production'
};

app.use(cors({
  origin: '*',
  credentials: true
}));

const users = [
  { username: 'admin', password: 'admin' }
];

const API_URL = 'http://api.example.com/data';
fetch(API_URL, {
  headers: { 'Authorization': \`Bearer \${token}\` }
});
`;

      const testFile = require('path').join(testWorkspacePath, 'config-multiple.js');
      await require('fs/promises').writeFile(testFile, vulnerableCode, 'utf8');

      const { SecurityAnalyzer } = require('../helpers/securityAnalyzerWrapper');
      const analyzer = new SecurityAnalyzer();
      const vulnerabilities = await analyzer.analyzeFile(testFile);

      const configVulnerabilities = vulnerabilities.filter(
        (v: any) => v.category === VULNERABILITY_CATEGORIES.CONFIGURATION
      );

      assert.ok(
        configVulnerabilities.length >= 1,
        `Expected at least 1 configuration vulnerability, found ${configVulnerabilities.length}`
      );

      for (const vuln of configVulnerabilities) {
        assert.ok(
          vuln.owaspCategory?.includes('A05:2021'),
          `Configuration vulnerability should map to OWASP A05:2021, got: ${vuln.owaspCategory}`
        );
      }
    });
  });
});
