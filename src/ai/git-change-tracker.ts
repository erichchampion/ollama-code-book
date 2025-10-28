/**
 * Git Integration for Change Tracking
 *
 * Provides git-based change detection for the incremental knowledge graph.
 * Integrates with git history to identify modified files, track commits,
 * and provide intelligent change analysis based on git diffs.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger.js';
import { FileChange } from './incremental-knowledge-graph.js';
import { getPerformanceConfig } from '../config/performance.js';

const execAsync = promisify(exec);

export interface GitCommitInfo {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  files: GitFileChange[];
}

export interface GitFileChange {
  path: string;
  status: 'A' | 'M' | 'D' | 'R' | 'C'; // Added, Modified, Deleted, Renamed, Copied
  insertions: number;
  deletions: number;
  oldPath?: string; // For renamed files
}

export interface GitTrackingConfig {
  repositoryPath: string;
  trackingMode: 'since_commit' | 'since_date' | 'working_directory';
  sinceCommit?: string;
  sinceDate?: Date;
  includeUntracked: boolean;
  excludePatterns: string[];
  maxCommits?: number;
}

/**
 * Git-based change tracking for incremental knowledge graph updates
 */
export class GitChangeTracker {
  private config: GitTrackingConfig;
  private lastProcessedCommit: string | null = null;

  constructor(config: Partial<GitTrackingConfig> = {}) {
    const performanceConfig = getPerformanceConfig();
    this.config = {
      repositoryPath: process.cwd(),
      trackingMode: 'working_directory',
      includeUntracked: true,
      excludePatterns: config.excludePatterns || performanceConfig.filePatterns.excludePatterns,
      maxCommits: 100,
      ...config
    };
  }

  /**
   * Initialize git tracking and verify repository
   */
  async initialize(): Promise<void> {
    try {
      await this.verifyGitRepository();
      await this.loadLastProcessedCommit();
      logger.info('Git change tracker initialized', {
        mode: this.config.trackingMode,
        repo: this.config.repositoryPath
      });
    } catch (error) {
      logger.error('Failed to initialize git change tracker', { error });
      throw error;
    }
  }

  /**
   * Get all changes since last processed state
   */
  async getChangesSinceLastUpdate(): Promise<FileChange[]> {
    try {
      switch (this.config.trackingMode) {
        case 'working_directory':
          return await this.getWorkingDirectoryChanges();
        case 'since_commit':
          return await this.getChangesSinceCommit(this.config.sinceCommit!);
        case 'since_date':
          return await this.getChangesSinceDate(this.config.sinceDate!);
        default:
          throw new Error(`Unsupported tracking mode: ${this.config.trackingMode}`);
      }
    } catch (error) {
      logger.error('Failed to get git changes', { error });
      return [];
    }
  }

  /**
   * Get changes in working directory (staged + unstaged + untracked)
   */
  private async getWorkingDirectoryChanges(): Promise<FileChange[]> {
    const changes: FileChange[] = [];

    // Get staged and unstaged changes
    const { stdout: statusOutput } = await execAsync('git status --porcelain', {
      cwd: this.config.repositoryPath
    });

    if (statusOutput.trim()) {
      const statusLines = statusOutput.trim().split('\n');

      for (const line of statusLines) {
        const status = line.substring(0, 2);
        const filePath = line.substring(3);

        if (this.shouldIncludeFile(filePath)) {
          const change = await this.createFileChangeFromStatus(status, filePath);
          if (change) {
            changes.push(change);
          }
        }
      }
    }

    // Get untracked files if enabled
    if (this.config.includeUntracked) {
      const untrackedChanges = await this.getUntrackedFiles();
      changes.push(...untrackedChanges);
    }

    return changes;
  }

  /**
   * Get changes since specific commit
   */
  private async getChangesSinceCommit(sinceCommit: string): Promise<FileChange[]> {
    const { stdout } = await execAsync(
      `git diff --name-status ${sinceCommit}..HEAD`,
      { cwd: this.config.repositoryPath }
    );

    const changes: FileChange[] = [];

    if (stdout.trim()) {
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const [status, ...pathParts] = line.split('\t');
        const filePath = pathParts.join('\t'); // Handle paths with tabs

        if (this.shouldIncludeFile(filePath)) {
          const change = await this.createFileChangeFromGitStatus(status, filePath);
          if (change) {
            changes.push(change);
          }
        }
      }
    }

    return changes;
  }

  /**
   * Get changes since specific date
   */
  private async getChangesSinceDate(sinceDate: Date): Promise<FileChange[]> {
    const dateStr = sinceDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    const { stdout } = await execAsync(
      `git log --since="${dateStr}" --name-status --pretty=format:"%H"`,
      { cwd: this.config.repositoryPath }
    );

    const changes = new Map<string, FileChange>();

    if (stdout.trim()) {
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        if (line.match(/^[A-Z]\s+/)) { // Status line
          const [status, ...pathParts] = line.split('\t');
          const filePath = pathParts.join('\t');

          if (this.shouldIncludeFile(filePath)) {
            const change = await this.createFileChangeFromGitStatus(status.trim(), filePath);
            if (change) {
              // Use latest change for each file
              changes.set(filePath, change);
            }
          }
        }
      }
    }

    return Array.from(changes.values());
  }

  /**
   * Get commit information for analysis
   */
  async getCommitInfo(commitHash?: string): Promise<GitCommitInfo | null> {
    try {
      const hash = commitHash || 'HEAD';
      const { stdout } = await execAsync(
        `git show --name-status --pretty=format:"%H|%an|%ae|%ai|%s" ${hash}`,
        { cwd: this.config.repositoryPath }
      );

      const lines = stdout.split('\n');
      const headerLine = lines[0];
      const [commitHash_, author, email, dateStr, ...messageParts] = headerLine.split('|');
      const message = messageParts.join('|');

      const files: GitFileChange[] = [];

      // Parse file changes (skip header lines)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && line.match(/^[A-Z]\s+/)) {
          const [status, ...pathParts] = line.split('\t');
          const filePath = pathParts.join('\t');

          files.push({
            path: filePath,
            status: status.trim() as GitFileChange['status'],
            insertions: 0, // Would need additional parsing for exact counts
            deletions: 0
          });
        }
      }

      return {
        hash: commitHash_,
        author,
        email,
        date: new Date(dateStr),
        message,
        files
      };
    } catch (error) {
      logger.warn('Failed to get commit info', { commitHash, error });
      return null;
    }
  }

  /**
   * Get recent commits for analysis
   */
  async getRecentCommits(limit: number = 10): Promise<GitCommitInfo[]> {
    try {
      const { stdout } = await execAsync(
        `git log --oneline -${limit} --pretty=format:"%H"`,
        { cwd: this.config.repositoryPath }
      );

      const commitHashes = stdout.trim().split('\n');
      const commits: GitCommitInfo[] = [];

      for (const hash of commitHashes) {
        const commit = await this.getCommitInfo(hash);
        if (commit) {
          commits.push(commit);
        }
      }

      return commits;
    } catch (error) {
      logger.error('Failed to get recent commits', { error });
      return [];
    }
  }

  /**
   * Mark commit as processed
   */
  async markCommitProcessed(commitHash: string): Promise<void> {
    this.lastProcessedCommit = commitHash;
    // Could persist this to a config file or database
    logger.debug('Marked commit as processed', { commitHash });
  }

  /**
   * Check if repository is a git repository
   */
  private async verifyGitRepository(): Promise<void> {
    try {
      await execAsync('git rev-parse --git-dir', {
        cwd: this.config.repositoryPath
      });
    } catch (error) {
      throw new Error(`Not a git repository: ${this.config.repositoryPath}`);
    }
  }

  /**
   * Load last processed commit from storage
   */
  private async loadLastProcessedCommit(): Promise<void> {
    try {
      // Try to get the last commit
      const { stdout } = await execAsync('git rev-parse HEAD', {
        cwd: this.config.repositoryPath
      });
      this.lastProcessedCommit = stdout.trim();
    } catch (error) {
      logger.debug('No previous commit found or repository empty');
    }
  }

  /**
   * Get untracked files
   */
  private async getUntrackedFiles(): Promise<FileChange[]> {
    const { stdout } = await execAsync(
      'git ls-files --others --exclude-standard',
      { cwd: this.config.repositoryPath }
    );

    const changes: FileChange[] = [];

    if (stdout.trim()) {
      const files = stdout.trim().split('\n');

      for (const filePath of files) {
        if (this.shouldIncludeFile(filePath)) {
          try {
            const fullPath = path.join(this.config.repositoryPath, filePath);
            const stats = await fs.stat(fullPath);

            changes.push({
              path: filePath,
              changeType: 'added',
              lastModified: stats.mtime,
              size: stats.size
            });
          } catch (error) {
            // File might have been deleted between listing and stat
            logger.debug('Failed to stat untracked file', { filePath, error });
          }
        }
      }
    }

    return changes;
  }

  /**
   * Create FileChange from git status
   */
  private async createFileChangeFromStatus(status: string, filePath: string): Promise<FileChange | null> {
    const staged = status[0];
    const unstaged = status[1];

    // Determine change type based on git status
    let changeType: FileChange['changeType'];

    if (staged === 'A' || unstaged === 'A') {
      changeType = 'added';
    } else if (staged === 'D' || unstaged === 'D') {
      changeType = 'deleted';
    } else if (staged === 'M' || unstaged === 'M') {
      changeType = 'modified';
    } else {
      return null; // Unsupported status
    }

    return this.createFileChangeFromPath(filePath, changeType);
  }

  /**
   * Create FileChange from git diff status
   */
  private async createFileChangeFromGitStatus(status: string, filePath: string): Promise<FileChange | null> {
    let changeType: FileChange['changeType'];

    switch (status) {
      case 'A':
        changeType = 'added';
        break;
      case 'M':
        changeType = 'modified';
        break;
      case 'D':
        changeType = 'deleted';
        break;
      default:
        return null;
    }

    return this.createFileChangeFromPath(filePath, changeType);
  }

  /**
   * Create FileChange object from file path
   */
  private async createFileChangeFromPath(filePath: string, changeType: FileChange['changeType']): Promise<FileChange> {
    const fullPath = path.join(this.config.repositoryPath, filePath);

    try {
      if (changeType === 'deleted') {
        return {
          path: filePath,
          changeType,
          lastModified: new Date(),
          size: 0
        };
      }

      const stats = await fs.stat(fullPath);
      return {
        path: filePath,
        changeType,
        lastModified: stats.mtime,
        size: stats.size
      };
    } catch (error) {
      // File might not exist (deleted) or be inaccessible
      return {
        path: filePath,
        changeType,
        lastModified: new Date(),
        size: 0
      };
    }
  }

  /**
   * Check if file should be included based on patterns
   */
  private shouldIncludeFile(filePath: string): boolean {
    // Check exclude patterns
    for (const pattern of this.config.excludePatterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Simple pattern matching (supports * wildcards)
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex - handle ** first, then *
    let regexPattern = pattern
      .replace(/\*\*/g, '__DOUBLESTAR__')  // Temporary placeholder
      .replace(/\*/g, '[^/]*')             // Single * matches within directory
      .replace(/__DOUBLESTAR__/g, '.*')    // ** matches across directories
      .replace(/\?/g, '.');                // ? matches single character

    // Handle simple file extension patterns like *.log
    if (pattern.includes('*') && !pattern.includes('/')) {
      // For patterns without path separators, match anywhere in filename
      regexPattern = '.*' + regexPattern.replace(/^\.\*/, '');
    }

    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(filePath);
  }
}