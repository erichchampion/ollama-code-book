/**
 * Basic Integration Tests for File-Based Logging
 * Tests the logger's file output functionality with simple assertions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { Logger, LogLevel } from '../../../src/utils/logger.js';

describe('File-Based Logging', () => {
  const testLogDir = path.join(process.cwd(), 'tests', 'fixtures', 'logs');
  const testLogFile = path.join(testLogDir, 'test.log');
  let logger: Logger;

  beforeEach(() => {
    // Ensure test log directory exists
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }

    // Create a fresh logger instance for each test
    logger = new Logger();

    // Clean up any existing test log files
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  afterEach(() => {
    // Clean up logger
    if (logger) {
      try {
        logger.close();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }

    // Clean up test log files
    if (fs.existsSync(testLogFile)) {
      try {
        fs.unlinkSync(testLogFile);
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('File creation and writing', () => {
    it('should create log file when logFile is configured', (done) => {
      logger.configure({
        logFile: testLogFile,
        enableFileLogging: true,
        level: LogLevel.DEBUG
      });

      logger.info('Test message');

      // Wait a bit for async file operations
      setTimeout(() => {
        logger.close();
        expect(fs.existsSync(testLogFile)).toBe(true);
        done();
      }, 100);
    });

    it('should write log messages to file', (done) => {
      logger.configure({
        logFile: testLogFile,
        enableFileLogging: true,
        level: LogLevel.DEBUG
      });

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');

      setTimeout(() => {
        logger.close();
        const contents = fs.readFileSync(testLogFile, 'utf-8');
        expect(contents).toContain('DEBUG: Debug message');
        expect(contents).toContain('INFO: Info message');
        expect(contents).toContain('WARN: Warn message');
        done();
      }, 100);
    });

    it('should create parent directories if they do not exist', (done) => {
      const deepPath = path.join(testLogDir, 'deep', 'nested', 'path', 'test.log');

      logger.configure({
        logFile: deepPath,
        enableFileLogging: true,
        level: LogLevel.INFO
      });

      logger.info('Test message');

      setTimeout(() => {
        logger.close();
        expect(fs.existsSync(deepPath)).toBe(true);

        // Clean up
        try {
          fs.unlinkSync(deepPath);
          fs.rmdirSync(path.dirname(deepPath));
          fs.rmdirSync(path.dirname(path.dirname(deepPath)));
          fs.rmdirSync(path.dirname(path.dirname(path.dirname(deepPath))));
        } catch (e) {
          // Ignore cleanup errors
        }
        done();
      }, 100);
    });
  });

  describe('ANSI code stripping', () => {
    it('should strip ANSI color codes from file output', (done) => {
      logger.configure({
        logFile: testLogFile,
        enableFileLogging: true,
        level: LogLevel.DEBUG,
        colors: true // Enable colors (should be stripped from file)
      });

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      setTimeout(() => {
        logger.close();
        const contents = fs.readFileSync(testLogFile, 'utf-8');

        // Check that color codes are NOT in the file
        expect(contents).not.toContain('\x1b[36m'); // Cyan (DEBUG)
        expect(contents).not.toContain('\x1b[32m'); // Green (INFO)
        expect(contents).not.toContain('\x1b[33m'); // Yellow (WARN)
        expect(contents).not.toContain('\x1b[31m'); // Red (ERROR)
        expect(contents).not.toContain('\x1b[0m');  // Reset

        // But messages should still be there
        expect(contents).toContain('DEBUG: Debug message');
        expect(contents).toContain('INFO: Info message');
        expect(contents).toContain('WARN: Warn message');
        expect(contents).toContain('ERROR: Error message');
        done();
      }, 100);
    });
  });

  describe('Cleanup', () => {
    it('should close file stream when close() is called', (done) => {
      logger.configure({
        logFile: testLogFile,
        enableFileLogging: true,
        level: LogLevel.INFO
      });

      logger.info('Test message');

      setTimeout(() => {
        logger.close();

        // After close, file should exist but stream should be closed
        expect(fs.existsSync(testLogFile)).toBe(true);

        // Writing after close should not crash
        logger.info('This should not be written');

        const contents = fs.readFileSync(testLogFile, 'utf-8');
        expect(contents).toContain('Test message');
        expect(contents).not.toContain('This should not be written');
        done();
      }, 100);
    });
  });

  describe('Timestamps in file logs', () => {
    it('should include timestamps in file logs', (done) => {
      logger.configure({
        logFile: testLogFile,
        enableFileLogging: true,
        level: LogLevel.INFO,
        timestamps: true
      });

      logger.info('Test message');

      setTimeout(() => {
        logger.close();
        const contents = fs.readFileSync(testLogFile, 'utf-8');

        // Should contain ISO timestamp format
        expect(contents).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
        expect(contents).toContain('INFO: Test message');
        done();
      }, 100);
    });
  });

  describe('Log file appending', () => {
    it('should append to existing log file', (done) => {
      logger.configure({
        logFile: testLogFile,
        enableFileLogging: true,
        level: LogLevel.INFO
      });

      logger.info('First message');

      setTimeout(() => {
        logger.close();

        // Create new logger with same file
        const logger2 = new Logger();
        logger2.configure({
          logFile: testLogFile,
          enableFileLogging: true,
          level: LogLevel.INFO
        });

        logger2.info('Second message');

        setTimeout(() => {
          logger2.close();

          const contents = fs.readFileSync(testLogFile, 'utf-8');
          expect(contents).toContain('First message');
          expect(contents).toContain('Second message');

          // Should have two initialization markers
          const initCount = (contents.match(/Logger initialized/g) || []).length;
          expect(initCount).toBeGreaterThanOrEqual(2);
          done();
        }, 100);
      }, 100);
    });
  });
});
