/**
 * Architectural Analyzer
 *
 * Provides comprehensive architectural pattern detection and analysis.
 * Identifies design patterns, code smells, and architectural improvements.
 */

import { logger } from '../utils/logger.js';
import { getPerformanceConfig } from '../config/performance.js';
import { calculateCyclomaticComplexity, calculateAverageComplexity } from '../utils/complexity-calculator.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';

export interface ArchitecturalPattern {
  name: string;
  confidence: number;
  location: {
    file: string;
    startLine: number;
    endLine: number;
  };
  description: string;
  benefits: string[];
  suggestions?: string[];
}

export interface CodeSmell {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  location: {
    file: string;
    startLine: number;
    endLine: number;
  };
  description: string;
  impact: string;
  suggestion: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ArchitecturalAnalysis {
  patterns: ArchitecturalPattern[];
  codeSmells: CodeSmell[];
  metrics: {
    maintainabilityIndex: number;
    technicalDebt: number;
    complexity: number;
    coupling: number;
    cohesion: number;
  };
  recommendations: string[];
  summary: string;
}

export class ArchitecturalAnalyzer {
  private config = getPerformanceConfig();

  /**
   * Analyze codebase for architectural patterns and issues
   */
  async analyzeArchitecture(
    files: Array<{ path: string; content: string; type: string }>,
    context?: any
  ): Promise<ArchitecturalAnalysis> {
    try {
      logger.info('Starting architectural analysis', { fileCount: files.length });

      const patterns = await this.detectDesignPatterns(files);
      const codeSmells = await this.detectCodeSmells(files);
      const metrics = await this.calculateArchitecturalMetrics(files);
      const recommendations = await this.generateRecommendations(patterns, codeSmells, metrics);

      const analysis: ArchitecturalAnalysis = {
        patterns,
        codeSmells,
        metrics,
        recommendations,
        summary: this.generateSummary(patterns, codeSmells, metrics)
      };

      logger.info('Architectural analysis completed', {
        patterns: patterns.length,
        codeSmells: codeSmells.length,
        maintainabilityIndex: metrics.maintainabilityIndex
      });

      return analysis;
    } catch (error) {
      logger.error('Architectural analysis failed:', error);
      throw error;
    }
  }

  /**
   * Detect design patterns in the codebase
   */
  private async detectDesignPatterns(
    files: Array<{ path: string; content: string; type: string }>
  ): Promise<ArchitecturalPattern[]> {
    const patterns: ArchitecturalPattern[] = [];

    for (const file of files) {
      patterns.push(...this.detectSingletonPattern(file));
      patterns.push(...this.detectFactoryPattern(file));
      patterns.push(...this.detectObserverPattern(file));
      patterns.push(...this.detectDecoratorPattern(file));
      patterns.push(...this.detectMVCPattern(file));
      patterns.push(...this.detectRepositoryPattern(file));
      patterns.push(...this.detectBuilderPattern(file));
      patterns.push(...this.detectStrategyPattern(file));
    }

    return patterns.filter(p => p.confidence >= this.config.codeAnalysis.architectural.confidenceThreshold);
  }

  /**
   * Detect Singleton pattern
   */
  private detectSingletonPattern(file: { path: string; content: string; type: string }): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];
    const lines = file.content.split('\n');

    // TypeScript/JavaScript Singleton patterns
    const singletonPatterns = [
      /class\s+(\w+)[\s\S]*?private\s+static\s+instance/,
      /private\s+constructor\s*\(/,
      /public\s+static\s+getInstance\s*\(/,
      /export\s+const\s+\w+\s*=\s*new\s+/
    ];

    let hasPrivateConstructor = false;
    let hasStaticInstance = false;
    let hasGetInstance = false;
    let className = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (singletonPatterns[0].test(line)) {
        hasStaticInstance = true;
        const match = line.match(/class\s+(\w+)/);
        if (match) className = match[1];
      }
      if (singletonPatterns[1].test(line)) hasPrivateConstructor = true;
      if (singletonPatterns[2].test(line)) hasGetInstance = true;
    }

    if ((hasPrivateConstructor && hasStaticInstance && hasGetInstance) ||
        file.content.includes('export const') && file.content.includes('new ')) {
      patterns.push({
        name: 'Singleton',
        confidence: Math.max(this.config.codeAnalysis.architectural.confidenceThreshold * 2.8, 0.85),
        location: {
          file: file.path,
          startLine: 1,
          endLine: lines.length
        },
        description: `Singleton pattern detected in ${className || 'exported constant'}`,
        benefits: [
          'Ensures single instance',
          'Global point of access',
          'Lazy initialization'
        ],
        suggestions: [
          'Consider dependency injection instead',
          'Ensure thread safety if needed',
          'Document singleton lifetime'
        ]
      });
    }

    return patterns;
  }

  /**
   * Detect Factory pattern
   */
  private detectFactoryPattern(file: { path: string; content: string; type: string }): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    const factoryPatterns = [
      /create\w*\s*\(/,
      /factory/i,
      /switch\s*\([^)]*type/,
      /if\s*\([^)]*type.*===.*\)\s*return\s+new/
    ];

    let factoryScore = 0;
    const lines = file.content.split('\n');

    for (const pattern of factoryPatterns) {
      if (pattern.test(file.content)) {
        factoryScore += 0.3;
      }
    }

    if (factoryScore >= THRESHOLD_CONSTANTS.ARCHITECTURE.FACTORY_PATTERN_THRESHOLD) {
      patterns.push({
        name: 'Factory',
        confidence: Math.min(factoryScore, THRESHOLD_CONSTANTS.ARCHITECTURE.VERY_HIGH_CONFIDENCE),
        location: {
          file: file.path,
          startLine: 1,
          endLine: lines.length
        },
        description: 'Factory pattern detected for object creation',
        benefits: [
          'Encapsulates object creation',
          'Supports multiple variants',
          'Reduces coupling'
        ]
      });
    }

    return patterns;
  }

  /**
   * Detect Observer pattern
   */
  private detectObserverPattern(file: { path: string; content: string; type: string }): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    const observerIndicators = [
      /addEventListener|on\w+|subscribe|notify/,
      /EventEmitter|Observable|Subject/,
      /observers?\s*[:=]/,
      /update\s*\(/
    ];

    let observerScore = 0;
    for (const indicator of observerIndicators) {
      if (indicator.test(file.content)) {
        observerScore += 0.25;
      }
    }

    if (observerScore >= THRESHOLD_CONSTANTS.ARCHITECTURE.OBSERVER_PATTERN_THRESHOLD) {
      patterns.push({
        name: 'Observer',
        confidence: Math.min(observerScore, THRESHOLD_CONSTANTS.ARCHITECTURE.VERY_HIGH_CONFIDENCE),
        location: {
          file: file.path,
          startLine: 1,
          endLine: file.content.split('\n').length
        },
        description: 'Observer pattern detected for event handling',
        benefits: [
          'Loose coupling between subjects and observers',
          'Dynamic relationships',
          'Broadcast communication'
        ]
      });
    }

    return patterns;
  }

  /**
   * Detect other patterns (simplified implementations)
   */
  private detectDecoratorPattern(file: { path: string; content: string; type: string }): ArchitecturalPattern[] {
    if (/@\w+\s*\(|decorator/i.test(file.content)) {
      return [{
        name: 'Decorator',
        confidence: THRESHOLD_CONSTANTS.ARCHITECTURE.MEDIUM_CONFIDENCE,
        location: { file: file.path, startLine: 1, endLine: file.content.split('\n').length },
        description: 'Decorator pattern detected',
        benefits: ['Extends functionality', 'Composition over inheritance']
      }];
    }
    return [];
  }

  private detectMVCPattern(file: { path: string; content: string; type: string }): ArchitecturalPattern[] {
    const mvcIndicators = /controller|model|view|router/i;
    if (mvcIndicators.test(file.path) || mvcIndicators.test(file.content)) {
      return [{
        name: 'MVC',
        confidence: THRESHOLD_CONSTANTS.ARCHITECTURE.LOW_CONFIDENCE,
        location: { file: file.path, startLine: 1, endLine: file.content.split('\n').length },
        description: 'MVC pattern structure detected',
        benefits: ['Separation of concerns', 'Maintainable code', 'Testable components']
      }];
    }
    return [];
  }

  private detectRepositoryPattern(file: { path: string; content: string; type: string }): ArchitecturalPattern[] {
    if (/repository|repo\b/i.test(file.path) && /find|save|delete|update/.test(file.content)) {
      return [{
        name: 'Repository',
        confidence: THRESHOLD_CONSTANTS.ARCHITECTURE.HIGH_CONFIDENCE,
        location: { file: file.path, startLine: 1, endLine: file.content.split('\n').length },
        description: 'Repository pattern detected for data access',
        benefits: ['Data access abstraction', 'Testable persistence', 'Centralized queries']
      }];
    }
    return [];
  }

  private detectBuilderPattern(file: { path: string; content: string; type: string }): ArchitecturalPattern[] {
    if (/builder/i.test(file.path) && /build\(\)|with\w+\(/.test(file.content)) {
      return [{
        name: 'Builder',
        confidence: 0.75,
        location: { file: file.path, startLine: 1, endLine: file.content.split('\n').length },
        description: 'Builder pattern detected for object construction',
        benefits: ['Flexible object creation', 'Readable construction', 'Optional parameters']
      }];
    }
    return [];
  }

  private detectStrategyPattern(file: { path: string; content: string; type: string }): ArchitecturalPattern[] {
    if (/strategy|algorithm/i.test(file.content) && /execute\(|apply\(/.test(file.content)) {
      return [{
        name: 'Strategy',
        confidence: THRESHOLD_CONSTANTS.ARCHITECTURE.MEDIUM_CONFIDENCE,
        location: { file: file.path, startLine: 1, endLine: file.content.split('\n').length },
        description: 'Strategy pattern detected for algorithm selection',
        benefits: ['Interchangeable algorithms', 'Runtime selection', 'Open/closed principle']
      }];
    }
    return [];
  }

  /**
   * Detect code smells
   */
  private async detectCodeSmells(
    files: Array<{ path: string; content: string; type: string }>
  ): Promise<CodeSmell[]> {
    const codeSmells: CodeSmell[] = [];

    for (const file of files) {
      codeSmells.push(...this.detectGodClass(file));
      codeSmells.push(...this.detectLongMethod(file));
      codeSmells.push(...this.detectDuplicateCode(file, files));
      codeSmells.push(...this.detectLargeClass(file));
      codeSmells.push(...this.detectLongParameterList(file));
    }

    return codeSmells;
  }

  /**
   * Detect God Class code smell
   */
  private detectGodClass(file: { path: string; content: string; type: string }): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];
    const lines = file.content.split('\n');

    // Count methods and lines in classes
    let inClass = false;
    let className = '';
    let classStartLine = 0;
    let methodCount = 0;
    let classLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/class\s+(\w+)/.test(line)) {
        if (inClass && (methodCount > this.config.codeAnalysis.architectural.godClassMethodLimit ||
                       classLines > this.config.codeAnalysis.architectural.godClassLineLimit)) {
          codeSmells.push({
            type: 'God Class',
            severity: 'high',
            confidence: THRESHOLD_CONSTANTS.ARCHITECTURE.HIGH_CONFIDENCE,
            location: {
              file: file.path,
              startLine: classStartLine,
              endLine: i
            },
            description: `Class ${className} has ${methodCount} methods and ${classLines} lines`,
            impact: 'Reduces maintainability and testability',
            suggestion: 'Consider breaking this class into smaller, more focused classes',
            effort: 'high'
          });
        }

        const match = line.match(/class\s+(\w+)/);
        className = match ? match[1] : '';
        inClass = true;
        classStartLine = i + 1;
        methodCount = 0;
        classLines = 0;
      }

      if (inClass) {
        classLines++;
        if (/^\s*(public|private|protected)?\s*(static\s+)?\w+\s*\(/.test(line)) {
          methodCount++;
        }
      }
    }

    return codeSmells;
  }

  /**
   * Detect Long Method code smell
   */
  private detectLongMethod(file: { path: string; content: string; type: string }): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];
    const lines = file.content.split('\n');

    let inMethod = false;
    let methodStartLine = 0;
    let methodLines = 0;
    let methodName = '';
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect method start
      const methodMatch = line.match(/^\s*(public|private|protected)?\s*(static\s+)?(async\s+)?(\w+)\s*\(/);
      if (methodMatch && !inMethod) {
        methodName = methodMatch[4];
        methodStartLine = i + 1;
        methodLines = 0;
        inMethod = true;
        braceCount = 0;
      }

      if (inMethod) {
        methodLines++;
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;

        if (braceCount === 0 && methodLines > 1) {
          if (methodLines > this.config.codeAnalysis.architectural.longMethodLineLimit) {
            codeSmells.push({
              type: 'Long Method',
              severity: 'medium',
              confidence: THRESHOLD_CONSTANTS.ARCHITECTURE.VERY_HIGH_CONFIDENCE,
              location: {
                file: file.path,
                startLine: methodStartLine,
                endLine: i + 1
              },
              description: `Method ${methodName} has ${methodLines} lines`,
              impact: 'Reduces readability and maintainability',
              suggestion: 'Consider breaking this method into smaller, more focused methods',
              effort: 'medium'
            });
          }
          inMethod = false;
        }
      }
    }

    return codeSmells;
  }

  /**
   * Detect duplicate code blocks
   */
  private detectDuplicateCode(
    file: { path: string; content: string; type: string },
    allFiles: Array<{ path: string; content: string; type: string }>
  ): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];
    const lines = file.content.split('\n');
    const minBlockSize = this.config.codeAnalysis.architectural.duplicateBlockMinLines;

    // Simple duplicate detection - look for identical blocks
    for (let i = 0; i < lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize).join('\n');

      if (block.trim().length > 50) { // Only check substantial blocks
        const duplicates = this.findDuplicateBlocks(block, allFiles, file.path);

        if (duplicates.length > 0) {
          codeSmells.push({
            type: 'Duplicate Code',
            severity: 'medium',
            confidence: THRESHOLD_CONSTANTS.ARCHITECTURE.MEDIUM_CONFIDENCE,
            location: {
              file: file.path,
              startLine: i + 1,
              endLine: i + minBlockSize
            },
            description: `Duplicate code block found in ${duplicates.length} other location(s)`,
            impact: 'Increases maintenance burden and bug risk',
            suggestion: 'Extract common code into a shared function or module',
            effort: 'medium'
          });
        }
      }
    }

    return codeSmells;
  }

  private findDuplicateBlocks(
    block: string,
    allFiles: Array<{ path: string; content: string; type: string }>,
    currentFile: string
  ): string[] {
    const duplicates: string[] = [];

    for (const file of allFiles) {
      if (file.path !== currentFile && file.content.includes(block)) {
        duplicates.push(file.path);
      }
    }

    return duplicates;
  }

  /**
   * Detect other code smells (simplified)
   */
  private detectLargeClass(file: { path: string; content: string; type: string }): CodeSmell[] {
    const lines = file.content.split('\n').length;
    if (lines > this.config.codeAnalysis.architectural.godClassLineLimit) {
      return [{
        type: 'Large Class',
        severity: 'medium',
        confidence: THRESHOLD_CONSTANTS.ARCHITECTURE.HIGH_CONFIDENCE,
        location: { file: file.path, startLine: 1, endLine: lines },
        description: `File has ${lines} lines`,
        impact: 'Reduces maintainability',
        suggestion: 'Consider splitting into multiple files',
        effort: 'high'
      }];
    }
    return [];
  }

  private detectLongParameterList(file: { path: string; content: string; type: string }): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];
    const paramPattern = /\(([^)]*)\)/g;
    let match;

    while ((match = paramPattern.exec(file.content)) !== null) {
      const params = match[1].split(',').filter(p => p.trim());
      if (params.length > 5) {
        codeSmells.push({
          type: 'Long Parameter List',
          severity: 'low',
          confidence: THRESHOLD_CONSTANTS.ARCHITECTURE.VERY_HIGH_CONFIDENCE,
          location: { file: file.path, startLine: 1, endLine: 1 },
          description: `Function has ${params.length} parameters`,
          impact: 'Reduces readability',
          suggestion: 'Consider using parameter objects or configuration',
          effort: 'low'
        });
      }
    }

    return codeSmells;
  }

  /**
   * Calculate architectural metrics
   */
  private async calculateArchitecturalMetrics(
    files: Array<{ path: string; content: string; type: string }>
  ): Promise<ArchitecturalAnalysis['metrics']> {
    let totalComplexity = 0;
    let totalLines = 0;
    let coupling = 0;
    let cohesion = 0;

    for (const file of files) {
      const fileComplexity = this.calculateFileCyclomaticComplexity(file.content);
      totalComplexity += fileComplexity;
      totalLines += file.content.split('\n').length;

      // Simplified coupling calculation
      const imports = (file.content.match(/import.*from/g) || []).length;
      coupling += imports;
    }

    const avgComplexity = totalComplexity / files.length;
    const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(avgComplexity) - 0.23 * avgComplexity - 16.2 * Math.log(totalLines / files.length));

    return {
      maintainabilityIndex: Math.round(maintainabilityIndex),
      technicalDebt: Math.round(100 - maintainabilityIndex),
      complexity: Math.round(avgComplexity),
      coupling: Math.round(coupling / files.length),
      cohesion: Math.round(85 - (coupling / files.length) * 2) // Simplified inverse relationship
    };
  }

  /**
   * Calculate cyclomatic complexity using centralized calculator
   */
  private calculateFileCyclomaticComplexity(content: string): number {
    const complexityThresholds = {
      low: this.config.codeAnalysis.quality.complexityThresholds.medium,
      moderate: this.config.codeAnalysis.quality.complexityThresholds.high,
      high: this.config.codeAnalysis.quality.complexityThresholds.high * 2
    };
    return calculateCyclomaticComplexity(content, { thresholds: complexityThresholds }).cyclomaticComplexity;
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(
    patterns: ArchitecturalPattern[],
    codeSmells: CodeSmell[],
    metrics: ArchitecturalAnalysis['metrics']
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Maintainability recommendations
    if (metrics.maintainabilityIndex < this.config.codeAnalysis.quality.maintainabilityThresholds.fair) {
      recommendations.push('Consider refactoring to improve maintainability index');
    }

    // Code smell recommendations
    const criticalSmells = codeSmells.filter(s => s.severity === 'critical' || s.severity === 'high');
    if (criticalSmells.length > 0) {
      recommendations.push(`Address ${criticalSmells.length} critical code smell(s) to improve code quality`);
    }

    // Pattern recommendations
    if (patterns.length === 0) {
      recommendations.push('Consider implementing design patterns to improve code structure');
    }

    // Complexity recommendations
    if (metrics.complexity > this.config.codeAnalysis.quality.complexityThresholds.high) {
      recommendations.push('Reduce code complexity through method extraction and simplification');
    }

    // Coupling recommendations
    if (metrics.coupling > 10) {
      recommendations.push('Reduce coupling between components through dependency injection');
    }

    return recommendations;
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(
    patterns: ArchitecturalPattern[],
    codeSmells: CodeSmell[],
    metrics: ArchitecturalAnalysis['metrics']
  ): string {
    const patternCount = patterns.length;
    const smellCount = codeSmells.length;
    const criticalSmells = codeSmells.filter(s => s.severity === 'critical' || s.severity === 'high').length;

    return `Architectural analysis found ${patternCount} design pattern(s) and ${smellCount} code smell(s) ` +
           `(${criticalSmells} critical). Maintainability index: ${metrics.maintainabilityIndex}/100. ` +
           `Complexity: ${metrics.complexity}, Coupling: ${metrics.coupling}.`;
  }
}