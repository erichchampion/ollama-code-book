/**
 * Risk Assessment Engine
 *
 * Phase 2.3: Comprehensive risk assessment for file operations
 */

import * as path from 'path';
import { logger } from '../utils/logger.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';
import {
  RiskAssessment,
  RiskFactor,
  RiskFactorType,
  RiskLevel,
  FileOperationDescription,
  PotentialIssue,
  IssueType
} from './safety-types.js';
import { FileTarget, SafetyLevel, ImpactLevel } from '../routing/file-operation-types.js';
import {
  RISK_CONFIG,
  FILE_SIZE_THRESHOLDS
} from './safety-constants.js';
import {
  isSystemFile,
  isConfigFile,
  isSecurityFile,
  categorizeFileSize
} from './safety-utils.js';

export class RiskAssessmentEngine {
  private riskFactorWeights: Map<RiskFactorType, number> = new Map();
  private safetyThresholds: Map<RiskLevel, number> = new Map();

  constructor() {
    this.initializeWeights();
    this.initializeThresholds();
  }

  /**
   * Perform comprehensive risk assessment for file operation
   */
  async assessRisk(
    operation: FileOperationDescription,
    targets: FileTarget[]
  ): Promise<RiskAssessment> {
    logger.debug(`Assessing risk for ${operation.type} operation on ${targets.length} targets`);

    try {
      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(operation, targets);

      // Calculate overall risk level
      const riskLevel = this.calculateRiskLevel(riskFactors);

      // Determine safety and impact levels
      const safetyLevel = this.determineSafetyLevel(operation, targets);
      const impactLevel = this.determineImpactLevel(operation, targets);

      // Generate mitigation strategies
      const mitigationStrategies = this.generateMitigationStrategies(riskFactors);

      // Calculate confidence in assessment
      const confidence = this.calculateConfidence(riskFactors, targets);

      // Generate reasoning
      const reasoning = this.generateReasoning(riskFactors, riskLevel);

      // Determine if automatic approval is possible
      const automaticApproval = this.canAutoApprove(riskLevel, riskFactors);

      return {
        level: riskLevel,
        safetyLevel,
        impactLevel,
        riskFactors,
        mitigationStrategies,
        confidence,
        reasoning,
        automaticApproval
      };

    } catch (error) {
      logger.error('Risk assessment failed:', error);
      // Return conservative assessment on error
      return this.createConservativeAssessment(operation, targets);
    }
  }

  /**
   * Identify specific risk factors for the operation
   */
  private async identifyRiskFactors(
    operation: FileOperationDescription,
    targets: FileTarget[]
  ): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Check for system file modifications
    const systemFiles = targets.filter(t => isSystemFile(t.path));
    if (systemFiles.length > 0) {
      factors.push({
        type: 'system_file_modification',
        severity: 'high',
        description: `Modifying ${systemFiles.length} system file(s)`,
        affected: systemFiles.map(f => f.path),
        mitigation: 'Create backup before modification, validate changes carefully'
      });
    }

    // Check for large file changes
    const largeFiles = targets.filter(t =>
      t.size && t.size > FILE_SIZE_THRESHOLDS.LARGE_FILE
    );
    if (largeFiles.length > 0) {
      factors.push({
        type: 'large_file_changes',
        severity: 'medium',
        description: `Operating on ${largeFiles.length} large file(s) (>100MB)`,
        affected: largeFiles.map(f => f.path),
        mitigation: 'Consider incremental changes, monitor memory usage'
      });
    }

    // Check for multiple file changes
    if (targets.length > RISK_CONFIG.BULK_OPERATION_THRESHOLD) {
      factors.push({
        type: 'multiple_file_changes',
        severity: 'medium',
        description: `Operating on ${targets.length} files simultaneously`,
        affected: targets.map(t => t.path),
        mitigation: 'Process in batches, implement progress tracking'
      });
    }

    // Check for deletion operations
    if (operation.type === 'delete') {
      factors.push({
        type: 'deletion_operation',
        severity: 'high',
        description: 'File deletion is irreversible',
        affected: targets.map(t => t.path),
        mitigation: 'Create full backup, confirm deletion intent'
      });
    }

    // Check for configuration file changes
    const configFiles = targets.filter(t => isConfigFile(t.path));
    if (configFiles.length > 0) {
      factors.push({
        type: 'configuration_changes',
        severity: 'medium',
        description: `Modifying ${configFiles.length} configuration file(s)`,
        affected: configFiles.map(f => f.path),
        mitigation: 'Validate configuration syntax, test in development environment'
      });
    }

    // Check for dependency modifications
    const dependencyFiles = targets.filter(t => this.isDependencyFile(t.path));
    if (dependencyFiles.length > 0) {
      factors.push({
        type: 'dependency_modifications',
        severity: 'medium',
        description: `Modifying ${dependencyFiles.length} dependency file(s)`,
        affected: dependencyFiles.map(f => f.path),
        mitigation: 'Reinstall dependencies, run tests after changes'
      });
    }

    // Check for build system changes
    const buildFiles = targets.filter(t => this.isBuildFile(t.path));
    if (buildFiles.length > 0) {
      factors.push({
        type: 'build_system_changes',
        severity: 'medium',
        description: `Modifying ${buildFiles.length} build system file(s)`,
        affected: buildFiles.map(f => f.path),
        mitigation: 'Test build process, verify CI/CD pipeline'
      });
    }

    // Check for security-related changes
    const securityFiles = targets.filter(t => isSecurityFile(t.path));
    if (securityFiles.length > 0) {
      factors.push({
        type: 'security_related_changes',
        severity: 'high',
        description: `Modifying ${securityFiles.length} security-related file(s)`,
        affected: securityFiles.map(f => f.path),
        mitigation: 'Security review required, audit changes'
      });
    }

    return factors;
  }

  /**
   * Calculate overall risk level based on factors
   */
  private calculateRiskLevel(riskFactors: RiskFactor[]): RiskLevel {
    let score = 0;

    for (const factor of riskFactors) {
      const weight = this.riskFactorWeights.get(factor.type) || 1;
      const severityMultiplier = factor.severity === 'high' ? 3 :
                                factor.severity === 'medium' ? 2 : 1;
      score += weight * severityMultiplier;
    }

    if (score >= 10) return 'critical';
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    if (score >= 2) return 'low';
    return 'minimal';
  }

  /**
   * Determine safety level based on operation characteristics
   */
  private determineSafetyLevel(
    operation: FileOperationDescription,
    targets: FileTarget[]
  ): SafetyLevel {
    if (operation.type === 'delete') return 'dangerous';
    if (operation.type === 'move') return 'risky';
    if (targets.some(t => isSystemFile(t.path))) return 'risky';
    if (targets.some(t => isConfigFile(t.path))) return 'cautious';
    return 'safe';
  }

  /**
   * Determine impact level based on scope of changes
   */
  private determineImpactLevel(
    operation: FileOperationDescription,
    targets: FileTarget[]
  ): ImpactLevel {
    if (operation.type === 'delete' || targets.length > RISK_CONFIG.BULK_OPERATION_THRESHOLD) return 'major';
    if (operation.type === 'move' || targets.length > 5) return 'significant';
    if (targets.length > 2) return 'moderate';
    return 'minimal';
  }

  /**
   * Generate mitigation strategies for identified risks
   */
  private generateMitigationStrategies(riskFactors: RiskFactor[]): string[] {
    const strategies = new Set<string>();

    // Add general strategies
    strategies.add('Create comprehensive backup before operation');
    strategies.add('Validate all changes before applying');

    // Add specific mitigations from risk factors
    for (const factor of riskFactors) {
      if (factor.mitigation) {
        strategies.add(factor.mitigation);
      }
    }

    // Add high-risk specific strategies
    const hasHighRisk = riskFactors.some(f => f.severity === 'high');
    if (hasHighRisk) {
      strategies.add('Require explicit user confirmation');
      strategies.add('Implement staged rollout');
      strategies.add('Monitor operation in real-time');
    }

    return Array.from(strategies);
  }

  /**
   * Calculate confidence in the risk assessment
   */
  private calculateConfidence(riskFactors: RiskFactor[], targets: FileTarget[]): number {
    let confidence = THRESHOLD_CONSTANTS.RISK.BASE_CONFIDENCE; // Base confidence

    // Reduce confidence for unknown file types
    const unknownFiles = targets.filter(t => !t.language);
    confidence -= (unknownFiles.length / targets.length) * THRESHOLD_CONSTANTS.RISK.UNKNOWN_FILE_PENALTY;

    // Reduce confidence for very large operations
    if (targets.length > 20) {
      confidence -= THRESHOLD_CONSTANTS.RISK.UNCLEAR_SCOPE_PENALTY;
    }

    // Increase confidence for well-understood risks
    const knownRiskTypes = new Set([
      'system_file_modification',
      'deletion_operation',
      'configuration_changes'
    ]);
    const knownRisks = riskFactors.filter(f => knownRiskTypes.has(f.type));
    confidence += (knownRisks.length / Math.max(riskFactors.length, 1)) * THRESHOLD_CONSTANTS.RISK.KNOWN_RISK_BONUS;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Generate human-readable reasoning for the assessment
   */
  private generateReasoning(riskFactors: RiskFactor[], riskLevel: RiskLevel): string {
    if (riskFactors.length === 0) {
      return `Low-risk operation: ${riskLevel} risk level with no significant risk factors identified.`;
    }

    const highRiskFactors = riskFactors.filter(f => f.severity === 'high');
    const mediumRiskFactors = riskFactors.filter(f => f.severity === 'medium');

    let reasoning = `Risk level: ${riskLevel}. `;

    if (highRiskFactors.length > 0) {
      reasoning += `High-risk factors: ${highRiskFactors.map(f => f.description).join(', ')}. `;
    }

    if (mediumRiskFactors.length > 0) {
      reasoning += `Medium-risk factors: ${mediumRiskFactors.map(f => f.description).join(', ')}. `;
    }

    reasoning += `Recommended mitigations should be applied before proceeding.`;

    return reasoning;
  }

  /**
   * Determine if operation can be automatically approved
   */
  private canAutoApprove(riskLevel: RiskLevel, riskFactors: RiskFactor[]): boolean {
    // Never auto-approve high or critical risk operations
    if (riskLevel === 'high' || riskLevel === 'critical') {
      return false;
    }

    // Check for specific blocking factors
    const blockingFactors = [
      'deletion_operation',
      'system_file_modification',
      'security_related_changes'
    ];

    return !riskFactors.some(f =>
      blockingFactors.includes(f.type) && f.severity === 'high'
    );
  }

  /**
   * Create conservative assessment when normal assessment fails
   */
  private createConservativeAssessment(
    operation: FileOperationDescription,
    targets: FileTarget[]
  ): RiskAssessment {
    return {
      level: 'high',
      safetyLevel: 'dangerous',
      impactLevel: 'major',
      riskFactors: [{
        type: 'irreversible_operation',
        severity: 'high',
        description: 'Unable to assess risks - conservative approach applied',
        affected: targets.map(t => t.path)
      }],
      mitigationStrategies: [
        'Manual review required',
        'Create full backup',
        'Proceed with extreme caution'
      ],
      confidence: 0.1,
      reasoning: 'Risk assessment failed - applying maximum caution',
      automaticApproval: false
    };
  }


  /**
   * Check if file is related to dependencies
   */
  private isDependencyFile(filePath: string): boolean {
    const dependencyFiles = [
      'package.json', 'package-lock.json', 'yarn.lock',
      'requirements.txt', 'Pipfile', 'Pipfile.lock',
      'Cargo.toml', 'Cargo.lock',
      'composer.json', 'composer.lock',
      'go.mod', 'go.sum'
    ];
    const fileName = path.basename(filePath);
    return dependencyFiles.includes(fileName);
  }

  /**
   * Check if file is related to build system
   */
  private isBuildFile(filePath: string): boolean {
    const buildFiles = [
      'Makefile', 'CMakeLists.txt', 'build.gradle',
      'webpack.config.js', 'rollup.config.js',
      'tsconfig.json', 'babel.config.js'
    ];
    const fileName = path.basename(filePath);
    return buildFiles.includes(fileName) ||
           filePath.includes('.github/workflows/') ||
           filePath.includes('jenkins') ||
           filePath.includes('ci') && filePath.includes('cd');
  }


  /**
   * Initialize risk factor weights
   */
  private initializeWeights(): void {
    this.riskFactorWeights = new Map([
      ['system_file_modification', RISK_CONFIG.FACTOR_WEIGHTS.SYSTEM_FILE],
      ['deletion_operation', RISK_CONFIG.FACTOR_WEIGHTS.DELETION],
      ['security_related_changes', RISK_CONFIG.FACTOR_WEIGHTS.SECURITY_FILE],
      ['configuration_changes', RISK_CONFIG.FACTOR_WEIGHTS.CONFIG_FILE],
      ['dependency_modifications', RISK_CONFIG.FACTOR_WEIGHTS.EXTERNAL_DEPENDENCY],
      ['build_system_changes', RISK_CONFIG.FACTOR_WEIGHTS.CROSS_MODULE],
      ['large_file_changes', RISK_CONFIG.FACTOR_WEIGHTS.LARGE_FILE],
      ['multiple_file_changes', RISK_CONFIG.FACTOR_WEIGHTS.BULK_OPERATION],
      ['irreversible_operation', RISK_CONFIG.FACTOR_WEIGHTS.DELETION]
    ]);
  }

  /**
   * Initialize risk level thresholds
   */
  private initializeThresholds(): void {
    this.safetyThresholds = new Map([
      ['minimal', RISK_CONFIG.SAFETY_THRESHOLDS.LOW * 0.3],
      ['low', RISK_CONFIG.SAFETY_THRESHOLDS.LOW],
      ['medium', RISK_CONFIG.SAFETY_THRESHOLDS.MEDIUM],
      ['high', RISK_CONFIG.SAFETY_THRESHOLDS.HIGH],
      ['critical', RISK_CONFIG.SAFETY_THRESHOLDS.CRITICAL]
    ]);
  }
}