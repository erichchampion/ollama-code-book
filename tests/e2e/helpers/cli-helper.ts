/**
 * CLI Helper utilities for E2E testing
 * Provides functions to execute CLI commands and parse output
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { TEST_TIMEOUTS, TEST_PATHS } from '../config/test-constants.js';
import { waitFor } from '../../shared/test-utils.js';
import { fileExists, readFile, writeFile } from '../../shared/file-utils.js';
import { createTempDir, cleanupTempDir } from '../../shared/file-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

export interface CLIResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

/**
 * Execute a CLI command and return the result
 */
export async function executeCommand(
  command: string,
  options: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv } = {}
): Promise<CLIResult> {
  const startTime = Date.now();
  const cwd = options.cwd || process.cwd();
  const timeout = options.timeout || TEST_TIMEOUTS.DEFAULT_COMMAND_TIMEOUT;
  const env = { ...process.env, ...options.env };

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      env,
    });

    return {
      exitCode: 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      exitCode: error.code || 1,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute ollama-code CLI command
 */
export async function executeOllamaCode(
  args: string,
  options: { cwd?: string; timeout?: number } = {}
): Promise<CLIResult> {
  const command = `node ${TEST_PATHS.CLI_ENTRY_POINT} ${args}`;
  return executeCommand(command, options);
}

/**
 * Create a temporary test directory
 */
export async function createTestDirectory(prefix: string = 'test-'): Promise<string> {
  return createTempDir(prefix, TEST_PATHS.TEST_RESULTS_DIR);
}

/**
 * Cleanup test directory
 */
export async function cleanupTestDirectory(dirPath: string): Promise<void> {
  await cleanupTempDir(dirPath);
}

/**
 * Copy fixture project to test directory
 */
export async function copyFixture(
  fixtureName: string,
  targetDir: string
): Promise<void> {
  const fixturePath = path.join(TEST_PATHS.FIXTURES_PROJECTS_DIR, fixtureName);

  // Validate fixture exists
  if (!(await fileExists(fixturePath))) {
    throw new Error(`Fixture not found: ${fixtureName} at ${fixturePath}`);
  }

  try {
    const { copy } = await import('../../shared/file-utils.js');
    await copy(fixturePath, targetDir);
  } catch (error) {
    throw new Error(`Failed to copy fixture ${fixtureName}: ${error}`);
  }
}

/**
 * Wait for a condition to be true (re-exported from shared utils)
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout || TEST_TIMEOUTS.DEFAULT_WAIT_TIMEOUT;
  const interval = options.interval || TEST_TIMEOUTS.DEFAULT_WAIT_INTERVAL;
  await waitFor(condition, timeout, interval);
}

/**
 * Parse JSON output from CLI
 */
export function parseJSONOutput(stdout: string): any {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Failed to parse JSON output: ${stdout}`);
  }
}

// Re-export file utilities from shared module
export { fileExists, readFile, writeFile } from '../../shared/file-utils.js';
