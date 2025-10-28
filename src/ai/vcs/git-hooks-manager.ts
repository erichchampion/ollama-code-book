/**
 * Git Hooks Manager
 *
 * Automated installation and management of git hooks for AI-powered
 * code analysis, commit enhancement, and quality tracking.
 */

import * as fs from 'fs/promises';
import { normalizeError } from '../../utils/error-utils.js';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger.js';
import { VCSIntelligence } from './vcs-intelligence.js';
import { CommitMessageGenerator } from './commit-message-generator.js';
import { RegressionAnalyzer } from './regression-analyzer.js';
import { CodeQualityTracker } from './code-quality-tracker.js';

const execAsync = promisify(exec);

export interface GitHooksConfig {
  repositoryPath: string;
  enablePreCommit: boolean;
  enableCommitMsg: boolean;
  enablePrePush: boolean;
  enablePostMerge: boolean;
  enableQualityGates: boolean;
  bypassEnabled: boolean;
  analysisTimeout: number;
  failOnAnalysisError: boolean;
  backupExistingHooks: boolean;
  customHookPaths?: {
    preCommit?: string;
    commitMsg?: string;
    prePush?: string;
    postMerge?: string;
  };
}

export interface HookExecutionContext {
  hookType: GitHookType;
  repositoryPath: string;
  bypassRequested: boolean;
  environment: Record<string, string>;
  arguments: string[];
}

export interface HookExecutionResult {
  success: boolean;
  exitCode: number;
  output: string;
  error?: string;
  executionTime: number;
  analysisResults?: any;
}

export type GitHookType = 'pre-commit' | 'commit-msg' | 'pre-push' | 'post-merge';

export class GitHooksManager {
  private config: GitHooksConfig;
  private vcsIntelligence: VCSIntelligence;
  private commitGenerator: CommitMessageGenerator;
  private regressionAnalyzer: RegressionAnalyzer;
  private qualityTracker: CodeQualityTracker;
  private hooksPath: string;

  constructor(config: GitHooksConfig) {
    this.config = config;
    this.hooksPath = path.join(config.repositoryPath, '.git', 'hooks');

    // Initialize VCS components
    this.vcsIntelligence = new VCSIntelligence({
      repositoryPath: config.repositoryPath,
      defaultBranch: 'main',
      enableAutoAnalysis: true,
      analysisDepth: 30,
      enableGitHooks: true,
      hookTypes: ['pre-commit', 'commit-msg', 'pre-push', 'post-merge'],
      qualityThresholds: {
        maxComplexity: 10,
        minTestCoverage: 80,
        maxFileSize: 500,
        maxLinesChanged: 500,
        criticalFilePatterns: ['src/core/**', 'src/security/**']
      }
    });

    this.commitGenerator = new CommitMessageGenerator({
      repositoryPath: config.repositoryPath,
      style: 'conventional',
      maxLength: 72,
      includeScope: true,
      includeBody: true,
      includeFooter: false,
      aiProvider: 'ollama'
    });

    this.regressionAnalyzer = new RegressionAnalyzer({
      repositoryPath: config.repositoryPath,
      analysisDepth: 50,
      riskThresholds: {
        fileSize: 500,
        linesChanged: 300,
        filesChanged: 10,
        complexity: 15,
        hotspotFrequency: 5,
        authorExperience: 6
      },
      enablePredictiveAnalysis: true,
      enableHistoricalLearning: true,
      criticalPaths: ['src/core/**', 'src/security/**'],
      testPatterns: ['**/*.test.*', '**/*.spec.*', '**/tests/**'],
      buildPatterns: ['**/package.json', '**/Dockerfile', '**/*.yml']
    });

    this.qualityTracker = new CodeQualityTracker({
      repositoryPath: config.repositoryPath,
      trackingInterval: 'commit',
      retentionPeriod: 90,
      qualityThresholds: {
        minOverallScore: 80,
        maxCriticalIssues: 0,
        maxSecurityIssues: 5,
        minTestCoverage: 80,
        maxTechnicalDebt: 40,
        maxComplexity: 10,
        minMaintainability: 70
      },
      enableTrendAnalysis: true,
      enablePredictiveAnalysis: true,
      enableAlerts: true,
      alertThresholds: {
        qualityDegradation: 10,
        securityIssueIncrease: 3,
        complexityIncrease: 20,
        testCoverageDecrease: 10,
        technicalDebtIncrease: 8
      },
      storageBackend: 'file',
      storagePath: path.join(config.repositoryPath, '.ollama-code', 'quality-tracking')
    });
  }

  /**
   * Install all configured git hooks
   */
  async installHooks(): Promise<void> {
    logger.info('Installing git hooks for AI-powered development assistance');

    try {
      // Ensure hooks directory exists
      await this.ensureHooksDirectory();

      // Backup existing hooks if enabled
      if (this.config.backupExistingHooks) {
        await this.backupExistingHooks();
      }

      // Install individual hooks based on configuration
      const installPromises: Promise<void>[] = [];

      if (this.config.enablePreCommit) {
        installPromises.push(this.installPreCommitHook());
      }

      if (this.config.enableCommitMsg) {
        installPromises.push(this.installCommitMsgHook());
      }

      if (this.config.enablePrePush) {
        installPromises.push(this.installPrePushHook());
      }

      if (this.config.enablePostMerge) {
        installPromises.push(this.installPostMergeHook());
      }

      await Promise.all(installPromises);

      logger.info('Git hooks installation completed successfully');
    } catch (error) {
      logger.error('Failed to install git hooks', error);
      throw error;
    }
  }

  /**
   * Uninstall all ollama-code git hooks
   */
  async uninstallHooks(): Promise<void> {
    logger.info('Uninstalling ollama-code git hooks');

    try {
      const hookTypes: GitHookType[] = ['pre-commit', 'commit-msg', 'pre-push', 'post-merge'];

      for (const hookType of hookTypes) {
        const hookPath = path.join(this.hooksPath, hookType);

        try {
          const content = await fs.readFile(hookPath, 'utf8');

          // Only remove if it's our hook
          if (content.includes('# ollama-code generated hook')) {
            await fs.unlink(hookPath);
            logger.info(`Removed ${hookType} hook`);
          }
        } catch (error) {
          // Hook doesn't exist, which is fine
        }
      }

      // Restore backed up hooks if they exist
      await this.restoreBackedUpHooks();

      logger.info('Git hooks uninstallation completed');
    } catch (error) {
      logger.error('Failed to uninstall git hooks', error);
      throw error;
    }
  }

  /**
   * Execute pre-commit hook analysis
   */
  async executePreCommitHook(context: HookExecutionContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    logger.info('Executing pre-commit hook analysis');

    try {
      // Check for bypass
      if (context.bypassRequested || context.environment.OLLAMA_CODE_BYPASS === 'true') {
        logger.warn('Pre-commit analysis bypassed by user request');
        return {
          success: true,
          exitCode: 0,
          output: 'Analysis bypassed by user request',
          executionTime: Date.now() - startTime
        };
      }

      // Get staged files for analysis
      const { stdout: stagedFiles } = await execAsync('git diff --cached --name-only', {
        cwd: context.repositoryPath
      });

      if (!stagedFiles.trim()) {
        return {
          success: true,
          exitCode: 0,
          output: 'No staged files to analyze',
          executionTime: Date.now() - startTime
        };
      }

      const files = stagedFiles.trim().split('\n');
      logger.info(`Analyzing ${files.length} staged files`);

      // Perform comprehensive analysis
      const analysisResults = await this.vcsIntelligence.analyzeRepository();

      // Check for critical issues
      const criticalIssues = this.findCriticalIssues(analysisResults);

      if (criticalIssues.length > 0 && this.config.enableQualityGates) {
        const errorMessage = `Pre-commit analysis failed with ${criticalIssues.length} critical issues:\n${
          criticalIssues.map(issue => `  - ${issue}`).join('\n')
        }\n\nUse OLLAMA_CODE_BYPASS=true to bypass this check if necessary.`;

        return {
          success: false,
          exitCode: 1,
          output: errorMessage,
          error: 'Critical issues found in staged files',
          executionTime: Date.now() - startTime,
          analysisResults
        };
      }

      return {
        success: true,
        exitCode: 0,
        output: `Pre-commit analysis passed. Analyzed ${files.length} files with no critical issues.`,
        executionTime: Date.now() - startTime,
        analysisResults
      };

    } catch (error) {
      const errorMessage = `Pre-commit analysis failed: ${normalizeError(error).message}`;

      if (this.config.failOnAnalysisError) {
        return {
          success: false,
          exitCode: 1,
          output: errorMessage,
          error: errorMessage,
          executionTime: Date.now() - startTime
        };
      } else {
        logger.warn('Pre-commit analysis failed but continuing due to configuration', error);
        return {
          success: true,
          exitCode: 0,
          output: `Analysis failed but continuing: ${errorMessage}`,
          executionTime: Date.now() - startTime
        };
      }
    }
  }

  /**
   * Execute commit message enhancement
   */
  async executeCommitMsgHook(context: HookExecutionContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const commitMsgFile = context.arguments[0];

    if (!commitMsgFile) {
      return {
        success: false,
        exitCode: 1,
        output: 'Commit message file not provided',
        error: 'Missing commit message file argument',
        executionTime: Date.now() - startTime
      };
    }

    try {
      // Check for bypass
      if (context.bypassRequested || context.environment.OLLAMA_CODE_BYPASS === 'true') {
        return {
          success: true,
          exitCode: 0,
          output: 'Commit message enhancement bypassed',
          executionTime: Date.now() - startTime
        };
      }

      // Read current commit message
      const currentMessage = await fs.readFile(commitMsgFile, 'utf8');

      // Skip if message already looks good or is a merge/revert
      if (this.shouldSkipCommitEnhancement(currentMessage)) {
        return {
          success: true,
          exitCode: 0,
          output: 'Commit message enhancement skipped (already good or special commit)',
          executionTime: Date.now() - startTime
        };
      }

      // Generate enhanced commit message
      const enhanced = await this.commitGenerator.generateCommitMessage();

      if (enhanced && enhanced.message.trim() !== currentMessage.trim()) {
        // Create enhanced message with original as fallback
        const enhancedMessage = `${enhanced.message}\n\n# Original message:\n# ${currentMessage.split('\n').join('\n# ')}`;

        await fs.writeFile(commitMsgFile, enhancedMessage);

        return {
          success: true,
          exitCode: 0,
          output: 'Commit message enhanced with AI suggestions',
          executionTime: Date.now() - startTime,
          analysisResults: enhanced
        };
      }

      return {
        success: true,
        exitCode: 0,
        output: 'No commit message enhancement needed',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Commit message enhancement failed', error);

      if (this.config.failOnAnalysisError) {
        return {
          success: false,
          exitCode: 1,
          output: `Commit message enhancement failed: ${normalizeError(error).message}`,
          error: normalizeError(error).message,
          executionTime: Date.now() - startTime
        };
      } else {
        return {
          success: true,
          exitCode: 0,
          output: 'Commit message enhancement failed but continuing',
          executionTime: Date.now() - startTime
        };
      }
    }
  }

  /**
   * Execute pre-push regression analysis
   */
  async executePrePushHook(context: HookExecutionContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    logger.info('Executing pre-push regression analysis');

    try {
      // Check for bypass
      if (context.bypassRequested || context.environment.OLLAMA_CODE_BYPASS === 'true') {
        return {
          success: true,
          exitCode: 0,
          output: 'Pre-push analysis bypassed',
          executionTime: Date.now() - startTime
        };
      }

      // Perform regression analysis
      const regressionAnalysis = await this.regressionAnalyzer.analyzeRegressions();

      // Check risk levels
      const highRiskPredictions = regressionAnalysis.predictions.filter(
        (p: any) => p.risk === 'high' || p.confidence > 0.8
      );

      if (highRiskPredictions.length > 0 && this.config.enableQualityGates) {
        const riskSummary = highRiskPredictions.map((p: any) =>
          `  - ${p.type} risk: ${p.description} (confidence: ${Math.round(p.confidence * 100)}%)`
        ).join('\n');

        const errorMessage = `Pre-push analysis detected high regression risk:\n${riskSummary}\n\nUse OLLAMA_CODE_BYPASS=true to bypass if necessary.`;

        return {
          success: false,
          exitCode: 1,
          output: errorMessage,
          error: 'High regression risk detected',
          executionTime: Date.now() - startTime,
          analysisResults: regressionAnalysis
        };
      }

      return {
        success: true,
        exitCode: 0,
        output: `Pre-push regression analysis passed. Risk level: ${regressionAnalysis.riskAssessment.overallRisk}`,
        executionTime: Date.now() - startTime,
        analysisResults: regressionAnalysis
      };

    } catch (error) {
      const errorMessage = `Pre-push analysis failed: ${normalizeError(error).message}`;

      if (this.config.failOnAnalysisError) {
        return {
          success: false,
          exitCode: 1,
          output: errorMessage,
          error: errorMessage,
          executionTime: Date.now() - startTime
        };
      } else {
        return {
          success: true,
          exitCode: 0,
          output: `Analysis failed but continuing: ${errorMessage}`,
          executionTime: Date.now() - startTime
        };
      }
    }
  }

  /**
   * Execute post-merge quality tracking
   */
  async executePostMergeHook(context: HookExecutionContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    logger.info('Executing post-merge quality tracking');

    try {
      // This hook doesn't block, so no bypass needed

      // Track quality metrics after merge
      const qualitySnapshot = await this.qualityTracker.takeSnapshot();

      // Generate basic report
      const report = await this.qualityTracker.generateReport({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date()
      });

      let output = 'Post-merge quality tracking completed';
      if (report.topIssues && report.topIssues.length > 0) {
        output += `\nTop quality issues:\n${report.topIssues.map((issue: any) => `  - ${issue.category}: ${issue.description}`).join('\n')}`;
      }

      return {
        success: true,
        exitCode: 0,
        output,
        executionTime: Date.now() - startTime,
        analysisResults: { qualitySnapshot, report }
      };

    } catch (error) {
      logger.error('Post-merge quality tracking failed', error);

      // Post-merge hooks should not fail the operation
      return {
        success: true,
        exitCode: 0,
        output: `Quality tracking failed: ${normalizeError(error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Install pre-commit hook
   */
  private async installPreCommitHook(): Promise<void> {
    const hookPath = path.join(this.hooksPath, 'pre-commit');
    const hookScript = this.generatePreCommitScript();

    await fs.writeFile(hookPath, hookScript);
    await fs.chmod(hookPath, 0o755);

    logger.info('Pre-commit hook installed');
  }

  /**
   * Install commit-msg hook
   */
  private async installCommitMsgHook(): Promise<void> {
    const hookPath = path.join(this.hooksPath, 'commit-msg');
    const hookScript = this.generateCommitMsgScript();

    await fs.writeFile(hookPath, hookScript);
    await fs.chmod(hookPath, 0o755);

    logger.info('Commit-msg hook installed');
  }

  /**
   * Install pre-push hook
   */
  private async installPrePushHook(): Promise<void> {
    const hookPath = path.join(this.hooksPath, 'pre-push');
    const hookScript = this.generatePrePushScript();

    await fs.writeFile(hookPath, hookScript);
    await fs.chmod(hookPath, 0o755);

    logger.info('Pre-push hook installed');
  }

  /**
   * Install post-merge hook
   */
  private async installPostMergeHook(): Promise<void> {
    const hookPath = path.join(this.hooksPath, 'post-merge');
    const hookScript = this.generatePostMergeScript();

    await fs.writeFile(hookPath, hookScript);
    await fs.chmod(hookPath, 0o755);

    logger.info('Post-merge hook installed');
  }

  /**
   * Generate pre-commit hook script
   */
  private generatePreCommitScript(): string {
    return `#!/bin/sh
# ollama-code generated hook - pre-commit analysis

# Enable bypass with OLLAMA_CODE_BYPASS=true
if [ "$OLLAMA_CODE_BYPASS" = "true" ]; then
    echo "ollama-code: Pre-commit analysis bypassed"
    exit 0
fi

# Check if ollama-code is available
if ! command -v ollama-code >/dev/null 2>&1; then
    echo "ollama-code: Command not found, skipping analysis"
    exit 0
fi

echo "ollama-code: Running pre-commit analysis..."

# Execute pre-commit analysis
ollama-code hook pre-commit --cwd="${this.config.repositoryPath}" --timeout=${this.config.analysisTimeout}
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo "ollama-code: Pre-commit analysis failed (exit code: $exit_code)"
    echo "To bypass this check, use: OLLAMA_CODE_BYPASS=true git commit"
    exit $exit_code
fi

echo "ollama-code: Pre-commit analysis passed"
exit 0
`;
  }

  /**
   * Generate commit-msg hook script
   */
  private generateCommitMsgScript(): string {
    return `#!/bin/sh
# ollama-code generated hook - commit message enhancement

# Enable bypass with OLLAMA_CODE_BYPASS=true
if [ "$OLLAMA_CODE_BYPASS" = "true" ]; then
    echo "ollama-code: Commit message enhancement bypassed"
    exit 0
fi

# Check if ollama-code is available
if ! command -v ollama-code >/dev/null 2>&1; then
    exit 0
fi

# Execute commit message enhancement
ollama-code hook commit-msg --cwd="${this.config.repositoryPath}" --commit-msg-file="$1" --timeout=${this.config.analysisTimeout}
exit_code=$?

# Commit message hooks should generally not fail the commit
if [ $exit_code -ne 0 ]; then
    echo "ollama-code: Commit message enhancement failed but continuing"
fi

exit 0
`;
  }

  /**
   * Generate pre-push hook script
   */
  private generatePrePushScript(): string {
    return `#!/bin/sh
# ollama-code generated hook - regression analysis

# Enable bypass with OLLAMA_CODE_BYPASS=true
if [ "$OLLAMA_CODE_BYPASS" = "true" ]; then
    echo "ollama-code: Pre-push analysis bypassed"
    exit 0
fi

# Check if ollama-code is available
if ! command -v ollama-code >/dev/null 2>&1; then
    echo "ollama-code: Command not found, skipping analysis"
    exit 0
fi

echo "ollama-code: Running regression analysis..."

# Execute pre-push analysis
ollama-code hook pre-push --cwd="${this.config.repositoryPath}" --timeout=${this.config.analysisTimeout}
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo "ollama-code: Regression analysis failed (exit code: $exit_code)"
    echo "To bypass this check, use: OLLAMA_CODE_BYPASS=true git push"
    exit $exit_code
fi

echo "ollama-code: Regression analysis passed"
exit 0
`;
  }

  /**
   * Generate post-merge hook script
   */
  private generatePostMergeScript(): string {
    return `#!/bin/sh
# ollama-code generated hook - quality tracking

# Check if ollama-code is available
if ! command -v ollama-code >/dev/null 2>&1; then
    exit 0
fi

# Execute post-merge quality tracking (async, non-blocking)
ollama-code hook post-merge --cwd="${this.config.repositoryPath}" --timeout=${this.config.analysisTimeout} &

exit 0
`;
  }

  /**
   * Ensure hooks directory exists
   */
  private async ensureHooksDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.hooksPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Backup existing hooks
   */
  private async backupExistingHooks(): Promise<void> {
    const backupDir = path.join(this.hooksPath, 'ollama-code-backup');
    await fs.mkdir(backupDir, { recursive: true });

    const hookTypes: GitHookType[] = ['pre-commit', 'commit-msg', 'pre-push', 'post-merge'];

    for (const hookType of hookTypes) {
      const hookPath = path.join(this.hooksPath, hookType);
      const backupPath = path.join(backupDir, `${hookType}.backup`);

      try {
        const content = await fs.readFile(hookPath, 'utf8');

        // Only backup if it's not our hook
        if (!content.includes('# ollama-code generated hook')) {
          await fs.writeFile(backupPath, content);
          await fs.chmod(backupPath, 0o755);
          logger.info(`Backed up existing ${hookType} hook`);
        }
      } catch (error) {
        // Hook doesn't exist, which is fine
      }
    }
  }

  /**
   * Restore backed up hooks
   */
  private async restoreBackedUpHooks(): Promise<void> {
    const backupDir = path.join(this.hooksPath, 'ollama-code-backup');

    try {
      const backupFiles = await fs.readdir(backupDir);

      for (const backupFile of backupFiles) {
        if (backupFile.endsWith('.backup')) {
          const hookType = backupFile.replace('.backup', '');
          const backupPath = path.join(backupDir, backupFile);
          const hookPath = path.join(this.hooksPath, hookType);

          const content = await fs.readFile(backupPath, 'utf8');
          await fs.writeFile(hookPath, content);
          await fs.chmod(hookPath, 0o755);

          logger.info(`Restored ${hookType} hook from backup`);
        }
      }

      // Remove backup directory
      await fs.rm(backupDir, { recursive: true });
    } catch (error) {
      // Backup directory doesn't exist or other error
      logger.debug('No backup hooks to restore', error);
    }
  }

  /**
   * Find critical issues in analysis results
   */
  private findCriticalIssues(analysisResults: any): string[] {
    const issues: string[] = [];

    if (analysisResults.qualityMetrics) {
      const { qualityMetrics } = analysisResults;

      if (qualityMetrics.bugs > 0) {
        issues.push(`${qualityMetrics.bugs} critical bugs detected`);
      }

      if (qualityMetrics.vulnerabilities > 0) {
        issues.push(`${qualityMetrics.vulnerabilities} security vulnerabilities detected`);
      }

      if (qualityMetrics.complexityScore > this.config.analysisTimeout) {
        issues.push(`Code complexity too high: ${qualityMetrics.complexityScore}`);
      }
    }

    return issues;
  }

  /**
   * Check if commit message enhancement should be skipped
   */
  private shouldSkipCommitEnhancement(message: string): boolean {
    const trimmed = message.trim();

    // Skip if empty or just comments
    if (!trimmed || trimmed.startsWith('#')) {
      return true;
    }

    // Skip merge commits
    if (trimmed.startsWith('Merge ') || trimmed.includes('Merge branch')) {
      return true;
    }

    // Skip revert commits
    if (trimmed.startsWith('Revert ')) {
      return true;
    }

    // Skip if already follows conventional format
    const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
    if (conventionalPattern.test(trimmed)) {
      return true;
    }

    // Skip if message is already descriptive enough
    if (trimmed.length > 50 && trimmed.includes(' ')) {
      return true;
    }

    return false;
  }
}

/**
 * Default git hooks configuration
 */
export const DEFAULT_GIT_HOOKS_CONFIG: Partial<GitHooksConfig> = {
  enablePreCommit: true,
  enableCommitMsg: true,
  enablePrePush: true,
  enablePostMerge: true,
  enableQualityGates: true,
  bypassEnabled: true,
  analysisTimeout: 30000, // 30 seconds
  failOnAnalysisError: false,
  backupExistingHooks: true
};
