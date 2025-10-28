/**
 * Security Test Helper
 * Utilities for testing security vulnerability detection
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as assert from 'assert';
import { SecurityAnalyzer, SecurityVulnerability } from './securityAnalyzerWrapper';
import {
  CWE_IDS,
  OWASP_CATEGORIES,
  VULNERABILITY_CATEGORIES,
  SEVERITY_LEVELS,
  CONFIDENCE_LEVELS,
} from './securityTestConstants';

/**
 * Options for vulnerability detection testing
 */
export interface VulnerabilityDetectionOptions {
  /** Expected recommendation text (partial match) */
  shouldContainRecommendation?: string;
  /** Expected OWASP category */
  owaspCategory?: string;
  /** Expected confidence level */
  confidence?: typeof CONFIDENCE_LEVELS[keyof typeof CONFIDENCE_LEVELS];
  /** Expected minimum number of vulnerabilities */
  minVulnerabilities?: number;
  /** Expected exact number of vulnerabilities */
  exactVulnerabilities?: number;
  /** Custom assertion function */
  customAssert?: (vulnerability: SecurityVulnerability) => void;
}

/**
 * Test helper to detect and validate security vulnerabilities
 *
 * @param workspacePath - Test workspace directory path
 * @param filename - Name of the file to create
 * @param vulnerableCode - Code containing vulnerability
 * @param category - Expected vulnerability category
 * @param cweId - Expected CWE ID
 * @param severity - Expected severity level
 * @param options - Additional validation options
 * @returns Array of detected vulnerabilities matching criteria
 */
export async function testVulnerabilityDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  category: string,
  cweId: number,
  severity: typeof SEVERITY_LEVELS[keyof typeof SEVERITY_LEVELS],
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  // Create test file
  const testFile = path.join(workspacePath, filename);
  await fs.writeFile(testFile, vulnerableCode, 'utf8');

  // Analyze file with production SecurityAnalyzer
  const analyzer = new SecurityAnalyzer();
  const allVulnerabilities = await analyzer.analyzeFile(testFile);

  // Filter vulnerabilities matching criteria
  const matchingVulnerabilities = allVulnerabilities.filter(v =>
    v.category === category &&
    v.cweId === cweId &&
    v.severity === severity
  );

  // Assertions
  if (options.exactVulnerabilities !== undefined) {
    assert.strictEqual(
      matchingVulnerabilities.length,
      options.exactVulnerabilities,
      `Expected exactly ${options.exactVulnerabilities} ${category} vulnerabilities (CWE-${cweId}), found ${matchingVulnerabilities.length}`
    );
  } else {
    const minVulns = options.minVulnerabilities ?? 1;
    assert.ok(
      matchingVulnerabilities.length >= minVulns,
      `Expected at least ${minVulns} ${category} vulnerability (CWE-${cweId}), found ${matchingVulnerabilities.length}`
    );
  }

  // Validate first matching vulnerability
  const vulnerability = matchingVulnerabilities[0];
  assert.ok(vulnerability, `Should detect ${category} vulnerability (CWE-${cweId})`);

  // Check recommendation
  if (options.shouldContainRecommendation) {
    const recommendation = vulnerability.recommendation.toLowerCase();
    const expectedText = options.shouldContainRecommendation.toLowerCase();
    assert.ok(
      recommendation.includes(expectedText),
      `Recommendation should mention "${options.shouldContainRecommendation}". Got: "${vulnerability.recommendation}"`
    );
  }

  // Check OWASP category
  if (options.owaspCategory) {
    assert.ok(
      vulnerability.owaspCategory?.includes(options.owaspCategory),
      `Should map to OWASP ${options.owaspCategory}. Got: ${vulnerability.owaspCategory}`
    );
  }

  // Check confidence level
  if (options.confidence) {
    assert.strictEqual(
      vulnerability.confidence,
      options.confidence,
      `Expected confidence: ${options.confidence}, got: ${vulnerability.confidence}`
    );
  }

  // Custom assertions
  if (options.customAssert) {
    options.customAssert(vulnerability);
  }

  return matchingVulnerabilities;
}

/**
 * Test helper for SQL injection detection
 */
export async function testSQLInjectionDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.INJECTION,
    CWE_IDS.SQL_INJECTION,
    SEVERITY_LEVELS.CRITICAL,
    {
      shouldContainRecommendation: 'parameterized',
      owaspCategory: 'A03:2021',
      ...options,
    }
  );
}

/**
 * Test helper for NoSQL injection detection
 */
export async function testNoSQLInjectionDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.INJECTION,
    CWE_IDS.NOSQL_INJECTION,
    SEVERITY_LEVELS.CRITICAL,
    {
      owaspCategory: 'A03:2021',
      ...options,
    }
  );
}

/**
 * Test helper for command injection detection
 */
export async function testCommandInjectionDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.INJECTION,
    CWE_IDS.COMMAND_INJECTION,
    SEVERITY_LEVELS.CRITICAL,
    {
      shouldContainRecommendation: 'sanitize',
      owaspCategory: 'A03:2021',
      ...options,
    }
  );
}

/**
 * Test helper for LDAP injection detection
 */
export async function testLDAPInjectionDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.INJECTION,
    CWE_IDS.LDAP_INJECTION,
    SEVERITY_LEVELS.HIGH,
    {
      owaspCategory: 'A03:2021',
      ...options,
    }
  );
}

/**
 * Test helper for XPath injection detection
 */
export async function testXPathInjectionDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.INJECTION,
    CWE_IDS.XPATH_INJECTION,
    SEVERITY_LEVELS.HIGH,
    {
      owaspCategory: 'A03:2021',
      ...options,
    }
  );
}

/**
 * Test helper for template injection detection
 */
export async function testTemplateInjectionDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.INJECTION,
    CWE_IDS.TEMPLATE_INJECTION,
    SEVERITY_LEVELS.HIGH,
    {
      owaspCategory: 'A03:2021',
      ...options,
    }
  );
}

/**
 * Test helper for XSS detection
 */
export async function testXSSDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.XSS,
    CWE_IDS.XSS,
    SEVERITY_LEVELS.HIGH,
    {
      shouldContainRecommendation: 'sanitize',
      owaspCategory: 'A03:2021',
      ...options,
    }
  );
}

/**
 * Test helper for hardcoded credentials detection
 */
export async function testHardcodedCredentialsDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.AUTHENTICATION,
    CWE_IDS.HARDCODED_CREDENTIALS,
    SEVERITY_LEVELS.CRITICAL,
    {
      shouldContainRecommendation: 'environment',
      owaspCategory: 'A07:2021',
      ...options,
    }
  );
}

/**
 * Test helper for weak password policy detection
 */
export async function testWeakPasswordPolicyDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.AUTHENTICATION,
    CWE_IDS.WEAK_PASSWORD,
    SEVERITY_LEVELS.HIGH,
    {
      shouldContainRecommendation: 'password',
      owaspCategory: 'A07:2021',
      ...options,
    }
  );
}

/**
 * Test helper for missing authentication check detection
 */
export async function testMissingAuthCheckDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.AUTHENTICATION,
    CWE_IDS.AUTH_BYPASS,
    SEVERITY_LEVELS.CRITICAL,
    {
      shouldContainRecommendation: 'authentication',
      owaspCategory: 'A01:2021',
      ...options,
    }
  );
}

/**
 * Test helper for session fixation detection
 */
export async function testSessionFixationDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.AUTHENTICATION,
    CWE_IDS.SESSION_FIXATION,
    SEVERITY_LEVELS.HIGH,
    {
      shouldContainRecommendation: 'regenerate',
      owaspCategory: 'A07:2021',
      ...options,
    }
  );
}

/**
 * Test helper to verify NO vulnerabilities are detected (negative test)
 */
export async function testNoVulnerabilitiesDetected(
  workspacePath: string,
  filename: string,
  safeCode: string,
  category?: string
): Promise<void> {
  const testFile = path.join(workspacePath, filename);
  await fs.writeFile(testFile, safeCode, 'utf8');

  const analyzer = new SecurityAnalyzer();
  const vulnerabilities = await analyzer.analyzeFile(testFile);

  // CRITICAL: Verify analyzer returned valid array (Bug #2 fix)
  assert.ok(
    Array.isArray(vulnerabilities),
    'SecurityAnalyzer must return array (returned undefined or null)'
  );

  if (category) {
    const categoryVulns = vulnerabilities.filter(v => v.category === category);
    assert.strictEqual(
      categoryVulns.length,
      0,
      `Expected no ${category} vulnerabilities for safe code, found ${categoryVulns.length}`
    );
  } else {
    assert.strictEqual(
      vulnerabilities.length,
      0,
      `Expected no vulnerabilities for safe code, found ${vulnerabilities.length}`
    );
  }
}

/**
 * Assert vulnerability has required security metadata
 */
export function assertSecurityMetadata(vulnerability: SecurityVulnerability): void {
  assert.ok(vulnerability.id, 'Vulnerability should have ID');
  assert.ok(vulnerability.title, 'Vulnerability should have title');
  assert.ok(vulnerability.description, 'Vulnerability should have description');
  assert.ok(vulnerability.severity, 'Vulnerability should have severity');
  assert.ok(vulnerability.category, 'Vulnerability should have category');
  assert.ok(vulnerability.recommendation, 'Vulnerability should have recommendation');
  assert.ok(vulnerability.confidence, 'Vulnerability should have confidence level');

  // OWASP category (optional but should be present for major vulnerabilities)
  if (vulnerability.severity === 'critical' || vulnerability.severity === 'high') {
    assert.ok(
      vulnerability.owaspCategory,
      `Critical/High severity vulnerabilities should have OWASP category. Got: ${vulnerability.severity}`
    );
  }

  // CWE ID (optional but recommended)
  if (vulnerability.cweId) {
    assert.ok(
      typeof vulnerability.cweId === 'number',
      'CWE ID should be a number'
    );
    assert.ok(
      vulnerability.cweId > 0,
      'CWE ID should be positive'
    );
  }

  // References
  assert.ok(
    Array.isArray(vulnerability.references),
    'References should be an array'
  );

  if (vulnerability.owaspCategory) {
    const hasOwaspRef = vulnerability.references.some(ref =>
      ref.toLowerCase().includes('owasp.org')
    );
    assert.ok(
      hasOwaspRef,
      'Vulnerability with OWASP category should have OWASP reference link'
    );
  }

  if (vulnerability.cweId) {
    const hasCweRef = vulnerability.references.some(ref =>
      ref.toLowerCase().includes('cwe.mitre.org')
    );
    assert.ok(
      hasCweRef,
      'Vulnerability with CWE ID should have CWE reference link'
    );
  }
}

/**
 * Assert vulnerability has expected line number
 */
export function assertVulnerabilityLine(
  vulnerability: SecurityVulnerability,
  expectedLine: number,
  tolerance: number = 2
): void {
  const actualLine = vulnerability.line;
  const diff = Math.abs(actualLine - expectedLine);

  assert.ok(
    diff <= tolerance,
    `Vulnerability line should be around ${expectedLine} (±${tolerance}), got ${actualLine}`
  );
}

/**
 * Create a test file with multiple vulnerabilities for comprehensive testing
 */
export async function createMultiVulnerabilityFile(
  workspacePath: string,
  filename: string,
  vulnerabilities: Array<{ type: string; code: string }>
): Promise<string> {
  const code = vulnerabilities.map((v, i) =>
    `// Vulnerability ${i + 1}: ${v.type}\n${v.code}\n`
  ).join('\n');

  const testFile = path.join(workspacePath, filename);
  await fs.writeFile(testFile, code, 'utf8');

  return testFile;
}

/**
 * Assert vulnerability has expected OWASP category
 */
export function assertOWASPCategory(
  vulnerability: SecurityVulnerability,
  expectedCategory: string
): void {
  assert.ok(
    vulnerability.owaspCategory?.includes(expectedCategory),
    `Expected OWASP ${expectedCategory}, got: ${vulnerability.owaspCategory}`
  );
}

/**
 * Assert all vulnerabilities have expected OWASP category
 */
export function assertAllVulnerabilitiesHaveOWASP(
  vulnerabilities: SecurityVulnerability[],
  expectedCategory: string
): void {
  for (const vuln of vulnerabilities) {
    assertOWASPCategory(vuln, expectedCategory);
  }
}

/**
 * Assert vulnerability has CWE ID
 */
export function assertCWEId(
  vulnerability: SecurityVulnerability,
  expectedCweId: number
): void {
  assert.strictEqual(
    vulnerability.cweId,
    expectedCweId,
    `Expected CWE-${expectedCweId}, got: CWE-${vulnerability.cweId}`
  );
}

/**
 * Assert all vulnerabilities have expected CWE ID
 */
export function assertAllVulnerabilitiesHaveCWE(
  vulnerabilities: SecurityVulnerability[],
  expectedCweId: number
): void {
  for (const vuln of vulnerabilities) {
    assertCWEId(vuln, expectedCweId);
  }
}

/**
 * Test helper for hardcoded secrets detection (API keys, tokens)
 */
export async function testHardcodedSecretsDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.SECRETS,
    CWE_IDS.HARDCODED_SECRETS,
    SEVERITY_LEVELS.CRITICAL,
    {
      shouldContainRecommendation: 'environment',
      owaspCategory: 'A02:2021',
      ...options,
    }
  );
}

/**
 * Test helper for exposed encryption keys detection
 */
export async function testExposedEncryptionKeysDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.SECRETS,
    CWE_IDS.EXPOSED_ENCRYPTION_KEYS,
    SEVERITY_LEVELS.CRITICAL,
    {
      owaspCategory: 'A02:2021',
      ...options,
    }
  );
}

/**
 * Test helper for sensitive data in logs detection
 */
export async function testSensitiveDataInLogsDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.SECRETS,
    CWE_IDS.SENSITIVE_DATA_IN_LOGS,
    SEVERITY_LEVELS.HIGH,
    {
      owaspCategory: 'A09:2021',
      ...options,
    }
  );
}

/**
 * Test helper for unencrypted sensitive storage detection
 */
export async function testUnencryptedStorageDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.SECRETS,
    CWE_IDS.UNENCRYPTED_STORAGE,
    SEVERITY_LEVELS.HIGH,
    {
      owaspCategory: 'A02:2021',
      ...options,
    }
  );
}

/**
 * Create security test filename with proper extension
 */
export function createSecurityTestFile(
  category: string,
  testName: string,
  language: 'js' | 'ts' | 'jsx' | 'tsx' | 'py' = 'js'
): string {
  return `${category}-${testName}.${language}`;
}

/**
 * Test helper for debug mode in production detection
 */
export async function testDebugModeDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.CONFIGURATION,
    CWE_IDS.DEBUG_MODE_PRODUCTION,
    SEVERITY_LEVELS.HIGH,
    {
      shouldContainRecommendation: 'debug',
      owaspCategory: 'A05:2021',
      ...options,
    }
  );
}

/**
 * Test helper for CORS misconfiguration detection
 */
export async function testCorsMisconfigurationDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.CONFIGURATION,
    CWE_IDS.CORS_MISCONFIGURATION,
    SEVERITY_LEVELS.HIGH,
    {
      shouldContainRecommendation: 'CORS',
      owaspCategory: 'A05:2021',
      ...options,
    }
  );
}

/**
 * Test helper for default credentials detection
 */
export async function testDefaultCredentialsDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.CONFIGURATION,
    CWE_IDS.DEFAULT_CREDENTIALS,
    SEVERITY_LEVELS.CRITICAL,
    {
      shouldContainRecommendation: 'credentials',
      owaspCategory: 'A05:2021',
      ...options,
    }
  );
}

/**
 * Test helper for insecure HTTP usage detection
 */
export async function testInsecureHttpDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.CONFIGURATION,
    CWE_IDS.INSECURE_TRANSPORT,
    SEVERITY_LEVELS.HIGH,
    {
      shouldContainRecommendation: 'HTTPS',
      owaspCategory: 'A05:2021',
      ...options,
    }
  );
}

/**
 * Test helper for magic number detection
 */
export async function testMagicNumberDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.CODE_QUALITY,
    CWE_IDS.MAGIC_NUMBER,
    SEVERITY_LEVELS.MEDIUM,
    {
      shouldContainRecommendation: 'constant',
      ...options,
    }
  );
}

/**
 * Test helper for large function detection
 */
export async function testLargeFunctionDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.CODE_QUALITY,
    CWE_IDS.LARGE_FUNCTION,
    SEVERITY_LEVELS.MEDIUM,
    {
      shouldContainRecommendation: 'function',
      ...options,
    }
  );
}

/**
 * Test helper for deep nesting detection
 */
export async function testDeepNestingDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.CODE_QUALITY,
    CWE_IDS.DEEP_NESTING,
    SEVERITY_LEVELS.MEDIUM,
    {
      shouldContainRecommendation: 'nesting',
      ...options,
    }
  );
}

/**
 * Test helper for missing error handling detection
 */
export async function testMissingErrorHandlingDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.CODE_QUALITY,
    CWE_IDS.MISSING_ERROR_HANDLING,
    SEVERITY_LEVELS.HIGH,
    {
      shouldContainRecommendation: 'error',
      ...options,
    }
  );
}

/**
 * Test helper for missing input validation detection
 */
export async function testMissingInputValidationDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.CODE_QUALITY,
    CWE_IDS.MISSING_INPUT_VALIDATION,
    SEVERITY_LEVELS.HIGH,
    {
      shouldContainRecommendation: 'validat',
      ...options,
    }
  );
}

/**
 * Test helper for large class detection
 */
export async function testLargeClassDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.ARCHITECTURE,
    CWE_IDS.LARGE_CLASS,
    SEVERITY_LEVELS.MEDIUM,
    {
      shouldContainRecommendation: 'class',
      ...options,
    }
  );
}

/**
 * Test helper for tight coupling detection
 */
export async function testTightCouplingDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.ARCHITECTURE,
    CWE_IDS.TIGHT_COUPLING,
    SEVERITY_LEVELS.MEDIUM,
    {
      shouldContainRecommendation: 'coupling',
      ...options,
    }
  );
}

/**
 * Test helper for missing abstraction detection
 */
export async function testMissingAbstractionDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.ARCHITECTURE,
    CWE_IDS.MISSING_ABSTRACTION,
    SEVERITY_LEVELS.MEDIUM,
    {
      shouldContainRecommendation: 'repository',
      ...options,
    }
  );
}

/**
 * Test helper for circular dependency detection
 */
export async function testCircularDependencyDetection(
  workspacePath: string,
  filename: string,
  vulnerableCode: string,
  options: VulnerabilityDetectionOptions = {}
): Promise<SecurityVulnerability[]> {
  return testVulnerabilityDetection(
    workspacePath,
    filename,
    vulnerableCode,
    VULNERABILITY_CATEGORIES.ARCHITECTURE,
    CWE_IDS.CIRCULAR_DEPENDENCY,
    SEVERITY_LEVELS.HIGH,
    {
      shouldContainRecommendation: 'circular',
      ...options,
    }
  );
}

/**
 * Test helper for generating and validating review reports
 */
export async function testReviewReportGeneration(
  workspacePath: string,
  filename: string,
  code: string
): Promise<{ vulnerabilities: SecurityVulnerability[]; report: any }> {
  const testFile = require('path').join(workspacePath, filename);
  await require('fs/promises').writeFile(testFile, code, 'utf8');

  const { SecurityAnalyzer } = require('./securityAnalyzerWrapper');
  const analyzer = new SecurityAnalyzer();

  const vulnerabilities = await analyzer.analyzeFile(testFile);
  const report = analyzer.generateReviewReport(vulnerabilities);

  return { vulnerabilities, report };
}

/**
 * Test helper for quality assessment metrics
 */
export async function testQualityMetrics(
  workspacePath: string,
  filename: string,
  code: string
): Promise<any> {
  const testFile = require('path').join(workspacePath, filename);
  await require('fs/promises').writeFile(testFile, code, 'utf8');

  const { SecurityAnalyzer } = require('./securityAnalyzerWrapper');
  const analyzer = new SecurityAnalyzer();

  const metrics = await analyzer.calculateQualityMetrics(testFile);

  return metrics;
}
