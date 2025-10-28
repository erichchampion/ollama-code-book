/**
 * Commit Message Generator
 *
 * AI-powered commit message generation based on git diff analysis,
 * conventional commit standards, and project context. Provides
 * intelligent, descriptive commit messages that follow best practices.
 */

import { logger } from '../../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { AI_CONSTANTS } from '../../config/constants.js';

const execAsync = promisify(exec);

export interface CommitMessageConfig {
  repositoryPath: string;
  style: 'conventional' | 'descriptive' | 'minimal' | 'custom';
  maxLength: number;
  includeScope: boolean;
  includeBody: boolean;
  includeFooter: boolean;
  customTemplate?: string;
  aiProvider?: string; // Which AI provider to use for generation
}

export interface CommitAnalysis {
  changedFiles: ChangedFile[];
  overallChangeType: CommitType;
  scope: string | null;
  impactLevel: 'patch' | 'minor' | 'major';
  summary: string;
  suggestions: string[];
}

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string;
  insertions: number;
  deletions: number;
  changeType: ChangeType;
  scope: string;
}

export interface GeneratedCommitMessage {
  message: string;
  type: CommitType;
  scope: string | null;
  subject: string;
  body: string | null;
  footer: string | null;
  confidence: number;
  alternatives: string[];
  analysis: CommitAnalysis;
}

export type CommitType =
  | 'feat'     // New feature
  | 'fix'      // Bug fix
  | 'docs'     // Documentation changes
  | 'style'    // Code style changes (formatting, etc.)
  | 'refactor' // Code refactoring
  | 'perf'     // Performance improvements
  | 'test'     // Test-related changes
  | 'build'    // Build system changes
  | 'ci'       // CI/CD changes
  | 'chore'    // Maintenance tasks
  | 'revert'   // Revert previous commit
  | 'wip';     // Work in progress

export type ChangeType =
  | 'feature'
  | 'bugfix'
  | 'documentation'
  | 'styling'
  | 'refactoring'
  | 'performance'
  | 'testing'
  | 'configuration'
  | 'maintenance';

/**
 * AI-powered commit message generator
 */
export class CommitMessageGenerator {
  private config: CommitMessageConfig;
  private aiClient: any; // Would be injected from main AI client

  constructor(config: CommitMessageConfig, aiClient?: any) {
    this.config = config;
    this.aiClient = aiClient;
  }

  /**
   * Generate commit message from current staged changes
   */
  async generateCommitMessage(): Promise<GeneratedCommitMessage> {
    try {
      logger.info('Generating commit message from staged changes');

      // Analyze staged changes
      const analysis = await this.analyzeChanges();

      // Generate message based on style
      const message = await this.generateMessage(analysis);

      logger.info('Commit message generated successfully', {
        type: message.type,
        confidence: message.confidence,
        alternativeCount: message.alternatives.length
      });

      return message;
    } catch (error) {
      logger.error('Failed to generate commit message', error);
      throw error;
    }
  }

  /**
   * Generate commit message from specific diff or commit
   */
  async generateFromDiff(diffText: string): Promise<GeneratedCommitMessage> {
    try {
      logger.info('Generating commit message from provided diff');

      const analysis = await this.analyzeDiff(diffText);
      const message = await this.generateMessage(analysis);

      return message;
    } catch (error) {
      logger.error('Failed to generate commit message from diff', error);
      throw error;
    }
  }

  /**
   * Analyze current staged changes
   */
  private async analyzeChanges(): Promise<CommitAnalysis> {
    try {
      // Get staged diff
      const { stdout: diffOutput } = await execAsync('git diff --cached --stat --name-status', {
        cwd: this.config.repositoryPath
      });

      if (!diffOutput.trim()) {
        throw new Error('No staged changes found');
      }

      // Get detailed diff for AI analysis
      const { stdout: detailedDiff } = await execAsync('git diff --cached', {
        cwd: this.config.repositoryPath
      });

      return await this.analyzeDiff(detailedDiff);
    } catch (error) {
      logger.error('Failed to analyze staged changes', error);
      throw error;
    }
  }

  /**
   * Analyze git diff to understand changes
   */
  private async analyzeDiff(diffText: string): Promise<CommitAnalysis> {
    try {
      const changedFiles = this.parseChangedFiles(diffText);
      const overallChangeType = this.determineOverallChangeType(changedFiles);
      const scope = this.determineScope(changedFiles);
      const impactLevel = this.determineImpactLevel(changedFiles);
      const summary = this.generateSummary(changedFiles);
      const suggestions = this.generateSuggestions(changedFiles, overallChangeType);

      return {
        changedFiles,
        overallChangeType,
        scope,
        impactLevel,
        summary,
        suggestions
      };
    } catch (error) {
      logger.error('Failed to analyze diff', error);
      throw error;
    }
  }

  /**
   * Parse changed files from git diff
   */
  private parseChangedFiles(diffText: string): ChangedFile[] {
    const files: ChangedFile[] = [];
    const diffLines = diffText.split('\n');
    let currentFile: ChangedFile | null = null;

    for (const line of diffLines) {
      // Parse diff headers
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          files.push(currentFile);
        }

        const pathMatch = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (pathMatch) {
          currentFile = {
            path: pathMatch[2],
            status: pathMatch[1] === pathMatch[2] ? 'modified' : 'renamed',
            oldPath: pathMatch[1] !== pathMatch[2] ? pathMatch[1] : undefined,
            insertions: 0,
            deletions: 0,
            changeType: 'feature', // Will be determined later
            scope: this.extractScope(pathMatch[2])
          };
        }
      } else if (line.startsWith('new file mode')) {
        if (currentFile) currentFile.status = 'added';
      } else if (line.startsWith('deleted file mode')) {
        if (currentFile) currentFile.status = 'deleted';
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        if (currentFile) currentFile.insertions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        if (currentFile) currentFile.deletions++;
      }
    }

    if (currentFile) {
      files.push(currentFile);
    }

    // Determine change types
    files.forEach(file => {
      file.changeType = this.determineChangeType(file);
    });

    return files;
  }

  /**
   * Extract scope from file path
   */
  private extractScope(filePath: string): string {
    const pathParts = filePath.split('/');

    // Common scope patterns
    if (pathParts.includes('src')) {
      const srcIndex = pathParts.indexOf('src');
      if (srcIndex + 1 < pathParts.length) {
        return pathParts[srcIndex + 1];
      }
    }

    if (pathParts.includes('lib')) {
      const libIndex = pathParts.indexOf('lib');
      if (libIndex + 1 < pathParts.length) {
        return pathParts[libIndex + 1];
      }
    }

    // Check for common module patterns
    if (pathParts.length > 1) {
      const firstDir = pathParts[0];
      if (['components', 'services', 'utils', 'api', 'models', 'controllers'].includes(firstDir)) {
        return firstDir;
      }
    }

    // File extension based scope
    const ext = path.extname(filePath).slice(1);
    if (ext) {
      const extToScope: Record<string, string> = {
        'md': 'docs',
        'json': 'config',
        'yml': 'config',
        'yaml': 'config',
        'Dockerfile': 'docker',
        'test.ts': 'test',
        'spec.ts': 'test',
        'test.js': 'test',
        'spec.js': 'test'
      };

      if (extToScope[ext] || filePath.includes('.test.') || filePath.includes('.spec.')) {
        return extToScope[ext] || 'test';
      }
    }

    return pathParts[0] || 'core';
  }

  /**
   * Determine change type for a file
   */
  private determineChangeType(file: ChangedFile): ChangeType {
    const { path: filePath, insertions, deletions, status } = file;

    // Documentation files
    if (filePath.endsWith('.md') || filePath.includes('docs/') || filePath.includes('README')) {
      return 'documentation';
    }

    // Test files
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('/test/') || filePath.includes('/tests/')) {
      return 'testing';
    }

    // Configuration files
    if (filePath.includes('config') || filePath.endsWith('.json') || filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
      return 'configuration';
    }

    // Style files
    if (filePath.endsWith('.css') || filePath.endsWith('.scss') || filePath.endsWith('.less')) {
      return 'styling';
    }

    // New files are likely features
    if (status === 'added') {
      return 'feature';
    }

    // Deleted files are maintenance
    if (status === 'deleted') {
      return 'maintenance';
    }

    // High deletion ratio might indicate refactoring
    if (deletions > insertions && deletions > 10) {
      return 'refactoring';
    }

    // Small changes might be bug fixes
    if (insertions + deletions < 20) {
      return 'bugfix';
    }

    // Large changes might be features
    if (insertions > 50) {
      return 'feature';
    }

    // Performance-related keywords in path
    if (filePath.includes('performance') || filePath.includes('optimization')) {
      return 'performance';
    }

    // Default to feature for new code
    return insertions > deletions ? 'feature' : 'maintenance';
  }

  /**
   * Determine overall commit type
   */
  private determineOverallChangeType(files: ChangedFile[]): CommitType {
    if (files.length === 0) return 'chore';

    const changeTypeCounts = new Map<ChangeType, number>();
    files.forEach(file => {
      const current = changeTypeCounts.get(file.changeType) || 0;
      changeTypeCounts.set(file.changeType, current + 1);
    });

    // Find the most common change type
    const mostCommon = Array.from(changeTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const changeTypeToCommitType: Record<ChangeType, CommitType> = {
      'feature': 'feat',
      'bugfix': 'fix',
      'documentation': 'docs',
      'styling': 'style',
      'refactoring': 'refactor',
      'performance': 'perf',
      'testing': 'test',
      'configuration': files.some(f => f.path.includes('ci') || f.path.includes('.github')) ? 'ci' : 'build',
      'maintenance': 'chore'
    };

    return changeTypeToCommitType[mostCommon[0]] || 'feat';
  }

  /**
   * Determine scope from changed files
   */
  private determineScope(files: ChangedFile[]): string | null {
    if (!this.config.includeScope || files.length === 0) return null;

    // Get all scopes
    const scopes = files.map(f => f.scope);
    const scopeCounts = new Map<string, number>();

    scopes.forEach(scope => {
      const current = scopeCounts.get(scope) || 0;
      scopeCounts.set(scope, current + 1);
    });

    // If all files have the same scope, use it
    if (scopeCounts.size === 1) {
      return scopes[0];
    }

    // If changes span multiple scopes, use the most common or null
    if (scopeCounts.size > 3) {
      return null; // Too many scopes
    }

    const mostCommon = Array.from(scopeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    return mostCommon[1] > 1 ? mostCommon[0] : null;
  }

  /**
   * Determine impact level of changes
   */
  private determineImpactLevel(files: ChangedFile[]): 'patch' | 'minor' | 'major' {
    const totalChanges = files.reduce((sum, f) => sum + f.insertions + f.deletions, 0);
    const newFiles = files.filter(f => f.status === 'added').length;
    const deletedFiles = files.filter(f => f.status === 'deleted').length;

    // Major changes: many new/deleted files or very large changes
    if (newFiles > 5 || deletedFiles > 3 || totalChanges > 500) {
      return 'major';
    }

    // Minor changes: new features or moderate changes
    if (newFiles > 0 || totalChanges > 100 || files.some(f => f.changeType === 'feature')) {
      return 'minor';
    }

    // Patch changes: small fixes and updates
    return 'patch';
  }

  /**
   * Generate summary of changes
   */
  private generateSummary(files: ChangedFile[]): string {
    if (files.length === 0) return 'no changes';

    const fileCount = files.length;
    const totalLines = files.reduce((sum, f) => sum + f.insertions + f.deletions, 0);
    const changeTypes = [...new Set(files.map(f => f.changeType))];

    return `${fileCount} file${fileCount > 1 ? 's' : ''} changed, ${totalLines} lines affected (${changeTypes.join(', ')})`;
  }

  /**
   * Generate suggestions for commit message
   */
  private generateSuggestions(files: ChangedFile[], commitType: CommitType): string[] {
    const suggestions: string[] = [];

    // Suggest breaking changes if major impact
    const impactLevel = this.determineImpactLevel(files);
    if (impactLevel === 'major') {
      suggestions.push('Consider if this is a breaking change and add ! after type if so');
    }

    // Suggest testing if no test files changed
    const hasTestChanges = files.some(f => f.changeType === 'testing');
    if (commitType === 'feat' && !hasTestChanges) {
      suggestions.push('Consider adding tests for new features');
    }

    // Suggest documentation if significant changes
    const hasDocChanges = files.some(f => f.changeType === 'documentation');
    if ((commitType === 'feat' || impactLevel === 'major') && !hasDocChanges) {
      suggestions.push('Consider updating documentation for significant changes');
    }

    return suggestions;
  }

  /**
   * Generate the actual commit message
   */
  private async generateMessage(analysis: CommitAnalysis): Promise<GeneratedCommitMessage> {
    try {
      let message: string;
      let alternatives: string[] = [];

      switch (this.config.style) {
        case 'conventional':
          message = this.generateConventionalMessage(analysis);
          alternatives = this.generateConventionalAlternatives(analysis);
          break;
        case 'descriptive':
          message = this.generateDescriptiveMessage(analysis);
          alternatives = this.generateDescriptiveAlternatives(analysis);
          break;
        case 'minimal':
          message = this.generateMinimalMessage(analysis);
          alternatives = this.generateMinimalAlternatives(analysis);
          break;
        case 'custom':
          message = this.generateCustomMessage(analysis);
          alternatives = [];
          break;
        default:
          message = this.generateConventionalMessage(analysis);
          alternatives = this.generateConventionalAlternatives(analysis);
      }

      // AI enhancement if available
      if (this.aiClient) {
        const enhanced = await this.enhanceWithAI(message, analysis, alternatives);
        message = enhanced.message;
        alternatives = enhanced.alternatives;
      }

      const parts = this.parseCommitMessage(message);

      return {
        message,
        type: analysis.overallChangeType,
        scope: analysis.scope,
        subject: parts.subject,
        body: parts.body,
        footer: parts.footer,
        confidence: this.calculateConfidence(analysis),
        alternatives,
        analysis
      };
    } catch (error) {
      logger.error('Failed to generate commit message', error);
      throw error;
    }
  }

  /**
   * Generate conventional commit message
   */
  private generateConventionalMessage(analysis: CommitAnalysis): string {
    const { overallChangeType: type, scope } = analysis;

    let subject = this.generateSubject(analysis);

    // Truncate subject if too long
    const maxSubjectLength = this.config.maxLength - (scope ? scope.length + 4 : 2) - type.length;
    if (subject.length > maxSubjectLength) {
      subject = subject.substring(0, maxSubjectLength - 3) + '...';
    }

    let message = scope ? `${type}(${scope}): ${subject}` : `${type}: ${subject}`;

    if (this.config.includeBody) {
      const body = this.generateBody(analysis);
      if (body) {
        message += '\n\n' + body;
      }
    }

    if (this.config.includeFooter) {
      const footer = this.generateFooter(analysis);
      if (footer) {
        message += '\n\n' + footer;
      }
    }

    return message;
  }

  /**
   * Generate descriptive commit message
   */
  private generateDescriptiveMessage(analysis: CommitAnalysis): string {
    const subject = this.generateDescriptiveSubject(analysis);
    let message = subject;

    if (this.config.includeBody) {
      const body = this.generateBody(analysis);
      if (body) {
        message += '\n\n' + body;
      }
    }

    return message;
  }

  /**
   * Generate minimal commit message
   */
  private generateMinimalMessage(analysis: CommitAnalysis): string {
    return this.generateSubject(analysis);
  }

  /**
   * Generate custom commit message using template
   */
  private generateCustomMessage(analysis: CommitAnalysis): string {
    if (!this.config.customTemplate) {
      return this.generateConventionalMessage(analysis);
    }

    // Simple template substitution
    return this.config.customTemplate
      .replace('{{type}}', analysis.overallChangeType)
      .replace('{{scope}}', analysis.scope || '')
      .replace('{{subject}}', this.generateSubject(analysis))
      .replace('{{body}}', this.generateBody(analysis) || '')
      .replace('{{footer}}', this.generateFooter(analysis) || '');
  }

  /**
   * Generate subject line
   */
  private generateSubject(analysis: CommitAnalysis): string {
    const { changedFiles, overallChangeType } = analysis;

    if (changedFiles.length === 1) {
      const file = changedFiles[0];
      const filename = path.basename(file.path);

      switch (overallChangeType) {
        case 'feat':
          return `add ${filename} functionality`;
        case 'fix':
          return `fix issues in ${filename}`;
        case 'docs':
          return `update ${filename} documentation`;
        case 'style':
          return `improve ${filename} formatting`;
        case 'refactor':
          return `refactor ${filename}`;
        case 'test':
          return `add tests for ${filename}`;
        default:
          return `update ${filename}`;
      }
    }

    // Multiple files
    const scopes = [...new Set(changedFiles.map(f => f.scope))];
    const scopeText = scopes.length === 1 ? scopes[0] : `${scopes.length} areas`;

    switch (overallChangeType) {
      case 'feat':
        return `add new functionality to ${scopeText}`;
      case 'fix':
        return `fix issues in ${scopeText}`;
      case 'docs':
        return `update documentation for ${scopeText}`;
      case 'style':
        return `improve code formatting in ${scopeText}`;
      case 'refactor':
        return `refactor code in ${scopeText}`;
      case 'test':
        return `add tests for ${scopeText}`;
      case 'chore':
        return `update ${scopeText} maintenance`;
      default:
        return `update ${scopeText}`;
    }
  }

  /**
   * Generate descriptive subject line
   */
  private generateDescriptiveSubject(analysis: CommitAnalysis): string {
    const { changedFiles, overallChangeType, summary } = analysis;

    const actionWords = {
      'feat': 'Implement',
      'fix': 'Fix',
      'docs': 'Update',
      'style': 'Format',
      'refactor': 'Refactor',
      'perf': 'Optimize',
      'test': 'Test',
      'build': 'Build',
      'ci': 'Configure',
      'chore': 'Maintain',
      'revert': 'Revert',
      'wip': 'Work on'
    };

    const action = actionWords[overallChangeType] || 'Update';

    if (changedFiles.length === 1) {
      const file = changedFiles[0];
      const component = this.extractComponentName(file.path);
      return `${action} ${component}`;
    }

    return `${action} multiple components (${changedFiles.length} files)`;
  }

  /**
   * Extract component name from file path
   */
  private extractComponentName(filePath: string): string {
    const filename = path.basename(filePath, path.extname(filePath));

    // Convert kebab-case, snake_case to title case
    return filename
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Generate commit body
   */
  private generateBody(analysis: CommitAnalysis): string | null {
    if (!this.config.includeBody) return null;

    const { changedFiles, summary } = analysis;
    const bodyParts: string[] = [];

    // Add summary
    bodyParts.push(`Changes: ${summary}`);

    // Add file details if multiple files
    if (changedFiles.length > 1) {
      bodyParts.push('');
      bodyParts.push('Modified files:');
      changedFiles.forEach(file => {
        const status = file.status === 'modified' ? 'M' :
                      file.status === 'added' ? 'A' :
                      file.status === 'deleted' ? 'D' : 'R';
        bodyParts.push(`- ${status} ${file.path} (+${file.insertions}/-${file.deletions})`);
      });
    }

    return bodyParts.length > 1 ? bodyParts.join('\n') : null;
  }

  /**
   * Generate commit footer
   */
  private generateFooter(analysis: CommitAnalysis): string | null {
    if (!this.config.includeFooter) return null;

    const footerParts: string[] = [];

    // Add breaking change notice if major impact
    if (analysis.impactLevel === 'major') {
      footerParts.push('BREAKING CHANGE: This commit may require manual intervention');
    }

    // Add suggestions as footer
    if (analysis.suggestions.length > 0) {
      footerParts.push('');
      footerParts.push('Recommendations:');
      analysis.suggestions.forEach(suggestion => {
        footerParts.push(`- ${suggestion}`);
      });
    }

    return footerParts.length > 0 ? footerParts.join('\n') : null;
  }

  /**
   * Generate alternative conventional messages
   */
  private generateConventionalAlternatives(analysis: CommitAnalysis): string[] {
    const alternatives: string[] = [];
    const { overallChangeType: type, scope } = analysis;

    // Different subject variations
    const subjectVariations = [
      this.generateSubject(analysis),
      this.generateDescriptiveSubject(analysis).toLowerCase(),
      this.generateMinimalDescription(analysis)
    ];

    subjectVariations.forEach(subject => {
      if (scope) {
        alternatives.push(`${type}(${scope}): ${subject}`);
      } else {
        alternatives.push(`${type}: ${subject}`);
      }
    });

    return [...new Set(alternatives)]; // Remove duplicates
  }

  /**
   * Generate alternative descriptive messages
   */
  private generateDescriptiveAlternatives(analysis: CommitAnalysis): string[] {
    return [
      this.generateDescriptiveSubject(analysis),
      this.generateSubject(analysis),
      this.generateMinimalDescription(analysis)
    ];
  }

  /**
   * Generate alternative minimal messages
   */
  private generateMinimalAlternatives(analysis: CommitAnalysis): string[] {
    return [
      this.generateMinimalDescription(analysis),
      this.generateSubject(analysis),
      `Update ${analysis.changedFiles.length} files`
    ];
  }

  /**
   * Generate minimal description
   */
  private generateMinimalDescription(analysis: CommitAnalysis): string {
    const { changedFiles } = analysis;

    if (changedFiles.length === 1) {
      return `Update ${path.basename(changedFiles[0].path)}`;
    }

    return `Update ${changedFiles.length} files`;
  }

  /**
   * Enhance message with AI if available
   */
  private async enhanceWithAI(
    message: string,
    analysis: CommitAnalysis,
    alternatives: string[]
  ): Promise<{ message: string; alternatives: string[] }> {
    try {
      if (!this.aiClient) {
        return { message, alternatives };
      }

      const prompt = `
Given this git diff analysis, please improve the commit message and suggest alternatives:

Current message: "${message}"
Change analysis: ${JSON.stringify(analysis, null, 2)}

Please provide:
1. An improved commit message following best practices
2. 2-3 alternative commit messages

Format your response as JSON:
{
  "improved": "improved commit message",
  "alternatives": ["alternative 1", "alternative 2", "alternative 3"]
}
`;

      const response = await this.aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.GIT_MESSAGE_TEMPERATURE,
        max_tokens: 500
      });

      if (response.message?.content) {
        try {
          const result = JSON.parse(response.message.content);
          return {
            message: result.improved || message,
            alternatives: result.alternatives || alternatives
          };
        } catch {
          // If JSON parsing fails, return original
          return { message, alternatives };
        }
      }

      return { message, alternatives };
    } catch (error) {
      logger.debug('AI enhancement failed, using original message', error);
      return { message, alternatives };
    }
  }

  /**
   * Parse commit message into components
   */
  private parseCommitMessage(message: string): {
    subject: string;
    body: string | null;
    footer: string | null;
  } {
    const lines = message.split('\n');
    const subject = lines[0] || '';

    let bodyStart = -1;
    let footerStart = -1;

    // Find body start (first non-empty line after subject)
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() && bodyStart === -1) {
        bodyStart = i;
        break;
      }
    }

    // Find footer start (lines starting with known footer prefixes)
    for (let i = bodyStart + 1; i < lines.length; i++) {
      if (lines[i].match(/^(BREAKING CHANGE:|Closes:|Fixes:|Refs:|Co-authored-by:)/)) {
        footerStart = i;
        break;
      }
    }

    const body = bodyStart !== -1 && footerStart !== -1
      ? lines.slice(bodyStart, footerStart).join('\n').trim()
      : bodyStart !== -1
        ? lines.slice(bodyStart).join('\n').trim()
        : null;

    const footer = footerStart !== -1
      ? lines.slice(footerStart).join('\n').trim()
      : null;

    return {
      subject,
      body: body || null,
      footer: footer || null
    };
  }

  /**
   * Calculate confidence score for generated message
   */
  private calculateConfidence(analysis: CommitAnalysis): number {
    let confidence = 70; // Base confidence

    // Higher confidence for single file changes
    if (analysis.changedFiles.length === 1) {
      confidence += 15;
    }

    // Higher confidence for clear change types
    const clearTypes = ['docs', 'test', 'style'];
    if (clearTypes.includes(analysis.overallChangeType)) {
      confidence += 10;
    }

    // Lower confidence for complex changes
    if (analysis.changedFiles.length > 10) {
      confidence -= 20;
    }

    // Higher confidence if scope is clear
    if (analysis.scope) {
      confidence += 5;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CommitMessageConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Commit message generator configuration updated', updates);
  }

  /**
   * Get current configuration
   */
  getConfig(): CommitMessageConfig {
    return { ...this.config };
  }
}