/**
 * Git Hooks Test Helper
 * Utilities for testing Git hooks management and VCS intelligence
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  GIT_HOOKS_TEST_CONSTANTS,
  GIT_HOOKS_FILE_PERMISSIONS,
  COMMIT_MESSAGE_TEST_CONSTANTS,
  PR_REVIEW_TEST_CONSTANTS,
} from './test-constants';
import type { GitHooksConfig } from './gitHooksManagerWrapper';
import type { CommitMessageConfig, GeneratedCommitMessage } from './commitMessageGeneratorWrapper';
import type { PRReviewConfig } from './prReviewAutomationWrapper';

const execAsync = promisify(exec);

export interface GitTestRepo {
  path: string;
  cleanup: () => Promise<void>;
}

export interface GitCommitOptions {
  message?: string;
  allowEmpty?: boolean;
  noVerify?: boolean;
}

/**
 * Create a temporary Git repository for testing
 */
export async function createTestGitRepo(name: string = 'test-repo'): Promise<GitTestRepo> {
  const repoPath = path.join(__dirname, '../../../', GIT_HOOKS_TEST_CONSTANTS.TEST_REPOS_DIR, name);

  // Clean up if exists
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
  } catch {
    // Ignore if doesn't exist
  }

  // Create directory
  await fs.mkdir(repoPath, { recursive: true });

  // Initialize git repo
  await execAsync('git init', { cwd: repoPath });
  await execAsync(`git config user.email "${GIT_HOOKS_TEST_CONSTANTS.TEST_GIT_EMAIL}"`, { cwd: repoPath });
  await execAsync(`git config user.name "${GIT_HOOKS_TEST_CONSTANTS.TEST_GIT_NAME}"`, { cwd: repoPath });

  // Create initial commit
  await fs.writeFile(path.join(repoPath, 'README.md'), '# Test Repository');
  await execAsync('git add README.md', { cwd: repoPath });
  await execAsync('git commit -m "Initial commit"', { cwd: repoPath });

  return {
    path: repoPath,
    cleanup: async () => {
      await fs.rm(repoPath, { recursive: true, force: true });
    },
  };
}

/**
 * Check if a Git hook exists
 */
export async function hookExists(repoPath: string, hookName: string): Promise<boolean> {
  const hookPath = path.join(repoPath, '.git', 'hooks', hookName);
  try {
    await fs.access(hookPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read Git hook content
 */
export async function readHookContent(repoPath: string, hookName: string): Promise<string> {
  const hookPath = path.join(repoPath, '.git', 'hooks', hookName);
  return await fs.readFile(hookPath, 'utf8');
}

/**
 * Check if a Git hook is executable
 */
export async function isHookExecutable(repoPath: string, hookName: string): Promise<boolean> {
  const hookPath = path.join(repoPath, '.git', 'hooks', hookName);
  try {
    const stats = await fs.stat(hookPath);
    // Check if file has execute permission (owner, group, or other)
    return (stats.mode & GIT_HOOKS_FILE_PERMISSIONS.EXECUTE_BIT) !== 0;
  } catch {
    return false;
  }
}

/**
 * Create a file in the Git repository
 */
export async function createFile(
  repoPath: string,
  filePath: string,
  content: string
): Promise<void> {
  const fullPath = path.join(repoPath, filePath);
  const dir = path.dirname(fullPath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');
}

/**
 * Stage a file in Git
 */
export async function stageFile(repoPath: string, filePath: string): Promise<void> {
  await execAsync(`git add "${filePath}"`, { cwd: repoPath });
}

/**
 * Get list of staged files
 */
export async function getStagedFiles(repoPath: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync('git diff --cached --name-only', { cwd: repoPath });
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Commit changes
 */
export async function commit(
  repoPath: string,
  options: GitCommitOptions = {}
): Promise<{ success: boolean; output: string; exitCode: number }> {
  const {
    message = 'Test commit',
    allowEmpty = false,
    noVerify = false,
  } = options;

  const args: string[] = ['commit', '-m', `"${message}"`];
  if (allowEmpty) args.push('--allow-empty');
  if (noVerify) args.push('--no-verify');

  try {
    const { stdout, stderr } = await execAsync(`git ${args.join(' ')}`, { cwd: repoPath });
    return {
      success: true,
      output: stdout + stderr,
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout + error.stderr,
      exitCode: error.code || 1,
    };
  }
}

/**
 * Get last commit message
 */
export async function getLastCommitMessage(repoPath: string): Promise<string> {
  const { stdout } = await execAsync('git log -1 --pretty=%B', { cwd: repoPath });
  return stdout.trim();
}

/**
 * Get Git diff for staged files
 */
export async function getStagedDiff(repoPath: string): Promise<string> {
  const { stdout } = await execAsync('git diff --cached', { cwd: repoPath });
  return stdout;
}

/**
 * Check if repository is a Git repository
 */
export async function isGitRepository(repoPath: string): Promise<boolean> {
  try {
    await execAsync('git rev-parse --git-dir', { cwd: repoPath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Backup a hook file
 */
export async function backupHook(repoPath: string, hookName: string): Promise<void> {
  const hookPath = path.join(repoPath, '.git', 'hooks', hookName);
  const backupPath = `${hookPath}${GIT_HOOKS_TEST_CONSTANTS.BACKUP_EXTENSION}`;

  try {
    await fs.copyFile(hookPath, backupPath);
  } catch {
    // Hook doesn't exist, which is fine
  }
}

/**
 * Restore a backed up hook
 */
export async function restoreHook(repoPath: string, hookName: string): Promise<void> {
  const hookPath = path.join(repoPath, '.git', 'hooks', hookName);
  const backupPath = `${hookPath}${GIT_HOOKS_TEST_CONSTANTS.BACKUP_EXTENSION}`;

  try {
    await fs.copyFile(backupPath, hookPath);
    await fs.unlink(backupPath);
  } catch {
    // Backup doesn't exist
  }
}

/**
 * Check if hook backup exists
 */
export async function hookBackupExists(repoPath: string, hookName: string): Promise<boolean> {
  const backupPath = path.join(repoPath, '.git', 'hooks', `${hookName}${GIT_HOOKS_TEST_CONSTANTS.BACKUP_EXTENSION}`);
  try {
    await fs.access(backupPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write a custom hook script
 */
export async function writeCustomHook(
  repoPath: string,
  hookName: string,
  content: string
): Promise<void> {
  const hookPath = path.join(repoPath, '.git', 'hooks', hookName);
  await fs.writeFile(hookPath, content, 'utf8');
  await fs.chmod(hookPath, GIT_HOOKS_FILE_PERMISSIONS.EXECUTABLE);
}

/**
 * Remove a hook
 */
export async function removeHook(repoPath: string, hookName: string): Promise<void> {
  const hookPath = path.join(repoPath, '.git', 'hooks', hookName);
  try {
    await fs.unlink(hookPath);
  } catch {
    // Hook doesn't exist
  }
}

/**
 * Get hook execution time (mock for testing)
 */
export async function measureHookExecutionTime(
  repoPath: string,
  hookName: string,
  action: () => Promise<any>
): Promise<number> {
  const startTime = Date.now();
  await action();
  return Date.now() - startTime;
}

/**
 * Create a file with linting errors
 */
export async function createFileWithLintErrors(repoPath: string, filePath: string): Promise<void> {
  const content = `
// Missing semicolons, var usage, etc.
var x = 1
var y = 2
function test() {
  console.log(x)
  console.log(y)
}
`;
  await createFile(repoPath, filePath, content);
}

/**
 * Create a file with TypeScript errors
 */
export async function createFileWithTypeErrors(repoPath: string, filePath: string): Promise<void> {
  const content = `
// TypeScript errors
function add(a: number, b: number): number {
  return a + b;
}

const result: number = add("1", "2"); // Type error
const missing: string = undefined; // Type error
`;
  await createFile(repoPath, filePath, content);
}

/**
 * Create multiple files with changes
 */
export async function createMultipleFiles(
  repoPath: string,
  count: number = 5
): Promise<string[]> {
  const files: string[] = [];
  for (let i = 0; i < count; i++) {
    const filePath = `file${i}.js`;
    await createFile(repoPath, filePath, `// File ${i}\nconsole.log('Hello ${i}');\n`);
    files.push(filePath);
  }
  return files;
}

/**
 * Simulate rapid reconnection attempts
 */
export async function simulateRapidCommits(
  repoPath: string,
  count: number = 5
): Promise<boolean[]> {
  const results: boolean[] = [];
  for (let i = 0; i < count; i++) {
    await createFile(repoPath, `rapid-${i}.txt`, `Content ${i}`);
    await stageFile(repoPath, `rapid-${i}.txt`);
    const result = await commit(repoPath, { message: `Rapid commit ${i}` });
    results.push(result.success);
  }
  return results;
}

/**
 * Check if hook contains ollama-code marker
 */
export async function isOllamaCodeHook(repoPath: string, hookName: string): Promise<boolean> {
  try {
    const content = await readHookContent(repoPath, hookName);
    return content.includes(GIT_HOOKS_TEST_CONSTANTS.HOOK_MARKER) || content.includes('ollama-code');
  } catch {
    return false;
  }
}

/**
 * Get hook file permissions
 */
export async function getHookPermissions(repoPath: string, hookName: string): Promise<string> {
  const hookPath = path.join(repoPath, '.git', 'hooks', hookName);
  const stats = await fs.stat(hookPath);
  return (stats.mode & parseInt('777', 8)).toString(8);
}

/**
 * Create and stage a file in one operation
 */
export async function createAndStageFile(
  repoPath: string,
  filePath: string,
  content: string
): Promise<void> {
  await createFile(repoPath, filePath, content);
  await stageFile(repoPath, filePath);
}

/**
 * Test wrapper that creates a git repo, runs test function, and cleans up
 */
export async function withGitRepo<T>(
  name: string,
  testFn: (repoPath: string) => Promise<T>
): Promise<T> {
  const repo = await createTestGitRepo(name);
  try {
    return await testFn(repo.path);
  } finally {
    await repo.cleanup();
  }
}

/**
 * Create a Git Hooks configuration with sensible defaults
 * Reduces code duplication by providing a base config that can be overridden
 */
export function createGitHooksConfig(
  repoPath: string,
  overrides: Partial<GitHooksConfig> = {}
): GitHooksConfig {
  return {
    repositoryPath: repoPath,
    enablePreCommit: false,
    enableCommitMsg: false,
    enablePrePush: false,
    enablePostMerge: false,
    enableQualityGates: false,
    bypassEnabled: false,
    analysisTimeout: GIT_HOOKS_TEST_CONSTANTS.DEFAULT_ANALYSIS_TIMEOUT,
    failOnAnalysisError: false,
    backupExistingHooks: false,
    ...overrides,
  };
}

/**
 * Create a Commit Message configuration with sensible defaults
 * Reduces code duplication by providing a base config that can be overridden
 */
export function createCommitMessageConfig(
  repositoryPath: string,
  overrides: Partial<CommitMessageConfig> = {}
): CommitMessageConfig {
  return {
    repositoryPath,
    style: 'conventional',
    maxLength: COMMIT_MESSAGE_TEST_CONSTANTS.DEFAULT_MAX_LENGTH,
    includeScope: false,
    includeBody: false,
    includeFooter: false,
    ...overrides,
  };
}

/**
 * Assert that a generated commit message is valid
 */
export function assertValidCommitMessage(
  result: GeneratedCommitMessage,
  config: CommitMessageConfig
): void {
  const assert = require('assert');

  assert.ok(result.message, 'Should generate message');
  assert.ok(result.message.length > 0, 'Message should not be empty');

  if (config.maxLength) {
    const firstLine = result.message.split('\n')[0];
    assert.ok(firstLine.length <= config.maxLength,
      `First line should be <= ${config.maxLength} chars, got ${firstLine.length}`);
  }

  assert.ok(result.confidence >= 0 && result.confidence <= 1,
    'Confidence should be between 0 and 1');
}

/**
 * Assert that a message matches conventional commit format
 */
export function assertConventionalFormat(message: string): void {
  const assert = require('assert');
  const pattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|wip)(\([a-z-]+\))?: .+/;
  assert.ok(pattern.test(message), 'Should match conventional commit format');
}

/**
 * Assert that a message starts with an emoji
 */
export function assertEmojiFormat(message: string): void {
  const assert = require('assert');
  const emojiPattern = /^[\u{1F300}-\u{1F9FF}]/u;
  assert.ok(emojiPattern.test(message), 'Should start with emoji');
  assert.ok(message.length > 2, 'Should have text after emoji');
}

/**
 * Create a PR Review configuration with sensible defaults
 * Reduces code duplication by providing a base config that can be overridden
 *
 * @param platform - The platform type (github, gitlab, or bitbucket)
 * @param overrides - Partial config to override defaults
 * @returns Complete PRReviewConfig object
 */
export function createPRReviewConfig(
  platform: 'github' | 'gitlab' | 'bitbucket',
  overrides: Partial<PRReviewConfig> = {}
): PRReviewConfig {
  const repoUrls = {
    github: PR_REVIEW_TEST_CONSTANTS.DEFAULT_GITHUB_REPO,
    gitlab: PR_REVIEW_TEST_CONSTANTS.DEFAULT_GITLAB_REPO,
    bitbucket: PR_REVIEW_TEST_CONSTANTS.DEFAULT_BITBUCKET_REPO,
  };

  return {
    platform,
    repositoryUrl: repoUrls[platform],
    apiToken: PR_REVIEW_TEST_CONSTANTS.DEFAULT_API_TOKEN,
    autoApprove: false,
    blockOnCritical: true,
    ...overrides,
  };
}
