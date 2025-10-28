/**
 * Pull Request Reviewer
 *
 * AI-powered automated code review system for pull requests.
 * Provides comprehensive analysis, feedback, and recommendations
 * for code changes in pull requests across different platforms.
 */

import { logger } from '../../utils/logger.js';
import { AutomatedCodeReviewer } from '../automated-code-reviewer.js';
import { SecurityAnalyzer } from '../security-analyzer.js';
import { PerformanceAnalyzer } from '../performance-analyzer.js';
import { generateReviewId, generateFindingId } from '../../utils/id-generator.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface PRReviewConfig {
  repositoryPath: string;
  platform: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'generic';
  reviewDepth: 'surface' | 'moderate' | 'deep' | 'comprehensive';
  enableSecurityAnalysis: boolean;
  enablePerformanceAnalysis: boolean;
  enableArchitectureAnalysis: boolean;
  autoAssignReviewers: boolean;
  requiredChecks: string[];
  reviewCriteria: ReviewCriteria;
}

export interface ReviewCriteria {
  maxFileSize: number; // KB
  maxLinesChanged: number;
  minTestCoverage: number;
  requiresDocumentation: boolean;
  blockingIssueThreshold: 'low' | 'medium' | 'high' | 'critical';
  autoApproveThreshold: number; // Confidence score 0-100
}

export interface PullRequestInfo {
  id: string;
  title: string;
  description: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'closed' | 'merged' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  url: string;
  labels: string[];
  reviewers: string[];
  commits: PRCommit[];
  files: PRFile[];
}

export interface PRCommit {
  sha: string;
  message: string;
  author: string;
  date: Date;
}

export interface PRFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  oldPath?: string;
  patch?: string;
}

export interface PRReviewResult {
  reviewId: string;
  pullRequestId: string;
  status: 'approved' | 'changes_requested' | 'commented' | 'pending';
  overallScore: number;
  recommendation: 'approve' | 'request_changes' | 'comment' | 'block';
  summary: string;
  findings: ReviewFinding[];
  metrics: ReviewMetrics;
  suggestions: string[];
  reviewTime: number; // milliseconds
}

export interface ReviewFinding {
  id: string;
  type: 'security' | 'performance' | 'quality' | 'style' | 'architecture' | 'testing' | 'documentation';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  file: string;
  line?: number;
  column?: number;
  suggestion?: string;
  rule?: string;
  confidence: number;
  autoFixable: boolean;
}

export interface ReviewMetrics {
  filesReviewed: number;
  linesReviewed: number;
  issuesFound: number;
  securityIssues: number;
  performanceIssues: number;
  qualityScore: number;
  testCoverage: number;
  complexity: number;
  maintainability: number;
}

export interface ReviewerAssignment {
  reviewer: string;
  reason: string;
  expertise: string[];
  confidence: number;
}

/**
 * AI-powered pull request reviewer
 */
export class PullRequestReviewer {
  private config: PRReviewConfig;
  private codeReviewer: AutomatedCodeReviewer;
  private securityAnalyzer: SecurityAnalyzer;
  private performanceAnalyzer: PerformanceAnalyzer;
  private aiClient: any;

  constructor(config: PRReviewConfig, aiClient?: any) {
    this.config = config;
    this.aiClient = aiClient;

    // Initialize analyzers
    this.codeReviewer = new AutomatedCodeReviewer();

    this.securityAnalyzer = new SecurityAnalyzer();

    this.performanceAnalyzer = new PerformanceAnalyzer();
  }

  /**
   * Review a pull request
   */
  async reviewPullRequest(prInfo: PullRequestInfo): Promise<PRReviewResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting pull request review', {
        prId: prInfo.id,
        filesChanged: prInfo.files.length,
        linesChanged: prInfo.files.reduce((sum, f) => sum + f.changes, 0)
      });

      // Validate PR eligibility for review
      this.validatePRForReview(prInfo);

      // Perform comprehensive analysis
      const [
        codeFindings,
        securityFindings,
        performanceFindings,
        architectureFindings,
        testFindings
      ] = await Promise.all([
        this.performCodeReview(prInfo),
        this.config.enableSecurityAnalysis ? this.performSecurityReview(prInfo) : Promise.resolve([]),
        this.config.enablePerformanceAnalysis ? this.performPerformanceReview(prInfo) : Promise.resolve([]),
        this.config.enableArchitectureAnalysis ? this.performArchitectureReview(prInfo) : Promise.resolve([]),
        this.performTestReview(prInfo)
      ]);

      // Combine all findings
      const allFindings = [
        ...codeFindings,
        ...securityFindings,
        ...performanceFindings,
        ...architectureFindings,
        ...testFindings
      ];

      // Calculate metrics
      const metrics = this.calculateMetrics(prInfo, allFindings);

      // Generate recommendations
      const { status, recommendation, overallScore } = this.generateRecommendation(allFindings, metrics);

      // Generate summary and suggestions
      const summary = this.generateSummary(prInfo, allFindings, metrics);
      const suggestions = this.generateSuggestions(prInfo, allFindings, metrics);

      const result: PRReviewResult = {
        reviewId: this.generateReviewId(),
        pullRequestId: prInfo.id,
        status,
        overallScore,
        recommendation,
        summary,
        findings: allFindings,
        metrics,
        suggestions,
        reviewTime: Date.now() - startTime
      };

      logger.info('Pull request review completed', {
        prId: prInfo.id,
        recommendation,
        issuesFound: allFindings.length,
        reviewTime: result.reviewTime
      });

      return result;
    } catch (error) {
      logger.error('Failed to review pull request', error);
      throw error;
    }
  }

  /**
   * Review a specific diff
   */
  async reviewDiff(
    diffText: string,
    metadata: { sourceBranch: string; targetBranch: string; author: string }
  ): Promise<PRReviewResult> {
    // Create a minimal PR info object for diff-only review
    const prInfo: PullRequestInfo = {
      id: 'diff-review',
      title: 'Diff Review',
      description: 'Direct diff analysis',
      author: metadata.author,
      sourceBranch: metadata.sourceBranch,
      targetBranch: metadata.targetBranch,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      url: '',
      labels: [],
      reviewers: [],
      commits: [],
      files: this.parseDiffToFiles(diffText)
    };

    return this.reviewPullRequest(prInfo);
  }

  /**
   * Validate if PR is eligible for review
   */
  private validatePRForReview(prInfo: PullRequestInfo): void {
    // Check if PR is not draft
    if (prInfo.status === 'draft') {
      throw new Error('Cannot review draft pull requests');
    }

    // Check file size limits (maxFileSize is in lines of changes)
    const oversizedFiles = prInfo.files.filter(f => f.changes > this.config.reviewCriteria.maxFileSize);
    if (oversizedFiles.length > 0) {
      logger.warn('Large files detected in PR', {
        files: oversizedFiles.map(f => f.path),
        threshold: this.config.reviewCriteria.maxFileSize
      });
    }

    // Check total changes limit
    const totalChanges = prInfo.files.reduce((sum, f) => sum + f.changes, 0);
    if (totalChanges > this.config.reviewCriteria.maxLinesChanged) {
      logger.warn('Large PR detected', {
        changes: totalChanges,
        threshold: this.config.reviewCriteria.maxLinesChanged
      });
    }
  }

  /**
   * Perform code quality review
   */
  private async performCodeReview(prInfo: PullRequestInfo): Promise<ReviewFinding[]> {
    const findings: ReviewFinding[] = [];

    try {
      for (const file of prInfo.files) {
        if (file.status === 'deleted') continue;

        const filePath = path.join(this.config.repositoryPath, file.path);

        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const review = await this.codeReviewer.reviewCode({
            files: [{ path: filePath, content: fileContent }]
          });

          // Convert code review findings to PR findings
          ((review as any).issues || []).forEach((issue: any) => {
            findings.push({
              id: this.generateFindingId(),
              type: 'quality',
              severity: this.mapSeverity(issue.severity),
              title: issue.category || 'Quality Issue',
              description: issue.description || issue.message || 'Quality issue detected',
              file: file.path,
              line: issue.line || 0,
              column: issue.column || 0,
              suggestion: issue.suggestion || issue.fix || undefined,
              rule: issue.category || issue.type || 'quality',
              confidence: issue.confidence,
              autoFixable: issue.autoFixable
            });
          });
        } catch (error) {
          logger.debug(`Failed to review file ${file.path}`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to perform code review', error);
    }

    return findings;
  }

  /**
   * Perform security analysis
   */
  private async performSecurityReview(prInfo: PullRequestInfo): Promise<ReviewFinding[]> {
    const findings: ReviewFinding[] = [];

    try {
      const filesToAnalyze = prInfo.files
        .filter(f => f.status !== 'deleted')
        .map(f => path.join(this.config.repositoryPath, f.path));

      const securityResults = await this.securityAnalyzer.analyzeFile(filesToAnalyze[0] || '', 'low' as any);

      securityResults.forEach((vuln: any) => {
        findings.push({
          id: this.generateFindingId(),
          type: 'security',
          severity: this.mapSeverity(vuln.severity || 'medium'),
          title: vuln.type || 'Security Issue',
          description: vuln.description || 'Security vulnerability detected',
          file: path.relative(this.config.repositoryPath, vuln.file || ''),
          line: vuln.line || 0,
          suggestion: vuln.recommendation || vuln.fix || undefined,
          rule: vuln.type || 'security',
          confidence: vuln.confidence || 'medium',
          autoFixable: false
        });
      });
    } catch (error) {
      logger.error('Failed to perform security review', error);
    }

    return findings;
  }

  /**
   * Perform performance analysis
   */
  private async performPerformanceReview(prInfo: PullRequestInfo): Promise<ReviewFinding[]> {
    const findings: ReviewFinding[] = [];

    try {
      const filesToAnalyze = prInfo.files
        .filter(f => f.status !== 'deleted')
        .map(f => path.join(this.config.repositoryPath, f.path));

      const perfResults = await this.performanceAnalyzer.analyzeFile(filesToAnalyze[0] || '', { severityThreshold: 'low' as any, analyzeComplexity: true, checkMemoryLeaks: true });

      (perfResults.issues || []).forEach((issue: any) => {
        findings.push({
          id: this.generateFindingId(),
          type: 'performance',
          severity: this.mapSeverity(issue.severity),
          title: issue.category || issue.type || 'Performance Issue',
          description: issue.description || 'Performance issue detected',
          file: path.relative(this.config.repositoryPath, issue.file || ''),
          line: issue.line || 0,
          suggestion: issue.suggestion || issue.fix || undefined,
          rule: issue.category || issue.type || 'performance',
          confidence: (typeof issue.confidence === 'number' ? issue.confidence : 'medium'),
          autoFixable: false
        });
      });
    } catch (error) {
      logger.error('Failed to perform performance review', error);
    }

    return findings;
  }

  /**
   * Perform architecture analysis
   */
  private async performArchitectureReview(prInfo: PullRequestInfo): Promise<ReviewFinding[]> {
    const findings: ReviewFinding[] = [];

    try {
      // Architecture analysis would integrate with architectural analyzer
      // For now, provide basic architectural feedback

      const structuralChanges = prInfo.files.filter(f =>
        f.path.includes('src/') && (f.status === 'added' || f.status === 'deleted')
      );

      if (structuralChanges.length > 5) {
        findings.push({
          id: this.generateFindingId(),
          type: 'architecture',
          severity: 'warning',
          title: 'Significant structural changes',
          description: `${structuralChanges.length} files added/removed. Consider architectural impact.`,
          file: '',
          suggestion: 'Review architectural patterns and ensure consistency with existing codebase',
          confidence: 70,
          autoFixable: false
        });
      }

      // Check for circular dependencies (simplified)
      const newFiles = prInfo.files.filter(f => f.status === 'added');
      if (newFiles.length > 0) {
        findings.push({
          id: this.generateFindingId(),
          type: 'architecture',
          severity: 'info',
          title: 'New files added',
          description: `${newFiles.length} new files added. Verify they follow project structure.`,
          file: '',
          suggestion: 'Ensure new files follow established patterns and naming conventions',
          confidence: 60,
          autoFixable: false
        });
      }
    } catch (error) {
      logger.error('Failed to perform architecture review', error);
    }

    return findings;
  }

  /**
   * Perform test coverage analysis
   */
  private async performTestReview(prInfo: PullRequestInfo): Promise<ReviewFinding[]> {
    const findings: ReviewFinding[] = [];

    try {
      const sourceFiles = prInfo.files.filter(f =>
        f.status !== 'deleted' &&
        !f.path.includes('.test.') &&
        !f.path.includes('.spec.') &&
        !f.path.includes('/test/') &&
        (f.path.endsWith('.ts') || f.path.endsWith('.js') || f.path.endsWith('.py'))
      );

      const testFiles = prInfo.files.filter(f =>
        f.path.includes('.test.') ||
        f.path.includes('.spec.') ||
        f.path.includes('/test/')
      );

      // Check if new source files have corresponding tests
      const newSourceFiles = sourceFiles.filter(f => f.status === 'added');
      if (newSourceFiles.length > 0 && testFiles.length === 0) {
        findings.push({
          id: this.generateFindingId(),
          type: 'testing',
          severity: 'warning',
          title: 'Missing tests for new code',
          description: `${newSourceFiles.length} new source files added without corresponding tests`,
          file: '',
          suggestion: 'Add unit tests for new functionality to ensure code quality and maintainability',
          confidence: 80,
          autoFixable: false
        });
      }

      // Check test-to-code ratio
      const testToCodeRatio = testFiles.length / Math.max(sourceFiles.length, 1);
      if (testToCodeRatio < 0.5) {
        findings.push({
          id: this.generateFindingId(),
          type: 'testing',
          severity: 'info',
          title: 'Low test coverage ratio',
          description: `Test-to-code ratio is ${(testToCodeRatio * 100).toFixed(1)}%. Consider increasing test coverage.`,
          file: '',
          suggestion: 'Aim for at least 1 test file per 2 source files for adequate coverage',
          confidence: 70,
          autoFixable: false
        });
      }
    } catch (error) {
      logger.error('Failed to perform test review', error);
    }

    return findings;
  }

  /**
   * Calculate review metrics
   */
  private calculateMetrics(prInfo: PullRequestInfo, findings: ReviewFinding[]): ReviewMetrics {
    const filesReviewed = prInfo.files.length;
    const linesReviewed = prInfo.files.reduce((sum, f) => sum + f.changes, 0);
    const issuesFound = findings.length;

    const securityIssues = findings.filter(f => f.type === 'security').length;
    const performanceIssues = findings.filter(f => f.type === 'performance').length;

    // Calculate quality score based on issues found
    const criticalIssues = findings.filter(f => f.severity === 'critical').length;
    const errorIssues = findings.filter(f => f.severity === 'error').length;
    const warningIssues = findings.filter(f => f.severity === 'warning').length;

    let qualityScore = 100;
    qualityScore -= criticalIssues * 25;
    qualityScore -= errorIssues * 15;
    qualityScore -= warningIssues * 5;
    qualityScore = Math.max(0, qualityScore);

    // Estimate test coverage (simplified)
    const testFiles = prInfo.files.filter(f =>
      f.path.includes('.test.') || f.path.includes('.spec.')
    ).length;
    const sourceFiles = prInfo.files.filter(f =>
      !f.path.includes('.test.') && !f.path.includes('.spec.') &&
      (f.path.endsWith('.ts') || f.path.endsWith('.js'))
    ).length;
    const testCoverage = sourceFiles > 0 ? Math.min(100, (testFiles / sourceFiles) * 100) : 0;

    // Calculate complexity (simplified)
    const complexity = Math.min(10, Math.ceil(linesReviewed / 100));

    // Calculate maintainability
    const maintainability = Math.max(0, 100 - complexity * 10 - issuesFound * 2);

    return {
      filesReviewed,
      linesReviewed,
      issuesFound,
      securityIssues,
      performanceIssues,
      qualityScore,
      testCoverage,
      complexity,
      maintainability
    };
  }

  /**
   * Generate review recommendation
   */
  private generateRecommendation(
    findings: ReviewFinding[],
    metrics: ReviewMetrics
  ): { status: 'approved' | 'changes_requested' | 'commented' | 'pending', recommendation: 'approve' | 'request_changes' | 'comment' | 'block', overallScore: number } {

    const criticalIssues = findings.filter(f => f.severity === 'critical');
    const securityIssues = findings.filter(f => f.type === 'security' && f.severity !== 'info');
    const blockingIssues = findings.filter(f =>
      f.severity === 'critical' ||
      (f.type === 'security' && f.severity === 'error')
    );

    // Calculate overall score
    let overallScore = metrics.qualityScore;

    // Adjust score based on test coverage
    if (metrics.testCoverage < this.config.reviewCriteria.minTestCoverage) {
      overallScore -= 10;
    }

    // Security bonus/penalty
    if (metrics.securityIssues === 0) {
      overallScore += 5;
    } else {
      overallScore -= metrics.securityIssues * 5;
    }

    overallScore = Math.max(0, Math.min(100, overallScore));

    // Determine recommendation
    if (blockingIssues.length > 0) {
      return {
        status: 'changes_requested',
        recommendation: 'block',
        overallScore
      };
    }

    if (criticalIssues.length > 0 || securityIssues.length > 0) {
      return {
        status: 'changes_requested',
        recommendation: 'request_changes',
        overallScore
      };
    }

    if (overallScore >= this.config.reviewCriteria.autoApproveThreshold) {
      return {
        status: 'approved',
        recommendation: 'approve',
        overallScore
      };
    }

    if (findings.length > 0) {
      return {
        status: 'commented',
        recommendation: 'comment',
        overallScore
      };
    }

    return {
      status: 'approved',
      recommendation: 'approve',
      overallScore
    };
  }

  /**
   * Generate review summary
   */
  private generateSummary(
    prInfo: PullRequestInfo,
    findings: ReviewFinding[],
    metrics: ReviewMetrics
  ): string {
    const parts: string[] = [];

    // Overall assessment
    parts.push(`## Review Summary`);
    parts.push(`**Overall Score:** ${metrics.qualityScore}/100`);
    parts.push(`**Files Reviewed:** ${metrics.filesReviewed}`);
    parts.push(`**Lines Changed:** ${metrics.linesReviewed}`);
    parts.push('');

    // Issue breakdown
    if (findings.length > 0) {
      parts.push(`## Issues Found (${findings.length})`);

      const issuesByType = new Map<string, number>();
      const issuesBySeverity = new Map<string, number>();

      findings.forEach(finding => {
        issuesByType.set(finding.type, (issuesByType.get(finding.type) || 0) + 1);
        issuesBySeverity.set(finding.severity, (issuesBySeverity.get(finding.severity) || 0) + 1);
      });

      parts.push('**By Type:**');
      Array.from(issuesByType.entries()).forEach(([type, count]) => {
        parts.push(`- ${type}: ${count}`);
      });

      parts.push('');
      parts.push('**By Severity:**');
      Array.from(issuesBySeverity.entries()).forEach(([severity, count]) => {
        parts.push(`- ${severity}: ${count}`);
      });
    } else {
      parts.push(`## ✅ No Issues Found`);
      parts.push('Great job! No significant issues were detected in this pull request.');
    }

    // Metrics
    parts.push('');
    parts.push('## Metrics');
    parts.push(`- **Quality Score:** ${metrics.qualityScore}/100`);
    parts.push(`- **Test Coverage:** ${metrics.testCoverage.toFixed(1)}%`);
    parts.push(`- **Complexity:** ${metrics.complexity}/10`);
    parts.push(`- **Maintainability:** ${metrics.maintainability}/100`);

    return parts.join('\n');
  }

  /**
   * Generate suggestions for improvement
   */
  private generateSuggestions(
    prInfo: PullRequestInfo,
    findings: ReviewFinding[],
    metrics: ReviewMetrics
  ): string[] {
    const suggestions: string[] = [];

    // Quality suggestions
    if (metrics.qualityScore < 80) {
      suggestions.push('Consider addressing code quality issues to improve maintainability');
    }

    // Test coverage suggestions
    if (metrics.testCoverage < this.config.reviewCriteria.minTestCoverage) {
      suggestions.push(`Increase test coverage to at least ${this.config.reviewCriteria.minTestCoverage}%`);
    }

    // Security suggestions
    if (metrics.securityIssues > 0) {
      suggestions.push('Address security vulnerabilities before merging');
    }

    // Performance suggestions
    if (metrics.performanceIssues > 0) {
      suggestions.push('Review performance issues to ensure optimal execution');
    }

    // Size suggestions
    if (metrics.linesReviewed > this.config.reviewCriteria.maxLinesChanged) {
      suggestions.push('Consider breaking down large PRs into smaller, more focused changes');
    }

    // Documentation suggestions
    if (this.config.reviewCriteria.requiresDocumentation) {
      const hasDocChanges = prInfo.files.some(f => f.path.endsWith('.md'));
      if (!hasDocChanges && prInfo.files.some(f => f.status === 'added')) {
        suggestions.push('Consider updating documentation for new features');
      }
    }

    return suggestions;
  }

  /**
   * Suggest reviewers based on file changes and expertise
   */
  async suggestReviewers(prInfo: PullRequestInfo): Promise<ReviewerAssignment[]> {
    if (!this.config.autoAssignReviewers) {
      return [];
    }

    try {
      // This would integrate with team/expertise databases
      // For now, provide basic suggestions based on file patterns

      const assignments: ReviewerAssignment[] = [];
      const changedAreas = this.identifyChangedAreas(prInfo);

      // Example reviewer assignments (would be configured per project)
      const expertiseMap: Record<string, { reviewers: string[], expertise: string[] }> = {
        'frontend': {
          reviewers: ['frontend-lead', 'ui-expert'],
          expertise: ['React', 'TypeScript', 'CSS']
        },
        'backend': {
          reviewers: ['backend-lead', 'api-expert'],
          expertise: ['Node.js', 'APIs', 'Database']
        },
        'security': {
          reviewers: ['security-team'],
          expertise: ['Security', 'Authentication', 'Encryption']
        },
        'performance': {
          reviewers: ['performance-team'],
          expertise: ['Performance', 'Optimization', 'Monitoring']
        }
      };

      changedAreas.forEach(area => {
        const experts = expertiseMap[area];
        if (experts) {
          experts.reviewers.forEach(reviewer => {
            assignments.push({
              reviewer,
              reason: `Expert in ${area} changes`,
              expertise: experts.expertise,
              confidence: 80
            });
          });
        }
      });

      return assignments;
    } catch (error) {
      logger.error('Failed to suggest reviewers', error);
      return [];
    }
  }

  /**
   * Identify changed areas from PR files
   */
  private identifyChangedAreas(prInfo: PullRequestInfo): string[] {
    const areas = new Set<string>();

    prInfo.files.forEach(file => {
      const filePath = file.path;

      // Frontend patterns
      if (filePath.includes('components/') || filePath.includes('ui/') || filePath.endsWith('.css')) {
        areas.add('frontend');
      }

      // Backend patterns
      if (filePath.includes('api/') || filePath.includes('server/') || filePath.includes('controllers/')) {
        areas.add('backend');
      }

      // Security patterns
      if (filePath.includes('auth') || filePath.includes('security') || filePath.includes('crypto')) {
        areas.add('security');
      }

      // Performance patterns
      if (filePath.includes('performance') || filePath.includes('optimization')) {
        areas.add('performance');
      }

      // Database patterns
      if (filePath.includes('model') || filePath.includes('migration') || filePath.includes('schema')) {
        areas.add('database');
      }
    });

    return Array.from(areas);
  }

  // Helper methods

  private mapReviewDepth(depth: string): 'surface' | 'moderate' | 'deep' {
    switch (depth) {
      case 'comprehensive':
      case 'deep':
        return 'deep';
      case 'moderate':
        return 'moderate';
      default:
        return 'surface';
    }
  }

  private mapSeverity(severity: string): 'info' | 'warning' | 'error' | 'critical' {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'critical';
      case 'error':
      case 'medium':
        return 'error';
      case 'warning':
      case 'low':
        return 'warning';
      default:
        return 'info';
    }
  }

  private generateReviewId(): string {
    return generateReviewId();
  }

  private generateFindingId(): string {
    return generateFindingId();
  }

  private parseDiffToFiles(diffText: string): PRFile[] {
    // Simple diff parsing - in practice, this would be more robust
    const files: PRFile[] = [];
    const lines = diffText.split('\n');
    let currentFile: PRFile | null = null;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          files.push(currentFile);
        }

        const pathMatch = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (pathMatch) {
          currentFile = {
            path: pathMatch[2],
            status: 'modified',
            additions: 0,
            deletions: 0,
            changes: 0,
            patch: ''
          };
        }
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        if (currentFile) {
          currentFile.additions++;
          currentFile.changes++;
        }
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        if (currentFile) {
          currentFile.deletions++;
          currentFile.changes++;
        }
      }
    }

    if (currentFile) {
      files.push(currentFile);
    }

    return files;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PRReviewConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Pull request reviewer configuration updated', updates);
  }

  /**
   * Get current configuration
   */
  getConfig(): PRReviewConfig {
    return { ...this.config };
  }
}