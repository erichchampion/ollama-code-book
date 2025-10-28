/**
 * Rollback Manager
 *
 * Provides transaction-like rollback capabilities for autonomous development operations.
 * Tracks changes and can revert them if operations fail.
 */

import { logger } from './logger.js';
import { normalizeError } from '../utils/error-utils.js';
import { Result, ok, err, errFromError, errFromString, ErrorDetails, isErr } from '../types/result.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RollbackAction {
  id: string;
  type: 'file_create' | 'file_modify' | 'file_delete' | 'directory_create' | 'directory_delete' | 'custom';
  description: string;
  rollbackData: any;
  timestamp: Date;
  priority: number; // Higher priority actions are rolled back first
}

export interface FileBackup {
  originalPath: string;
  backupPath: string;
  originalContent?: string;
  existed: boolean;
}

export interface RollbackContext {
  operationId: string;
  operationName: string;
  startTime: Date;
  actions: RollbackAction[];
  backups: Map<string, FileBackup>;
  isActive: boolean;
}

export class RollbackManager {
  private contexts: Map<string, RollbackContext> = new Map();
  private backupDirectory: string;

  constructor(backupDirectory = '.rollback_backups') {
    this.backupDirectory = path.resolve(backupDirectory);
  }

  /**
   * Start a new rollback context
   */
  async startContext(operationId: string, operationName: string): Promise<Result<RollbackContext, ErrorDetails>> {
    if (this.contexts.has(operationId)) {
      return errFromString(`Rollback context already exists: ${operationId}`, 'CONTEXT_EXISTS');
    }

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDirectory, { recursive: true });

      const context: RollbackContext = {
        operationId,
        operationName,
        startTime: new Date(),
        actions: [],
        backups: new Map(),
        isActive: true
      };

      this.contexts.set(operationId, context);
      logger.info(`Rollback context started: ${operationId} (${operationName})`);

      return ok(context);
    } catch (error) {
      return errFromError(error instanceof Error ? error : new Error(String(error)), 'CONTEXT_START_FAILED');
    }
  }

  /**
   * Add a rollback action to the context
   */
  addAction(
    operationId: string,
    type: RollbackAction['type'],
    description: string,
    rollbackData: any,
    priority = 0
  ): Result<void, ErrorDetails> {
    const context = this.contexts.get(operationId);
    if (!context) {
      return errFromString(`Rollback context not found: ${operationId}`, 'CONTEXT_NOT_FOUND');
    }

    if (!context.isActive) {
      return errFromString(`Rollback context is not active: ${operationId}`, 'CONTEXT_INACTIVE');
    }

    const action: RollbackAction = {
      id: `${operationId}_${context.actions.length}`,
      type,
      description,
      rollbackData,
      timestamp: new Date(),
      priority
    };

    context.actions.push(action);
    logger.debug(`Rollback action added: ${action.description}`, { actionId: action.id });

    return ok(undefined);
  }

  /**
   * Backup a file before modifying it
   */
  async backupFile(operationId: string, filePath: string): Promise<Result<FileBackup, ErrorDetails>> {
    const context = this.contexts.get(operationId);
    if (!context) {
      return errFromString(`Rollback context not found: ${operationId}`, 'CONTEXT_NOT_FOUND');
    }

    try {
      const absolutePath = path.resolve(filePath);
      const relativePath = path.relative(process.cwd(), absolutePath);
      const backupPath = path.join(this.backupDirectory, operationId, relativePath);

      let existed = false;
      let originalContent: string | undefined;

      try {
        originalContent = await fs.readFile(absolutePath, 'utf-8');
        existed = true;
      } catch (error) {
        // File doesn't exist, that's okay
        existed = false;
      }

      if (existed && originalContent) {
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, originalContent);
      }

      const backup: FileBackup = {
        originalPath: absolutePath,
        backupPath,
        originalContent,
        existed
      };

      context.backups.set(absolutePath, backup);

      // Add rollback action
      this.addAction(
        operationId,
        existed ? 'file_modify' : 'file_create',
        `Backup file: ${relativePath}`,
        { backup },
        1
      );

      logger.debug(`File backed up: ${relativePath}`, { existed, backupPath });

      return ok(backup);
    } catch (error) {
      return errFromError(error instanceof Error ? error : new Error(String(error)), 'BACKUP_FAILED');
    }
  }

  /**
   * Execute rollback for a context
   */
  async executeRollback(operationId: string): Promise<Result<void, ErrorDetails>> {
    const context = this.contexts.get(operationId);
    if (!context) {
      return errFromString(`Rollback context not found: ${operationId}`, 'CONTEXT_NOT_FOUND');
    }

    try {
      logger.info(`Starting rollback for operation: ${operationId} (${context.operationName})`);

      // Sort actions by priority (higher priority first) then by reverse timestamp
      const sortedActions = [...context.actions].sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return b.timestamp.getTime() - a.timestamp.getTime(); // More recent first
      });

      const errors: string[] = [];

      for (const action of sortedActions) {
        try {
          await this.executeRollbackAction(action);
          logger.debug(`Rollback action executed: ${action.description}`);
        } catch (error) {
          const errorMessage = normalizeError(error).message;
          errors.push(`Failed to rollback ${action.description}: ${errorMessage}`);
          logger.error(`Rollback action failed: ${action.description}`, error);
        }
      }

      // Clean up backup directory for this operation
      try {
        const operationBackupDir = path.join(this.backupDirectory, operationId);
        await fs.rm(operationBackupDir, { recursive: true, force: true });
      } catch (error) {
        logger.warn('Failed to clean up backup directory:', error);
      }

      context.isActive = false;

      if (errors.length > 0) {
        return errFromString(
          `Rollback completed with errors: ${errors.join('; ')}`,
          'ROLLBACK_PARTIAL_FAILURE',
          { errors, completedActions: sortedActions.length - errors.length }
        );
      }

      logger.info(`Rollback completed successfully: ${operationId}`);
      return ok(undefined);
    } catch (error) {
      return errFromError(error instanceof Error ? error : new Error(String(error)), 'ROLLBACK_FAILED');
    }
  }

  /**
   * Execute a single rollback action
   */
  private async executeRollbackAction(action: RollbackAction): Promise<void> {
    switch (action.type) {
      case 'file_create':
        // Delete the created file
        if (action.rollbackData.backup && !action.rollbackData.backup.existed) {
          await fs.unlink(action.rollbackData.backup.originalPath);
        }
        break;

      case 'file_modify':
        // Restore the original file
        if (action.rollbackData.backup) {
          const backup = action.rollbackData.backup as FileBackup;
          if (backup.existed && backup.originalContent) {
            await fs.writeFile(backup.originalPath, backup.originalContent);
          } else {
            await fs.unlink(backup.originalPath);
          }
        }
        break;

      case 'file_delete':
        // Restore deleted file from backup
        if (action.rollbackData.backup) {
          const backup = action.rollbackData.backup as FileBackup;
          if (backup.originalContent) {
            await fs.mkdir(path.dirname(backup.originalPath), { recursive: true });
            await fs.writeFile(backup.originalPath, backup.originalContent);
          }
        }
        break;

      case 'directory_create':
        // Remove created directory
        if (action.rollbackData.path) {
          await fs.rm(action.rollbackData.path, { recursive: true, force: true });
        }
        break;

      case 'directory_delete':
        // Restore directory (if backup exists)
        if (action.rollbackData.backupPath && action.rollbackData.originalPath) {
          await fs.mkdir(action.rollbackData.originalPath, { recursive: true });
          // Would need to recursively restore directory contents
        }
        break;

      case 'custom':
        // Execute custom rollback function
        if (action.rollbackData.rollbackFunction) {
          await action.rollbackData.rollbackFunction();
        }
        break;

      default:
        throw new Error(`Unknown rollback action type: ${action.type}`);
    }
  }

  /**
   * Commit a context (no rollback needed)
   */
  async commitContext(operationId: string): Promise<Result<void, ErrorDetails>> {
    const context = this.contexts.get(operationId);
    if (!context) {
      return errFromString(`Rollback context not found: ${operationId}`, 'CONTEXT_NOT_FOUND');
    }

    try {
      // Clean up backup directory for this operation
      const operationBackupDir = path.join(this.backupDirectory, operationId);
      await fs.rm(operationBackupDir, { recursive: true, force: true });

      context.isActive = false;
      this.contexts.delete(operationId);

      logger.info(`Rollback context committed: ${operationId}`);
      return ok(undefined);
    } catch (error) {
      return errFromError(error instanceof Error ? error : new Error(String(error)), 'COMMIT_FAILED');
    }
  }

  /**
   * Get context information
   */
  getContext(operationId: string): RollbackContext | null {
    return this.contexts.get(operationId) || null;
  }

  /**
   * List all active contexts
   */
  getActiveContexts(): RollbackContext[] {
    return Array.from(this.contexts.values()).filter(c => c.isActive);
  }

  /**
   * Emergency cleanup - rollback all active contexts
   */
  async emergencyRollbackAll(): Promise<Result<void, ErrorDetails>> {
    const activeContexts = this.getActiveContexts();
    const errors: string[] = [];

    logger.warn(`Emergency rollback initiated for ${activeContexts.length} contexts`);

    for (const context of activeContexts) {
      try {
        const result = await this.executeRollback(context.operationId);
        if (isErr(result)) {
          errors.push(`${context.operationId}: ${result.error.message}`);
        }
      } catch (error) {
        const errorMessage = normalizeError(error).message;
        errors.push(`${context.operationId}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      return errFromString(
        `Emergency rollback completed with errors: ${errors.join('; ')}`,
        'EMERGENCY_ROLLBACK_PARTIAL_FAILURE',
        { errors }
      );
    }

    return ok(undefined);
  }
}
