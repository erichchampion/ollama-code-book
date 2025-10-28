/**
 * Safety System Types
 *
 * Phase 2.3: Comprehensive safety system for file operations
 */

import { SafetyLevel, ImpactLevel } from '../routing/file-operation-types.js';

export interface OperationApproval {
  operationId: string;
  operation: FileOperationDescription;
  riskAssessment: RiskAssessment;
  requiredApprovals: ApprovalType[];
  approvals: ApprovalRecord[];
  status: ApprovalStatus;
  timestamp: Date;
  expiresAt?: Date;
  changePreview?: ChangePreview;
  rollbackPlan?: RollbackPlan;
}

export interface FileOperationDescription {
  type: 'create' | 'modify' | 'delete' | 'move' | 'copy';
  targets: string[];
  description: string;
  estimatedChanges: number;
  affectedLines?: number;
  newFiles?: string[];
  modifiedFiles?: string[];
  deletedFiles?: string[];
}

export interface RiskAssessment {
  level: RiskLevel;
  safetyLevel: SafetyLevel;
  impactLevel: ImpactLevel;
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  confidence: number;
  reasoning: string;
  automaticApproval: boolean;
}

export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
  type: RiskFactorType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  affected: string[];
  mitigation?: string;
}

export type RiskFactorType =
  | 'system_file_modification'
  | 'large_file_changes'
  | 'multiple_file_changes'
  | 'deletion_operation'
  | 'configuration_changes'
  | 'dependency_modifications'
  | 'build_system_changes'
  | 'security_related_changes'
  | 'irreversible_operation';

export type ApprovalType = 'user' | 'automated' | 'admin' | 'peer_review';

export interface ApprovalRecord {
  type: ApprovalType;
  approver: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  timestamp: Date;
  reason?: string;
  conditions?: string[];
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface ChangePreview {
  summary: ChangeSummary;
  diffs: FileDiff[];
  visualDiff?: string;
  affectedDependencies: string[];
  potentialIssues: PotentialIssue[];
  recommendations: string[];
}

export interface ChangeSummary {
  totalFiles: number;
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  newFiles: number;
  deletedFiles: number;
  binaryFiles: number;
}

export interface FileDiff {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string;
  additions: number;
  deletions: number;
  diff: string;
  language?: string;
  isBinary: boolean;
  preview: string; // First few lines of changes
}

export interface PotentialIssue {
  type: IssueType;
  severity: 'info' | 'warning' | 'error';
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export type IssueType =
  | 'syntax_error'
  | 'missing_import'
  | 'broken_reference'
  | 'incompatible_change'
  | 'performance_concern'
  | 'security_risk'
  | 'breaking_change'
  | 'untested_change';

export interface RollbackPlan {
  id: string;
  operationId: string;
  strategy: RollbackStrategy;
  backups: BackupInfo[];
  steps: RollbackStep[];
  estimatedTime: number;
  riskLevel: RiskLevel;
  canAutoRollback: boolean;
  dependencies: string[];
}

export type RollbackStrategy =
  | 'backup_restore'
  | 'git_revert'
  | 'incremental_undo'
  | 'snapshot_restore'
  | 'manual_intervention';

export interface BackupInfo {
  id: string;
  type: BackupType;
  path: string;
  size: number;
  timestamp: Date;
  checksum: string;
  compressed: boolean;
  retention: Date;
  metadata: Record<string, any>;
}

export type BackupType = 'full_file' | 'differential' | 'incremental' | 'snapshot';

export interface RollbackStep {
  order: number;
  action: RollbackAction;
  target: string;
  description: string;
  automated: boolean;
  validation?: ValidationStep;
  fallback?: RollbackStep[];
}

export type RollbackAction =
  | 'restore_file'
  | 'delete_file'
  | 'revert_changes'
  | 'rebuild_dependency'
  | 'restart_service'
  | 'manual_step';

export interface ValidationStep {
  type: 'file_exists' | 'syntax_check' | 'test_run' | 'build_check' | 'custom';
  command?: string;
  expectedResult?: string;
  timeout: number;
}

export interface SafetyConfiguration {
  riskThresholds: {
    autoApprove: RiskLevel;
    requireConfirmation: RiskLevel;
    requireAdminApproval: RiskLevel;
    blockOperation: RiskLevel;
  };
  backupSettings: {
    enabled: boolean;
    retentionDays: number;
    maxBackups: number;
    compressBackups: boolean;
    backupTypes: BackupType[];
  };
  approvalSettings: {
    defaultTimeout: number;
    requireExplicitApproval: boolean;
    allowAutoApproval: boolean;
    escalationEnabled: boolean;
  };
  rollbackSettings: {
    autoRollbackEnabled: boolean;
    autoRollbackThreshold: RiskLevel;
    maxRollbackSteps: number;
    rollbackTimeout: number;
  };
}

export interface SafetyEvent {
  id: string;
  type: SafetyEventType;
  operationId: string;
  timestamp: Date;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  handled: boolean;
}

export type SafetyEventType =
  | 'operation_started'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'operation_completed'
  | 'operation_failed'
  | 'rollback_initiated'
  | 'rollback_completed'
  | 'backup_created'
  | 'risk_threshold_exceeded'
  | 'manual_intervention_required';