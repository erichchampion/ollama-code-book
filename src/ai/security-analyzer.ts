/**
 * Security Analyzer
 *
 * Advanced security analysis system for detecting vulnerabilities, security issues,
 * and compliance violations in codebases with OWASP Top 10 coverage and beyond.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getGitIgnoreParser } from '../utils/gitignore-parser.js';
import { getDefaultExcludePatterns } from '../config/file-patterns.js';

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

export interface DependencyVulnerability {
  package: string;
  version: string;
  vulnerability: {
    id: string;
    title: string;
    description: string;
    severity: SecurityVulnerability['severity'];
    cvss?: number;
    cve?: string;
    publishedDate: string;
    lastModifiedDate: string;
  };
  fixedIn?: string;
  recommendation: string;
}

export interface SecurityAnalysisOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  respectGitIgnore?: boolean;
  checkDependencies?: boolean;
  enableCustomRules?: boolean;
  severityThreshold?: SecurityVulnerability['severity'];
  maxFileSize?: number;
  projectRoot?: string;
}

export interface SecurityAnalysisResult {
  summary: {
    totalFiles: number;
    vulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    dependencyIssues: number;
  };
  vulnerabilities: SecurityVulnerability[];
  dependencyVulnerabilities: DependencyVulnerability[];
  executionTime: number;
  timestamp: Date;
  projectPath: string;
}

export class SecurityAnalyzer {
  private rules: SecurityRule[] = [];
  private customRules: SecurityRule[] = [];

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Analyze a project for security vulnerabilities
   */
  async analyzeProject(
    projectPath: string,
    options: SecurityAnalysisOptions = {}
  ): Promise<SecurityAnalysisResult> {
    const startTime = Date.now();

    const {
      includePatterns = ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.py', '**/*.java', '**/*.php', '**/*.rb'],
      excludePatterns = getDefaultExcludePatterns(),
      respectGitIgnore = true,
      checkDependencies = true,
      enableCustomRules = true,
      severityThreshold = 'info',
      maxFileSize = 1024 * 1024, // 1MB
      projectRoot = projectPath
    } = options;

    logger.info(`Starting security analysis of project: ${projectPath}`);

    const vulnerabilities: SecurityVulnerability[] = [];
    const dependencyVulnerabilities: DependencyVulnerability[] = [];

    // Get files to analyze
    const files = await this.getFilesToAnalyze(projectPath, includePatterns, excludePatterns, respectGitIgnore, projectRoot);

    logger.info(`Analyzing ${files.length} files for security vulnerabilities`);

    // Analyze each file
    let analyzedFiles = 0;
    for (const filePath of files) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > maxFileSize) {
          logger.debug(`Skipping large file: ${filePath} (${stats.size} bytes)`);
          continue;
        }

        const fileVulnerabilities = await this.analyzeFile(filePath, severityThreshold);
        vulnerabilities.push(...fileVulnerabilities);
        analyzedFiles++;

        if (analyzedFiles % 100 === 0) {
          logger.debug(`Analyzed ${analyzedFiles}/${files.length} files`);
        }
      } catch (error) {
        logger.warn(`Failed to analyze file ${filePath}:`, error);
      }
    }

    // Analyze dependencies
    if (checkDependencies) {
      try {
        const depVulnerabilities = await this.analyzeDependencies(projectPath);
        dependencyVulnerabilities.push(...depVulnerabilities);
      } catch (error) {
        logger.warn('Failed to analyze dependencies:', error);
      }
    }

    const result: SecurityAnalysisResult = {
      summary: this.createSummary(vulnerabilities, dependencyVulnerabilities, analyzedFiles),
      vulnerabilities: this.sortVulnerabilities(vulnerabilities),
      dependencyVulnerabilities,
      executionTime: Date.now() - startTime,
      timestamp: new Date(),
      projectPath
    };

    logger.info(`Security analysis completed: ${result.summary.vulnerabilities} vulnerabilities found in ${result.executionTime}ms`);

    return result;
  }

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
          if (match.index === undefined) continue;

          // Find line and column
          const beforeMatch = content.substring(0, match.index);
          const lineNumber = beforeMatch.split('\n').length;
          const lineStart = beforeMatch.lastIndexOf('\n') + 1;
          const columnNumber = match.index - lineStart + 1;

          // Additional validation if provided
          if (rule.validator && !rule.validator(match, content, filePath)) {
            continue;
          }

          const vulnerability: SecurityVulnerability = {
            id: `${rule.id}_${path.basename(filePath)}_${lineNumber}`,
            title: rule.name,
            description: rule.description,
            severity: rule.severity,
            category: rule.category,
            owaspCategory: rule.owaspCategory,
            cweId: rule.cweId,
            file: filePath,
            line: lineNumber,
            column: columnNumber,
            code: lines[lineNumber - 1]?.trim() || '',
            recommendation: rule.recommendation,
            references: rule.references,
            confidence: rule.confidence,
            impact: this.getImpactDescription(rule.severity),
            exploitability: this.getExploitabilityDescription(rule.severity)
          };

          vulnerabilities.push(vulnerability);
        }
      }
    } catch (error) {
      logger.error(`Error analyzing file ${filePath}:`, error);
    }

    return vulnerabilities;
  }

  /**
   * Load default security rules
   */
  private loadDefaultRules(): void {
    this.rules = [
      // OWASP A01: Broken Access Control
      {
        id: 'auth_bypass',
        name: 'Potential Authentication Bypass',
        description: 'Code that may bypass authentication checks',
        severity: 'high',
        category: 'authentication',
        owaspCategory: 'A01:2021 – Broken Access Control',
        cweId: 287,
        pattern: /(auth|login|authentication)\s*=\s*(true|false|null|undefined)|skip.*auth|bypass.*auth/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java'],
        confidence: 'medium',
        recommendation: 'Ensure proper authentication checks are in place and cannot be bypassed',
        references: [
          'https://owasp.org/Top10/A01_2021-Broken_Access_Control/',
          'https://cwe.mitre.org/data/definitions/287.html'
        ]
      },

      // OWASP A02: Cryptographic Failures
      {
        id: 'weak_crypto',
        name: 'Weak Cryptographic Algorithm',
        description: 'Use of weak or deprecated cryptographic algorithms',
        severity: 'high',
        category: 'cryptography',
        owaspCategory: 'A02:2021 – Cryptographic Failures',
        cweId: 327,
        pattern: /(md5|sha1|des|3des|rc4)\s*\(|\.createHash\s*\(\s*['"](?:md5|sha1)['"]|crypto\.subtle\.digest\s*\(\s*['"](?:SHA-1)['"]\)/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java'],
        confidence: 'high',
        recommendation: 'Use strong cryptographic algorithms like SHA-256, SHA-3, or bcrypt for hashing',
        references: [
          'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
          'https://cwe.mitre.org/data/definitions/327.html'
        ]
      },

      // OWASP A03: Injection
      {
        id: 'sql_injection',
        name: 'Potential SQL Injection',
        description: 'SQL query construction using string concatenation or interpolation',
        severity: 'critical',
        category: 'injection',
        owaspCategory: 'A03:2021 – Injection',
        cweId: 89,
        pattern: /(query|sql|execute)\s*\(\s*['"`][^'"`]*\$\{|['"`][^'"`]*\+.*\+.*['"`]|query.*=.*['"`].*\+.*req\.|SELECT.*FROM.*WHERE.*\+|INSERT.*INTO.*VALUES.*\+/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java', '**/*.php'],
        confidence: 'medium',
        recommendation: 'Use parameterized queries or prepared statements to prevent SQL injection',
        references: [
          'https://owasp.org/Top10/A03_2021-Injection/',
          'https://cwe.mitre.org/data/definitions/89.html'
        ]
      },

      {
        id: 'command_injection',
        name: 'Potential Command Injection',
        description: 'Execution of system commands with user input',
        severity: 'critical',
        category: 'injection',
        owaspCategory: 'A03:2021 – Injection',
        cweId: 78,
        pattern: /(exec|spawn|system|eval|shell_exec|passthru)\s*\([^)]*(?:req\.|params\.|query\.|body\.|\$_GET|\$_POST)/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java', '**/*.php'],
        confidence: 'high',
        recommendation: 'Validate and sanitize all user input before executing system commands',
        references: [
          'https://owasp.org/Top10/A03_2021-Injection/',
          'https://cwe.mitre.org/data/definitions/78.html'
        ]
      },

      // OWASP A04: Insecure Design
      {
        id: 'hardcoded_secrets',
        name: 'Hardcoded Secrets',
        description: 'Hardcoded passwords, API keys, or other sensitive information',
        severity: 'critical',
        category: 'secrets',
        owaspCategory: 'A04:2021 – Insecure Design',
        cweId: 798,
        pattern: /(password|pwd|secret|key|token|api_key)\s*[:=]\s*['"`][a-zA-Z0-9+/=]{8,}['"`]|(?:sk-|pk-|AKIA)[a-zA-Z0-9+/=]{20,}/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java', '**/*.php', '**/*.rb'],
        confidence: 'high',
        recommendation: 'Store secrets in environment variables or secure configuration management systems',
        references: [
          'https://owasp.org/Top10/A04_2021-Insecure_Design/',
          'https://cwe.mitre.org/data/definitions/798.html'
        ]
      },

      // OWASP A05: Security Misconfiguration
      {
        id: 'debug_enabled',
        name: 'Debug Mode Enabled',
        description: 'Debug mode or verbose error reporting enabled in production',
        severity: 'medium',
        category: 'configuration',
        owaspCategory: 'A05:2021 – Security Misconfiguration',
        cweId: 489,
        pattern: /(debug|verbose)\s*[:=]\s*(true|1|on)|app\.set\s*\(\s*['"`]env['"`]\s*,\s*['"`]development['"`]/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java'],
        confidence: 'medium',
        recommendation: 'Disable debug mode and verbose error reporting in production environments',
        references: [
          'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
          'https://cwe.mitre.org/data/definitions/489.html'
        ]
      },

      // OWASP A06: Vulnerable and Outdated Components
      {
        id: 'outdated_dependency',
        name: 'Potentially Outdated Dependencies',
        description: 'Dependencies that may be outdated or vulnerable',
        severity: 'medium',
        category: 'dependencies',
        owaspCategory: 'A06:2021 – Vulnerable and Outdated Components',
        cweId: 1104,
        pattern: /["'](?:jquery|lodash|moment|bootstrap)["']\s*:\s*["'][0-9]+\.[0-9]+\.[0-9]+["']/i,
        filePatterns: ['**/package.json', '**/requirements.txt', '**/Gemfile'],
        confidence: 'low',
        recommendation: 'Regularly update dependencies and use tools like npm audit or safety to check for vulnerabilities',
        references: [
          'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/',
          'https://cwe.mitre.org/data/definitions/1104.html'
        ]
      },

      // OWASP A07: Identification and Authentication Failures
      {
        id: 'weak_password_policy',
        name: 'Weak Password Requirements',
        description: 'Insufficient password complexity requirements',
        severity: 'medium',
        category: 'authentication',
        owaspCategory: 'A07:2021 – Identification and Authentication Failures',
        cweId: 521,
        pattern: /password.*length.*[<>=].*[1-7][^0-9]|minlength.*[1-7][^0-9]/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java'],
        confidence: 'medium',
        recommendation: 'Implement strong password policies with minimum length and complexity requirements',
        references: [
          'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
          'https://cwe.mitre.org/data/definitions/521.html'
        ]
      },

      // OWASP A08: Software and Data Integrity Failures
      {
        id: 'insecure_deserialization',
        name: 'Insecure Deserialization',
        description: 'Unsafe deserialization of untrusted data',
        severity: 'high',
        category: 'deserialization',
        owaspCategory: 'A08:2021 – Software and Data Integrity Failures',
        cweId: 502,
        pattern: /(JSON\.parse|pickle\.loads|unserialize|yaml\.load)\s*\([^)]*(?:req\.|params\.|query\.|body\.)/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java', '**/*.php'],
        confidence: 'high',
        recommendation: 'Validate and sanitize data before deserialization, use safe parsing methods',
        references: [
          'https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/',
          'https://cwe.mitre.org/data/definitions/502.html'
        ]
      },

      // OWASP A09: Security Logging and Monitoring Failures
      {
        id: 'insufficient_logging',
        name: 'Insufficient Security Logging',
        description: 'Lack of proper security event logging',
        severity: 'low',
        category: 'logging',
        owaspCategory: 'A09:2021 – Security Logging and Monitoring Failures',
        cweId: 778,
        pattern: /(login|authentication|authorization|access).*(?!.*log)/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java'],
        confidence: 'low',
        recommendation: 'Implement comprehensive security logging for authentication, authorization, and access events',
        references: [
          'https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/',
          'https://cwe.mitre.org/data/definitions/778.html'
        ]
      },

      // OWASP A10: Server-Side Request Forgery (SSRF)
      {
        id: 'ssrf_vulnerability',
        name: 'Potential SSRF Vulnerability',
        description: 'Server-side request to user-controlled URLs',
        severity: 'high',
        category: 'ssrf',
        owaspCategory: 'A10:2021 – Server-Side Request Forgery (SSRF)',
        cweId: 918,
        pattern: /(fetch|axios|request|http\.get|urllib\.request)\s*\([^)]*(?:req\.|params\.|query\.|body\.)/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java'],
        confidence: 'medium',
        recommendation: 'Validate and restrict URLs to prevent SSRF attacks, use allowlists for permitted destinations',
        references: [
          'https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_(SSRF)/',
          'https://cwe.mitre.org/data/definitions/918.html'
        ]
      },

      // Additional common vulnerabilities
      {
        id: 'xss_vulnerability',
        name: 'Potential XSS Vulnerability',
        description: 'Unsafe rendering of user input that may lead to XSS',
        severity: 'high',
        category: 'xss',
        owaspCategory: 'A03:2021 – Injection',
        cweId: 79,
        pattern: /innerHTML\s*=.*(?:req\.|params\.|query\.|body\.)|document\.write\s*\(.*(?:req\.|params\.|query\.|body\.)/i,
        filePatterns: ['**/*.js', '**/*.ts'],
        confidence: 'high',
        recommendation: 'Use safe DOM manipulation methods and properly escape user input',
        references: [
          'https://owasp.org/Top10/A03_2021-Injection/',
          'https://cwe.mitre.org/data/definitions/79.html'
        ]
      },

      {
        id: 'path_traversal',
        name: 'Path Traversal Vulnerability',
        description: 'Potential directory traversal attack vector',
        severity: 'high',
        category: 'path_traversal',
        cweId: 22,
        pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)/i,
        filePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java', '**/*.php'],
        confidence: 'high',
        recommendation: 'Validate and sanitize file paths, use path.resolve() and check against allowed directories',
        references: [
          'https://cwe.mitre.org/data/definitions/22.html'
        ]
      }
    ];

    logger.info(`Loaded ${this.rules.length} security rules`);
  }

  /**
   * Analyze dependencies for known vulnerabilities
   */
  private async analyzeDependencies(projectPath: string): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    // Check package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      for (const [pkg, version] of Object.entries(dependencies)) {
        // This is a simplified check - in production, you'd integrate with actual vulnerability databases
        if (this.isKnownVulnerablePackage(pkg, version as string)) {
          vulnerabilities.push({
            package: pkg,
            version: version as string,
            vulnerability: {
              id: `vuln_${pkg}_${version}`,
              title: `Known vulnerability in ${pkg}`,
              description: `Package ${pkg} version ${version} has known security vulnerabilities`,
              severity: 'medium',
              publishedDate: new Date().toISOString(),
              lastModifiedDate: new Date().toISOString()
            },
            recommendation: `Update ${pkg} to the latest secure version`
          });
        }
      }
    } catch (error) {
      logger.debug('No package.json found or unable to parse');
    }

    return vulnerabilities;
  }

  /**
   * Get files to analyze based on patterns and filters
   */
  private async getFilesToAnalyze(
    projectPath: string,
    includePatterns: string[],
    excludePatterns: string[],
    respectGitIgnore: boolean,
    projectRoot: string
  ): Promise<string[]> {
    const files: string[] = [];

    const gitIgnoreParser = respectGitIgnore ? getGitIgnoreParser(projectRoot) : null;

    const walkDirectory = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath);

        // Check gitignore
        if (gitIgnoreParser && gitIgnoreParser.isIgnored(fullPath)) {
          continue;
        }

        // Check exclude patterns
        if (excludePatterns.some(pattern => this.matchesPattern(relativePath, pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDirectory(fullPath);
        } else if (entry.isFile()) {
          // Check include patterns
          if (includePatterns.some(pattern => this.matchesPattern(relativePath, pattern))) {
            files.push(fullPath);
          }
        }
      }
    };

    await walkDirectory(projectPath);
    return files;
  }

  /**
   * Check if a pattern matches a file path
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regex = new RegExp(
      pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
    );
    return regex.test(filePath);
  }

  /**
   * Get applicable rules for a file type
   */
  private getApplicableRules(fileExtension: string): SecurityRule[] {
    return this.rules.filter(rule =>
      rule.filePatterns.some(pattern => pattern.includes('*' + fileExtension) || pattern === '**/*')
    );
  }

  /**
   * Check if severity meets threshold
   */
  private meetsSeverityThreshold(severity: SecurityVulnerability['severity'], threshold: SecurityVulnerability['severity']): boolean {
    const levels = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return levels[severity] >= levels[threshold];
  }

  /**
   * Sort vulnerabilities by severity and confidence
   */
  private sortVulnerabilities(vulnerabilities: SecurityVulnerability[]): SecurityVulnerability[] {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    const confidenceOrder = { high: 2, medium: 1, low: 0 };

    return vulnerabilities.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
  }

  /**
   * Create summary statistics
   */
  private createSummary(
    vulnerabilities: SecurityVulnerability[],
    dependencyVulnerabilities: DependencyVulnerability[],
    totalFiles: number
  ): SecurityAnalysisResult['summary'] {
    const summary = {
      totalFiles,
      vulnerabilities: vulnerabilities.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      infoCount: 0,
      dependencyIssues: dependencyVulnerabilities.length
    };

    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': summary.criticalCount++; break;
        case 'high': summary.highCount++; break;
        case 'medium': summary.mediumCount++; break;
        case 'low': summary.lowCount++; break;
        case 'info': summary.infoCount++; break;
      }
    }

    return summary;
  }

  /**
   * Get impact description based on severity
   */
  private getImpactDescription(severity: SecurityVulnerability['severity']): string {
    switch (severity) {
      case 'critical': return 'High impact - can lead to complete system compromise';
      case 'high': return 'Significant impact - can lead to data breach or service disruption';
      case 'medium': return 'Moderate impact - may affect security posture';
      case 'low': return 'Low impact - minor security concern';
      case 'info': return 'Informational - security enhancement opportunity';
      default: return 'Unknown impact';
    }
  }

  /**
   * Get exploitability description based on severity
   */
  private getExploitabilityDescription(severity: SecurityVulnerability['severity']): string {
    switch (severity) {
      case 'critical': return 'Easily exploitable with minimal skill required';
      case 'high': return 'Exploitable with moderate skill and effort';
      case 'medium': return 'Requires specific conditions or elevated access';
      case 'low': return 'Difficult to exploit or requires insider access';
      case 'info': return 'Not directly exploitable';
      default: return 'Unknown exploitability';
    }
  }

  /**
   * Check if a package has known vulnerabilities (simplified)
   */
  private isKnownVulnerablePackage(pkg: string, version: string): boolean {
    // This is a simplified check - in production, integrate with npm audit, Snyk, or similar services
    const knownVulnerable = ['lodash', 'moment', 'jquery'];
    return knownVulnerable.includes(pkg);
  }

  /**
   * Add custom security rule
   */
  addCustomRule(rule: SecurityRule): void {
    this.customRules.push(rule);
    logger.info(`Added custom security rule: ${rule.id}`);
  }

  /**
   * Generate security report
   */
  generateReport(result: SecurityAnalysisResult): string {
    const lines = [
      '# Security Analysis Report',
      `Generated: ${result.timestamp.toISOString()}`,
      `Project: ${result.projectPath}`,
      `Analysis Time: ${result.executionTime}ms`,
      '',
      '## Summary',
      `- **Files Analyzed**: ${result.summary.totalFiles}`,
      `- **Total Vulnerabilities**: ${result.summary.vulnerabilities}`,
      `- **Critical**: ${result.summary.criticalCount}`,
      `- **High**: ${result.summary.highCount}`,
      `- **Medium**: ${result.summary.mediumCount}`,
      `- **Low**: ${result.summary.lowCount}`,
      `- **Info**: ${result.summary.infoCount}`,
      `- **Dependency Issues**: ${result.summary.dependencyIssues}`,
      '',
      '## Vulnerabilities by Severity',
      ''
    ];

    // Group vulnerabilities by severity
    const bySeverity = new Map<string, SecurityVulnerability[]>();
    for (const vuln of result.vulnerabilities) {
      if (!bySeverity.has(vuln.severity)) {
        bySeverity.set(vuln.severity, []);
      }
      bySeverity.get(vuln.severity)!.push(vuln);
    }

    // Report each severity level
    for (const [severity, vulnerabilities] of bySeverity) {
      if (vulnerabilities.length > 0) {
        lines.push(`### ${severity.toUpperCase()} (${vulnerabilities.length})`);
        lines.push('');

        for (const vuln of vulnerabilities.slice(0, 10)) { // Limit to first 10 per severity
          lines.push(`**${vuln.title}** (${vuln.file}:${vuln.line})`);
          lines.push(`- Description: ${vuln.description}`);
          lines.push(`- Recommendation: ${vuln.recommendation}`);
          lines.push(`- Confidence: ${vuln.confidence}`);
          if (vuln.owaspCategory) {
            lines.push(`- OWASP: ${vuln.owaspCategory}`);
          }
          lines.push('');
        }

        if (vulnerabilities.length > 10) {
          lines.push(`... and ${vulnerabilities.length - 10} more`);
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }
}

// Factory function
export function createSecurityAnalyzer(): SecurityAnalyzer {
  return new SecurityAnalyzer();
}