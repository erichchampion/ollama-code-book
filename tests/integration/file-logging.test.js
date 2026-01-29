/**
 * Integration Tests for File-Based Logging
 * Tests the complete file logging behavior through the CLI
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('File-Based Logging Integration', () => {
  const testLogDir = path.join(__dirname, '..', 'fixtures', 'logs');
  const testLogFile = path.join(testLogDir, 'integration-test.log');
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'src', 'cli.js');

  beforeAll(() => {
    // Ensure log directory exists
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clean up log file before each test
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  afterEach(() => {
    // Clean up log file after each test
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  describe('Basic file logging', () => {
    it('should create log file when LOG_FILE is set', () => {
      try {
        execSync(`LOG_FILE=${testLogFile} LOG_LEVEL=0 node ${cliPath} help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        // Command may fail but log file should still be created
      }

      expect(fs.existsSync(testLogFile)).toBe(true);
    });

    it('should write DEBUG/INFO logs to file when LOG_LEVEL=0', () => {
      try {
        execSync(`LOG_FILE=${testLogFile} LOG_LEVEL=0 node ${cliPath} help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        // Ignore errors
      }

      const contents = fs.readFileSync(testLogFile, 'utf-8');

      // Should contain initialization message
      expect(contents).toContain('Logger initialized');

      // Should contain log messages (at least some DEBUG or INFO)
      const hasDebugOrInfo = contents.includes('DEBUG:') || contents.includes('INFO:');
      expect(hasDebugOrInfo).toBe(true);
    });

    it('should not contain ANSI color codes in log file', () => {
      try {
        execSync(`LOG_FILE=${testLogFile} LOG_LEVEL=0 node ${cliPath} help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        // Ignore errors
      }

      const contents = fs.readFileSync(testLogFile, 'utf-8');

      // Check for common ANSI escape sequences
      expect(contents).not.toContain('\x1b[36m'); // Cyan
      expect(contents).not.toContain('\x1b[32m'); // Green
      expect(contents).not.toContain('\x1b[33m'); // Yellow
      expect(contents).not.toContain('\x1b[31m'); // Red
      expect(contents).not.toContain('\x1b[0m');  // Reset
    });

    it('should contain timestamps in log entries', () => {
      try {
        execSync(`LOG_FILE=${testLogFile} LOG_LEVEL=0 node ${cliPath} help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        // Ignore errors
      }

      const contents = fs.readFileSync(testLogFile, 'utf-8');

      // Should have ISO timestamp format
      const timestampRegex = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
      expect(timestampRegex.test(contents)).toBe(true);
    });
  });

  describe('Console output behavior', () => {
    it('should keep console clean (no DEBUG/INFO/WARN) when file logging is enabled', () => {
      let consoleOutput;
      try {
        consoleOutput = execSync(`LOG_FILE=${testLogFile} LOG_LEVEL=0 node ${cliPath} help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        consoleOutput = error.stdout || '';
      }

      // Console should NOT contain DEBUG/INFO/WARN (they go to file)
      expect(consoleOutput).not.toContain('[36mDEBUG'); // Colored DEBUG
      expect(consoleOutput).not.toContain('[32mINFO');  // Colored INFO
      expect(consoleOutput).not.toContain('[33mWARN');  // Colored WARN

      // But it should show the help text
      expect(consoleOutput).toContain('Ollama Code CLI');
    });

    it('should show ERROR messages in console even with file logging', () => {
      let consoleOutput;
      let exitCode = 0;

      try {
        consoleOutput = execSync(`LOG_FILE=${testLogFile} LOG_LEVEL=0 node ${cliPath} invalid-command-xyz`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        consoleOutput = error.stderr || error.stdout || '';
        exitCode = error.status;
      }

      // Should have non-zero exit code
      expect(exitCode).not.toBe(0);

      // Console should contain ERROR message
      expect(consoleOutput).toContain('ERROR');
      expect(consoleOutput.toLowerCase()).toContain('unknown command');
    });
  });

  describe('Directory creation', () => {
    it('should create parent directories for log file path', () => {
      const deepPath = path.join(testLogDir, 'deep', 'nested', 'test.log');

      try {
        execSync(`LOG_FILE=${deepPath} LOG_LEVEL=0 node ${cliPath} help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        // Ignore errors
      }

      expect(fs.existsSync(deepPath)).toBe(true);

      // Clean up
      fs.unlinkSync(deepPath);
      fs.rmdirSync(path.dirname(deepPath));
      fs.rmdirSync(path.dirname(path.dirname(deepPath)));
    });
  });

  describe('Fallback behavior', () => {
    it('should work normally when LOG_FILE is not set', () => {
      let consoleOutput;
      try {
        consoleOutput = execSync(`LOG_LEVEL=0 node ${cliPath} help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        consoleOutput = error.stdout || '';
      }

      // Should show help text
      expect(consoleOutput).toContain('Ollama Code CLI');

      // Log file should NOT be created
      expect(fs.existsSync(testLogFile)).toBe(false);
    });

    it('should handle invalid LOG_FILE path gracefully', () => {
      let consoleOutput;
      let exitCode;

      try {
        // Merge stderr into stdout (2>&1) so we capture the logger's console.warn about file logging failure
        consoleOutput = execSync(`LOG_FILE=/root/no-permission.log LOG_LEVEL=0 node ${cliPath} help 2>&1`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
        exitCode = 0;
      } catch (error) {
        consoleOutput = (error.stdout || '') + (error.stderr || '');
        exitCode = error.status || 0;
      }

      // Should still show help (fallback to console)
      expect(consoleOutput).toContain('Ollama Code CLI');

      // Should show warning about file logging failure (logger uses console.warn -> stderr)
      expect(consoleOutput.toLowerCase()).toContain('could not initialize file logging');
    });
  });

  describe('Log appending', () => {
    it('should append to existing log file', () => {
      // Write initial log entry
      try {
        execSync(`LOG_FILE=${testLogFile} LOG_LEVEL=0 node ${cliPath} help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        // Ignore errors
      }

      const firstContents = fs.readFileSync(testLogFile, 'utf-8');
      const firstSize = firstContents.length;

      // Write second log entry
      try {
        execSync(`LOG_FILE=${testLogFile} LOG_LEVEL=0 node ${cliPath} help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 10000
        });
      } catch (error) {
        // Ignore errors
      }

      const secondContents = fs.readFileSync(testLogFile, 'utf-8');
      const secondSize = secondContents.length;

      // File should have grown (appended)
      expect(secondSize).toBeGreaterThan(firstSize);

      // Should contain multiple initialization markers
      const initCount = (secondContents.match(/Logger initialized/g) || []).length;
      expect(initCount).toBeGreaterThanOrEqual(2);
    });
  });
});
