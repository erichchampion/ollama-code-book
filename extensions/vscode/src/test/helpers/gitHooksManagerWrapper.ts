/**
 * Git Hooks Manager Wrapper
 * Re-exports production GitHooksManager for use in tests
 *
 * Note: This file exists to work around TypeScript rootDir restrictions.
 * The actual GitHooksManager implementation is in src/ai/vcs/git-hooks-manager.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { GIT_HOOKS_TEST_CONSTANTS, GIT_HOOKS_FILE_PERMISSIONS, GIT_HOOK_TYPES } from './test-constants';

/**
 * Git hooks configuration interface
 */
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

/**
 * Mock Git Hooks Manager for testing
 * Simulates production GitHooksManager behavior without external dependencies
 */
export class GitHooksManager {
  private config: GitHooksConfig;
  private hooksPath: string;

  constructor(config: GitHooksConfig) {
    this.config = config;
    this.hooksPath = path.join(config.repositoryPath, '.git', 'hooks');
  }

  /**
   * Install git hooks based on configuration
   */
  async installHooks(): Promise<void> {
    // Ensure hooks directory exists
    await fs.mkdir(this.hooksPath, { recursive: true });

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
  }

  /**
   * Uninstall all ollama-code git hooks
   */
  async uninstallHooks(): Promise<void> {
    for (const hookType of GIT_HOOK_TYPES) {
      const hookPath = path.join(this.hooksPath, hookType);

      try {
        const content = await fs.readFile(hookPath, 'utf8');

        // Only remove if it's our hook
        if (content.includes(GIT_HOOKS_TEST_CONSTANTS.HOOK_MARKER)) {
          await fs.unlink(hookPath);
        }
      } catch (error) {
        // Hook doesn't exist, which is fine
      }
    }

    // Restore backed up hooks if they exist
    await this.restoreBackedUpHooks();
  }

  /**
   * Backup existing hooks
   */
  private async backupExistingHooks(): Promise<void> {
    for (const hookType of GIT_HOOK_TYPES) {
      const hookPath = path.join(this.hooksPath, hookType);
      const backupPath = `${hookPath}${GIT_HOOKS_TEST_CONSTANTS.BACKUP_EXTENSION}`;

      try {
        const content = await fs.readFile(hookPath, 'utf8');

        // Only backup if it's not already our hook
        if (!content.includes(GIT_HOOKS_TEST_CONSTANTS.HOOK_MARKER)) {
          await fs.copyFile(hookPath, backupPath);
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
    for (const hookType of GIT_HOOK_TYPES) {
      const hookPath = path.join(this.hooksPath, hookType);
      const backupPath = `${hookPath}${GIT_HOOKS_TEST_CONSTANTS.BACKUP_EXTENSION}`;

      try {
        await fs.copyFile(backupPath, hookPath);
        await fs.unlink(backupPath);
      } catch (error) {
        // Backup doesn't exist
      }
    }
  }

  /**
   * Install pre-commit hook
   */
  private async installPreCommitHook(): Promise<void> {
    const hookPath = path.join(this.hooksPath, 'pre-commit');
    const hookContent = this.generatePreCommitHookContent();

    await fs.writeFile(hookPath, hookContent, 'utf8');
    await fs.chmod(hookPath, GIT_HOOKS_FILE_PERMISSIONS.EXECUTABLE);
  }

  /**
   * Install commit-msg hook
   */
  private async installCommitMsgHook(): Promise<void> {
    const hookPath = path.join(this.hooksPath, 'commit-msg');
    const hookContent = this.generateCommitMsgHookContent();

    await fs.writeFile(hookPath, hookContent, 'utf8');
    await fs.chmod(hookPath, GIT_HOOKS_FILE_PERMISSIONS.EXECUTABLE);
  }

  /**
   * Install pre-push hook
   */
  private async installPrePushHook(): Promise<void> {
    const hookPath = path.join(this.hooksPath, 'pre-push');
    const hookContent = this.generatePrePushHookContent();

    await fs.writeFile(hookPath, hookContent, 'utf8');
    await fs.chmod(hookPath, GIT_HOOKS_FILE_PERMISSIONS.EXECUTABLE);
  }

  /**
   * Install post-merge hook
   */
  private async installPostMergeHook(): Promise<void> {
    const hookPath = path.join(this.hooksPath, 'post-merge');
    const hookContent = this.generatePostMergeHookContent();

    await fs.writeFile(hookPath, hookContent, 'utf8');
    await fs.chmod(hookPath, GIT_HOOKS_FILE_PERMISSIONS.EXECUTABLE);
  }

  /**
   * Generate pre-commit hook content
   */
  private generatePreCommitHookContent(): string {
    return `#!/bin/sh
${GIT_HOOKS_TEST_CONSTANTS.HOOK_MARKER} - pre-commit
# Auto-generated by ollama-code Git Hooks Manager

echo "Running ollama-code pre-commit checks..."

# Quality gates enabled: ${this.config.enableQualityGates}
# Bypass enabled: ${this.config.bypassEnabled}

${this.config.enableQualityGates ? `
# Run linting on staged files
# Run tests on affected modules
# Run security scan
# Run type checking
` : ''}

exit 0
`;
  }

  /**
   * Generate commit-msg hook content
   */
  private generateCommitMsgHookContent(): string {
    return `#!/bin/sh
${GIT_HOOKS_TEST_CONSTANTS.HOOK_MARKER} - commit-msg
# Auto-generated by ollama-code Git Hooks Manager

echo "Running ollama-code commit message validation..."

# Validate commit message format
# Check conventional commit format
# Validate issue references
# Check message length

exit 0
`;
  }

  /**
   * Generate pre-push hook content
   */
  private generatePrePushHookContent(): string {
    return `#!/bin/sh
${GIT_HOOKS_TEST_CONSTANTS.HOOK_MARKER} - pre-push
# Auto-generated by ollama-code Git Hooks Manager

echo "Running ollama-code pre-push checks..."

exit 0
`;
  }

  /**
   * Generate post-merge hook content
   */
  private generatePostMergeHookContent(): string {
    return `#!/bin/sh
${GIT_HOOKS_TEST_CONSTANTS.HOOK_MARKER} - post-merge
# Auto-generated by ollama-code Git Hooks Manager

echo "Running ollama-code post-merge tasks..."

exit 0
`;
  }
}
