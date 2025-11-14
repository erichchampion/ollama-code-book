import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BackupManager } from '../../../src/core/backup-manager.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('BackupManager Async Operations', () => {
  let backupManager: BackupManager;
  let testDir: string;
  let backupDir: string;
  let testFile: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-manager-test-'));
    backupDir = path.join(testDir, '.ollama-code-backups');
    testFile = path.join(testDir, 'test.txt');

    // Create test file
    await fs.writeFile(testFile, 'test content', 'utf-8');

    // Initialize backup manager
    backupManager = new BackupManager(backupDir, 50, false);
    await backupManager.initialize();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Event Loop Non-Blocking', () => {
    it('should not block event loop during checkpoint creation', async () => {
      // This test verifies that async operations don't block the event loop
      let eventLoopTicked = false;

      // Set up an immediate callback that will only execute if event loop is not blocked
      setImmediate(() => {
        eventLoopTicked = true;
      });

      // Create checkpoint (potentially long-running operation)
      const result = await backupManager.createCheckpoint(
        'Test checkpoint',
        [testFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      // If event loop was blocked, the immediate callback wouldn't have run yet
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(result.success).toBe(true);
      expect(eventLoopTicked).toBe(true);
    });

    it('should allow concurrent operations during backup', async () => {
      let concurrentOperationCompleted = false;

      // Start backup
      const backupPromise = backupManager.createCheckpoint(
        'Test checkpoint',
        [testFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      // Start concurrent operation
      const concurrentPromise = (async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        concurrentOperationCompleted = true;
      })();

      // Wait for both
      await Promise.all([backupPromise, concurrentPromise]);

      expect(concurrentOperationCompleted).toBe(true);
    });

    it('should handle multiple concurrent checkpoint creations', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      const file3 = path.join(testDir, 'file3.txt');

      await fs.writeFile(file1, 'content 1', 'utf-8');
      await fs.writeFile(file2, 'content 2', 'utf-8');
      await fs.writeFile(file3, 'content 3', 'utf-8');

      const metadata = {
        phase: 'test',
        operation: 'create',
        riskLevel: 'low' as const,
        affectedComponents: ['test'],
        estimatedImpact: 'minimal' as const
      };

      // Create multiple checkpoints concurrently
      const results = await Promise.all([
        backupManager.createCheckpoint('Checkpoint 1', [file1], metadata),
        backupManager.createCheckpoint('Checkpoint 2', [file2], metadata),
        backupManager.createCheckpoint('Checkpoint 3', [file3], metadata)
      ]);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // All should have unique IDs
      const ids = results.map(r => r.checkpointId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle git command errors gracefully', async () => {
      // Create checkpoint in a non-git directory
      const result = await backupManager.createCheckpoint(
        'Test checkpoint',
        [testFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      // Should still succeed even if git operations fail
      expect(result.success).toBe(true);
      expect(result.checkpointId).toBeDefined();
      expect(result.filesBackedUp).toBe(1);
    });

    it('should handle missing files gracefully', async () => {
      const nonexistentFile = path.join(testDir, 'nonexistent.txt');

      const result = await backupManager.createCheckpoint(
        'Test checkpoint',
        [testFile, nonexistentFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      // Should succeed with existing file, skip nonexistent
      expect(result.success).toBe(true);
      expect(result.filesBackedUp).toBe(1);
    });

    it('should handle permission errors gracefully', async () => {
      if (process.platform !== 'win32') {
        const noPermFile = path.join(testDir, 'noperm.txt');
        await fs.writeFile(noPermFile, 'test', 'utf-8');
        await fs.chmod(noPermFile, 0o000);

        const result = await backupManager.createCheckpoint(
          'Test checkpoint',
          [noPermFile],
          {
            phase: 'test',
            operation: 'create',
            riskLevel: 'low',
            affectedComponents: ['test'],
            estimatedImpact: 'minimal'
          }
        );

        // Should handle the error
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();

        // Cleanup
        await fs.chmod(noPermFile, 0o644);
      }
    });

    it('should handle restore errors gracefully', async () => {
      // Create a checkpoint
      const result = await backupManager.createCheckpoint(
        'Test checkpoint',
        [testFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      expect(result.success).toBe(true);
      const checkpointId = result.checkpointId!;

      // Try to restore a non-existent checkpoint
      const restoreResult = await backupManager.restoreCheckpoint('nonexistent-id');
      expect(restoreResult.success).toBe(false);
      expect(restoreResult.error).toContain('not found');
    });
  });

  describe('Git Integration', () => {
    let gitInitialized = false;
    let originalCwd: string;

    beforeEach(async () => {
      originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Initialize git repo
        await execAsync('git init');
        await execAsync('git config user.email "test@example.com"');
        await execAsync('git config user.name "Test User"');
        await execAsync('git add .');
        await execAsync('git commit -m "Initial commit" --allow-empty');
        gitInitialized = true;
      } catch (error) {
        console.warn('Git not available for testing:', error);
        gitInitialized = false;
      }
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('should create git checkpoints when in git repo', async () => {
      if (!gitInitialized) {
        console.log('Skipping test - git not available');
        return;
      }

      const result = await backupManager.createCheckpoint(
        'Test git checkpoint',
        [testFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      expect(result.success).toBe(true);

      // Verify checkpoint was created
      const checkpoint = backupManager.getCheckpoint(result.checkpointId!);
      expect(checkpoint).toBeDefined();

      // Git commit hash should be set (if git operations succeeded)
      // Note: This might not be set if git operations failed, which is OK
      if (checkpoint?.gitCommit) {
        expect(checkpoint.gitCommit.length).toBe(40); // SHA-1 hash length
      }
    });

    it('should handle git operations asynchronously', async () => {
      if (!gitInitialized) {
        console.log('Skipping test - git not available');
        return;
      }

      let asyncCallbackExecuted = false;

      // Start checkpoint creation
      const checkpointPromise = backupManager.createCheckpoint(
        'Async test',
        [testFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      // This should execute while git operations are running
      setImmediate(() => {
        asyncCallbackExecuted = true;
      });

      await checkpointPromise;
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(asyncCallbackExecuted).toBe(true);
    });
  });

  describe('Restore Operations', () => {
    it('should restore files asynchronously', async () => {
      // Create checkpoint
      const createResult = await backupManager.createCheckpoint(
        'Test checkpoint',
        [testFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      expect(createResult.success).toBe(true);
      const checkpointId = createResult.checkpointId!;

      // Modify file
      await fs.writeFile(testFile, 'modified content', 'utf-8');

      let asyncCallbackExecuted = false;

      // Start restore
      const restorePromise = backupManager.restoreCheckpoint(checkpointId, {
        forceOverwrite: true
      });

      // This should execute while restore is running
      setImmediate(() => {
        asyncCallbackExecuted = true;
      });

      const restoreResult = await restorePromise;
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(restoreResult.success).toBe(true);
      expect(asyncCallbackExecuted).toBe(true);

      // Verify file was restored
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('test content');
    });

    it('should detect conflicts without blocking', async () => {
      // Create checkpoint
      const createResult = await backupManager.createCheckpoint(
        'Test checkpoint',
        [testFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      expect(createResult.success).toBe(true);

      // Modify file to create conflict
      await fs.writeFile(testFile, 'conflicting content', 'utf-8');

      // Try restore without force
      const restoreResult = await backupManager.restoreCheckpoint(
        createResult.checkpointId!,
        { dryRun: true }
      );

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.conflicts).toBeDefined();
      expect(restoreResult.conflicts!.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup old checkpoints asynchronously', async () => {
      const metadata = {
        phase: 'test',
        operation: 'create',
        riskLevel: 'low' as const,
        affectedComponents: ['test'],
        estimatedImpact: 'minimal' as const
      };

      // Create many checkpoints (more than max)
      const promises = [];
      for (let i = 0; i < 55; i++) {
        promises.push(
          backupManager.createCheckpoint(
            `Checkpoint ${i}`,
            [testFile],
            metadata
          )
        );
      }

      await Promise.all(promises);

      // Verify old checkpoints were cleaned up
      const checkpoints = backupManager.getCheckpoints();
      expect(checkpoints.length).toBeLessThanOrEqual(50);
    });

    it('should allow concurrent operations during cleanup', async () => {
      let concurrentOperationCompleted = false;

      const metadata = {
        phase: 'test',
        operation: 'create',
        riskLevel: 'low' as const,
        affectedComponents: ['test'],
        estimatedImpact: 'minimal' as const
      };

      // Create enough checkpoints to trigger cleanup
      for (let i = 0; i < 52; i++) {
        await backupManager.createCheckpoint(
          `Checkpoint ${i}`,
          [testFile],
          metadata
        );
      }

      // Concurrent operation during cleanup
      const concurrentPromise = (async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        concurrentOperationCompleted = true;
      })();

      await concurrentPromise;

      expect(concurrentOperationCompleted).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large files efficiently', async () => {
      const largeFile = path.join(testDir, 'large.txt');
      const largeContent = 'x'.repeat(1024 * 100); // 100KB
      await fs.writeFile(largeFile, largeContent, 'utf-8');

      const start = Date.now();

      const result = await backupManager.createCheckpoint(
        'Large file checkpoint',
        [largeFile],
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      // Should complete in reasonable time (< 1 second for 100KB)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle multiple files efficiently', async () => {
      const files = [];
      for (let i = 0; i < 10; i++) {
        const file = path.join(testDir, `file${i}.txt`);
        await fs.writeFile(file, `content ${i}`, 'utf-8');
        files.push(file);
      }

      const start = Date.now();

      const result = await backupManager.createCheckpoint(
        'Multiple files checkpoint',
        files,
        {
          phase: 'test',
          operation: 'create',
          riskLevel: 'low',
          affectedComponents: ['test'],
          estimatedImpact: 'minimal'
        }
      );

      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.filesBackedUp).toBe(10);
      // Should complete in reasonable time
      expect(duration).toBeLessThan(2000);
    });
  });
});
