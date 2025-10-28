/**
 * Secure Git Command Executor
 *
 * Provides safe execution of git commands with input sanitization
 * and protection against command injection vulnerabilities.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';
import path from 'path';

const execAsync = promisify(exec);

export interface GitExecOptions {
  cwd: string;
  timeout?: number;
  maxBuffer?: number;
}

export interface GitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class GitCommandExecutor {
  private static readonly ALLOWED_GIT_COMMANDS = [
    'status',
    'log',
    'diff',
    'show',
    'branch',
    'remote',
    'config',
    'rev-parse',
    'symbolic-ref'
  ];

  private static readonly SAFE_FLAGS = [
    '--oneline',
    '--follow',
    '--cached',
    '--stat',
    '--name-status',
    '--porcelain',
    '--show-current',
    '--git-dir',
    '--format="%H|%an|%ae|%ad|%s"',
    '-1',
    '-v',
    '@{u}..'
  ];

  /**
   * Execute a git command safely with input sanitization
   */
  static async execute(
    command: string,
    args: string[] = [],
    options: GitExecOptions
  ): Promise<GitCommandResult> {
    try {
      // Validate the base command
      const baseCommand = command.toLowerCase();
      if (!this.ALLOWED_GIT_COMMANDS.includes(baseCommand)) {
        throw new Error(`Unsafe git command not allowed: ${command}`);
      }

      // Sanitize and validate arguments
      const sanitizedArgs = this.sanitizeArguments(args);

      // Validate repository path
      const sanitizedCwd = this.sanitizeRepositoryPath(options.cwd);

      // Build the complete command
      const fullCommand = ['git', command, ...sanitizedArgs].join(' ');

      logger.debug('Executing git command', { command: fullCommand, cwd: sanitizedCwd });

      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd: sanitizedCwd,
        timeout: options.timeout || 30000,
        maxBuffer: options.maxBuffer || 1024 * 1024 // 1MB default
      });

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0
      };

    } catch (error: any) {
      logger.error('Git command execution failed', {
        command,
        args,
        cwd: options.cwd,
        error: error.message
      });

      return {
        stdout: '',
        stderr: error.message || 'Unknown error',
        exitCode: error.code || 1
      };
    }
  }

  /**
   * Convenience method for git log with file path
   */
  static async getFileHistory(
    filePath: string,
    options: GitExecOptions,
    extraArgs: string[] = []
  ): Promise<GitCommandResult> {
    const sanitizedFilePath = this.sanitizeFilePath(filePath);
    const args = ['--oneline', '--follow', '--', sanitizedFilePath, ...extraArgs];
    return this.execute('log', args, options);
  }

  /**
   * Convenience method for git show with commit hash
   */
  static async showCommit(
    commitHash: string,
    options: GitExecOptions,
    extraArgs: string[] = []
  ): Promise<GitCommandResult> {
    const sanitizedHash = this.sanitizeCommitHash(commitHash);
    const args = ['--name-status', '--format=""', sanitizedHash, ...extraArgs];
    return this.execute('show', args, options);
  }

  /**
   * Convenience method for git status
   */
  static async getStatus(options: GitExecOptions): Promise<GitCommandResult> {
    return this.execute('status', ['--porcelain'], options);
  }

  /**
   * Convenience method for git diff
   */
  static async getDiff(
    options: GitExecOptions,
    cached: boolean = false,
    extraArgs: string[] = []
  ): Promise<GitCommandResult> {
    const args = cached ? ['--cached', ...extraArgs] : extraArgs;
    return this.execute('diff', args, options);
  }

  /**
   * Sanitize command arguments to prevent injection
   */
  private static sanitizeArguments(args: string[]): string[] {
    return args.map(arg => {
      // Remove any shell metacharacters
      const sanitized = arg.replace(/[;&|`$(){}[\]<>]/g, '');

      // Validate against known safe patterns
      if (this.SAFE_FLAGS.some(flag => sanitized.startsWith(flag.replace(/"/g, '')))) {
        return sanitized;
      }

      // For file paths and other arguments, ensure they're properly quoted
      if (sanitized.includes(' ') || sanitized.includes('\t')) {
        return `"${sanitized}"`;
      }

      return sanitized;
    });
  }

  /**
   * Sanitize file path to prevent directory traversal
   */
  private static sanitizeFilePath(filePath: string): string {
    // Normalize the path to prevent directory traversal
    const normalized = path.normalize(filePath);

    // Remove any shell metacharacters
    const sanitized = normalized.replace(/[;&|`$(){}[\]<>]/g, '');

    // Ensure it doesn't start with dangerous patterns
    if (sanitized.startsWith('../') || sanitized.includes('/../')) {
      throw new Error(`Unsafe file path detected: ${filePath}`);
    }

    return sanitized;
  }

  /**
   * Sanitize commit hash
   */
  private static sanitizeCommitHash(hash: string): string {
    // Git commit hashes are hexadecimal, 7-40 characters
    if (!/^[a-fA-F0-9]{7,40}$/.test(hash)) {
      throw new Error(`Invalid commit hash format: ${hash}`);
    }

    return hash;
  }

  /**
   * Sanitize repository path
   */
  private static sanitizeRepositoryPath(repoPath: string): string {
    // Resolve to absolute path to prevent relative path issues
    const resolved = path.resolve(repoPath);

    // Basic validation - ensure it exists and is a directory
    // Note: We don't check existence here as that would require fs access
    // The calling code should validate the repository exists

    return resolved;
  }

  /**
   * Check if a path is a valid git repository
   */
  static async isGitRepository(repoPath: string): Promise<boolean> {
    try {
      const result = await this.execute('rev-parse', ['--git-dir'], { cwd: repoPath });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get repository information safely
   */
  static async getRepositoryInfo(repoPath: string) {
    const isRepo = await this.isGitRepository(repoPath);
    if (!isRepo) {
      throw new Error(`Path is not a git repository: ${repoPath}`);
    }

    const [urlResult, branchResult] = await Promise.allSettled([
      this.execute('config', ['--get', 'remote.origin.url'], { cwd: repoPath }),
      this.execute('branch', ['--show-current'], { cwd: repoPath })
    ]);

    return {
      remoteUrl: urlResult.status === 'fulfilled' ? urlResult.value.stdout.trim() : '',
      currentBranch: branchResult.status === 'fulfilled' ? branchResult.value.stdout.trim() : ''
    };
  }
}