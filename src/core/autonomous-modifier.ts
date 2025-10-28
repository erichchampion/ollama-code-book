/**
 * Autonomous Code Modifier
 *
 * High-level orchestrator for safe autonomous code modifications.
 * Integrates code editing, AST manipulation, and backup management.
 */

import { CodeEditor, CodeEdit, EditResult } from '../tools/code-editor.js';
import { normalizeError } from '../utils/error-utils.js';
import { ASTManipulator, CodeTransformation } from '../tools/ast-manipulator.js';
import { BackupManager, Checkpoint, BackupResult, RestoreResult } from './backup-manager.js';
import { logger } from '../utils/logger.js';
import * as path from 'path';

export interface ModificationPlan {
  id: string;
  description: string;
  phase: string;
  operations: ModificationOperation[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedImpact: 'minimal' | 'moderate' | 'significant';
  rollbackStrategy: 'checkpoint' | 'git' | 'backup';
}

export interface ModificationOperation {
  type: 'create' | 'edit' | 'delete' | 'transform';
  filePath: string;
  description: string;
  priority: number;
  dependencies?: string[];
  transformation?: CodeTransformation;
  newContent?: string;
}

export interface ModificationResult {
  success: boolean;
  planId: string;
  checkpointId?: string;
  completedOperations: number;
  failedOperations: number;
  errors?: ModificationError[];
  rollbackPerformed?: boolean;
}

export interface ModificationError {
  operation: ModificationOperation;
  error: string;
  recoverable: boolean;
}

export class AutonomousModifier {
  private codeEditor: CodeEditor;
  private astManipulator: ASTManipulator;
  private backupManager: BackupManager;
  private activePlans = new Map<string, ModificationPlan>();

  constructor(
    codeEditor?: CodeEditor,
    astManipulator?: ASTManipulator,
    backupManager?: BackupManager
  ) {
    this.codeEditor = codeEditor || new CodeEditor();
    this.astManipulator = astManipulator || new ASTManipulator();
    this.backupManager = backupManager || new BackupManager();
  }

  /**
   * Initialize the autonomous modifier
   */
  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.codeEditor.initialize(),
        this.backupManager.initialize()
      ]);

      logger.info('Autonomous modifier initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize autonomous modifier:', error);
      throw error;
    }
  }

  /**
   * Execute a modification plan
   */
  async executeModificationPlan(plan: ModificationPlan): Promise<ModificationResult> {
    const planId = plan.id;
    this.activePlans.set(planId, plan);

    try {
      logger.info('Starting modification plan execution', {
        planId,
        description: plan.description,
        operationCount: plan.operations.length,
        riskLevel: plan.riskLevel
      });

      // Create checkpoint before modifications
      const checkpointResult = await this.createCheckpoint(plan);
      if (!checkpointResult.success) {
        throw new Error(`Failed to create checkpoint: ${checkpointResult.error}`);
      }

      const checkpointId = checkpointResult.checkpointId!;
      let completedOperations = 0;
      const errors: ModificationError[] = [];

      // Sort operations by priority
      const sortedOperations = plan.operations.sort((a, b) => a.priority - b.priority);

      // Execute operations in order
      for (const operation of sortedOperations) {
        try {
          await this.executeOperation(operation);
          completedOperations++;

          logger.debug('Operation completed successfully', {
            planId,
            operation: operation.description,
            filePath: operation.filePath
          });

        } catch (error) {
          const modError: ModificationError = {
            operation,
            error: normalizeError(error).message,
            recoverable: this.isRecoverableError(error)
          };

          errors.push(modError);

          logger.error('Operation failed', {
            planId,
            operation: operation.description,
            error: modError.error,
            recoverable: modError.recoverable
          });

          // If it's a non-recoverable error and risk is high, stop and rollback
          if (!modError.recoverable && plan.riskLevel === 'high') {
            logger.warn('Non-recoverable error in high-risk plan, initiating rollback');

            const rollbackResult = await this.rollbackToCheckpoint(checkpointId);

            return {
              success: false,
              planId,
              checkpointId,
              completedOperations,
              failedOperations: plan.operations.length - completedOperations,
              errors,
              rollbackPerformed: rollbackResult.success
            };
          }
        }
      }

      const success = errors.length === 0 || errors.every(e => e.recoverable);

      logger.info('Modification plan execution completed', {
        planId,
        success,
        completedOperations,
        errors: errors.length
      });

      return {
        success,
        planId,
        checkpointId,
        completedOperations,
        failedOperations: errors.length,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      logger.error('Modification plan execution failed:', error);

      return {
        success: false,
        planId,
        completedOperations: 0,
        failedOperations: plan.operations.length,
        errors: [{
          operation: plan.operations[0],
          error: normalizeError(error).message,
          recoverable: false
        }]
      };

    } finally {
      this.activePlans.delete(planId);
    }
  }

  /**
   * Create a checkpoint before modifications
   */
  private async createCheckpoint(plan: ModificationPlan): Promise<BackupResult> {
    const filePaths = plan.operations.map(op => op.filePath);

    return await this.backupManager.createCheckpoint(
      `Pre-modification checkpoint: ${plan.description}`,
      filePaths,
      {
        phase: plan.phase,
        operation: 'modification_plan',
        riskLevel: plan.riskLevel,
        affectedComponents: this.extractAffectedComponents(plan),
        estimatedImpact: plan.estimatedImpact
      }
    );
  }

  /**
   * Execute a single modification operation
   */
  private async executeOperation(operation: ModificationOperation): Promise<void> {
    switch (operation.type) {
      case 'create':
        await this.executeCreateOperation(operation);
        break;

      case 'edit':
        await this.executeEditOperation(operation);
        break;

      case 'delete':
        await this.executeDeleteOperation(operation);
        break;

      case 'transform':
        await this.executeTransformOperation(operation);
        break;

      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  }

  /**
   * Execute create operation
   */
  private async executeCreateOperation(operation: ModificationOperation): Promise<void> {
    if (!operation.newContent) {
      throw new Error('Create operation requires newContent');
    }

    const editResult = await this.codeEditor.createEdit(
      operation.filePath,
      operation.newContent,
      operation.description
    );

    if (!editResult.success) {
      throw new Error(`Failed to create edit: ${editResult.error}`);
    }

    const applyResult = await this.codeEditor.applyEdit(editResult.editId);
    if (!applyResult.success) {
      throw new Error(`Failed to apply edit: ${applyResult.error}`);
    }
  }

  /**
   * Execute edit operation
   */
  private async executeEditOperation(operation: ModificationOperation): Promise<void> {
    if (!operation.newContent) {
      throw new Error('Edit operation requires newContent');
    }

    const editResult = await this.codeEditor.createEdit(
      operation.filePath,
      operation.newContent,
      operation.description
    );

    if (!editResult.success) {
      throw new Error(`Failed to create edit: ${editResult.error}`);
    }

    const applyResult = await this.codeEditor.applyEdit(editResult.editId);
    if (!applyResult.success) {
      throw new Error(`Failed to apply edit: ${applyResult.error}`);
    }
  }

  /**
   * Execute delete operation
   */
  private async executeDeleteOperation(operation: ModificationOperation): Promise<void> {
    // For delete operations, we create an edit with empty content
    const editResult = await this.codeEditor.createEdit(
      operation.filePath,
      '',
      operation.description
    );

    if (!editResult.success) {
      throw new Error(`Failed to create delete edit: ${editResult.error}`);
    }

    const applyResult = await this.codeEditor.applyEdit(editResult.editId);
    if (!applyResult.success) {
      throw new Error(`Failed to apply delete edit: ${applyResult.error}`);
    }
  }

  /**
   * Execute transform operation
   */
  private async executeTransformOperation(operation: ModificationOperation): Promise<void> {
    if (!operation.transformation) {
      throw new Error('Transform operation requires transformation');
    }

    const result = await this.astManipulator.applyTransformation(
      operation.filePath,
      operation.transformation
    );

    if (!result.success) {
      throw new Error(`Failed to apply transformation: ${result.error}`);
    }
  }

  /**
   * Rollback to a checkpoint
   */
  private async rollbackToCheckpoint(checkpointId: string): Promise<RestoreResult> {
    logger.info('Initiating rollback to checkpoint', { checkpointId });

    return await this.backupManager.restoreCheckpoint(checkpointId, {
      forceOverwrite: true
    });
  }

  /**
   * Check if an error is recoverable
   */
  private isRecoverableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Validation errors are typically recoverable
      if (error.message.includes('validation') || error.message.includes('syntax')) {
        return true;
      }

      // File system errors might be recoverable
      if (error.message.includes('ENOENT') || error.message.includes('EACCES')) {
        return true;
      }

      // AST parsing errors are usually recoverable
      if (error.message.includes('parse') || error.message.includes('AST')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract affected components from plan
   */
  private extractAffectedComponents(plan: ModificationPlan): string[] {
    const components = new Set<string>();

    for (const operation of plan.operations) {
      const dir = path.dirname(operation.filePath);
      const component = path.basename(dir);
      components.add(component);
    }

    return Array.from(components);
  }

  /**
   * Get active modification plans
   */
  getActivePlans(): ModificationPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Cancel an active plan
   */
  async cancelPlan(planId: string): Promise<boolean> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      return false;
    }

    // Note: In a real implementation, this would need to handle
    // interrupting in-progress operations gracefully
    this.activePlans.delete(planId);

    logger.info('Cancelled modification plan', { planId });
    return true;
  }

  /**
   * Get backup manager for direct access
   */
  getBackupManager(): BackupManager {
    return this.backupManager;
  }

  /**
   * Get code editor for direct access
   */
  getCodeEditor(): CodeEditor {
    return this.codeEditor;
  }

  /**
   * Get AST manipulator for direct access
   */
  getASTManipulator(): ASTManipulator {
    return this.astManipulator;
  }
}
