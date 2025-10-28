/**
 * Git Integration Module
 *
 * Provides intelligent git operations with AI-powered features including:
 * - Smart commit message generation
 * - Automated PR descriptions
 * - Branch analysis and suggestions
 * - Conflict resolution assistance
 * - Code review preparation
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getEnhancedClient } from '../ai/index.js';
import { createSpinner } from '../utils/spinner.js';
import { AI_CONSTANTS } from '../config/constants.js';

const execAsync = promisify(exec);

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
}

export interface GitCommit {
  hash: string;
  author: string;
  date: Date;
  message: string;
  files: string[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
  lastCommit: string;
}

export interface CommitSuggestion {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  scope?: string;
  description: string;
  body?: string;
  breaking?: string;
  confidence: number;
}

export class GitManager {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * Check if current directory is a git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.workingDir });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize git repository if not exists
   */
  async initRepo(): Promise<void> {
    const spinner = createSpinner('Initializing git repository...');
    spinner.start();

    try {
      if (await this.isGitRepo()) {
        spinner.succeed('Repository already initialized');
        return;
      }

      await execAsync('git init', { cwd: this.workingDir });
      spinner.succeed('Git repository initialized');
    } catch (error) {
      spinner.fail('Failed to initialize git repository');
      throw error;
    }
  }

  /**
   * Get detailed git status
   */
  async getStatus(): Promise<GitStatus> {
    const spinner = createSpinner('Analyzing git status...');
    spinner.start();

    try {
      // Get current branch
      const { stdout: branchOut } = await execAsync('git branch --show-current', { cwd: this.workingDir });
      const branch = branchOut.trim();

      // Get ahead/behind info
      let ahead = 0, behind = 0;
      try {
        const { stdout: countOut } = await execAsync(`git rev-list --count --left-right @{upstream}...HEAD`, { cwd: this.workingDir });
        const [behindStr, aheadStr] = countOut.trim().split('\t');
        behind = parseInt(behindStr) || 0;
        ahead = parseInt(aheadStr) || 0;
      } catch {
        // No upstream branch
      }

      // Get file status
      const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd: this.workingDir });
      const lines = statusOut.split('\n').filter(line => line.trim().length > 0);

      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];
      const conflicted: string[] = [];

      for (const line of lines) {
        // Git porcelain format: XY filename, where X and Y are status codes
        // But sometimes it's just X filename (single char status)
        // We need to find where the filename starts by looking for the space after status codes

        let statusCode: string;
        let filePath: string;

        // Git porcelain format is always: XY filename
        // where X is staged status, Y is working tree status
        // We need to handle this properly
        if (line.length < 3) {
          console.error(`Invalid git status line format: "${line}"`);
          continue;
        }

        statusCode = line.substring(0, 2);
        filePath = line.substring(3);

        // Handle quoted filenames (git quotes filenames with special characters)
        if (filePath.startsWith('"') && filePath.endsWith('"')) {
          // Remove quotes and unescape
          filePath = filePath.slice(1, -1);
          // Unescape common escape sequences
          filePath = filePath.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // Ensure we don't have any accidental path truncation
        if (filePath.length === 0) {
          logger.warn(`Empty file path detected from line: "${line}"`);
          continue;
        }

        // Git status codes: XY where X=index, Y=worktree
        // U = unmerged (conflict), A = added, M = modified, D = deleted, R = renamed, C = copied
        if (statusCode.includes('U') || (statusCode[0] === 'A' && statusCode[1] === 'A')) {
          // Conflicts: UU, AA, etc.
          conflicted.push(filePath);
        } else if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
          // Staged changes: A, M, D, R, C in first position
          staged.push(filePath);
        } else if (statusCode[1] !== ' ' && statusCode[1] !== '?') {
          // Working tree changes: M, D in second position
          unstaged.push(filePath);
        } else if (statusCode === '??') {
          // Untracked files
          untracked.push(filePath);
        }
      }

      spinner.succeed('Git status analyzed');

      return {
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        conflicted
      };
    } catch (error) {
      spinner.fail('Failed to get git status');
      throw error;
    }
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(count: number = 10): Promise<GitCommit[]> {
    const spinner = createSpinner('Fetching recent commits...');
    spinner.start();

    try {
      const { stdout } = await execAsync(`git log --oneline --format="%H|%an|%ad|%s" --date=iso -${count}`, { cwd: this.workingDir });
      const lines = stdout.trim().split('\n').filter(line => line.length > 0);

      const commits: GitCommit[] = [];
      for (const line of lines) {
        const [hash, author, dateStr, message] = line.split('|');
        const date = new Date(dateStr);

        // Get files changed in this commit
        const { stdout: filesOut } = await execAsync(`git diff-tree --no-commit-id --name-only -r ${hash}`, { cwd: this.workingDir });
        const files = filesOut.trim().split('\n').filter(f => f.length > 0);

        commits.push({
          hash: hash.substring(0, 8),
          author,
          date,
          message,
          files
        });
      }

      spinner.succeed('Recent commits fetched');
      return commits;
    } catch (error) {
      spinner.fail('Failed to fetch commits');
      throw error;
    }
  }

  /**
   * Get all branches
   */
  async getBranches(): Promise<GitBranch[]> {
    const spinner = createSpinner('Fetching branches...');
    spinner.start();

    try {
      const { stdout } = await execAsync('git branch -vv', { cwd: this.workingDir });
      const lines = stdout.trim().split('\n');

      const branches: GitBranch[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        const current = trimmed.startsWith('*');
        const parts = trimmed.replace(/^\*\s*/, '').split(/\s+/);

        const name = parts[0];
        const lastCommit = parts[1];

        // Parse upstream info
        let upstream: string | undefined;
        const upstreamMatch = line.match(/\[([^\]]+)\]/);
        if (upstreamMatch) {
          upstream = upstreamMatch[1].split(':')[0];
        }

        branches.push({
          name,
          current,
          lastCommit,
          upstream
        });
      }

      spinner.succeed('Branches fetched');
      return branches;
    } catch (error) {
      spinner.fail('Failed to fetch branches');
      throw error;
    }
  }

  /**
   * Generate intelligent commit message suggestions
   */
  async generateCommitMessage(): Promise<CommitSuggestion[]> {
    const spinner = createSpinner('Generating commit message suggestions...');
    spinner.start();

    try {
      const status = await this.getStatus();

      if (status.staged.length === 0) {
        spinner.fail('No staged changes found');
        throw new Error('No staged changes to commit');
      }

      // Get staged changes diff
      const { stdout: diffOut } = await execAsync('git diff --cached', { cwd: this.workingDir });

      // Analyze changes with AI
      const aiClient = await getEnhancedClient();

      const prompt = `Analyze the following git diff and generate commit message suggestions following conventional commits format.

Staged files: ${status.staged.join(', ')}

Git diff:
${diffOut}

Please suggest 3 commit messages with different approaches:
1. Most specific and detailed
2. Concise but clear
3. High-level summary

For each suggestion, provide:
- type (feat/fix/docs/style/refactor/test/chore)
- scope (optional)
- description (max 50 chars)
- body (optional, max 72 chars per line)
- breaking changes (if any)
- confidence level (0-1)

Format as JSON array of CommitSuggestion objects.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.GIT_MESSAGE_TEMPERATURE
      });

      let suggestions: CommitSuggestion[];
      try {
        suggestions = JSON.parse(response.content);
      } catch {
        // Fallback to pattern-based suggestions
        suggestions = this.generateFallbackCommitSuggestions(status.staged, diffOut);
      }

      spinner.succeed('Commit message suggestions generated');
      return suggestions;
    } catch (error) {
      spinner.fail('Failed to generate commit messages');
      throw error;
    }
  }

  /**
   * Fallback commit message generation using patterns
   */
  private generateFallbackCommitSuggestions(stagedFiles: string[], diff: string): CommitSuggestion[] {
    const suggestions: CommitSuggestion[] = [];

    // Analyze file patterns
    const hasTests = stagedFiles.some(f => f.includes('test') || f.includes('spec'));
    const hasDocuments = stagedFiles.some(f => f.includes('.md') || f.includes('doc'));
    const hasConfig = stagedFiles.some(f => f.includes('config') || f.includes('.json') || f.includes('.yaml'));
    const hasNewFiles = diff.includes('new file mode');
    const hasDeletedFiles = diff.includes('deleted file mode');

    if (hasTests) {
      suggestions.push({
        type: 'test',
        description: 'add/update tests',
        confidence: 0.8
      });
    }

    if (hasDocuments) {
      suggestions.push({
        type: 'docs',
        description: 'update documentation',
        confidence: 0.8
      });
    }

    if (hasConfig) {
      suggestions.push({
        type: 'chore',
        description: 'update configuration',
        confidence: 0.7
      });
    }

    if (hasNewFiles) {
      suggestions.push({
        type: 'feat',
        description: 'add new functionality',
        confidence: 0.6
      });
    }

    // Generic fallback
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'chore',
        description: 'update codebase',
        confidence: 0.5
      });
    }

    return suggestions;
  }

  /**
   * Create commit with AI-generated message
   */
  async smartCommit(message?: string): Promise<void> {
    const spinner = createSpinner('Creating intelligent commit...');
    spinner.start();

    try {
      let commitMessage = message;

      if (!commitMessage) {
        const suggestions = await this.generateCommitMessage();
        // Use the highest confidence suggestion
        const bestSuggestion = suggestions.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        );

        commitMessage = this.formatCommitMessage(bestSuggestion);
      }

      await execAsync(`git commit -m "${commitMessage}"`, { cwd: this.workingDir });
      spinner.succeed(`Commit created: ${commitMessage}`);
    } catch (error) {
      spinner.fail('Failed to create commit');
      throw error;
    }
  }

  /**
   * Format commit suggestion as conventional commit message
   */
  private formatCommitMessage(suggestion: CommitSuggestion): string {
    let message = suggestion.type;

    if (suggestion.scope) {
      message += `(${suggestion.scope})`;
    }

    if (suggestion.breaking) {
      message += '!';
    }

    message += `: ${suggestion.description}`;

    if (suggestion.body) {
      message += `\n\n${suggestion.body}`;
    }

    if (suggestion.breaking) {
      message += `\n\nBREAKING CHANGE: ${suggestion.breaking}`;
    }

    return message;
  }

  /**
   * Generate pull request description
   */
  async generatePRDescription(targetBranch: string = 'main'): Promise<string> {
    const spinner = createSpinner('Generating PR description...');
    spinner.start();

    try {
      // Get commits since target branch
      const { stdout: commitsOut } = await execAsync(
        `git log ${targetBranch}..HEAD --oneline --format="%s"`,
        { cwd: this.workingDir }
      );

      // Get file changes
      const { stdout: filesOut } = await execAsync(
        `git diff ${targetBranch}..HEAD --name-only`,
        { cwd: this.workingDir }
      );

      // Get detailed diff stats
      const { stdout: statsOut } = await execAsync(
        `git diff ${targetBranch}..HEAD --stat`,
        { cwd: this.workingDir }
      );

      const commits = commitsOut.trim().split('\n').filter(c => c.length > 0);
      const files = filesOut.trim().split('\n').filter(f => f.length > 0);

      const aiClient = await getEnhancedClient();

      const prompt = `Generate a comprehensive pull request description based on the following information:

Commits in this PR:
${commits.map(c => `- ${c}`).join('\n')}

Files changed:
${files.join('\n')}

Change statistics:
${statsOut}

Please create a PR description with:
1. Clear summary of what this PR does
2. Key changes and improvements
3. Testing notes
4. Any breaking changes or migration notes
5. Checklist for reviewers

Use professional, clear language suitable for code review.`;

      const response = await aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.TEST_GEN_TEMPERATURE
      });

      spinner.succeed('PR description generated');
      return response.content;
    } catch (error) {
      spinner.fail('Failed to generate PR description');
      throw error;
    }
  }

  /**
   * Analyze conflicts and suggest resolutions
   */
  async analyzeConflicts(): Promise<string[]> {
    const spinner = createSpinner('Analyzing merge conflicts...');
    spinner.start();

    try {
      const status = await this.getStatus();

      if (status.conflicted.length === 0) {
        spinner.succeed('No conflicts found');
        return [];
      }

      const suggestions: string[] = [];

      for (const file of status.conflicted) {
        try {
          const content = await fs.readFile(path.join(this.workingDir, file), 'utf-8');

          // Extract conflict markers
          const conflicts = this.extractConflictSections(content);

          if (conflicts.length > 0) {
            const aiClient = await getEnhancedClient();

            const prompt = `Analyze this merge conflict and suggest a resolution:

File: ${file}

Conflicts:
${conflicts.map((c, i) => `
Conflict ${i + 1}:
<<<<<<< HEAD
${c.current}
=======
${c.incoming}
>>>>>>> branch
`).join('\n')}

Provide specific suggestions for resolving each conflict.`;

            const response = await aiClient.complete(prompt, {
              temperature: AI_CONSTANTS.GIT_MESSAGE_TEMPERATURE
            });

            suggestions.push(`${file}:\n${response.content}`);
          }
        } catch (error) {
          logger.error(`Failed to analyze conflicts in ${file}:`, error);
        }
      }

      spinner.succeed('Conflict analysis complete');
      return suggestions;
    } catch (error) {
      spinner.fail('Failed to analyze conflicts');
      throw error;
    }
  }

  /**
   * Extract conflict sections from file content
   */
  private extractConflictSections(content: string): Array<{ current: string; incoming: string }> {
    const conflicts: Array<{ current: string; incoming: string }> = [];
    const lines = content.split('\n');

    let inConflict = false;
    let currentSection = '';
    let incomingSection = '';
    let inIncoming = false;

    for (const line of lines) {
      if (line.startsWith('<<<<<<<')) {
        inConflict = true;
        currentSection = '';
        incomingSection = '';
        inIncoming = false;
      } else if (line === '=======') {
        inIncoming = true;
      } else if (line.startsWith('>>>>>>>')) {
        if (inConflict) {
          conflicts.push({
            current: currentSection.trim(),
            incoming: incomingSection.trim()
          });
        }
        inConflict = false;
      } else if (inConflict) {
        if (inIncoming) {
          incomingSection += line + '\n';
        } else {
          currentSection += line + '\n';
        }
      }
    }

    return conflicts;
  }
}

/**
 * Default git manager instance
 */
export const gitManager = new GitManager();