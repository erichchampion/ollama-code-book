/**
 * Security - Injection Vulnerabilities Tests
 * OWASP Top 10 - Injection vulnerability detection tests
 *
 * Tests production SecurityAnalyzer for injection vulnerability detection
 */

import * as assert from 'assert';
import {
  createTestWorkspace,
  cleanupTestWorkspace
} from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import {
  testSQLInjectionDetection,
  testNoSQLInjectionDetection,
  testCommandInjectionDetection,
  testLDAPInjectionDetection,
  testXPathInjectionDetection,
  testTemplateInjectionDetection,
  assertSecurityMetadata,
  testNoVulnerabilitiesDetected,
} from '../helpers/securityTestHelper';
import { CWE_IDS, OWASP_CATEGORIES } from '../helpers/securityTestConstants';

suite('Security - Injection Vulnerabilities Tests', () => {
  let testWorkspacePath: string;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('security-injection-tests');
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('SQL Injection Detection', () => {
    test('Should detect SQL injection with string concatenation', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const query = "SELECT * FROM users WHERE id = " + req.params.id;
db.execute(query);
`;

      const vulnerabilities = await testSQLInjectionDetection(
        testWorkspacePath,
        'sql-concat.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify OWASP and CWE mappings
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.SQL_INJECTION);
      assert.ok(vulnerabilities[0].owaspCategory?.includes('A03:2021'));
      assert.ok(vulnerabilities[0].references.length > 0);
    });

    test('Should detect SQL injection with template literals', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const query = \`SELECT * FROM users WHERE username = '\${req.body.username}'\`;
db.query(query);
`;

      const vulnerabilities = await testSQLInjectionDetection(
        testWorkspacePath,
        'sql-template.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect SQL injection');
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('sql'));
    });

    test('Should NOT detect parameterized SQL queries', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = `
const query = 'SELECT * FROM users WHERE id = $1';
db.query(query, [userId]);
`;

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'sql-safe.js',
        safeCode,
        'injection'
      );
    });
  });

  suite('NoSQL Injection Detection', () => {
    test('Should detect NoSQL injection with direct user input', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const user = await User.find(req.query);
`;

      const vulnerabilities = await testNoSQLInjectionDetection(
        testWorkspacePath,
        'nosql-direct.js',
        vulnerableCode,
        {
          confidence: 'high',
        }
      );

      assertSecurityMetadata(vulnerabilities[0]);
      assert.strictEqual(vulnerabilities[0].severity, 'critical');
    });

    test('Should detect NoSQL injection with $where operator', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const users = await User.find({ $where: req.body.filter });
`;

      const vulnerabilities = await testNoSQLInjectionDetection(
        testWorkspacePath,
        'nosql-where.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect NoSQL injection');
      assert.ok(vulnerabilities[0].recommendation.length > 0);
    });

    test('Should NOT detect safe MongoDB queries', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = `
const sanitizedQuery = validator.escape(req.query.search);
const user = await User.findOne({ username: sanitizedQuery });
`;

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'nosql-safe.js',
        safeCode,
        'injection'
      );
    });
  });

  suite('Command Injection Detection', () => {
    test('Should detect command injection in exec()', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const { exec } = require('child_process');
exec('ls ' + req.query.dir);
`;

      const vulnerabilities = await testCommandInjectionDetection(
        testWorkspacePath,
        'cmd-exec.js',
        vulnerableCode,
        {
          shouldContainRecommendation: 'validate',
        }
      );

      assertSecurityMetadata(vulnerabilities[0]);
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.COMMAND_INJECTION);
      assert.strictEqual(vulnerabilities[0].severity, 'critical');
    });

    test('Should detect command injection in spawn() with shell:true', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
spawn(req.params.cmd, [], { shell: true });
`;

      const vulnerabilities = await testCommandInjectionDetection(
        testWorkspacePath,
        'cmd-spawn.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect command injection');
      assert.ok(vulnerabilities[0].references.some(ref => ref.includes('cwe.mitre.org')));
    });

    test('Should detect code injection in eval()', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
eval(req.body.code);
`;

      const vulnerabilities = await testCommandInjectionDetection(
        testWorkspacePath,
        'code-eval.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect code injection');
      assert.strictEqual(vulnerabilities[0].severity, 'critical');
    });

    test('Should NOT detect safe execFile usage', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = `
const { execFile } = require('child_process');
const allowedCommands = ['ls', 'pwd'];
const cmd = allowedCommands.includes(req.query.cmd) ? req.query.cmd : 'ls';
execFile(cmd, ['-la']);
`;

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'cmd-safe.js',
        safeCode,
        'injection'
      );
    });
  });

  suite('LDAP Injection Detection', () => {
    test('Should detect LDAP injection in filter', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const filter = 'uid=' + req.params.username;
ldapClient.search(baseDN, { filter }, callback);
`;

      const vulnerabilities = await testLDAPInjectionDetection(
        testWorkspacePath,
        'ldap-filter.js',
        vulnerableCode
      );

      assertSecurityMetadata(vulnerabilities[0]);
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.LDAP_INJECTION);
      assert.strictEqual(vulnerabilities[0].severity, 'high');
      assert.ok(vulnerabilities[0].owaspCategory?.includes(OWASP_CATEGORIES.A03_INJECTION));
    });

    test('Should NOT detect escaped LDAP filters', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = `
const escapedUsername = ldap.escapeFilter(req.params.username);
const filter = 'uid=' + escapedUsername;
ldapClient.search(baseDN, { filter }, callback);
`;

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'ldap-safe.js',
        safeCode,
        'injection'
      );
    });
  });

  suite('XPath Injection Detection', () => {
    test('Should detect XPath injection', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const xpath = '/users/user[username="' + req.query.user + '"]';
const result = doc.select(xpath);
`;

      const vulnerabilities = await testXPathInjectionDetection(
        testWorkspacePath,
        'xpath-injection.js',
        vulnerableCode
      );

      assertSecurityMetadata(vulnerabilities[0]);
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.XPATH_INJECTION);
      assert.strictEqual(vulnerabilities[0].severity, 'high');
      assert.ok(vulnerabilities[0].references.length > 0);
    });

    test('Should NOT detect parameterized XPath queries', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = `
const escapedUser = xpath.escape(req.query.user);
const xpath = '/users/user[username="' + escapedUser + '"]';
const result = doc.select(xpath);
`;

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'xpath-safe.js',
        safeCode,
        'injection'
      );
    });
  });

  suite('Template Injection Detection', () => {
    test('Should detect template injection', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const template = req.body.template;
const compiled = Handlebars.compile(template);
`;

      const vulnerabilities = await testTemplateInjectionDetection(
        testWorkspacePath,
        'template-injection.js',
        vulnerableCode
      );

      assertSecurityMetadata(vulnerabilities[0]);
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.TEMPLATE_INJECTION);
      assert.strictEqual(vulnerabilities[0].severity, 'high');
      assert.ok(vulnerabilities[0].owaspCategory?.includes('A03:2021'));
    });

    test('Should detect unescaped template variables', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const html = '{{{ req.body.userInput }}}';
`;

      const vulnerabilities = await testTemplateInjectionDetection(
        testWorkspacePath,
        'template-unescaped.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect unescaped template injection');
      assert.strictEqual(vulnerabilities[0].severity, 'high');
    });

    test('Should NOT detect escaped template usage', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = `
const sanitizedInput = sanitize(req.body.userInput);
const html = '{{ safeInput }}'; // Auto-escaped by Handlebars
`;

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'template-safe.js',
        safeCode,
        'injection'
      );
    });
  });

  suite('Security Metadata Validation', () => {
    test('All injection vulnerabilities should have OWASP A03:2021 mapping', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const query = "SELECT * FROM users WHERE id = " + req.params.id;
exec('ls ' + req.query.dir);
`;

      const vulnerabilities = await testSQLInjectionDetection(
        testWorkspacePath,
        'multiple-injections.js',
        vulnerableCode,
        { minVulnerabilities: 1 }
      );

      for (const vuln of vulnerabilities) {
        assert.ok(
          vuln.owaspCategory?.includes('A03:2021'),
          `Injection vulnerability should map to OWASP A03:2021, got: ${vuln.owaspCategory}`
        );
      }
    });

    test('All critical vulnerabilities should have reference links', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `eval(req.body.code);`;

      const vulnerabilities = await testCommandInjectionDetection(
        testWorkspacePath,
        'critical-vuln.js',
        vulnerableCode
      );

      const criticalVuln = vulnerabilities.find(v => v.severity === 'critical');
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

    test('All vulnerabilities should have confidence levels', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const query = \`SELECT * FROM users WHERE id = '\${req.params.id}'\`;
db.query(query);
`;

      const vulnerabilities = await testSQLInjectionDetection(
        testWorkspacePath,
        'confidence-test.js',
        vulnerableCode
      );

      for (const vuln of vulnerabilities) {
        assert.ok(
          ['high', 'medium', 'low'].includes(vuln.confidence),
          `Confidence should be high/medium/low, got: ${vuln.confidence}`
        );
      }
    });
  });
});
