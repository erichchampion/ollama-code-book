/**
 * Safety System Integration
 *
 * Phase 2.3: Integration layer to connect safety system with file operations
 */

import { logger } from '../utils/logger.js';
import { SafetyOrchestrator } from './safety-orchestrator.js';
import { FileOperationDescription, OperationApproval, SafetyConfiguration } from './safety-types.js';
import { FileTarget } from '../routing/file-operation-types.js';
import { EnhancedCodeEditor } from '../tools/enhanced-code-editor.js';
import * as fs from 'fs/promises';
import { fileExists, extractErrorMessage } from './safety-utils.js';

interface SafeFileOperationContext {
  operationId: string;
  description: string;
  targets: string[];
  operationType: 'create' | 'modify' | 'delete' | 'move' | 'copy';
  content?: string;
  preview?: boolean;
  userPreferences?: {
    autoApprove?: boolean;
    riskTolerance?: 'minimal' | 'low' | 'medium' | 'high' | 'critical';
    requireConfirmation?: boolean;
  };
}

interface SafeOperationResult {
  success: boolean;
  operationId: string;
  approval?: OperationApproval;
  rollbackAvailable: boolean;
  message: string;
  warnings?: string[];
  errors?: string[];
}

export class SafetyIntegration {
  private orchestrator: SafetyOrchestrator;
  private pendingOperations: Map<string, OperationApproval> = new Map();

  constructor(config?: Partial<SafetyConfiguration>) {
    this.orchestrator = new SafetyOrchestrator(config);
  }

  /**
   * Execute file operation with comprehensive safety measures
   */
  async executeFileOperationSafely(
    context: SafeFileOperationContext,
    operationCallback: () => Promise<void>
  ): Promise<SafeOperationResult> {
    const { operationId, description, targets, operationType, content, preview } = context;

    logger.info(`Starting safe file operation: ${operationId}`);

    try {
      // Step 1: Prepare operation context
      const fileTargets = await this.analyzeTargets(targets);
      const operationDescription = this.createOperationDescription(
        operationType,
        targets,
        description
      );

      // Step 2: Safety assessment
      const orchestratorContext = {
        operationId,
        description: operationDescription,
        targets: fileTargets,
        content: content ? await this.prepareContentForPreview(targets, content, operationType) : undefined,
        userPreferences: context.userPreferences ? {
          autoApprove: context.userPreferences.autoApprove ?? false,
          riskTolerance: context.userPreferences.riskTolerance ?? 'medium',
          requireConfirmation: context.userPreferences.requireConfirmation ?? true
        } : undefined
      };

      const approval = await this.orchestrator.assessOperation(orchestratorContext);

      // Step 3: Handle preview mode
      if (preview) {
        return this.handlePreviewMode(approval);
      }

      // Step 4: Check approval status
      if (approval.status === 'pending') {
        this.pendingOperations.set(operationId, approval);
        return this.handlePendingApproval(approval);
      }

      if (approval.status === 'rejected') {
        return this.handleRejectedOperation(approval);
      }

      // Step 5: Execute approved operation
      const executionResult = await this.orchestrator.executeOperation(
        operationId,
        operationCallback
      );

      return {
        success: true,
        operationId,
        approval,
        rollbackAvailable: executionResult.rollbackAvailable,
        message: `✅ Operation completed successfully. ${executionResult.rollbackAvailable ? 'Rollback available.' : ''}`,
        warnings: this.extractWarnings(approval)
      };

    } catch (error) {
      logger.error(`Safe file operation failed: ${operationId}`, error);

      return {
        success: false,
        operationId,
        rollbackAvailable: false,
        message: `❌ Operation failed: ${extractErrorMessage(error)}`,
        errors: [extractErrorMessage(error)]
      };
    }
  }

  /**
   * Request approval for pending operation
   */
  async requestOperationApproval(operationId: string): Promise<SafeOperationResult> {
    const approval = this.pendingOperations.get(operationId);
    if (!approval) {
      return {
        success: false,
        operationId,
        rollbackAvailable: false,
        message: '❌ Operation not found or not pending approval',
        errors: ['Operation not found']
      };
    }

    try {
      const approvalResult = await this.orchestrator.requestApproval(operationId);

      if (approvalResult.approved) {
        this.pendingOperations.delete(operationId);
        return {
          success: true,
          operationId,
          approval,
          rollbackAvailable: false,
          message: '✅ Operation approved. You can now execute it.',
        };
      } else {
        return {
          success: false,
          operationId,
          rollbackAvailable: false,
          message: `❌ Operation rejected: ${approvalResult.reason}`,
          errors: [approvalResult.reason || 'Approval denied']
        };
      }

    } catch (error) {
      return {
        success: false,
        operationId,
        rollbackAvailable: false,
        message: `❌ Approval request failed: ${extractErrorMessage(error)}`,
        errors: [extractErrorMessage(error)]
      };
    }
  }

  /**
   * Rollback operation
   */
  async rollbackOperation(operationId: string): Promise<SafeOperationResult> {
    try {
      const result = await this.orchestrator.rollbackOperation(operationId);

      if (result.success) {
        return {
          success: true,
          operationId,
          rollbackAvailable: false,
          message: '✅ Operation rolled back successfully'
        };
      } else {
        return {
          success: false,
          operationId,
          rollbackAvailable: false,
          message: '❌ Rollback failed',
          errors: result.errors
        };
      }

    } catch (error) {
      return {
        success: false,
        operationId,
        rollbackAvailable: false,
        message: `❌ Rollback failed: ${extractErrorMessage(error)}`,
        errors: [extractErrorMessage(error)]
      };
    }
  }

  /**
   * Get operation status and details
   */
  getOperationDetails(operationId: string): {
    status: string;
    details?: OperationApproval;
    formattedSummary?: string;
  } {
    const approval = this.orchestrator.getOperationStatus(operationId) ||
                    this.pendingOperations.get(operationId);

    if (!approval) {
      return { status: 'not_found' };
    }

    return {
      status: approval.status,
      details: approval,
      formattedSummary: this.formatOperationSummary(approval)
    };
  }

  /**
   * List all operations
   */
  listOperations(): Array<{
    operationId: string;
    status: string;
    type: string;
    description: string;
    riskLevel: string;
    timestamp: Date;
  }> {
    const orchestratorOps = this.orchestrator.listOperations();
    const pendingOps = Array.from(this.pendingOperations.values());
    const allOps = [...orchestratorOps, ...pendingOps];

    return allOps.map(approval => ({
      operationId: approval.operationId,
      status: approval.status,
      type: approval.operation.type,
      description: approval.operation.description,
      riskLevel: approval.riskAssessment.level,
      timestamp: approval.timestamp
    }));
  }

  /**
   * Get safety events for operation
   */
  getOperationEvents(operationId: string) {
    return this.orchestrator.getSafetyEvents(operationId);
  }

  /**
   * Private helper methods
   */
  private async analyzeTargets(targetPaths: string[]): Promise<FileTarget[]> {
    const targets: FileTarget[] = [];

    for (const targetPath of targetPaths) {
      try {
        const exists = await fileExists(targetPath);
        let size: number | undefined;
        let lastModified: Date | undefined;

        if (exists) {
          const stats = await fs.stat(targetPath);
          size = stats.size;
          lastModified = stats.mtime;
        }

        targets.push({
          path: targetPath,
          type: exists ? 'file' : 'file', // Could be enhanced to detect directories
          exists,
          size,
          lastModified,
          confidence: 1.0,
          reason: 'File operation target'
        });

      } catch (error) {
        logger.warn(`Failed to analyze target ${targetPath}:`, error);
        // Add target anyway with minimal info
        targets.push({
          path: targetPath,
          type: 'file',
          exists: false,
          confidence: 0.5,
          reason: 'Analysis failed'
        });
      }
    }

    return targets;
  }

  private createOperationDescription(
    type: string,
    targets: string[],
    description: string
  ): FileOperationDescription {
    return {
      type: type as any,
      targets,
      description,
      estimatedChanges: targets.length,
      newFiles: type === 'create' ? targets : undefined,
      modifiedFiles: type === 'modify' ? targets : undefined,
      deletedFiles: type === 'delete' ? targets : undefined
    };
  }

  private async prepareContentForPreview(
    targets: string[],
    content: string,
    operationType: string
  ) {
    const contentArray = [];

    for (const target of targets) {
      let originalContent: string | undefined;

      // Read original content for modifications
      if (operationType === 'modify') {
        try {
          originalContent = await fs.readFile(target, 'utf-8');
        } catch (error) {
          logger.warn(`Could not read original content for ${target}:`, error);
        }
      }

      contentArray.push({
        filePath: target,
        newContent: content,
        originalContent
      });
    }

    return contentArray;
  }


  private handlePreviewMode(approval: OperationApproval): SafeOperationResult {
    const preview = approval.changePreview;

    let message = '📋 OPERATION PREVIEW\n';
    message += '═'.repeat(50) + '\n';

    if (preview) {
      message += `Files: ${preview.summary.totalFiles}\n`;
      message += `Lines: +${preview.summary.addedLines} -${preview.summary.removedLines}\n\n`;

      if (preview.visualDiff) {
        message += preview.visualDiff + '\n\n';
      }

      if (preview.potentialIssues.length > 0) {
        message += '⚠️  POTENTIAL ISSUES:\n';
        preview.potentialIssues.forEach(issue => {
          message += `• ${issue.description}\n`;
        });
        message += '\n';
      }

      if (preview.recommendations.length > 0) {
        message += '💡 RECOMMENDATIONS:\n';
        preview.recommendations.forEach(rec => {
          message += `• ${rec}\n`;
        });
      }
    }

    message += '\nUse --no-preview to execute the operation.';

    return {
      success: true,
      operationId: approval.operationId,
      approval,
      rollbackAvailable: false,
      message
    };
  }

  private handlePendingApproval(approval: OperationApproval): SafeOperationResult {
    let message = '⏳ OPERATION REQUIRES APPROVAL\n';
    message += '═'.repeat(50) + '\n';
    message += `Risk Level: ${approval.riskAssessment.level.toUpperCase()}\n`;
    message += `Required Approvals: ${approval.requiredApprovals.join(', ')}\n\n`;

    if (approval.riskAssessment.riskFactors.length > 0) {
      message += 'Risk Factors:\n';
      approval.riskAssessment.riskFactors.forEach(factor => {
        message += `• ${factor.description}\n`;
      });
      message += '\n';
    }

    message += `Use 'approve-operation ${approval.operationId}' to proceed.`;

    return {
      success: false,
      operationId: approval.operationId,
      approval,
      rollbackAvailable: false,
      message,
      warnings: ['Operation requires approval before execution']
    };
  }

  private handleRejectedOperation(approval: OperationApproval): SafeOperationResult {
    return {
      success: false,
      operationId: approval.operationId,
      approval,
      rollbackAvailable: false,
      message: '❌ Operation rejected due to safety concerns',
      errors: ['Operation rejected by safety system']
    };
  }

  private extractWarnings(approval: OperationApproval): string[] {
    const warnings: string[] = [];

    if (approval.riskAssessment.level === 'medium') {
      warnings.push('Medium risk operation - proceed with caution');
    }

    if (approval.changePreview?.potentialIssues && approval.changePreview.potentialIssues.length > 0) {
      const issueCount = approval.changePreview.potentialIssues.length;
      warnings.push(`${issueCount} potential issue(s) identified`);
    }

    return warnings;
  }

  private formatOperationSummary(approval: OperationApproval): string {
    const summary = [];

    summary.push(`Operation: ${approval.operation.type} (${approval.status})`);
    summary.push(`Risk: ${approval.riskAssessment.level}`);
    summary.push(`Files: ${approval.operation.targets.length}`);
    summary.push(`Created: ${approval.timestamp.toLocaleString()}`);

    if (approval.expiresAt) {
      summary.push(`Expires: ${approval.expiresAt.toLocaleString()}`);
    }

    return summary.join('\n');
  }
}

/**
 * Global safety integration instance
 */
let globalSafetyIntegration: SafetyIntegration | null = null;

export function getSafetyIntegration(config?: Partial<SafetyConfiguration>): SafetyIntegration {
  if (!globalSafetyIntegration) {
    globalSafetyIntegration = new SafetyIntegration(config);
  }
  return globalSafetyIntegration;
}

export function resetSafetyIntegration(): void {
  globalSafetyIntegration = null;
}