/**
 * Enhanced Code Editor
 *
 * Provides advanced AI-powered code editing capabilities with AST-aware editing,
 * multi-file operations, template-based generation, and intelligent validation.
 *
 * Built upon the existing CodeEditor foundation with enhanced capabilities.
 */

import { promises as fs } from 'fs';
import { normalizeError } from '../utils/error-utils.js';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { CodeEditor, CodeEdit, EditResult, ValidationResult } from './code-editor.js';
import { getOrCompileGlobalRegex } from '../utils/regex-cache.js';

// Core interfaces for enhanced editing capabilities
export interface EditRequest {
  type: 'create' | 'modify' | 'refactor' | 'replace' | 'insert';
  files: FileEditOperation[];
  context?: CodeContext;
  validation?: ValidationLevel;
  preview?: boolean;
  atomic?: boolean; // All operations succeed or all fail
}

export interface FileEditOperation {
  path: string;
  action: EditAction;
  content?: string;
  searchPattern?: string | RegExp;
  replaceContent?: string;
  insertLocation?: InsertLocation;
  templateData?: Record<string, any>;
  description?: string;
}

export interface EditAction {
  type: 'create-file' | 'modify-content' | 'find-replace' | 'insert-at' | 'delete-lines' | 'refactor-ast';
  parameters: Record<string, any>;
}

export interface InsertLocation {
  type: 'start' | 'end' | 'line-number' | 'after-pattern' | 'before-pattern' | 'ast-node';
  value: number | string | ASTLocation;
}

export interface ASTLocation {
  nodeType: string; // 'function' | 'class' | 'interface' | 'import'
  name?: string;
  position?: 'start' | 'end' | 'after' | 'before';
}

export interface CodeContext {
  projectRoot: string;
  language: string;
  framework?: string;
  dependencies: string[];
  relatedFiles: string[];
  codeStyle?: CodingStyle;
}

export interface CodingStyle {
  indentation: 'spaces' | 'tabs';
  indentSize: number;
  semicolons: boolean;
  quotes: 'single' | 'double';
  trailingComma: boolean;
  lineEnding: 'lf' | 'crlf';
}

export enum ValidationLevel {
  SYNTAX_ONLY = 'syntax',
  SEMANTIC = 'semantic',
  FULL_PROJECT = 'full',
  AI_ENHANCED = 'ai-enhanced'
}

// Enhanced edit result with more detailed information
export interface EnhancedEditResult extends EditResult {
  previewDiff?: string;
  affectedFiles?: string[];
  suggestedTests?: string[];
  codeQualityScore?: number;
  estimatedImpact?: ImpactAssessment;
}

export interface ImpactAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedComponents: string[];
  requiredTests: string[];
  documentationUpdates: string[];
  breakingChanges: boolean;
}

// Template system interfaces
export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  framework?: string;
  template: string;
  parameters: TemplateParameter[];
  dependencies?: string[];
}

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  validation?: (value: any) => boolean;
}

// AST-related interfaces
export interface ASTNode {
  type: string;
  name?: string;
  start: number;
  end: number;
  children?: ASTNode[];
  properties?: Record<string, any>;
}

export interface ASTEdit {
  nodeType: string;
  operation: 'insert' | 'replace' | 'delete' | 'modify';
  target: ASTNode | string; // Node reference or selector
  newContent?: string;
  position?: 'before' | 'after' | 'inside';
}

/**
 * Enhanced Code Editor class extending the base CodeEditor
 */
export class EnhancedCodeEditor extends CodeEditor {
  private templates = new Map<string, CodeTemplate>();
  private astCache = new Map<string, ASTNode[]>();
  private projectContext?: CodeContext;

  constructor(backupDir = '.ollama-code-backups') {
    super(backupDir);
  }

  /**
   * Initialize the enhanced code editor with project context
   */
  async initializeWithContext(context: CodeContext): Promise<void> {
    await this.initialize();
    this.projectContext = context;
    await this.loadDefaultTemplates();
    logger.debug('Enhanced code editor initialized with context', {
      projectRoot: context.projectRoot,
      language: context.language
    });
  }

  /**
   * Execute a comprehensive edit request
   */
  async executeEditRequest(request: EditRequest): Promise<EnhancedEditResult[]> {
    const results: EnhancedEditResult[] = [];
    const operationId = uuidv4();

    try {
      logger.info('Executing edit request', {
        operationId,
        type: request.type,
        fileCount: request.files.length
      });

      // Validate the request
      const validation = await this.validateEditRequest(request);
      if (!validation.isValid) {
        throw new Error(`Edit request validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate preview if requested
      if (request.preview) {
        return await this.generateEditPreview(request);
      }

      // Process each file operation
      for (const fileOp of request.files) {
        const result = await this.executeFileOperation(fileOp, request);
        results.push(result);

        // If atomic and any operation fails, rollback all
        if (request.atomic && !result.success) {
          await this.rollbackOperations(results.filter(r => r.success));
          throw new Error(`Atomic operation failed at file: ${fileOp.path}`);
        }
      }

      // Perform post-operation validation if requested
      if (request.validation && request.validation !== ValidationLevel.SYNTAX_ONLY) {
        await this.performEnhancedValidation(results, request.validation);
      }

      logger.info('Edit request completed successfully', {
        operationId,
        successCount: results.filter(r => r.success).length
      });

      return results;

    } catch (error) {
      logger.error('Edit request failed:', error);

      // Rollback any successful operations if atomic
      if (request.atomic) {
        await this.rollbackOperations(results.filter(r => r.success));
      }

      throw error;
    }
  }

  /**
   * Execute a single file operation
   */
  private async executeFileOperation(
    fileOp: FileEditOperation,
    request: EditRequest
  ): Promise<EnhancedEditResult> {
    try {
      let content: string;

      // Determine the content based on operation type
      switch (fileOp.action.type) {
        case 'create-file':
          content = await this.generateFileContent(fileOp, request.context);
          break;

        case 'modify-content':
          content = fileOp.content || '';
          break;

        case 'find-replace':
          content = await this.performFindReplace(fileOp);
          break;

        case 'insert-at':
          content = await this.performInsertAt(fileOp);
          break;

        case 'refactor-ast':
          content = await this.performASTRefactor(fileOp);
          break;

        default:
          throw new Error(`Unsupported operation type: ${fileOp.action.type}`);
      }

      // Create the edit using the base editor
      const baseResult = await this.createEdit(fileOp.path, content, fileOp.description);

      if (!baseResult.success) {
        return this.enhanceEditResult(baseResult, fileOp);
      }

      // Apply the edit
      const applyResult = await this.applyEdit(baseResult.editId);
      const enhancedResult = this.enhanceEditResult(applyResult, fileOp);

      // Generate additional metadata
      if (enhancedResult.success) {
        enhancedResult.codeQualityScore = await this.assessCodeQuality(fileOp.path);
        enhancedResult.estimatedImpact = await this.assessImpact(fileOp, request.context);
      }

      return enhancedResult;

    } catch (error) {
      logger.error(`File operation failed for ${fileOp.path}:`, error);
      return {
        success: false,
        editId: uuidv4(),
        error: normalizeError(error).message,
        affectedFiles: [fileOp.path]
      };
    }
  }

  /**
   * Generate file content using templates
   */
  private async generateFileContent(
    fileOp: FileEditOperation,
    context?: CodeContext
  ): Promise<string> {
    if (fileOp.templateData && fileOp.action.parameters.templateId) {
      return await this.applyTemplate(
        fileOp.action.parameters.templateId,
        fileOp.templateData,
        context
      );
    }

    return fileOp.content || '';
  }

  /**
   * Perform find and replace operation
   */
  private async performFindReplace(fileOp: FileEditOperation): Promise<string> {
    const currentContent = await fs.readFile(fileOp.path, 'utf-8').catch(() => '');

    if (!fileOp.searchPattern || !fileOp.replaceContent) {
      throw new Error('Find-replace operation requires searchPattern and replaceContent');
    }

    const pattern = typeof fileOp.searchPattern === 'string'
      ? getOrCompileGlobalRegex(fileOp.searchPattern)
      : fileOp.searchPattern;

    return currentContent.replace(pattern, fileOp.replaceContent);
  }

  /**
   * Perform insert at specific location
   */
  private async performInsertAt(fileOp: FileEditOperation): Promise<string> {
    const currentContent = await fs.readFile(fileOp.path, 'utf-8').catch(() => '');
    const lines = currentContent.split('\n');

    if (!fileOp.insertLocation || !fileOp.content) {
      throw new Error('Insert operation requires insertLocation and content');
    }

    const location = fileOp.insertLocation;
    let insertIndex: number;

    switch (location.type) {
      case 'start':
        insertIndex = 0;
        break;
      case 'end':
        insertIndex = lines.length;
        break;
      case 'line-number':
        insertIndex = Math.max(0, Math.min(Number(location.value), lines.length));
        break;
      case 'after-pattern':
        insertIndex = this.findPatternLine(lines, String(location.value)) + 1;
        break;
      case 'before-pattern':
        insertIndex = this.findPatternLine(lines, String(location.value));
        break;
      default:
        throw new Error(`Unsupported insert location type: ${location.type}`);
    }

    lines.splice(insertIndex, 0, fileOp.content);
    return lines.join('\n');
  }

  /**
   * Perform AST-based refactoring (placeholder for now)
   */
  private async performASTRefactor(fileOp: FileEditOperation): Promise<string> {
    // This would integrate with TypeScript compiler API or other AST parsers
    // For now, return the original content or provided content
    const currentContent = await fs.readFile(fileOp.path, 'utf-8').catch(() => '');

    // TODO: Implement actual AST manipulation
    logger.warn('AST refactoring not yet implemented, returning original content');

    return fileOp.content || currentContent;
  }

  /**
   * Apply a template with given data
   */
  private async applyTemplate(
    templateId: string,
    data: Record<string, any>,
    context?: CodeContext
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate template parameters
    for (const param of template.parameters) {
      if (param.required && !(param.name in data)) {
        throw new Error(`Required template parameter missing: ${param.name}`);
      }

      if (param.validation && data[param.name] && !param.validation(data[param.name])) {
        throw new Error(`Invalid value for parameter: ${param.name}`);
      }
    }

    // Simple template engine (would be enhanced with a proper template library)
    let result = template.template;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      const regex = getOrCompileGlobalRegex(this.escapeRegex(placeholder));
      result = result.replace(regex, String(value));
    }

    // Apply coding style if available
    if (context?.codeStyle) {
      result = this.applyCodingStyle(result, context.codeStyle);
    }

    return result;
  }

  /**
   * Load default templates for common code patterns
   */
  private async loadDefaultTemplates(): Promise<void> {
    // React component template
    this.templates.set('react-component', {
      id: 'react-component',
      name: 'React Component',
      description: 'Functional React component with TypeScript',
      language: 'typescript',
      framework: 'react',
      template: `import React from 'react';

interface {{componentName}}Props {
  {{#each props}}
  {{name}}: {{type}};
  {{/each}}
}

export const {{componentName}}: React.FC<{{componentName}}Props> = ({{propsDestructured}}) => {
  return (
    <div>
      {/* {{componentName}} component */}
      {{content}}
    </div>
  );
};

export default {{componentName}};`,
      parameters: [
        { name: 'componentName', type: 'string', description: 'Component name', required: true },
        { name: 'props', type: 'array', description: 'Component props', required: false, default: [] },
        { name: 'content', type: 'string', description: 'Component content', required: false, default: '' }
      ]
    });

    // Node.js Express route template
    this.templates.set('express-route', {
      id: 'express-route',
      name: 'Express Route',
      description: 'Express.js route handler with TypeScript',
      language: 'typescript',
      framework: 'express',
      template: `import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export const {{routeName}} = async (req: Request, res: Response): Promise<void> => {
  try {
    {{content}}

    res.json({ success: true });
  } catch (error) {
    logger.error('{{routeName}} error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};`,
      parameters: [
        { name: 'routeName', type: 'string', description: 'Route handler name', required: true },
        { name: 'content', type: 'string', description: 'Route logic', required: false, default: '// Route implementation' }
      ]
    });

    logger.debug('Loaded default templates', { count: this.templates.size });
  }

  /**
   * Enhance edit result with additional metadata
   */
  private enhanceEditResult(baseResult: EditResult, fileOp: FileEditOperation): EnhancedEditResult {
    return {
      ...baseResult,
      affectedFiles: [fileOp.path],
      previewDiff: undefined, // Would generate actual diff
      suggestedTests: [], // Would analyze and suggest tests
      codeQualityScore: undefined,
      estimatedImpact: undefined
    };
  }

  /**
   * Validate edit request before execution
   */
  private async validateEditRequest(request: EditRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!request.files || request.files.length === 0) {
      errors.push('Edit request must include at least one file operation');
    }

    for (const fileOp of request.files) {
      if (!fileOp.path) {
        errors.push('File operation must specify a path');
      }

      if (!fileOp.action || !fileOp.action.type) {
        errors.push(`File operation for ${fileOp.path} must specify an action type`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate preview of edit operations without applying them
   */
  private async generateEditPreview(request: EditRequest): Promise<EnhancedEditResult[]> {
    const previews: EnhancedEditResult[] = [];

    for (const fileOp of request.files) {
      try {
        const currentContent = await fs.readFile(fileOp.path, 'utf-8').catch(() => '');
        const newContent = await this.generateFileContent(fileOp, request.context);

        // Generate diff (simplified)
        const previewDiff = this.generateDiff(currentContent, newContent);

        previews.push({
          success: true,
          editId: `preview-${uuidv4()}`,
          affectedFiles: [fileOp.path],
          previewDiff,
          estimatedImpact: await this.assessImpact(fileOp, request.context)
        });
      } catch (error) {
        previews.push({
          success: false,
          editId: `preview-${uuidv4()}`,
          error: normalizeError(error).message,
          affectedFiles: [fileOp.path]
        });
      }
    }

    return previews;
  }

  /**
   * Utility methods
   */
  private findPatternLine(lines: string[], pattern: string): number {
    const index = lines.findIndex(line => line.includes(pattern));
    return index === -1 ? lines.length : index;
  }

  private applyCodingStyle(content: string, style: CodingStyle): string {
    // Apply coding style transformations
    let result = content;

    // Apply indentation
    if (style.indentation === 'spaces') {
      result = result.replace(/\t/g, ' '.repeat(style.indentSize));
    } else {
      const spacesRegex = getOrCompileGlobalRegex(` {${style.indentSize}}`);
      result = result.replace(spacesRegex, '\t');
    }

    // Apply line endings
    if (style.lineEnding === 'crlf') {
      result = result.replace(/\n/g, '\r\n');
    }

    return result;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generateDiff(oldContent: string, newContent: string): string {
    // Simplified diff generation - would use a proper diff library
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    return `--- Old\n+++ New\n@@ -1,${oldLines.length} +1,${newLines.length} @@\n${
      newLines.map(line => `+${line}`).join('\n')
    }`;
  }

  private async assessCodeQuality(filePath: string): Promise<number> {
    // Placeholder for code quality assessment
    // Would integrate with ESLint, TSLint, or other quality tools
    return Math.random() * 100; // Mock score
  }

  private async assessImpact(
    fileOp: FileEditOperation,
    context?: CodeContext
  ): Promise<ImpactAssessment> {
    // Placeholder for impact assessment
    return {
      riskLevel: 'low',
      affectedComponents: [],
      requiredTests: [],
      documentationUpdates: [],
      breakingChanges: false
    };
  }

  private async performEnhancedValidation(
    results: EnhancedEditResult[],
    level: ValidationLevel
  ): Promise<void> {
    // Placeholder for enhanced validation
    logger.debug('Performing enhanced validation', { level, resultCount: results.length });
  }

  private async rollbackOperations(results: EnhancedEditResult[]): Promise<void> {
    for (const result of results.reverse()) {
      if (result.editId && result.success) {
        await this.rollbackEdit(result.editId);
      }
    }
  }

  /**
   * Public API methods
   */

  /**
   * Add a custom template
   */
  addTemplate(template: CodeTemplate): void {
    this.templates.set(template.id, template);
    logger.debug('Added custom template', { id: template.id, name: template.name });
  }

  /**
   * Get available templates
   */
  getTemplates(): CodeTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by language or framework
   */
  getTemplatesByContext(language?: string, framework?: string): CodeTemplate[] {
    return Array.from(this.templates.values()).filter(template => {
      const langMatch = !language || template.language === language;
      const frameworkMatch = !framework || template.framework === framework;
      return langMatch && frameworkMatch;
    });
  }
}
