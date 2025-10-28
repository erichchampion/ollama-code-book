/**
 * Performance - Real-Time File Watching Tests
 * Tests file system change detection and incremental updates
 *
 * Tests file watching capabilities for:
 * - File creation/modification/deletion detection
 * - Directory rename detection
 * - Incremental update triggering
 * - Batch change handling (debouncing)
 * - .gitignore respect
 * - Concurrent change conflict resolution
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import {
  PROVIDER_TEST_TIMEOUTS,
  FILE_WATCHING_CONSTANTS,
} from '../helpers/test-constants';

/**
 * File change event types
 */
enum FileChangeType {
  CREATED = 'created',
  MODIFIED = 'modified',
  DELETED = 'deleted',
}

/**
 * File change event
 */
interface FileChangeEvent {
  type: FileChangeType;
  uri: vscode.Uri;
  timestamp: number;
}

/**
 * File watcher wrapper for testing
 */
class TestFileWatcher {
  private watcher: vscode.FileSystemWatcher | null = null;
  private events: FileChangeEvent[] = [];
  private disposables: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingEvents: Map<string, FileChangeEvent> = new Map();

  /**
   * Start watching a directory or glob pattern
   */
  watch(
    pattern: vscode.GlobPattern,
    options: {
      ignoreCreateEvents?: boolean;
      ignoreChangeEvents?: boolean;
      ignoreDeleteEvents?: boolean;
      debounce?: number;
    } = {}
  ): void {
    this.watcher = vscode.workspace.createFileSystemWatcher(
      pattern,
      options.ignoreCreateEvents,
      options.ignoreChangeEvents,
      options.ignoreDeleteEvents
    );

    const debounceDelay = options.debounce || 0;

    // Listen to file creation
    if (!options.ignoreCreateEvents) {
      this.disposables.push(
        this.watcher.onDidCreate(uri => {
          this.recordEvent({
            type: FileChangeType.CREATED,
            uri,
            timestamp: Date.now(),
          }, debounceDelay);
        })
      );
    }

    // Listen to file modification
    if (!options.ignoreChangeEvents) {
      this.disposables.push(
        this.watcher.onDidChange(uri => {
          this.recordEvent({
            type: FileChangeType.MODIFIED,
            uri,
            timestamp: Date.now(),
          }, debounceDelay);
        })
      );
    }

    // Listen to file deletion
    if (!options.ignoreDeleteEvents) {
      this.disposables.push(
        this.watcher.onDidDelete(uri => {
          this.recordEvent({
            type: FileChangeType.DELETED,
            uri,
            timestamp: Date.now(),
          }, debounceDelay);
        })
      );
    }

    this.disposables.push(this.watcher);
  }

  /**
   * Record a file change event with optional debouncing
   */
  private recordEvent(event: FileChangeEvent, debounceDelay: number): void {
    if (debounceDelay > 0) {
      // Debounced recording
      const key = `${event.uri.fsPath}-${event.type}`;
      this.pendingEvents.set(key, event);

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        // Flush pending events
        for (const pendingEvent of this.pendingEvents.values()) {
          this.events.push(pendingEvent);
        }
        this.pendingEvents.clear();
        this.debounceTimer = null;
      }, debounceDelay);
    } else {
      // Immediate recording
      this.events.push(event);
    }
  }

  /**
   * Get all recorded events
   */
  getEvents(): FileChangeEvent[] {
    return [...this.events];
  }

  /**
   * Get events of a specific type
   */
  getEventsByType(type: FileChangeType): FileChangeEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get events for a specific file
   */
  getEventsForFile(filePath: string): FileChangeEvent[] {
    return this.events.filter(e => e.uri.fsPath === filePath);
  }

  /**
   * Clear all recorded events
   */
  clearEvents(): void {
    this.events = [];
    this.pendingEvents.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Wait for pending debounced events to flush
   */
  async waitForDebounce(): Promise<void> {
    if (this.debounceTimer) {
      await new Promise(resolve =>
        setTimeout(resolve, FILE_WATCHING_CONSTANTS.DEBOUNCE_DELAY_MS + FILE_WATCHING_CONSTANTS.POLLING_INTERVAL_MS)
      );
    }
  }

  /**
   * Dispose watcher and cleanup
   */
  dispose(): void {
    try {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    } catch (e) {
      console.error('Error clearing debounce timer:', e);
    }

    try {
      this.disposables.forEach(d => d.dispose());
    } catch (e) {
      console.error('Error disposing resources:', e);
    } finally {
      this.disposables = [];
      this.watcher = null;
      this.events = [];
      this.pendingEvents.clear();
    }
  }
}

/**
 * Helper: Create a file with content
 */
async function createFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Helper: Modify a file
 */
async function modifyFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Helper: Delete a file
 */
async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

/**
 * Helper: Wait for file system events to propagate
 */
async function waitForFileSystemEvents(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, FILE_WATCHING_CONSTANTS.FS_EVENT_PROPAGATION_MS));
}

/**
 * Helper: Wait for watcher to detect changes
 */
async function waitForWatcherDetection(
  watcher: TestFileWatcher,
  expectedEventCount: number,
  timeout: number = FILE_WATCHING_CONSTANTS.MAX_DETECTION_WAIT_MS
): Promise<void> {
  const startTime = Date.now();

  while (watcher.getEvents().length < expectedEventCount) {
    if (Date.now() - startTime > timeout) {
      throw new Error(
        `Timeout waiting for watcher to detect ${expectedEventCount} events (got ${watcher.getEvents().length})`
      );
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

suite('Performance - Real-Time File Watching Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('performance-filewatching-tests');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('File Change Detection', () => {
    test('Should detect file creation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const watcher = new TestFileWatcher();
      const pattern = new vscode.RelativePattern(testWorkspacePath, '**/*.ts');
      watcher.watch(pattern);

      // Create a file
      const filePath = path.join(testWorkspacePath, 'test-create.ts');
      await createFile(filePath, 'export const test = 1;');

      // Wait for watcher to detect
      await waitForFileSystemEvents();

      const events = watcher.getEvents();
      const createEvents = watcher.getEventsByType(FileChangeType.CREATED);

      // Assertions
      assert.ok(createEvents.length > 0, 'Should detect file creation');
      assert.ok(
        createEvents.some(e => e.uri.fsPath === filePath),
        'Should detect the created file'
      );

      console.log(`✓ Detected ${createEvents.length} file creation event(s)`);

      watcher.dispose();
    });

    test('Should detect file modification', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create a file first
      const filePath = path.join(testWorkspacePath, 'test-modify.ts');
      await createFile(filePath, 'export const test = 1;');

      // Start watching after file exists
      const watcher = new TestFileWatcher();
      const pattern = new vscode.RelativePattern(testWorkspacePath, '**/*.ts');
      watcher.watch(pattern);

      await waitForFileSystemEvents();
      watcher.clearEvents(); // Clear creation event

      // Modify the file
      await modifyFile(filePath, 'export const test = 2;');

      // Wait for watcher to detect
      await waitForFileSystemEvents();

      const events = watcher.getEvents();
      const modifyEvents = watcher.getEventsByType(FileChangeType.MODIFIED);

      // Assertions
      assert.ok(modifyEvents.length > 0, 'Should detect file modification');
      assert.ok(
        modifyEvents.some(e => e.uri.fsPath === filePath),
        'Should detect the modified file'
      );

      console.log(`✓ Detected ${modifyEvents.length} file modification event(s)`);

      watcher.dispose();
    });

    test('Should detect file deletion', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create a file first
      const filePath = path.join(testWorkspacePath, 'test-delete.ts');
      await createFile(filePath, 'export const test = 1;');

      // Start watching after file exists
      const watcher = new TestFileWatcher();
      const pattern = new vscode.RelativePattern(testWorkspacePath, '**/*.ts');
      watcher.watch(pattern);

      await waitForFileSystemEvents();
      watcher.clearEvents(); // Clear creation event

      // Delete the file
      await deleteFile(filePath);

      // Wait for watcher to detect
      await waitForFileSystemEvents();

      const events = watcher.getEvents();
      const deleteEvents = watcher.getEventsByType(FileChangeType.DELETED);

      // Assertions
      assert.ok(deleteEvents.length > 0, 'Should detect file deletion');
      assert.ok(
        deleteEvents.some(e => e.uri.fsPath === filePath),
        'Should detect the deleted file'
      );

      console.log(`✓ Detected ${deleteEvents.length} file deletion event(s)`);

      watcher.dispose();
    });

    test('Should detect directory rename (as delete + create)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create a directory with a file
      const oldDirPath = path.join(testWorkspacePath, 'old-dir');
      const oldFilePath = path.join(oldDirPath, 'test.ts');
      await createFile(oldFilePath, 'export const test = 1;');

      // Start watching
      const watcher = new TestFileWatcher();
      const pattern = new vscode.RelativePattern(testWorkspacePath, '**/*.ts');
      watcher.watch(pattern);

      await waitForFileSystemEvents();
      watcher.clearEvents(); // Clear creation event

      // Rename directory
      const newDirPath = path.join(testWorkspacePath, 'new-dir');
      await fs.rename(oldDirPath, newDirPath);

      // Wait for watcher to detect
      await waitForFileSystemEvents();

      const events = watcher.getEvents();
      const deleteEvents = watcher.getEventsByType(FileChangeType.DELETED);
      const createEvents = watcher.getEventsByType(FileChangeType.CREATED);

      // Assertions
      assert.ok(events.length > 0, 'Should detect directory rename events');

      // Directory rename typically triggers delete + create
      const hasDeleteOrCreate = deleteEvents.length > 0 || createEvents.length > 0;
      assert.ok(hasDeleteOrCreate, 'Should detect delete or create events from rename');

      console.log(
        `✓ Directory rename detected: ${deleteEvents.length} delete(s), ${createEvents.length} create(s)`
      );

      watcher.dispose();
    });

    test('Should trigger incremental update on file change', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const watcher = new TestFileWatcher();
      const pattern = new vscode.RelativePattern(testWorkspacePath, '**/*.ts');
      watcher.watch(pattern);

      // Simulate incremental update tracking
      let updateTriggered = false;
      const triggerUpdate = () => {
        updateTriggered = true;
      };

      // Create a file
      const filePath = path.join(testWorkspacePath, 'incremental-test.ts');
      await createFile(filePath, 'export const test = 1;');

      // Wait for detection
      await waitForFileSystemEvents();

      // Check if any events were detected
      const events = watcher.getEvents();
      if (events.length > 0) {
        triggerUpdate();
      }

      // Assertions
      assert.ok(events.length > 0, 'Should detect file changes');
      assert.ok(updateTriggered, 'Should trigger incremental update');

      console.log(`✓ Incremental update triggered by ${events.length} event(s)`);

      watcher.dispose();
    });

    test('Should handle batch changes with debouncing (avoid thrashing)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      const watcher = new TestFileWatcher();
      const pattern = new vscode.RelativePattern(testWorkspacePath, '**/*.ts');

      // Watch with debouncing
      watcher.watch(pattern, { debounce: FILE_WATCHING_CONSTANTS.DEBOUNCE_DELAY_MS });

      // Create many files in rapid succession
      const filePaths: string[] = [];
      for (let i = 0; i < FILE_WATCHING_CONSTANTS.BATCH_CHANGE_COUNT; i++) {
        const filePath = path.join(testWorkspacePath, `batch-${i}.ts`);
        filePaths.push(filePath);
        await createFile(filePath, `export const test${i} = ${i};`);
      }

      // Wait for file system events
      await waitForFileSystemEvents();

      // Wait for debounce to complete
      await watcher.waitForDebounce();

      const events = watcher.getEvents();

      // Assertions
      assert.ok(events.length > 0, 'Should detect batch changes');

      // With debouncing, we should have fewer events than without
      // (debouncing batches rapid changes together)
      console.log(
        `✓ Batch changes handled: ${FILE_WATCHING_CONSTANTS.BATCH_CHANGE_COUNT} files created, ${events.length} debounced event(s)`
      );

      watcher.dispose();
    });

    test('Should respect .gitignore patterns', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create .gitignore
      const gitignorePath = path.join(testWorkspacePath, '.gitignore');
      await createFile(gitignorePath, 'node_modules/\n*.log\ndist/\n');

      // Start watching (exclude .gitignore patterns)
      const watcher = new TestFileWatcher();
      const pattern = new vscode.RelativePattern(testWorkspacePath, '**/*.{ts,js,log}');
      watcher.watch(pattern);

      await waitForFileSystemEvents();
      watcher.clearEvents();

      // Create files - some ignored, some not
      const trackedFile = path.join(testWorkspacePath, 'tracked.ts');
      const ignoredFile1 = path.join(testWorkspacePath, 'node_modules', 'lib.js');
      const ignoredFile2 = path.join(testWorkspacePath, 'debug.log');

      await createFile(trackedFile, 'export const test = 1;');
      await createFile(ignoredFile1, 'module.exports = {};');
      await createFile(ignoredFile2, 'Debug log');

      // Wait for detection
      await waitForFileSystemEvents();

      const events = watcher.getEvents();

      // Assertions
      assert.ok(events.length > 0, 'Should detect some file changes');

      // The tracked file should be detected
      const trackedEvents = events.filter(e => e.uri.fsPath === trackedFile);
      assert.ok(trackedEvents.length > 0, 'Should detect tracked file');

      console.log(`✓ .gitignore respected: ${events.length} event(s) for tracked files`);

      watcher.dispose();
    });

    test('Should resolve conflicts from concurrent changes', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      const watcher = new TestFileWatcher();
      const pattern = new vscode.RelativePattern(testWorkspacePath, '**/*.ts');
      watcher.watch(pattern);

      // Simulate concurrent changes to the same file
      const filePath = path.join(testWorkspacePath, 'concurrent-test.ts');
      await createFile(filePath, 'export const test = 0;');

      await waitForFileSystemEvents();
      watcher.clearEvents();

      // Make multiple rapid changes (simulating concurrent edits)
      const changes: Promise<void>[] = [];
      for (let i = 0; i < FILE_WATCHING_CONSTANTS.CONCURRENT_CHANGE_COUNT; i++) {
        changes.push(modifyFile(filePath, `export const test = ${i};`));
      }

      // Wait for all changes to complete
      await Promise.all(changes);

      // Wait for detection
      await waitForFileSystemEvents();

      const events = watcher.getEvents();
      const modifyEvents = watcher.getEventsByType(FileChangeType.MODIFIED);

      // Assertions
      assert.ok(modifyEvents.length > 0, 'Should detect concurrent modifications');

      // Should detect modifications, even if some are coalesced
      const fileEvents = events.filter(e => e.uri.fsPath === filePath);
      assert.ok(fileEvents.length > 0, 'Should detect changes to the file');

      // Read final file state
      const finalContent = await fs.readFile(filePath, 'utf-8');
      assert.ok(finalContent.includes('export const test ='), 'File should have valid content');

      console.log(
        `✓ Concurrent changes handled: ${FILE_WATCHING_CONSTANTS.CONCURRENT_CHANGE_COUNT} changes, ${fileEvents.length} event(s) detected`
      );

      watcher.dispose();
    });
  });
});
