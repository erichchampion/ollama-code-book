/**
 * Backup Manager
 *
 * Comprehensive backup and version control system for autonomous code modifications.
 * Provides checkpoint management, git integration, and safe rollback capabilities.
 */

import { promises as fs } from 'fs';
import { normalizeError } from '../utils/error-utils.js';
import * as path from 'path';
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface Checkpoint {
  id: string;
  timestamp: Date;
  description: string;
  files: CheckpointFile[];
  gitCommit?: string;
  parentCheckpoint?: string;
  metadata: CheckpointMetadata;
}

export interface CheckpointFile {
  path: string;
  originalHash: string;
  backupPath: string;
  size: number;
  lastModified: Date;
}

export interface CheckpointMetadata {
  phase: string;
  operation: string;
  riskLevel: 'low' | 'medium' | 'high';
  affectedComponents: string[];
  estimatedImpact: 'minimal' | 'moderate' | 'significant';
}

export interface BackupResult {
  success: boolean;
  checkpointId?: string;
  error?: string;
  filesBackedUp?: number;
  backupSize?: number;
}

export interface RestoreResult {
  success: boolean;
  filesRestored?: number;
  error?: string;
  conflicts?: RestoreConflict[];
}

export interface RestoreConflict {
  filePath: string;
  reason: string;
  currentHash: string;
  backupHash: string;
  resolution?: 'overwrite' | 'skip' | 'merge';
}

export class BackupManager {
  private checkpoints = new Map<string, Checkpoint>();
  private backupDir: string;
  private maxCheckpoints: number;
  private compressionEnabled: boolean;

  constructor(
    backupDir = '.ollama-code-backups',
    maxCheckpoints = 50,
    compressionEnabled = true
  ) {
    this.backupDir = backupDir;
    this.maxCheckpoints = maxCheckpoints;
    this.compressionEnabled = compressionEnabled;
  }

  /**
   * Initialize the backup manager
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir(path.join(this.backupDir, 'checkpoints'), { recursive: true });
      await fs.mkdir(path.join(this.backupDir, 'files'), { recursive: true });

      // Load existing checkpoints
      await this.loadCheckpoints();

      logger.debug('Backup manager initialized', {
        backupDir: this.backupDir,
        checkpointCount: this.checkpoints.size
      });
    } catch (error) {
      logger.error('Failed to initialize backup manager:', error);
      throw error;
    }
  }

  /**
   * Create a new checkpoint
   */
  async createCheckpoint(
    description: string,
    filePaths: string[],
    metadata: CheckpointMetadata
  ): Promise<BackupResult> {
    const checkpointId = uuidv4();

    try {
      const files: CheckpointFile[] = [];
      let totalSize = 0;

      // Process each file
      for (const filePath of filePaths) {
        const absolutePath = path.resolve(filePath);

        try {
          const stats = await fs.stat(absolutePath);
          const content = await fs.readFile(absolutePath, 'utf-8');
          const hash = this.calculateHash(content);

          // Create backup file
          const backupPath = await this.createFileBackup(
            checkpointId,
            absolutePath,
            content
          );

          files.push({
            path: absolutePath,
            originalHash: hash,
            backupPath,
            size: stats.size,
            lastModified: stats.mtime
          });

          totalSize += stats.size;

        } catch (error) {
          if ((error as any).code === 'ENOENT') {
            logger.warn(`File not found during backup: ${absolutePath}`);
            continue;
          }
          throw error;
        }
      }

      // Create git commit if possible
      let gitCommit: string | undefined;
      try {
        gitCommit = await this.createGitCheckpoint(checkpointId, description);
      } catch (error) {
        logger.warn('Git checkpoint creation failed:', error);
      }

      // Create checkpoint
      const checkpoint: Checkpoint = {
        id: checkpointId,
        timestamp: new Date(),
        description,
        files,
        gitCommit,
        metadata
      };

      // Save checkpoint
      await this.saveCheckpoint(checkpoint);
      this.checkpoints.set(checkpointId, checkpoint);

      // Cleanup old checkpoints if needed
      await this.cleanupOldCheckpoints();

      logger.info('Created checkpoint successfully', {
        checkpointId,
        description,
        filesBackedUp: files.length,
        totalSize,
        gitCommit
      });

      return {
        success: true,
        checkpointId,
        filesBackedUp: files.length,
        backupSize: totalSize
      };

    } catch (error) {
      logger.error('Failed to create checkpoint:', error);
      return {
        success: false,
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Restore from a checkpoint
   */
  async restoreCheckpoint(
    checkpointId: string,
    options: {
      forceOverwrite?: boolean;
      dryRun?: boolean;
      specificFiles?: string[];
    } = {}
  ): Promise<RestoreResult> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return {
        success: false,
        error: 'Checkpoint not found'
      };
    }

    try {
      const conflicts: RestoreConflict[] = [];
      const filesToRestore = options.specificFiles
        ? checkpoint.files.filter(f => options.specificFiles!.includes(f.path))
        : checkpoint.files;

      // Check for conflicts first
      for (const file of filesToRestore) {
        try {
          const currentContent = await fs.readFile(file.path, 'utf-8');
          const currentHash = this.calculateHash(currentContent);

          if (currentHash !== file.originalHash) {
            conflicts.push({
              filePath: file.path,
              reason: 'File has been modified since checkpoint',
              currentHash,
              backupHash: file.originalHash,
              resolution: options.forceOverwrite ? 'overwrite' : 'skip'
            });
          }
        } catch (error) {
          if ((error as any).code === 'ENOENT') {
            // File was deleted - we can restore it
            continue;
          }
          throw error;
        }
      }

      if (options.dryRun) {
        return {
          success: true,
          conflicts,
          filesRestored: filesToRestore.length - conflicts.filter(c => c.resolution === 'skip').length
        };
      }

      // Perform restoration
      let restoredCount = 0;
      for (const file of filesToRestore) {
        const conflict = conflicts.find(c => c.filePath === file.path);
        if (conflict && conflict.resolution === 'skip') {
          continue;
        }

        try {
          // Read backup content
          const backupContent = await fs.readFile(file.backupPath, 'utf-8');

          // Ensure directory exists
          const dir = path.dirname(file.path);
          await fs.mkdir(dir, { recursive: true });

          // Restore file atomically
          await this.atomicWrite(file.path, backupContent);
          restoredCount++;

          logger.debug('Restored file', { filePath: file.path });

        } catch (error) {
          logger.error(`Failed to restore file ${file.path}:`, error);
          conflicts.push({
            filePath: file.path,
            reason: `Restore failed: ${normalizeError(error).message}`,
            currentHash: '',
            backupHash: file.originalHash
          });
        }
      }

      // Restore git state if available
      if (checkpoint.gitCommit && !options.specificFiles) {
        try {
          await this.restoreGitState(checkpoint.gitCommit);
        } catch (error) {
          logger.warn('Git state restoration failed:', error);
        }
      }

      logger.info('Checkpoint restoration completed', {
        checkpointId,
        filesRestored: restoredCount,
        conflicts: conflicts.length
      });

      return {
        success: true,
        filesRestored: restoredCount,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };

    } catch (error) {
      logger.error('Failed to restore checkpoint:', error);
      return {
        success: false,
        error: normalizeError(error).message
      };
    }
  }

  /**
   * List all available checkpoints
   */
  getCheckpoints(): Checkpoint[] {
    return Array.from(this.checkpoints.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get checkpoint by ID
   */
  getCheckpoint(checkpointId: string): Checkpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return false;
    }

    try {
      // Delete backup files
      for (const file of checkpoint.files) {
        try {
          await fs.unlink(file.backupPath);
        } catch (error) {
          logger.warn(`Failed to delete backup file ${file.backupPath}:`, error);
        }
      }

      // Delete checkpoint metadata
      const checkpointPath = path.join(this.backupDir, 'checkpoints', `${checkpointId}.json`);
      await fs.unlink(checkpointPath);

      this.checkpoints.delete(checkpointId);

      logger.info('Deleted checkpoint', { checkpointId });
      return true;

    } catch (error) {
      logger.error('Failed to delete checkpoint:', error);
      return false;
    }
  }

  /**
   * Calculate file hash
   */
  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  /**
   * Create backup of a single file
   */
  private async createFileBackup(
    checkpointId: string,
    filePath: string,
    content: string
  ): Promise<string> {
    const fileName = path.basename(filePath);
    const fileHash = this.calculateHash(content);
    const backupFileName = `${checkpointId}-${fileHash}-${fileName}`;
    const backupPath = path.join(this.backupDir, 'files', backupFileName);

    await fs.writeFile(backupPath, content, 'utf-8');

    return backupPath;
  }

  /**
   * Create git checkpoint
   */
  private async createGitCheckpoint(checkpointId: string, description: string): Promise<string> {
    try {
      // Check if we're in a git repository
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });

      // Create a tag for this checkpoint
      const tagName = `ollama-code-checkpoint-${checkpointId}`;
      const commitMessage = `Checkpoint: ${description}`;

      // Get current commit hash
      const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

      // Create annotated tag
      execSync(`git tag -a "${tagName}" -m "${commitMessage}"`, { stdio: 'ignore' });

      logger.debug('Created git checkpoint', { tagName, commit: currentCommit });

      return currentCommit;

    } catch (error) {
      throw new Error(`Git checkpoint creation failed: ${normalizeError(error).message}`);
    }
  }

  /**
   * Restore git state
   */
  private async restoreGitState(commitHash: string): Promise<void> {
    try {
      // Check if commit exists
      execSync(`git cat-file -e ${commitHash}`, { stdio: 'ignore' });

      // Reset to the commit (soft reset to preserve working directory)
      execSync(`git reset --soft ${commitHash}`, { stdio: 'ignore' });

      logger.debug('Restored git state', { commit: commitHash });

    } catch (error) {
      throw new Error(`Git state restoration failed: ${normalizeError(error).message}`);
    }
  }

  /**
   * Atomic write operation
   */
  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp-${uuidv4()}`;

    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Save checkpoint metadata
   */
  private async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const checkpointPath = path.join(this.backupDir, 'checkpoints', `${checkpoint.id}.json`);
    const checkpointData = JSON.stringify(checkpoint, null, 2);
    await fs.writeFile(checkpointPath, checkpointData, 'utf-8');
  }

  /**
   * Load existing checkpoints
   */
  private async loadCheckpoints(): Promise<void> {
    try {
      const checkpointDir = path.join(this.backupDir, 'checkpoints');
      const files = await fs.readdir(checkpointDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const checkpointPath = path.join(checkpointDir, file);
            const content = await fs.readFile(checkpointPath, 'utf-8');
            const checkpoint = JSON.parse(content) as Checkpoint;

            // Convert timestamp back to Date object
            checkpoint.timestamp = new Date(checkpoint.timestamp);

            this.checkpoints.set(checkpoint.id, checkpoint);
          } catch (error) {
            logger.warn(`Failed to load checkpoint ${file}:`, error);
          }
        }
      }

      logger.debug('Loaded checkpoints', { count: this.checkpoints.size });

    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // Directory doesn't exist yet - that's ok
        return;
      }
      throw error;
    }
  }

  /**
   * Cleanup old checkpoints
   */
  private async cleanupOldCheckpoints(): Promise<void> {
    const checkpoints = this.getCheckpoints();

    if (checkpoints.length <= this.maxCheckpoints) {
      return;
    }

    const checkpointsToDelete = checkpoints.slice(this.maxCheckpoints);

    for (const checkpoint of checkpointsToDelete) {
      await this.deleteCheckpoint(checkpoint.id);
    }

    logger.info('Cleaned up old checkpoints', {
      deleted: checkpointsToDelete.length,
      remaining: this.checkpoints.size
    });
  }
}
