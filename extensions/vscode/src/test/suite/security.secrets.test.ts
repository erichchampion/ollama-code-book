/**
 * Security - Sensitive Data Exposure Tests
 * OWASP Top 10 - Sensitive data exposure vulnerability detection tests
 *
 * Tests production SecurityAnalyzer for sensitive data exposure vulnerabilities
 */

import * as assert from 'assert';
import {
  createTestWorkspace,
  cleanupTestWorkspace
} from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import {
  testHardcodedSecretsDetection,
  testExposedEncryptionKeysDetection,
  testSensitiveDataInLogsDetection,
  testUnencryptedStorageDetection,
  assertSecurityMetadata,
  testNoVulnerabilitiesDetected,
} from '../helpers/securityTestHelper';
import {
  CWE_IDS,
  OWASP_CATEGORIES,
  VULNERABILITY_CATEGORIES,
  SEVERITY_LEVELS,
  VULNERABILITY_CODE_TEMPLATES
} from '../helpers/securityTestConstants';

suite('Security - Sensitive Data Exposure Tests', () => {
  let testWorkspacePath: string;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('security-secrets-tests');
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Hardcoded API Keys Detection', () => {
    test('Should detect hardcoded AWS access key', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.HARDCODED_API_KEY_AWS();

      const vulnerabilities = await testHardcodedSecretsDetection(
        testWorkspacePath,
        'secrets-aws-key.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify OWASP and CWE mappings
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.HARDCODED_SECRETS);
      assert.ok(vulnerabilities[0].owaspCategory?.includes(OWASP_CATEGORIES.A02_CRYPTOGRAPHIC));
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.SECRETS);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.CRITICAL);
    });

    test('Should detect hardcoded Stripe API key', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.HARDCODED_API_KEY_STRIPE();

      const vulnerabilities = await testHardcodedSecretsDetection(
        testWorkspacePath,
        'secrets-stripe-key.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect hardcoded Stripe API key');
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.CRITICAL);
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('environment'));
    });

    test('Should detect hardcoded GitHub token', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.HARDCODED_API_KEY_GITHUB();

      const vulnerabilities = await testHardcodedSecretsDetection(
        testWorkspacePath,
        'secrets-github-token.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect hardcoded GitHub token');
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.CRITICAL);
    });

    test('Should NOT detect API keys from environment variables', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.SAFE_ENV_VARS_API_KEY();

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'secrets-safe-env-vars.js',
        safeCode,
        VULNERABILITY_CATEGORIES.SECRETS
      );
    });
  });

  suite('Exposed Encryption Keys Detection', () => {
    test('Should detect exposed AES encryption key', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.EXPOSED_ENCRYPTION_KEY_AES();

      const vulnerabilities = await testExposedEncryptionKeysDetection(
        testWorkspacePath,
        'secrets-aes-key.js',
        vulnerableCode
      );

      assertSecurityMetadata(vulnerabilities[0]);
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.EXPOSED_ENCRYPTION_KEYS);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.CRITICAL);
      assert.ok(vulnerabilities[0].owaspCategory?.includes(OWASP_CATEGORIES.A02_CRYPTOGRAPHIC));
    });

    test('Should detect exposed JWT secret key', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.EXPOSED_ENCRYPTION_KEY_JWT();

      const vulnerabilities = await testExposedEncryptionKeysDetection(
        testWorkspacePath,
        'secrets-jwt-secret.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect exposed JWT secret');
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('key'));
    });
  });

  suite('Sensitive Data in Logs Detection', () => {
    test('Should detect password in console.log', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.SENSITIVE_DATA_IN_LOGS_PASSWORD();

      const vulnerabilities = await testSensitiveDataInLogsDetection(
        testWorkspacePath,
        'secrets-log-password.js',
        vulnerableCode
      );

      assertSecurityMetadata(vulnerabilities[0]);
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.SENSITIVE_DATA_IN_LOGS);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
      assert.ok(vulnerabilities[0].owaspCategory?.includes(OWASP_CATEGORIES.A09_LOGGING));
    });

    test('Should detect auth token in logger.info', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.SENSITIVE_DATA_IN_LOGS_TOKEN();

      const vulnerabilities = await testSensitiveDataInLogsDetection(
        testWorkspacePath,
        'secrets-log-token.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect token in logs');
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('sanitize'));
    });

    test('Should detect credit card in console.log', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.SENSITIVE_DATA_IN_LOGS_CREDIT_CARD();

      const vulnerabilities = await testSensitiveDataInLogsDetection(
        testWorkspacePath,
        'secrets-log-credit-card.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect credit card in logs');
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
    });

    test('Should NOT detect sanitized logs', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.SAFE_SANITIZED_LOGS();

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'secrets-safe-sanitized-logs.js',
        safeCode,
        VULNERABILITY_CATEGORIES.SECRETS
      );
    });
  });

  suite('Unencrypted Sensitive Storage Detection', () => {
    test('Should detect unencrypted auth token in localStorage', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.UNENCRYPTED_STORAGE_TOKEN();

      const vulnerabilities = await testUnencryptedStorageDetection(
        testWorkspacePath,
        'secrets-storage-token.js',
        vulnerableCode
      );

      assertSecurityMetadata(vulnerabilities[0]);
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.UNENCRYPTED_STORAGE);
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
      assert.ok(vulnerabilities[0].owaspCategory?.includes(OWASP_CATEGORIES.A02_CRYPTOGRAPHIC));
    });

    test('Should detect unencrypted password in sessionStorage', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.UNENCRYPTED_STORAGE_PASSWORD();

      const vulnerabilities = await testUnencryptedStorageDetection(
        testWorkspacePath,
        'secrets-storage-password.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect unencrypted password in storage');
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('encrypt'));
    });

    test('Should NOT detect encrypted storage', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.SAFE_ENCRYPTED_STORAGE();

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'secrets-safe-encrypted-storage.js',
        safeCode,
        VULNERABILITY_CATEGORIES.SECRETS
      );
    });
  });

  suite('Security Metadata Validation', () => {
    test('All sensitive data vulnerabilities should have OWASP A02:2021 or A09:2021 mapping', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const stripeKey = "sk_live_51234567890abcdefghijklmnopqr";
console.log('Token:', authToken);
`;

      const vulnerabilities = await testHardcodedSecretsDetection(
        testWorkspacePath,
        'secrets-metadata-validation.js',
        vulnerableCode,
        { minVulnerabilities: 1 }
      );

      for (const vuln of vulnerabilities) {
        assert.ok(
          vuln.owaspCategory?.includes(OWASP_CATEGORIES.A02_CRYPTOGRAPHIC) ||
          vuln.owaspCategory?.includes(OWASP_CATEGORIES.A09_LOGGING),
          `Secrets vulnerability should map to OWASP A02:2021 or A09:2021, got: ${vuln.owaspCategory}`
        );
      }
    });

    test('All critical secrets vulnerabilities should have reference links', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.HARDCODED_API_KEY_AWS();

      const vulnerabilities = await testHardcodedSecretsDetection(
        testWorkspacePath,
        'secrets-critical-refs.js',
        vulnerableCode
      );

      const criticalVuln = vulnerabilities.find(v => v.severity === SEVERITY_LEVELS.CRITICAL);
      assert.ok(criticalVuln, 'Should find critical vulnerability');
      assert.ok(criticalVuln.references.length >= 2, 'Should have at least 2 references');
      assert.ok(
        criticalVuln.references.some(ref => ref.includes('owasp.org')),
        'Should have OWASP reference'
      );
      assert.ok(
        criticalVuln.references.some(ref => ref.includes('cwe.mitre.org')),
        'Should have CWE reference'
      );
    });
  });

  suite('Edge Cases', () => {
    test('Should detect API key at exactly 20-character boundary', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.EDGE_CASE_20_CHAR_BOUNDARY();

      const vulnerabilities = await testHardcodedSecretsDetection(
        testWorkspacePath,
        'secrets-edge-20char.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect API key at 20-character boundary');
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.CRITICAL);
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.HARDCODED_SECRETS);
    });

    test('Should NOT detect secret in template literal with variable interpolation', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.EDGE_CASE_TEMPLATE_LITERAL();

      // This should NOT be detected because the pattern has (?!.*\$\{) to exclude template literals
      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'secrets-edge-template-literal.js',
        safeCode,
        VULNERABILITY_CATEGORIES.SECRETS
      );
    });

    test('Should detect Base64-encoded encryption key', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = VULNERABILITY_CODE_TEMPLATES.SECRETS.EDGE_CASE_BASE64_SECRET();

      const vulnerabilities = await testExposedEncryptionKeysDetection(
        testWorkspacePath,
        'secrets-edge-base64.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect Base64-encoded encryption key');
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.CRITICAL);
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.EXPOSED_ENCRYPTION_KEYS);
    });
  });
});
