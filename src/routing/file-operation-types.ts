/**
 * File Operation Types
 *
 * Phase 2.2: Enhanced Natural Language Router
 * Types and interfaces for file operation intent classification and targeting
 */

export interface FileTarget {
  path: string;
  type: 'file' | 'directory';
  exists: boolean;
  size?: number;
  lastModified?: Date;
  language?: string;
  confidence: number;
  reason: string; // Why this file was selected
}

export interface FileOperationIntent {
  operation: 'create' | 'edit' | 'delete' | 'move' | 'copy' | 'refactor' | 'generate' | 'test';
  targets: FileTarget[];
  content?: {
    description?: string;
    language?: string;
    framework?: string;
    pattern?: string;
    replacement?: string;
  };
  safetyLevel: SafetyLevel;
  requiresApproval: boolean;
  estimatedImpact: ImpactLevel;
  dependencies: string[]; // Files that might be affected
  backupRequired: boolean;
}

export type SafetyLevel = 'safe' | 'cautious' | 'risky' | 'dangerous';
export type ImpactLevel = 'minimal' | 'moderate' | 'significant' | 'major';

export interface FileOperationContext {
  workingDirectory: string;
  projectFiles: string[];
  recentFiles: string[];
  gitStatus?: {
    modified: string[];
    staged: string[];
    untracked: string[];
  };
  dependencies?: Map<string, string[]>; // File dependency graph
}

export interface SafetyAssessment {
  level: SafetyLevel;
  risks: string[];
  recommendations: string[];
  requiresConfirmation: boolean;
  suggestedBackups: string[];
}

export interface FileOperationPlan {
  intent: FileOperationIntent;
  steps: FileOperationStep[];
  safety: SafetyAssessment;
  estimatedTime: number;
  rollbackPlan?: RollbackStep[];
}

export interface FileOperationStep {
  type: 'create' | 'edit' | 'delete' | 'move' | 'copy' | 'backup' | 'validate';
  target: string;
  description: string;
  safety: SafetyLevel;
  reversible: boolean;
  dependencies: string[];
}

export interface RollbackStep {
  type: 'restore' | 'delete' | 'move';
  target: string;
  source?: string;
  description: string;
}

export interface FileClassificationResult {
  targets: FileTarget[];
  confidence: number;
  ambiguousTargets: FileTarget[];
  suggestions: string[];
}