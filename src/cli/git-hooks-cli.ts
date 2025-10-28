/**
 * Git Hooks CLI Integration
 *
 * Command-line interface for managing git hooks and executing
 * hook operations from git hook scripts.
 */

import { Command } from 'commander';
import { normalizeError } from '../utils/error-utils.js';
import * as path from 'path';
import { GitHooksManager, GitHooksConfig, HookExecutionContext, GitHookType, DEFAULT_GIT_HOOKS_CONFIG } from '../ai/vcs/git-hooks-manager.js';
import { logger } from '../utils/logger.js';

export class GitHooksCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Setup CLI commands for git hooks management
   */
  private setupCommands(): void {
    // Main hooks command group
    const hooksCommand = this.program
      .command('hooks')
      .description('Manage git hooks for AI-powered development assistance');

    // Install hooks command
    hooksCommand
      .command('install')
      .description('Install ollama-code git hooks')
      .option('--cwd <path>', 'Repository path', process.cwd())
      .option('--no-pre-commit', 'Disable pre-commit hook')
      .option('--no-commit-msg', 'Disable commit-msg hook')
      .option('--no-pre-push', 'Disable pre-push hook')
      .option('--no-post-merge', 'Disable post-merge hook')
      .option('--no-quality-gates', 'Disable quality gate enforcement')
      .option('--no-backup', 'Skip backing up existing hooks')
      .option('--timeout <ms>', 'Analysis timeout in milliseconds', '30000')
      .option('--fail-on-error', 'Fail on analysis errors')
      .action(async (options) => {
        await this.installHooks(options);
      });

    // Uninstall hooks command
    hooksCommand
      .command('uninstall')
      .description('Uninstall ollama-code git hooks')
      .option('--cwd <path>', 'Repository path', process.cwd())
      .action(async (options) => {
        await this.uninstallHooks(options);
      });

    // Status command
    hooksCommand
      .command('status')
      .description('Show git hooks installation status')
      .option('--cwd <path>', 'Repository path', process.cwd())
      .action(async (options) => {
        await this.showHooksStatus(options);
      });

    // Hook execution commands (called from git hook scripts)
    const hookCommand = this.program
      .command('hook')
      .description('Execute git hook operations (internal use)');

    // Pre-commit hook execution
    hookCommand
      .command('pre-commit')
      .description('Execute pre-commit analysis')
      .option('--cwd <path>', 'Repository path', process.cwd())
      .option('--timeout <ms>', 'Analysis timeout', '30000')
      .option('--bypass', 'Bypass analysis')
      .action(async (options) => {
        await this.executeHook('pre-commit', options);
      });

    // Commit-msg hook execution
    hookCommand
      .command('commit-msg')
      .description('Execute commit message enhancement')
      .option('--cwd <path>', 'Repository path', process.cwd())
      .option('--commit-msg-file <file>', 'Commit message file path')
      .option('--timeout <ms>', 'Analysis timeout', '30000')
      .option('--bypass', 'Bypass enhancement')
      .action(async (options) => {
        await this.executeHook('commit-msg', options);
      });

    // Pre-push hook execution
    hookCommand
      .command('pre-push')
      .description('Execute pre-push regression analysis')
      .option('--cwd <path>', 'Repository path', process.cwd())
      .option('--timeout <ms>', 'Analysis timeout', '30000')
      .option('--bypass', 'Bypass analysis')
      .action(async (options) => {
        await this.executeHook('pre-push', options);
      });

    // Post-merge hook execution
    hookCommand
      .command('post-merge')
      .description('Execute post-merge quality tracking')
      .option('--cwd <path>', 'Repository path', process.cwd())
      .option('--timeout <ms>', 'Analysis timeout', '30000')
      .action(async (options) => {
        await this.executeHook('post-merge', options);
      });
  }

  /**
   * Install git hooks
   */
  private async installHooks(options: any): Promise<void> {
    try {
      const config: GitHooksConfig = {
        repositoryPath: path.resolve(options.cwd),
        enablePreCommit: options.preCommit !== false,
        enableCommitMsg: options.commitMsg !== false,
        enablePrePush: options.prePush !== false,
        enablePostMerge: options.postMerge !== false,
        enableQualityGates: options.qualityGates !== false,
        bypassEnabled: true,
        analysisTimeout: parseInt(options.timeout),
        failOnAnalysisError: options.failOnError || false,
        backupExistingHooks: options.backup !== false
      };

      const hooksManager = new GitHooksManager(config);
      await hooksManager.installHooks();

      console.log('✅ Git hooks installed successfully!');
      console.log('');
      console.log('Available hooks:');
      if (config.enablePreCommit) console.log('  • pre-commit: AI-powered code analysis');
      if (config.enableCommitMsg) console.log('  • commit-msg: Intelligent commit message enhancement');
      if (config.enablePrePush) console.log('  • pre-push: Regression risk assessment');
      if (config.enablePostMerge) console.log('  • post-merge: Quality trend tracking');
      console.log('');
      console.log('To bypass hooks when needed: OLLAMA_CODE_BYPASS=true git <command>');

    } catch (error) {
      console.error('❌ Failed to install git hooks:', normalizeError(error).message);
      process.exit(1);
    }
  }

  /**
   * Uninstall git hooks
   */
  private async uninstallHooks(options: any): Promise<void> {
    try {
      const config: GitHooksConfig = {
        ...DEFAULT_GIT_HOOKS_CONFIG,
        repositoryPath: path.resolve(options.cwd)
      } as GitHooksConfig;

      const hooksManager = new GitHooksManager(config);
      await hooksManager.uninstallHooks();

      console.log('✅ Git hooks uninstalled successfully!');

    } catch (error) {
      console.error('❌ Failed to uninstall git hooks:', normalizeError(error).message);
      process.exit(1);
    }
  }

  /**
   * Show git hooks installation status
   */
  private async showHooksStatus(options: any): Promise<void> {
    try {
      const repositoryPath = path.resolve(options.cwd);
      const hooksPath = path.join(repositoryPath, '.git', 'hooks');

      console.log(`Git hooks status for: ${repositoryPath}`);
      console.log('');

      const hookTypes: GitHookType[] = ['pre-commit', 'commit-msg', 'pre-push', 'post-merge'];

      for (const hookType of hookTypes) {
        const hookPath = path.join(hooksPath, hookType);

        try {
          const fs = await import('fs/promises');
          const content = await fs.readFile(hookPath, 'utf8');
          const isOllamaCode = content.includes('# ollama-code generated hook');
          const status = isOllamaCode ? '✅ Installed' : '⚠️  Custom hook exists';

          console.log(`  ${hookType.padEnd(12)}: ${status}`);
        } catch (error) {
          console.log(`  ${hookType.padEnd(12)}: ❌ Not installed`);
        }
      }

      console.log('');
      console.log('To install hooks: ollama-code hooks install');
      console.log('To uninstall hooks: ollama-code hooks uninstall');

    } catch (error) {
      console.error('❌ Failed to check hooks status:', normalizeError(error).message);
      process.exit(1);
    }
  }

  /**
   * Execute a specific git hook
   */
  private async executeHook(hookType: GitHookType, options: any): Promise<void> {
    try {
      const context: HookExecutionContext = {
        hookType,
        repositoryPath: path.resolve(options.cwd),
        bypassRequested: options.bypass || false,
        environment: process.env as Record<string, string>,
        arguments: hookType === 'commit-msg' ? [options.commitMsgFile] : []
      };

      const config: GitHooksConfig = {
        ...DEFAULT_GIT_HOOKS_CONFIG,
        repositoryPath: context.repositoryPath,
        analysisTimeout: parseInt(options.timeout) || 30000
      } as GitHooksConfig;

      const hooksManager = new GitHooksManager(config);

      let result;
      switch (hookType) {
        case 'pre-commit':
          result = await hooksManager.executePreCommitHook(context);
          break;
        case 'commit-msg':
          result = await hooksManager.executeCommitMsgHook(context);
          break;
        case 'pre-push':
          result = await hooksManager.executePrePushHook(context);
          break;
        case 'post-merge':
          result = await hooksManager.executePostMergeHook(context);
          break;
        default:
          throw new Error(`Unknown hook type: ${hookType}`);
      }

      // Output result
      if (result.output) {
        console.log(result.output);
      }

      // Exit with appropriate code
      process.exit(result.exitCode);

    } catch (error) {
      console.error(`❌ Hook execution failed:`, normalizeError(error).message);
      process.exit(1);
    }
  }

  /**
   * Parse CLI arguments and execute commands
   */
  async parse(argv: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }

  /**
   * Get the commander program instance
   */
  getProgram(): Command {
    return this.program;
  }
}

/**
 * Create and configure git hooks CLI
 */
export function createGitHooksCLI(): GitHooksCLI {
  return new GitHooksCLI();
}

/**
 * Execute git hooks CLI with provided arguments
 */
export async function executeGitHooksCLI(argv: string[]): Promise<void> {
  const cli = createGitHooksCLI();
  await cli.parse(argv);
}
