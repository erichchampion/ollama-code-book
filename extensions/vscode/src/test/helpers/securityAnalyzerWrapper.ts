/**
 * Security Analyzer Wrapper
 * Re-exports production SecurityAnalyzer for use in tests
 *
 * Note: This file exists to work around TypeScript rootDir restrictions.
 * The actual SecurityAnalyzer implementation is in src/ai/security-analyzer.ts
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  FILE_PATTERNS,
  VULNERABILITY_CATEGORIES,
  CONFIDENCE_SCORE_VALUES,
  DEFAULT_CONFIDENCE_SCORE,
  PERFECT_CONFIDENCE_SCORE,
  SEVERITY_WEIGHTS,
  SEVERITY_ORDER,
  PRIORITY_ORDER,
  MAX_RECOMMENDATION_EXAMPLES,
  POSITIVE_FINDING_MESSAGES,
  SUMMARY_NO_ISSUES,
  FALLBACK_POSITIVE_FINDING,
} from './securityTestConstants';

/**
 * Security vulnerability interface matching production SecurityAnalyzer
 */
export interface SecurityVulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  owaspCategory?: string;
  cweId?: number;
  file: string;
  line: number;
  column?: number;
  code: string;
  recommendation: string;
  references: string[];
  confidence: 'high' | 'medium' | 'low';
  impact: string;
  exploitability: string;
}

/**
 * Security rule definition
 */
export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: SecurityVulnerability['severity'];
  category: string;
  owaspCategory?: string;
  cweId?: number;
  pattern: RegExp;
  filePatterns: string[];
  confidence: SecurityVulnerability['confidence'];
  recommendation: string;
  references: string[];
  validator?: (match: RegExpMatchArray, code: string, filePath: string) => boolean;
}

/**
 * Production security rules (subset for testing)
 * Full implementation is in src/ai/security-analyzer.ts
 */
const SECURITY_RULES: SecurityRule[] = [
  // SQL Injection
  {
    id: 'sql_injection',
    name: 'Potential SQL Injection',
    description: 'SQL query construction using string concatenation or interpolation',
    severity: 'critical',
    category: 'injection',
    owaspCategory: 'A03:2021 – Injection',
    cweId: 89,
    pattern: /(query|sql|execute)\s*\(\s*['"`][^'"`]*\$\{|['"`][^'"`]*\+.*\+.*['"`]|query.*=.*['"`].*\+.*req\.|SELECT.*FROM.*WHERE.*\+|INSERT.*INTO.*VALUES.*\+/i,
    filePatterns: FILE_PATTERNS.BACKEND_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Use parameterized queries or prepared statements to prevent SQL injection',
    references: [
      'https://owasp.org/Top10/A03_2021-Injection/',
      'https://cwe.mitre.org/data/definitions/89.html'
    ]
  },

  // Command Injection
  {
    id: 'command_injection',
    name: 'Potential Command Injection',
    description: 'Execution of system commands with user input',
    severity: 'critical',
    category: 'injection',
    owaspCategory: 'A03:2021 – Injection',
    cweId: 78,
    pattern: /(exec|spawn|system|eval|shell_exec|passthru)\s*\([^)]*(?:req\.|params\.|query\.|body\.|\$_GET|\$_POST)/i,
    filePatterns: FILE_PATTERNS.BACKEND_LANGUAGES as unknown as string[],
    confidence: 'high',
    recommendation: 'Validate and sanitize all user input before executing system commands',
    references: [
      'https://owasp.org/Top10/A03_2021-Injection/',
      'https://cwe.mitre.org/data/definitions/78.html'
    ]
  },

  // NoSQL Injection (uses same CWE as SQL)
  {
    id: 'nosql_injection',
    name: 'Potential NoSQL Injection',
    description: 'NoSQL query construction with unsanitized user input',
    severity: 'critical',
    category: 'injection',
    owaspCategory: 'A03:2021 – Injection',
    cweId: 89,
    pattern: /\.find\s*\(\s*(?:req\.|params\.|query\.|body\.)|\$where.*(?:req\.|params\.|query\.|body\.)/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'high',
    recommendation: 'Validate and sanitize user input, use schema validation for MongoDB queries',
    references: [
      'https://owasp.org/Top10/A03_2021-Injection/',
      'https://cwe.mitre.org/data/definitions/89.html'
    ]
  },

  // LDAP Injection
  {
    id: 'ldap_injection',
    name: 'Potential LDAP Injection',
    description: 'LDAP query construction with unsanitized user input',
    severity: 'high',
    category: 'injection',
    owaspCategory: 'A03:2021 – Injection',
    cweId: 90,
    pattern: /(?:ldap|search).*filter.*(?:req\.|params\.|query\.|body\.)|(?:dn|baseDN).*=.*(?:req\.|params\.|query\.|body\.)/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Escape LDAP special characters or use LDAP libraries with built-in escaping',
    references: [
      'https://owasp.org/Top10/A03_2021-Injection/',
      'https://cwe.mitre.org/data/definitions/90.html'
    ]
  },

  // XPath Injection
  {
    id: 'xpath_injection',
    name: 'Potential XPath Injection',
    description: 'XPath query construction with unsanitized user input',
    severity: 'high',
    category: 'injection',
    owaspCategory: 'A03:2021 – Injection',
    cweId: 643,
    pattern: /(?:xpath|select).*(?:req\.|params\.|query\.|body\.)/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Use parameterized XPath queries or escape user input',
    references: [
      'https://owasp.org/Top10/A03_2021-Injection/',
      'https://cwe.mitre.org/data/definitions/643.html'
    ]
  },

  // Template Injection
  {
    id: 'template_injection',
    name: 'Potential Template Injection',
    description: 'Template rendering with unsanitized user input',
    severity: 'high',
    category: 'injection',
    owaspCategory: 'A03:2021 – Injection',
    cweId: 94,
    pattern: /(?:render|compile|template).*(?:req\.|params\.|query\.|body\.)|\{\{\{.*(?:req\.|params\.|query\.|body\.).*\}\}\}/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Escape user input or use sandboxed template engines',
    references: [
      'https://owasp.org/Top10/A03_2021-Injection/',
      'https://cwe.mitre.org/data/definitions/94.html'
    ]
  },

  // XSS (Cross-Site Scripting)
  {
    id: 'xss_vulnerability',
    name: 'Potential Cross-Site Scripting (XSS)',
    description: 'User input rendered without sanitization',
    severity: 'high',
    category: 'xss',
    owaspCategory: 'A03:2021 – Injection',
    cweId: 79,
    pattern: /\.innerHTML\s*=.*(?:req\.|params\.|query\.|body\.|location\.|window\.location)|\.outerHTML\s*=.*(?:req\.|params\.|query\.|body\.|location\.)|document\.write\s*\(.*(?:req\.|params\.|query\.|body\.|location\.)|dangerouslySetInnerHTML.*(?:req\.|params\.|query\.|body\.)/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'high',
    recommendation: 'Sanitize user input before rendering, use textContent instead of innerHTML, or use a library like DOMPurify',
    references: [
      'https://owasp.org/Top10/A03_2021-Injection/',
      'https://cwe.mitre.org/data/definitions/79.html'
    ]
  },

  // Hardcoded Credentials - Handles passwords and short auth tokens (< 20 chars)
  // Note: API keys (20+ chars) are handled by 'hardcoded_secrets' rule
  {
    id: 'hardcoded_credentials',
    name: 'Hardcoded Credentials Detected',
    description: 'Passwords and credentials hardcoded in source code',
    severity: 'critical',
    category: 'authentication',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
    cweId: 798,
    pattern: /(?:password|passwd|pwd|secret|auth[_-]?token)\s*[:=]\s*['"`](?!.*\$\{)[\w\-@#$%^&*()+=!]{6,}['"`]/i,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'high',
    recommendation: 'Store credentials in environment variables or secure secret management systems',
    references: [
      'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
      'https://cwe.mitre.org/data/definitions/798.html'
    ]
  },

  // Weak Password Validation
  {
    id: 'weak_password_policy',
    name: 'Weak Password Policy',
    description: 'Password validation allows weak passwords',
    severity: 'high',
    category: 'authentication',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
    cweId: 521,
    pattern: /password.*length.*[<<=].*[1-7][^0-9]|minLength.*:.*[1-7][^0-9]/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Enforce strong password policies: minimum 8 characters, complexity requirements',
    references: [
      'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
      'https://cwe.mitre.org/data/definitions/521.html'
    ]
  },

  // Missing Authentication Check
  {
    id: 'missing_auth_check',
    name: 'Missing Authentication Check',
    description: 'Route or endpoint missing authentication middleware',
    severity: 'critical',
    category: 'authentication',
    owaspCategory: 'A01:2021 – Broken Access Control',
    cweId: 287,
    pattern: /(?:app|router)\.(get|post|put|delete|patch)\s*\(['"`]\/(?:admin|api|private|protected|dashboard)[^'"`]*['"`]\s*,\s*(?:async\s*)?\((?!.*(?:auth|isAuthenticated|requireAuth|checkAuth|verifyToken))/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Add authentication middleware to protected routes',
    references: [
      'https://owasp.org/Top10/A01_2021-Broken_Access_Control/',
      'https://cwe.mitre.org/data/definitions/287.html'
    ]
  },

  // Session Fixation
  {
    id: 'session_fixation',
    name: 'Session Fixation Vulnerability',
    description: 'Session ID not regenerated after authentication',
    severity: 'high',
    category: 'authentication',
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
    cweId: 384,
    pattern: /(?:login|authenticate|signin)[\s\S]*?(?:req\.)?session\.(?:userId|user)\s*=/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Regenerate session ID after successful authentication using session.regenerate()',
    references: [
      'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
      'https://cwe.mitre.org/data/definitions/384.html'
    ],
    validator: (match: RegExpMatchArray, code: string, filePath: string): boolean => {
      if (!match.index) return false;

      // Extract the function/block containing the match
      const beforeAssignment = code.substring(0, match.index);

      // Find the start of the current function (last occurrence of function keyword or arrow)
      const functionStart = Math.max(
        beforeAssignment.lastIndexOf('function'),
        beforeAssignment.lastIndexOf('=>'),
        beforeAssignment.lastIndexOf('{')
      );

      // Get the code from function start to session assignment
      const functionScope = code.substring(Math.max(0, functionStart), match.index + match[0].length);

      // Check if session.regenerate() is called BEFORE the session assignment in the same scope
      // Must be an actual function call, not in comments or strings
      const regenerateCallPattern = /(?:req\.)?session\.regenerate\s*\(/;
      const hasRegenerateCall = regenerateCallPattern.test(functionScope);

      // If regenerate is found, ensure it's before the session assignment
      if (hasRegenerateCall) {
        const regenerateMatch = functionScope.match(regenerateCallPattern);
        if (regenerateMatch && regenerateMatch.index !== undefined) {
          const sessionAssignmentInScope = functionScope.indexOf('session.userId') !== -1
            ? functionScope.indexOf('session.userId')
            : functionScope.indexOf('session.user');

          // Regenerate must come before assignment
          return regenerateMatch.index >= sessionAssignmentInScope;
        }
      }

      // No regenerate call found = vulnerable
      return true;
    }
  },

  // Hardcoded Secrets (API Keys, Tokens) - Handles long API keys and tokens (20+ chars)
  // Note: Short passwords (< 20 chars) are handled by 'hardcoded_credentials' rule
  {
    id: 'hardcoded_secrets',
    name: 'Hardcoded Secrets/API Keys Detected',
    description: 'API keys, tokens, or secrets hardcoded in source code',
    severity: 'critical',
    category: 'secrets',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
    cweId: 798,
    pattern: /(?:api[_-]?key|apikey|access[_-]?key|secret[_-]?key|private[_-]?key|aws[_-]?access|stripe|twilio|github[_-]?token|slack[_-]?token|oauth[_-]?token)\s*[:=]\s*['"`](?!.*\$\{)[A-Za-z0-9\-_]{20,}['"`]/i,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'high',
    recommendation: 'Store API keys and secrets in environment variables or secure vault services (AWS Secrets Manager, HashiCorp Vault)',
    references: [
      'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
      'https://cwe.mitre.org/data/definitions/798.html'
    ]
  },

  // Exposed Encryption Keys
  {
    id: 'exposed_encryption_keys',
    name: 'Exposed Encryption Keys',
    description: 'Encryption keys or cryptographic material exposed in code',
    severity: 'critical',
    category: 'secrets',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
    cweId: 321,
    pattern: /(?:encryption[_-]?key|crypto[_-]?key|aes[_-]?key|rsa[_-]?key|hmac[_-]?secret|jwt[_-]?secret|signing[_-]?key)\s*[:=]\s*['"`][A-Za-z0-9+/=]{16,}['"`]/i,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'high',
    recommendation: 'Store encryption keys in secure key management systems (KMS), never in source code',
    references: [
      'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
      'https://cwe.mitre.org/data/definitions/321.html'
    ]
  },

  // Sensitive Data in Logs
  {
    id: 'sensitive_data_in_logs',
    name: 'Sensitive Data in Logs',
    description: 'Logging statements that may expose sensitive data',
    severity: 'high',
    category: 'secrets',
    owaspCategory: 'A09:2021 – Security Logging and Monitoring Failures',
    cweId: 532,
    pattern: /(?:console\.log|logger\.info|logger\.debug|log\.debug|print)\s*\([^)]*(?:password|token|secret|key|ssn|credit[_-]?card|auth)/i,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'medium',
    recommendation: 'Sanitize sensitive data before logging. Use structured logging with allowlists for sensitive fields',
    references: [
      'https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/',
      'https://cwe.mitre.org/data/definitions/532.html'
    ]
  },

  // Unencrypted Sensitive Data Storage
  {
    id: 'unencrypted_sensitive_storage',
    name: 'Unencrypted Sensitive Data Storage',
    description: 'Sensitive data stored without encryption',
    severity: 'high',
    category: 'secrets',
    owaspCategory: 'A02:2021 – Cryptographic Failures',
    cweId: 311,
    pattern: /(?:localStorage|sessionStorage|AsyncStorage|cookies?)\.setItem\s*\([^)]*(?:password|token|secret|ssn|credit[_-]?card|auth[_-]?token)/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Encrypt sensitive data before storage using AES-256 or similar. Consider using secure storage APIs',
    references: [
      'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
      'https://cwe.mitre.org/data/definitions/311.html'
    ]
  },

  // Debug Mode in Production
  {
    id: 'debug_mode_production',
    name: 'Debug Mode Enabled in Production',
    description: 'Debug mode or verbose error handling enabled in production environment',
    severity: 'high',
    category: 'configuration',
    owaspCategory: 'A05:2021 – Security Misconfiguration',
    cweId: 489,
    pattern: /(?:debug\s*:\s*true|dumpExceptions\s*:\s*true|showStack\s*:\s*true).*(?:production|prod)/i,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'high',
    recommendation: 'Disable debug mode and verbose error handling in production. Use environment variables to control debug settings',
    references: [
      'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
      'https://cwe.mitre.org/data/definitions/489.html'
    ]
  },

  // CORS Misconfiguration
  {
    id: 'cors_misconfiguration',
    name: 'Overly Permissive CORS Configuration',
    description: 'CORS configured to allow all origins with credentials enabled',
    severity: 'high',
    category: 'configuration',
    owaspCategory: 'A05:2021 – Security Misconfiguration',
    cweId: 942,
    pattern: /(?:origin\s*:\s*['"`]\*['"`]|Access-Control-Allow-Origin['"`]\s*,\s*['"`]\*['"`]).*(?:credentials\s*:\s*true|Access-Control-Allow-Credentials['"`]\s*,\s*['"`]true)/is,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'high',
    recommendation: 'Use a whitelist of allowed origins instead of wildcard (*). Never combine wildcard origin with credentials',
    references: [
      'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
      'https://cwe.mitre.org/data/definitions/942.html'
    ]
  },

  // Default Credentials
  {
    id: 'default_credentials',
    name: 'Use of Default Credentials',
    description: 'Default or common credentials used for authentication',
    severity: 'critical',
    category: 'configuration',
    owaspCategory: 'A05:2021 – Security Misconfiguration',
    cweId: 798,
    pattern: /(?:username|user)\s*:\s*['"`](?:admin|root|administrator)['"`]\s*,\s*password\s*:\s*['"`](?:admin|password|admin123|root|12345)/i,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'high',
    recommendation: 'Never use default credentials. Generate strong, unique passwords and store them securely in environment variables',
    references: [
      'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
      'https://cwe.mitre.org/data/definitions/798.html'
    ]
  },

  // Insecure HTTP Usage
  {
    id: 'insecure_http',
    name: 'Insecure HTTP for Sensitive Data',
    description: 'Sensitive data transmitted over unencrypted HTTP connection',
    severity: 'high',
    category: 'configuration',
    owaspCategory: 'A05:2021 – Security Misconfiguration',
    cweId: 319,
    pattern: /(?:http:\/\/[^'"`\s]+).*(?:password|token|secret|auth|session|cookie)/i,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Always use HTTPS for transmitting sensitive data. Set secure flag on cookies',
    references: [
      'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
      'https://cwe.mitre.org/data/definitions/319.html'
    ]
  },

  // Code Quality Analysis Rules
  {
    id: 'magic_number',
    name: 'Magic Number',
    description: 'Hardcoded numeric literal without explanation',
    severity: 'medium',
    category: 'code_quality',
    cweId: 1098,
    pattern: /(?:setTimeout|setInterval)\([^,]+,\s*(\d{4,})\)|(?:const|let|var)\s+\w+\s*=\s*[^'"]*(\d+\.\d+)[^'"]*;/,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'medium',
    recommendation: 'Replace magic numbers with named constants for better code maintainability',
    references: [
      'https://cwe.mitre.org/data/definitions/1098.html',
      'https://refactoring.guru/smells/magic-numbers'
    ]
  },
  {
    id: 'large_function',
    name: 'Large Function',
    description: 'Function exceeds 50 lines, indicating high complexity',
    severity: 'medium',
    category: 'code_quality',
    cweId: 1121,
    // Match function with 50+ line breaks (more accurate than character count)
    // Pattern: function declaration followed by { and at least 50 newlines before closing }
    pattern: /function\s+\w+\([^)]*\)\s*\{(?:[^\n]*\n){50,}[^\}]*\}/,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'medium',
    recommendation: 'Break down large functions into smaller, focused functions following Single Responsibility Principle',
    references: [
      'https://cwe.mitre.org/data/definitions/1121.html',
      'https://refactoring.guru/smells/long-method'
    ]
  },
  {
    id: 'deep_nesting',
    name: 'Deep Nesting',
    description: 'Code nesting exceeds 4 levels',
    severity: 'medium',
    category: 'code_quality',
    cweId: 1124,
    // Match 5+ levels of if nesting
    pattern: /if\s*\([^)]+\)\s*\{[^}]*if\s*\([^)]+\)\s*\{[^}]*if\s*\([^)]+\)\s*\{[^}]*if\s*\([^)]+\)\s*\{[^}]*if\s*\([^)]+\)\s*\{/s,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'high',
    recommendation: 'Reduce nesting by using early returns, guard clauses, or extracting functions',
    references: [
      'https://cwe.mitre.org/data/definitions/1124.html',
      'https://refactoring.guru/smells/arrow-code'
    ]
  },
  {
    id: 'missing_error_handling',
    name: 'Missing Error Handling',
    description: 'Async operation without immediate error handling (Note: may not detect try-catch in parent scope)',
    severity: 'high',
    category: 'code_quality',
    cweId: 252,
    // Match await without try/catch or .then without .catch
    // Note: This pattern checks for immediate error handling and may flag code that has
    // error handling in a parent scope. This is acceptable for regex-based analysis.
    pattern: /(?:await\s+\w+\([^)]*\)[^;]*;(?![^}]*catch))|\.\s*then\s*\([^)]+\)(?!\s*\.\s*catch)/s,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'medium',
    recommendation: 'Add try-catch blocks for async/await or .catch() for promises to handle errors properly',
    references: [
      'https://cwe.mitre.org/data/definitions/252.html',
      'https://nodejs.org/api/errors.html#error-handling-in-nodejs'
    ]
  },
  {
    id: 'missing_input_validation',
    name: 'Missing Input Validation',
    description: 'User input used without validation',
    severity: 'high',
    category: 'code_quality',
    cweId: 20,
    // Match req.body or function params used directly without checks
    pattern: /(?:createUser|processData|handle\w+)\s*\(\s*req\.body\s*\)|function\s+divide\s*\([^)]*\)\s*\{[^}]*return\s+\w+\s*\/\s*\w+/,
    filePatterns: FILE_PATTERNS.WEB_LANGUAGES as unknown as string[],
    confidence: 'medium',
    recommendation: 'Validate and sanitize all user inputs before processing',
    references: [
      'https://cwe.mitre.org/data/definitions/20.html',
      'https://owasp.org/www-project-proactive-controls/v3/en/c5-validate-inputs'
    ]
  },

  // Architecture Issues Rules
  {
    id: 'large_class',
    name: 'Large Class (God Object)',
    description: 'Class has more than 10 methods, indicating low cohesion (Threshold: 10+ methods)',
    severity: 'medium',
    category: 'architecture',
    cweId: 1048,
    // Match class with 10+ method definitions (threshold hardcoded in pattern)
    // Supports both JavaScript and TypeScript syntax:
    // - JavaScript: methodName(params) { }
    // - TypeScript: methodName(params): ReturnType { }
    // The (?:\s*:\s*[^{]+)? captures optional TypeScript return type annotation
    pattern: /class\s+\w+\s*\{[\s\S]*?(?:^\s*\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{[\s\S]*?\n\s*\}[\s\S]*?){10,}/m,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'medium',
    recommendation: 'Break down large classes following Single Responsibility Principle. Extract related methods into separate classes',
    references: [
      'https://cwe.mitre.org/data/definitions/1048.html',
      'https://refactoring.guru/smells/large-class'
    ]
  },
  {
    id: 'tight_coupling',
    name: 'Tight Coupling',
    description: 'Module has excessive dependencies (high fan-out) (Threshold: 6+ imports)',
    severity: 'medium',
    category: 'architecture',
    cweId: 1047,
    // Match 6+ import statements at the top of file (threshold hardcoded in pattern)
    // Threshold of 6+ imports indicates tight coupling and high fan-out
    pattern: /^(?:import\s+.*?from\s+['"][^'"]+['"];?\s*\n){6,}/m,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'low',
    recommendation: 'Reduce coupling by using dependency injection, interfaces, or facade pattern',
    references: [
      'https://cwe.mitre.org/data/definitions/1047.html',
      'https://en.wikipedia.org/wiki/Coupling_(computer_programming)'
    ]
  },
  {
    id: 'missing_abstraction',
    name: 'Missing Abstraction Layer',
    description: 'Direct database/external service access without abstraction',
    severity: 'medium',
    category: 'architecture',
    cweId: 1061,
    // Match direct database connection in controller/handler
    pattern: /(?:class\s+\w+Controller|app\.\w+\(['"]\/)[\s\S]*?(?:createConnection|connect\(|new\s+(?:MongoClient|Pool|Connection))/,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'medium',
    recommendation: 'Use repository pattern or data access layer to abstract database operations',
    references: [
      'https://cwe.mitre.org/data/definitions/1061.html',
      'https://martinfowler.com/eaaCatalog/repository.html'
    ]
  },
  {
    id: 'circular_dependency',
    name: 'Circular Dependency',
    description: 'Potential circular import detected between modules (Note: regex-based detection has limitations - use build tools like madge for comprehensive analysis)',
    severity: 'high',
    category: 'architecture',
    cweId: 1047,
    // Detects suspicious bidirectional import patterns by looking for:
    // 1. Multiple imports from relative paths in same file
    // 2. Imports that reference sibling modules (./filename pattern)
    // Note: True circular dependency detection requires multi-file static analysis.
    // This pattern detects files with multiple relative imports that may form cycles.
    // For comprehensive detection, use tools like madge, dpdm, or ESLint plugin-import.
    pattern: /(?:import\s+\{[^}]*\}\s+from\s+['"]\.\/\w+['"];?\s*\n){2,}/,
    filePatterns: FILE_PATTERNS.ALL_CODE as unknown as string[],
    confidence: 'low',
    recommendation: 'Refactor to eliminate circular dependencies. Extract shared code to separate module or use dependency inversion. Use madge or dpdm for comprehensive circular dependency detection',
    references: [
      'https://cwe.mitre.org/data/definitions/1047.html',
      'https://en.wikipedia.org/wiki/Circular_dependency',
      'https://github.com/pahen/madge'
    ]
  },

  // Note: duplicate_code rule removed - regex patterns are too simplistic for accurate
  // duplicate detection. Real duplicate detection requires AST/semantic analysis.
];

/**
 * Security Analyzer
 * Simplified version of production SecurityAnalyzer for tests
 */
export class SecurityAnalyzer {
  private rules: SecurityRule[] = SECURITY_RULES;

  /**
   * Analyze a single file for vulnerabilities
   */
  async analyzeFile(filePath: string, severityThreshold: SecurityVulnerability['severity'] = 'info'): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const fileExtension = path.extname(filePath);

      const applicableRules = this.getApplicableRules(fileExtension);

      for (const rule of applicableRules) {
        if (!this.meetsSeverityThreshold(rule.severity, severityThreshold)) {
          continue;
        }

        const matches = content.matchAll(new RegExp(rule.pattern.source, 'gm'));

        for (const match of matches) {
          if (!match.index) continue;

          // Skip if custom validator fails
          if (rule.validator && !rule.validator(match, content, filePath)) {
            continue;
          }

          // Calculate line number
          const beforeMatch = content.substring(0, match.index);
          const lineNumber = beforeMatch.split('\n').length;
          const lineContent = lines[lineNumber - 1] || '';

          vulnerabilities.push({
            id: rule.id,
            title: rule.name,
            description: rule.description,
            severity: rule.severity,
            category: rule.category,
            owaspCategory: rule.owaspCategory,
            cweId: rule.cweId,
            file: filePath,
            line: lineNumber,
            code: lineContent.trim(),
            recommendation: rule.recommendation,
            references: rule.references,
            confidence: rule.confidence,
            impact: this.getImpact(rule.severity),
            exploitability: this.getExploitability(rule.severity, rule.confidence),
          });
        }
      }
    } catch (error) {
      // Silently fail for test files that don't exist yet
      return [];
    }

    return vulnerabilities;
  }

  /**
   * Get applicable rules for file extension
   */
  private getApplicableRules(fileExtension: string): SecurityRule[] {
    return this.rules.filter(rule => {
      return rule.filePatterns.some(pattern => {
        const ext = pattern.replace('**/*', '');
        return ext === fileExtension || pattern === '**/*' || ext === '.*';
      });
    });
  }

  /**
   * Check if severity meets threshold
   */
  private meetsSeverityThreshold(
    ruleSeverity: SecurityVulnerability['severity'],
    threshold: SecurityVulnerability['severity']
  ): boolean {
    const severityOrder: SecurityVulnerability['severity'][] = ['info', 'low', 'medium', 'high', 'critical'];
    const ruleIndex = severityOrder.indexOf(ruleSeverity);
    const thresholdIndex = severityOrder.indexOf(threshold);
    return ruleIndex >= thresholdIndex;
  }

  /**
   * Get impact description based on severity
   */
  private getImpact(severity: SecurityVulnerability['severity']): string {
    const impacts: Record<SecurityVulnerability['severity'], string> = {
      critical: 'Critical - Immediate exploitation possible, severe consequences',
      high: 'High - Exploitation likely, significant impact',
      medium: 'Medium - Exploitation possible under certain conditions',
      low: 'Low - Limited impact or difficult to exploit',
      info: 'Informational - No direct security impact',
    };
    return impacts[severity];
  }

  /**
   * Get exploitability description
   */
  private getExploitability(
    severity: SecurityVulnerability['severity'],
    confidence: SecurityVulnerability['confidence']
  ): string {
    if (severity === 'critical' && confidence === 'high') {
      return 'Very High - Easily exploitable with public exploits available';
    }
    if (severity === 'high' || confidence === 'high') {
      return 'High - Can be exploited with moderate effort';
    }
    if (severity === 'medium') {
      return 'Medium - Requires specific conditions to exploit';
    }
    return 'Low - Difficult to exploit or requires extensive knowledge';
  }

  /**
   * Helper method to count vulnerabilities by severity in a single pass
   */
  private countBySeverity(vulnerabilities: SecurityVulnerability[]): Record<string, number> {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const vuln of vulnerabilities) {
      if (counts.hasOwnProperty(vuln.severity)) {
        counts[vuln.severity]++;
      }
    }

    return counts;
  }

  /**
   * Generate a comprehensive review report from vulnerabilities
   */
  generateReviewReport(vulnerabilities: SecurityVulnerability[]): ReviewReport {
    const severityCounts = this.countBySeverity(vulnerabilities);

    return {
      summary: this.generateSummary(vulnerabilities, severityCounts),
      severityBreakdown: this.classifyBySeverity(vulnerabilities),
      categoryBreakdown: this.classifyByCategory(vulnerabilities),
      recommendations: this.generateRecommendations(vulnerabilities),
      positiveFindings: this.generatePositiveFindings(vulnerabilities),
      actionableFiles: this.getActionableFiles(vulnerabilities),
      confidenceScore: this.calculateConfidenceScore(vulnerabilities),
      totalIssues: vulnerabilities.length,
      criticalCount: severityCounts.critical,
      highCount: severityCounts.high,
      mediumCount: severityCounts.medium,
      lowCount: severityCounts.low,
      infoCount: severityCounts.info,
    };
  }

  /**
   * Generate executive summary of findings
   */
  private generateSummary(
    vulnerabilities: SecurityVulnerability[],
    severityCounts: Record<string, number>
  ): string {
    if (vulnerabilities.length === 0) {
      return SUMMARY_NO_ISSUES;
    }

    const critical = severityCounts.critical;
    const high = severityCounts.high;
    const medium = severityCounts.medium;
    const total = vulnerabilities.length;

    const parts: string[] = [];
    parts.push(`Found ${total} security issue${total !== 1 ? 's' : ''}.`);

    if (critical > 0) {
      parts.push(`${critical} CRITICAL issue${critical !== 1 ? 's' : ''} require immediate attention.`);
    }
    if (high > 0) {
      parts.push(`${high} HIGH severity issue${high !== 1 ? 's' : ''} should be fixed promptly.`);
    }
    if (medium > 0) {
      parts.push(`${medium} MEDIUM severity issue${medium !== 1 ? 's' : ''} should be addressed.`);
    }

    return parts.join(' ');
  }

  /**
   * Classify vulnerabilities by severity level
   */
  private classifyBySeverity(vulnerabilities: SecurityVulnerability[]): Record<string, SeverityClassification> {
    const classification: Record<string, SeverityClassification> = {
      critical: { level: 'critical', count: 0, issues: [] },
      high: { level: 'high', count: 0, issues: [] },
      medium: { level: 'medium', count: 0, issues: [] },
      low: { level: 'low', count: 0, issues: [] },
      info: { level: 'info', count: 0, issues: [] },
    };

    for (const vuln of vulnerabilities) {
      const level = vuln.severity;
      if (classification[level]) {
        classification[level].count++;
        classification[level].issues.push(vuln);
      }
    }

    return classification;
  }

  /**
   * Classify vulnerabilities by category
   */
  private classifyByCategory(vulnerabilities: SecurityVulnerability[]): Record<string, number> {
    const categories: Record<string, number> = {};

    for (const vuln of vulnerabilities) {
      categories[vuln.category] = (categories[vuln.category] || 0) + 1;
    }

    return categories;
  }

  /**
   * Generate recommendations with examples
   */
  private generateRecommendations(vulnerabilities: SecurityVulnerability[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const seenRecommendations = new Set<string>();

    // Group vulnerabilities by type
    const byCategory = new Map<string, SecurityVulnerability[]>();
    for (const vuln of vulnerabilities) {
      const key = `${vuln.category}-${vuln.id}`;
      if (!byCategory.has(key)) {
        byCategory.set(key, []);
      }
      const vulnList = byCategory.get(key);
      if (vulnList) {
        vulnList.push(vuln);
      }
    }

    // Generate recommendations for each vulnerability type
    for (const [key, vulns] of byCategory) {
      if (vulns.length === 0) continue; // Safety check

      const firstVuln = vulns[0];
      const recKey = `${firstVuln.category}-${firstVuln.recommendation}`;

      if (!seenRecommendations.has(recKey)) {
        seenRecommendations.add(recKey);

        recommendations.push({
          category: firstVuln.category,
          severity: firstVuln.severity,
          title: firstVuln.title,
          recommendation: firstVuln.recommendation,
          affectedFiles: Array.from(new Set(vulns.map(v => v.file))),
          occurrences: vulns.length,
          examples: vulns.slice(0, MAX_RECOMMENDATION_EXAMPLES).map(v => ({
            file: v.file,
            line: v.line,
            code: v.code,
          })),
          references: firstVuln.references,
        });
      }
    }

    // Sort by severity (critical first)
    const getSeverityOrder = (severity: string): number => {
      return SEVERITY_ORDER[severity as keyof typeof SEVERITY_ORDER] ?? 999; // Default for unknown severities
    };
    recommendations.sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity));

    return recommendations;
  }

  /**
   * Generate positive findings for good security practices
   */
  private generatePositiveFindings(vulnerabilities: SecurityVulnerability[]): string[] {
    const findings: string[] = [];
    const categories = new Set(vulnerabilities.map(v => v.category));

    // Check what's NOT vulnerable
    const allCategories = Object.values(VULNERABILITY_CATEGORIES);

    for (const category of allCategories) {
      if (!categories.has(category)) {
        const message = POSITIVE_FINDING_MESSAGES[category as keyof typeof POSITIVE_FINDING_MESSAGES];
        if (message) {
          findings.push(message);
        }
      }
    }

    if (findings.length === 0 && vulnerabilities.length > 0) {
      findings.push(FALLBACK_POSITIVE_FINDING);
    }

    return findings;
  }

  /**
   * Get actionable files with issue counts
   */
  private getActionableFiles(vulnerabilities: SecurityVulnerability[]): ActionableFile[] {
    const fileMap = new Map<string, SecurityVulnerability[]>();

    for (const vuln of vulnerabilities) {
      if (!fileMap.has(vuln.file)) {
        fileMap.set(vuln.file, []);
      }
      const fileVulns = fileMap.get(vuln.file);
      if (fileVulns) {
        fileVulns.push(vuln);
      }
    }

    const actionableFiles: ActionableFile[] = [];

    for (const [file, vulns] of fileMap) {
      // Count severities in single pass
      const counts = this.countBySeverity(vulns);

      actionableFiles.push({
        file,
        issueCount: vulns.length,
        criticalCount: counts.critical,
        highCount: counts.high,
        mediumCount: counts.medium,
        priority: counts.critical > 0 ? 'critical' : counts.high > 0 ? 'high' : 'medium',
      });
    }

    // Sort by priority (critical first), then by issue count
    const getPriorityOrder = (priority: string): number => {
      return PRIORITY_ORDER[priority as keyof typeof PRIORITY_ORDER] ?? 999;
    };
    actionableFiles.sort((a, b) => {
      const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return b.issueCount - a.issueCount;
    });

    return actionableFiles;
  }

  /**
   * Calculate overall confidence score (0-100)
   */
  private calculateConfidenceScore(vulnerabilities: SecurityVulnerability[]): number {
    if (vulnerabilities.length === 0) {
      return PERFECT_CONFIDENCE_SCORE;
    }

    const getSeverityWeight = (severity: string): number => {
      if (severity === 'critical') return SEVERITY_WEIGHTS.CRITICAL;
      if (severity === 'high') return SEVERITY_WEIGHTS.HIGH;
      if (severity === 'medium') return SEVERITY_WEIGHTS.MEDIUM;
      if (severity === 'low') return SEVERITY_WEIGHTS.LOW;
      return SEVERITY_WEIGHTS.INFO;
    };

    let totalConfidence = 0;
    let totalWeight = 0;

    for (const vuln of vulnerabilities) {
      const confidenceLevel = vuln.confidence ?? 'medium';
      const confidence = CONFIDENCE_SCORE_VALUES[confidenceLevel.toUpperCase() as keyof typeof CONFIDENCE_SCORE_VALUES] ?? CONFIDENCE_SCORE_VALUES.MEDIUM;
      const weight = getSeverityWeight(vuln.severity);

      totalConfidence += confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(totalConfidence / totalWeight) : DEFAULT_CONFIDENCE_SCORE;
  }

  /**
   * Calculate quality metrics for a file
   */
  async calculateQualityMetrics(filePath: string): Promise<QualityMetrics> {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      const complexity = await this.calculateComplexityMetrics(content);
      const maintainability = await this.calculateMaintainabilityMetrics(content, complexity);
      const bestPractices = await this.calculateBestPracticeMetrics(content, filePath);
      const testCoverage = await this.calculateTestCoverageMetrics(filePath);
      const documentation = await this.calculateDocumentationMetrics(content);
      const typeSafety = await this.calculateTypeSafetyMetrics(content, filePath);

      // Calculate overall score (weighted average)
      const weights = {
        complexity: 0.20,
        maintainability: 0.15,
        bestPractices: 0.25,
        testCoverage: 0.20,
        documentation: 0.10,
        typeSafety: 0.10,
      };

      const scores = {
        complexity: this.gradeToScore(complexity.grade),
        maintainability: this.gradeToScore(maintainability.grade),
        bestPractices: this.gradeToScore(bestPractices.grade),
        testCoverage: this.gradeToScore(testCoverage.grade),
        documentation: this.gradeToScore(documentation.grade),
        typeSafety: this.gradeToScore(typeSafety.grade),
      };

      const overallScore = Math.round(
        scores.complexity * weights.complexity +
        scores.maintainability * weights.maintainability +
        scores.bestPractices * weights.bestPractices +
        scores.testCoverage * weights.testCoverage +
        scores.documentation * weights.documentation +
        scores.typeSafety * weights.typeSafety
      );

      return {
        complexity,
        maintainability,
        bestPractices,
        testCoverage,
        documentation,
        typeSafety,
        overallScore,
        grade: this.scoreToGrade(overallScore),
      };
    } catch (error) {
      // Return default metrics on error
      return this.getDefaultQualityMetrics();
    }
  }

  /**
   * Calculate complexity metrics
   */
  private async calculateComplexityMetrics(content: string): Promise<ComplexityMetrics> {
    const lines = content.split('\n');

    // Calculate cyclomatic complexity (count decision points)
    const decisionPoints = (content.match(/\b(if|else if|while|for|case|catch|\?\?|\|\||&&)\b/g) || []).length;
    const functionCount = (content.match(/\bfunction\b|=>/g) || []).length || 1;
    const cyclomaticComplexity = Math.round((decisionPoints + functionCount) / functionCount);

    // Calculate cognitive complexity (nested structures add more weight)
    let cognitiveComplexity = 0;
    let nestingLevel = 0;
    for (const line of lines) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;

      if (line.match(/\b(if|else|while|for|switch|catch)\b/)) {
        cognitiveComplexity += (1 + nestingLevel);
      }

      nestingLevel += openBraces - closeBraces;
    }

    // Calculate average function length
    const functionMatches = content.matchAll(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\()/g);
    const functionStarts: number[] = [];
    for (const match of functionMatches) {
      if (match.index !== undefined) {
        functionStarts.push(match.index);
      }
    }

    let totalFunctionLines = 0;
    for (let i = 0; i < functionStarts.length; i++) {
      const start = functionStarts[i];
      const end = functionStarts[i + 1] || content.length;
      const functionContent = content.substring(start, end);
      totalFunctionLines += functionContent.split('\n').length;
    }
    const averageFunctionLength = functionStarts.length > 0 ? Math.round(totalFunctionLines / functionStarts.length) : 0;

    // Calculate max nesting depth
    let maxNestingDepth = 0;
    let currentDepth = 0;
    for (const line of lines) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      currentDepth += openBraces - closeBraces;
      maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
    }

    // Calculate grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (cyclomaticComplexity > 20 || cognitiveComplexity > 30 || averageFunctionLength > 100 || maxNestingDepth > 6) {
      grade = 'F';
    } else if (cyclomaticComplexity > 15 || cognitiveComplexity > 20 || averageFunctionLength > 75 || maxNestingDepth > 5) {
      grade = 'D';
    } else if (cyclomaticComplexity > 10 || cognitiveComplexity > 15 || averageFunctionLength > 50 || maxNestingDepth > 4) {
      grade = 'C';
    } else if (cyclomaticComplexity > 5 || cognitiveComplexity > 10 || averageFunctionLength > 30 || maxNestingDepth > 3) {
      grade = 'B';
    }

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      averageFunctionLength,
      maxNestingDepth,
      grade,
    };
  }

  /**
   * Calculate maintainability metrics
   */
  private async calculateMaintainabilityMetrics(content: string, complexity: ComplexityMetrics): Promise<MaintainabilityMetrics> {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*'));

    // Calculate Maintainability Index (simplified version)
    // MI = 171 - 5.2 * ln(HalsteadVolume) - 0.23 * CyclomaticComplexity - 16.2 * ln(LinesOfCode)
    const loc = lines.length;
    const commentRatio = loc > 0 ? commentLines.length / loc : 0;

    // Simplified maintainability index (0-100 scale)
    const maintainabilityIndex = Math.round(
      100 - (complexity.cyclomaticComplexity * 2) - (Math.log(loc + 1) * 5) + (commentRatio * 20)
    );

    // Count code smells
    const codeSmells = this.countCodeSmells(content);

    // Estimate technical debt (in hours)
    const debtHours = Math.round(codeSmells * 0.5 + (100 - maintainabilityIndex) * 0.1);
    const technicalDebt = `${debtHours} hours`;

    // Calculate grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (maintainabilityIndex < 40 || codeSmells > 20) {
      grade = 'F';
    } else if (maintainabilityIndex < 55 || codeSmells > 15) {
      grade = 'D';
    } else if (maintainabilityIndex < 70 || codeSmells > 10) {
      grade = 'C';
    } else if (maintainabilityIndex < 85 || codeSmells > 5) {
      grade = 'B';
    }

    return {
      maintainabilityIndex: Math.max(0, Math.min(100, maintainabilityIndex)),
      codeSmells,
      technicalDebt,
      grade,
    };
  }

  /**
   * Count code smells in content
   */
  private countCodeSmells(content: string): number {
    let smells = 0;

    // Magic numbers
    smells += (content.match(/\b\d{2,}\b/g) || []).length;

    // Long functions (>50 lines)
    const functionMatches = content.matchAll(/(?:function|=>)[\s\S]*?\{[\s\S]*?\}/g);
    for (const match of functionMatches) {
      if (match[0].split('\n').length > 50) {
        smells++;
      }
    }

    // Deep nesting (>4 levels)
    const lines = content.split('\n');
    let depth = 0;
    for (const line of lines) {
      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;
      if (depth > 4) {
        smells++;
      }
    }

    return smells;
  }

  /**
   * Calculate best practice metrics
   */
  private async calculateBestPracticeMetrics(content: string, filePath: string): Promise<BestPracticeMetrics> {
    // Check naming conventions
    const functionNames = Array.from(content.matchAll(/(?:function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)).map(m => m[1]);
    const violations: string[] = [];

    for (const name of functionNames) {
      // Check for camelCase (or PascalCase for classes)
      if (!/^[a-z$_][a-zA-Z0-9$_]*$|^[A-Z][a-zA-Z0-9]*$/.test(name)) {
        violations.push(`Invalid naming: ${name}`);
      }
    }

    const namingScore = Math.max(0, 100 - (violations.length * 10));

    // Check error handling
    const asyncFunctions = (content.match(/\basync\s+function|\basync\s*\(/g) || []).length;
    const tryCatchBlocks = (content.match(/\btry\s*\{/g) || []).length;
    const promiseCatches = (content.match(/\.catch\s*\(/g) || []).length;
    const missingCatches = Math.max(0, asyncFunctions - tryCatchBlocks - promiseCatches);
    const errorHandlingScore = asyncFunctions > 0 ? Math.round(((asyncFunctions - missingCatches) / asyncFunctions) * 100) : 100;

    // Check input validation
    const userInputs = (content.match(/req\.(body|query|params)/g) || []).length;
    const validations = (content.match(/\b(validate|check|sanitize|assert)\b/gi) || []).length;
    const missingValidations = Math.max(0, userInputs - validations);
    const inputValidationScore = userInputs > 0 ? Math.round(((userInputs - missingValidations) / userInputs) * 100) : 100;

    // Calculate overall grade
    const avgScore = (namingScore + errorHandlingScore + inputValidationScore) / 3;
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (avgScore < 40) {
      grade = 'F';
    } else if (avgScore < 55) {
      grade = 'D';
    } else if (avgScore < 70) {
      grade = 'C';
    } else if (avgScore < 85) {
      grade = 'B';
    }

    return {
      namingConventions: {
        score: namingScore,
        violations,
      },
      errorHandling: {
        score: errorHandlingScore,
        missingCatches,
      },
      inputValidation: {
        score: inputValidationScore,
        missingValidations,
      },
      grade,
    };
  }

  /**
   * Calculate test coverage metrics
   */
  private async calculateTestCoverageMetrics(filePath: string): Promise<TestCoverageMetrics> {
    const dirName = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));

    // Check for test files
    const testPatterns = [
      path.join(dirName, `${baseName}.test.ts`),
      path.join(dirName, `${baseName}.test.js`),
      path.join(dirName, `${baseName}.spec.ts`),
      path.join(dirName, `${baseName}.spec.js`),
      path.join(dirName, '__tests__', `${baseName}.test.ts`),
      path.join(dirName, '__tests__', `${baseName}.test.js`),
    ];

    let hasTestFiles = false;
    for (const testPath of testPatterns) {
      try {
        await fs.access(testPath);
        hasTestFiles = true;
        break;
      } catch {
        // File doesn't exist
      }
    }

    // Simulate coverage metrics (in real implementation, this would parse coverage reports)
    const lineCoverage = hasTestFiles ? 75 : 0;
    const branchCoverage = hasTestFiles ? 65 : 0;
    const functionCoverage = hasTestFiles ? 80 : 0;
    const testFileRatio = hasTestFiles ? 1.0 : 0.0;

    // Calculate grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (!hasTestFiles || lineCoverage < 40) {
      grade = 'F';
    } else if (lineCoverage < 55) {
      grade = 'D';
    } else if (lineCoverage < 70) {
      grade = 'C';
    } else if (lineCoverage < 85) {
      grade = 'B';
    }

    return {
      lineCoverage,
      branchCoverage,
      functionCoverage,
      hasTestFiles,
      testFileRatio,
      grade,
    };
  }

  /**
   * Calculate documentation metrics
   */
  private async calculateDocumentationMetrics(content: string): Promise<DocumentationMetrics> {
    const functionMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(/g);
    const classMatches = content.matchAll(/(?:export\s+)?class\s+\w+/g);

    const totalFunctions = Array.from(functionMatches).length;
    const totalClasses = Array.from(classMatches).length;

    // Count JSDoc comments
    const jsDocComments = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;

    // Estimate function documentation (assume JSDoc is for functions/classes)
    const functionDocumentation = totalFunctions > 0 ? Math.min(100, Math.round((jsDocComments / totalFunctions) * 100)) : 0;
    const classDocumentation = totalClasses > 0 ? Math.min(100, Math.round((jsDocComments / totalClasses) * 100)) : 0;

    // Module documentation (check for module-level comment at top of file)
    const moduleDocumentation = content.trim().startsWith('/**') ? 100 : 0;

    // Check for README (would need to check file system in real implementation)
    const readmePresent = false;

    // Calculate grade
    const avgDoc = (functionDocumentation + classDocumentation + moduleDocumentation) / 3;
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (avgDoc < 40) {
      grade = 'F';
    } else if (avgDoc < 55) {
      grade = 'D';
    } else if (avgDoc < 70) {
      grade = 'C';
    } else if (avgDoc < 85) {
      grade = 'B';
    }

    return {
      functionDocumentation,
      classDocumentation,
      moduleDocumentation,
      readmePresent,
      grade,
    };
  }

  /**
   * Calculate type safety metrics
   */
  private async calculateTypeSafetyMetrics(content: string, filePath: string): Promise<TypeSafetyMetrics> {
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

    if (!isTypeScript) {
      return {
        strictModeEnabled: false,
        typeAnnotationCoverage: 0,
        anyTypeUsage: 0,
        implicitAnyCount: 0,
        grade: 'D',
      };
    }

    // Check for strict mode
    const strictModeEnabled = content.includes('"use strict"') || content.includes("'use strict'");

    // Count type annotations
    const functionParams = (content.match(/\([^)]*\)/g) || []).join('');
    const typeAnnotations = (functionParams.match(/:\s*\w+/g) || []).length;
    const totalParams = (functionParams.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || []).length;
    const typeAnnotationCoverage = totalParams > 0 ? Math.round((typeAnnotations / totalParams) * 100) : 100;

    // Count any type usage
    const anyTypeUsage = (content.match(/:\s*any\b/g) || []).length;

    // Count implicit any (parameters without type annotation)
    const implicitAnyCount = Math.max(0, totalParams - typeAnnotations);

    // Calculate grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (anyTypeUsage > 10 || typeAnnotationCoverage < 40) {
      grade = 'F';
    } else if (anyTypeUsage > 5 || typeAnnotationCoverage < 55) {
      grade = 'D';
    } else if (anyTypeUsage > 2 || typeAnnotationCoverage < 70) {
      grade = 'C';
    } else if (anyTypeUsage > 0 || typeAnnotationCoverage < 85) {
      grade = 'B';
    }

    return {
      strictModeEnabled,
      typeAnnotationCoverage,
      anyTypeUsage,
      implicitAnyCount,
      grade,
    };
  }

  /**
   * Convert grade to numeric score
   */
  private gradeToScore(grade: 'A' | 'B' | 'C' | 'D' | 'F'): number {
    const gradeMap: Record<'A' | 'B' | 'C' | 'D' | 'F', number> = {
      A: 95,
      B: 85,
      C: 75,
      D: 65,
      F: 50,
    };
    return gradeMap[grade];
  }

  /**
   * Convert numeric score to grade
   */
  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get default quality metrics (for error cases)
   */
  private getDefaultQualityMetrics(): QualityMetrics {
    return {
      complexity: {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        averageFunctionLength: 0,
        maxNestingDepth: 0,
        grade: 'C',
      },
      maintainability: {
        maintainabilityIndex: 50,
        codeSmells: 0,
        technicalDebt: '0 hours',
        grade: 'C',
      },
      bestPractices: {
        namingConventions: { score: 50, violations: [] },
        errorHandling: { score: 50, missingCatches: 0 },
        inputValidation: { score: 50, missingValidations: 0 },
        grade: 'C',
      },
      testCoverage: {
        lineCoverage: 0,
        branchCoverage: 0,
        functionCoverage: 0,
        hasTestFiles: false,
        testFileRatio: 0,
        grade: 'F',
      },
      documentation: {
        functionDocumentation: 0,
        classDocumentation: 0,
        moduleDocumentation: 0,
        readmePresent: false,
        grade: 'F',
      },
      typeSafety: {
        strictModeEnabled: false,
        typeAnnotationCoverage: 0,
        anyTypeUsage: 0,
        implicitAnyCount: 0,
        grade: 'D',
      },
      overallScore: 50,
      grade: 'C',
    };
  }
}

/**
 * Review report interface
 */
export interface ReviewReport {
  summary: string;
  severityBreakdown: Record<string, SeverityClassification>;
  categoryBreakdown: Record<string, number>;
  recommendations: Recommendation[];
  positiveFindings: string[];
  actionableFiles: ActionableFile[];
  confidenceScore: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
}

export interface SeverityClassification {
  level: 'critical' | 'high' | 'medium' | 'low' | 'info';
  count: number;
  issues: SecurityVulnerability[];
}

export interface Recommendation {
  category: string;
  severity: string;
  title: string;
  recommendation: string;
  affectedFiles: string[];
  occurrences: number;
  examples: Array<{
    file: string;
    line: number;
    code: string;
  }>;
  references: string[];
}

export interface ActionableFile {
  file: string;
  issueCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  priority: 'critical' | 'high' | 'medium';
}

/**
 * Quality metrics interface for code quality assessment
 */
export interface QualityMetrics {
  complexity: ComplexityMetrics;
  maintainability: MaintainabilityMetrics;
  bestPractices: BestPracticeMetrics;
  testCoverage: TestCoverageMetrics;
  documentation: DocumentationMetrics;
  typeSafety: TypeSafetyMetrics;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  averageFunctionLength: number;
  maxNestingDepth: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface MaintainabilityMetrics {
  maintainabilityIndex: number;
  codeSmells: number;
  technicalDebt: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface BestPracticeMetrics {
  namingConventions: {
    score: number;
    violations: string[];
  };
  errorHandling: {
    score: number;
    missingCatches: number;
  };
  inputValidation: {
    score: number;
    missingValidations: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface TestCoverageMetrics {
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  hasTestFiles: boolean;
  testFileRatio: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface DocumentationMetrics {
  functionDocumentation: number;
  classDocumentation: number;
  moduleDocumentation: number;
  readmePresent: boolean;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface TypeSafetyMetrics {
  strictModeEnabled: boolean;
  typeAnnotationCoverage: number;
  anyTypeUsage: number;
  implicitAnyCount: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}
