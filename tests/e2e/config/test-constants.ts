/**
 * E2E Test Constants
 * Centralized configuration values for E2E testing
 */

import * as path from 'path';

/**
 * Test timeout values in milliseconds
 */
export const TEST_TIMEOUTS = {
  /** Default timeout for CLI command execution */
  DEFAULT_COMMAND_TIMEOUT: 30000,
  /** Default timeout for waiting on conditions */
  DEFAULT_WAIT_TIMEOUT: 10000,
  /** Default interval for polling conditions */
  DEFAULT_WAIT_INTERVAL: 100,
  /** Extended timeout for analysis commands */
  ANALYSIS_TIMEOUT: 60000,
} as const;

/**
 * Test file paths
 */
export const TEST_PATHS = {
  /** CLI entry point for command execution */
  CLI_ENTRY_POINT: path.resolve(process.cwd(), 'dist/src/cli-selector.js'),
  /** Root directory for test fixtures */
  FIXTURES_DIR: path.resolve(process.cwd(), 'tests/fixtures'),
  /** Directory for projects used as test fixtures */
  FIXTURES_PROJECTS_DIR: path.resolve(process.cwd(), 'tests/fixtures/projects'),
  /** Directory for test results and artifacts */
  TEST_RESULTS_DIR: path.resolve(process.cwd(), 'test-results'),
} as const;

/**
 * Test fixture names
 */
export const TEST_FIXTURES = {
  /** Small JavaScript project for basic testing */
  SMALL_PROJECT: 'small',
  /** Vulnerable code samples for security testing */
  VULNERABLE_CODE: 'vulnerable',
} as const;
