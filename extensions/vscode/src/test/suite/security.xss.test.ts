/**
 * Security - XSS (Cross-Site Scripting) Vulnerabilities Tests
 * OWASP Top 10 - XSS vulnerability detection tests
 *
 * Tests production SecurityAnalyzer for XSS vulnerability detection
 */

import * as assert from 'assert';
import {
  createTestWorkspace,
  cleanupTestWorkspace
} from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import {
  testXSSDetection,
  assertSecurityMetadata,
  testNoVulnerabilitiesDetected,
  testVulnerabilityDetection,
} from '../helpers/securityTestHelper';
import { CWE_IDS, OWASP_CATEGORIES, VULNERABILITY_CATEGORIES, SEVERITY_LEVELS } from '../helpers/securityTestConstants';

suite('Security - XSS Vulnerabilities Tests', () => {
  let testWorkspacePath: string;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('security-xss-tests');
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Reflected XSS Detection', () => {
    test('Should detect reflected XSS with innerHTML', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
function displayMessage(req, res) {
  const message = req.query.message;
  document.getElementById('output').innerHTML = message;
}
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-reflected-innerHTML.js',
        vulnerableCode
      );

      // Validate security metadata
      assertSecurityMetadata(vulnerabilities[0]);

      // Verify OWASP and CWE mappings
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.XSS);
      assert.ok(vulnerabilities[0].owaspCategory?.includes('A03:2021'));
      assert.strictEqual(vulnerabilities[0].category, VULNERABILITY_CATEGORIES.XSS);
      assert.ok(vulnerabilities[0].references.length > 0);
    });

    test('Should detect reflected XSS with document.write', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
function renderContent(req, res) {
  const content = req.params.content;
  document.write(content);
}
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-document-write.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect XSS');
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
      assert.ok(vulnerabilities[0].description.toLowerCase().includes('xss'));
    });

    test('Should detect reflected XSS with outerHTML', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
app.get('/display', (req, res) => {
  const userInput = req.query.input;
  element.outerHTML = userInput;
});
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-outerHTML.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect outerHTML XSS');
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
    });
  });

  suite('DOM-based XSS Detection', () => {
    test('Should detect DOM XSS with location.hash', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const hash = location.hash.substring(1);
document.getElementById('output').innerHTML = hash;
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-dom-hash.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect DOM-based XSS');
      assertSecurityMetadata(vulnerabilities[0]);
      assert.ok(vulnerabilities[0].recommendation.toLowerCase().includes('sanitize'));
    });

    test('Should detect DOM XSS with window.location', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
const url = window.location.search;
document.body.innerHTML = url;
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-window-location.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect window.location XSS');
      assert.strictEqual(vulnerabilities[0].cweId, CWE_IDS.XSS);
    });
  });

  suite('React XSS Detection', () => {
    test('Should detect dangerouslySetInnerHTML in React', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
function UserContent({ userInput }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: userInput }} />
  );
}
`;

      const vulnerabilities = await testVulnerabilityDetection(
        testWorkspacePath,
        'xss-react-dangerous.jsx',
        vulnerableCode,
        VULNERABILITY_CATEGORIES.XSS,
        CWE_IDS.XSS,
        SEVERITY_LEVELS.HIGH,
        {
          shouldContainRecommendation: 'sanitize',
          owaspCategory: 'A03:2021',
        }
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect dangerouslySetInnerHTML');
      assertSecurityMetadata(vulnerabilities[0]);
    });

    test('Should detect React dangerouslySetInnerHTML with req.body', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
app.post('/render', (req, res) => {
  const html = req.body.content;
  const component = <div dangerouslySetInnerHTML={{ __html: html }} />;
  res.send(ReactDOMServer.renderToString(component));
});
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-react-server.jsx',
        vulnerableCode
      );

      assert.ok(vulnerabilities.length > 0, 'Should detect server-side React XSS');
      assert.strictEqual(vulnerabilities[0].severity, SEVERITY_LEVELS.HIGH);
    });
  });

  suite('Negative Tests - Safe Practices', () => {
    test('Should NOT detect safe textContent usage', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = `
function displayMessage(req, res) {
  const message = req.query.message;
  document.getElementById('output').textContent = message; // Safe - textContent escapes HTML
}
`;

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'xss-safe-textContent.js',
        safeCode,
        VULNERABILITY_CATEGORIES.XSS
      );
    });

    test('Should NOT detect sanitized innerHTML', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = `
import DOMPurify from 'dompurify';

function displayMessage(req, res) {
  const message = req.query.message;
  const sanitized = DOMPurify.sanitize(message);
  document.getElementById('output').innerHTML = sanitized;
}
`;

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'xss-safe-sanitized.js',
        safeCode,
        VULNERABILITY_CATEGORIES.XSS
      );
    });

    test('Should NOT detect escaped React rendering', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const safeCode = `
function UserContent({ userInput }) {
  return (
    <div>{userInput}</div> // Safe - React escapes by default
  );
}
`;

      await testNoVulnerabilitiesDetected(
        testWorkspacePath,
        'xss-safe-react.jsx',
        safeCode,
        VULNERABILITY_CATEGORIES.XSS
      );
    });
  });

  suite('Security Metadata Validation', () => {
    test('All XSS vulnerabilities should have OWASP A03:2021 mapping', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
document.getElementById('output').innerHTML = req.query.data;
element.outerHTML = req.params.content;
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-multiple.js',
        vulnerableCode,
        { minVulnerabilities: 1 }
      );

      for (const vuln of vulnerabilities) {
        assert.ok(
          vuln.owaspCategory?.includes('A03:2021'),
          `XSS vulnerability should map to OWASP A03:2021, got: ${vuln.owaspCategory}`
        );
      }
    });

    test('All XSS vulnerabilities should have CWE-79', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
document.write(req.body.html);
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-cwe-validation.js',
        vulnerableCode
      );

      assert.strictEqual(
        vulnerabilities[0].cweId,
        CWE_IDS.XSS,
        'XSS should have CWE-79'
      );
    });

    test('XSS vulnerabilities should have sanitization recommendations', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
element.innerHTML = req.query.userInput;
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-recommendation.js',
        vulnerableCode
      );

      const recommendation = vulnerabilities[0].recommendation.toLowerCase();
      assert.ok(
        recommendation.includes('sanitize') ||
        recommendation.includes('escape') ||
        recommendation.includes('textcontent'),
        `Recommendation should mention sanitization/escaping. Got: ${vulnerabilities[0].recommendation}`
      );
    });

    test('XSS vulnerabilities should have reference links', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const vulnerableCode = `
document.getElementById('div').innerHTML = location.hash;
`;

      const vulnerabilities = await testXSSDetection(
        testWorkspacePath,
        'xss-references.js',
        vulnerableCode
      );

      assert.ok(vulnerabilities[0].references.length >= 2, 'Should have at least 2 references');
      assert.ok(
        vulnerabilities[0].references.some(ref => ref.includes('owasp.org')),
        'Should have OWASP reference'
      );
      assert.ok(
        vulnerabilities[0].references.some(ref => ref.includes('cwe.mitre.org')),
        'Should have CWE reference'
      );
    });
  });
});
