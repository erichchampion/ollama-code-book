/**
 * Safe Code Editor
 *
 * Provides safe, atomic code editing capabilities with backup, validation,
 * and rollback functionality for autonomous code modifications.
 */

import { promises as fs } from 'fs';
import { normalizeError } from '../utils/error-utils.js';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface CodeEdit {
  id: string;
  filePath: string;
  originalContent: string;
  newContent: string;
  backup?: string;
  applied: boolean;
  timestamp: Date;
  validationPassed: boolean;
  description?: string;
}

export interface EditResult {
  success: boolean;
  editId: string;
  backupPath?: string;
  validationErrors?: string[];
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export enum ValidationLevel {
  SYNTAX = 'syntax',
  SEMANTIC = 'semantic',
  FULL = 'full',
  AI_ENHANCED = 'ai-enhanced'
}

export class CodeEditor {
  private pendingEdits = new Map<string, CodeEdit>();
  private appliedEdits = new Map<string, CodeEdit>();
  private backupDir: string;

  constructor(backupDir = '.ollama-code-backups') {
    this.backupDir = backupDir;
  }

  /**
   * Initialize the code editor
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.debug('Code editor initialized', { backupDir: this.backupDir });
    } catch (error) {
      logger.error('Failed to initialize code editor:', error);
      throw error;
    }
  }

  /**
   * Create a safe file edit operation
   */
  async createEdit(
    filePath: string,
    newContent: string,
    description?: string
  ): Promise<EditResult> {
    const editId = uuidv4();

    try {
      // Ensure the file exists and read current content
      const absolutePath = path.resolve(filePath);
      let originalContent = '';

      try {
        originalContent = await fs.readFile(absolutePath, 'utf-8');
      } catch (error) {
        // File doesn't exist - that's ok for new files
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }

      // Validate the new content
      const validation = await this.validateContent(absolutePath, newContent);

      const edit: CodeEdit = {
        id: editId,
        filePath: absolutePath,
        originalContent,
        newContent,
        applied: false,
        timestamp: new Date(),
        validationPassed: validation.isValid,
        description
      };

      this.pendingEdits.set(editId, edit);

      logger.debug('Created edit operation', {
        editId,
        filePath: absolutePath,
        description,
        validationPassed: validation.isValid
      });

      return {
        success: true,
        editId,
        validationErrors: validation.isValid ? undefined : validation.errors
      };

    } catch (error) {
      logger.error('Failed to create edit:', error);
      return {
        success: false,
        editId,
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Apply a pending edit with backup
   */
  async applyEdit(editId: string): Promise<EditResult> {
    const edit = this.pendingEdits.get(editId);
    if (!edit) {
      return {
        success: false,
        editId,
        error: 'Edit not found'
      };
    }

    if (!edit.validationPassed) {
      return {
        success: false,
        editId,
        error: 'Edit validation failed - cannot apply'
      };
    }

    try {
      // Create backup before applying
      const backupPath = await this.createBackup(edit);
      edit.backup = backupPath;

      // Ensure directory exists
      const dir = path.dirname(edit.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Apply the edit atomically
      await this.atomicWrite(edit.filePath, edit.newContent);

      // Mark as applied and move to applied edits
      edit.applied = true;
      this.appliedEdits.set(editId, edit);
      this.pendingEdits.delete(editId);

      logger.info('Applied edit successfully', {
        editId,
        filePath: edit.filePath,
        backupPath,
        description: edit.description
      });

      return {
        success: true,
        editId,
        backupPath
      };

    } catch (error) {
      logger.error('Failed to apply edit:', error);
      return {
        success: false,
        editId,
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Apply multiple edits in a transaction
   */
  async applyEdits(editIds: string[]): Promise<EditResult[]> {
    const results: EditResult[] = [];
    const appliedEdits: string[] = [];

    try {
      // First, validate all edits can be applied
      for (const editId of editIds) {
        const edit = this.pendingEdits.get(editId);
        if (!edit) {
          throw new Error(`Edit ${editId} not found`);
        }
        if (!edit.validationPassed) {
          throw new Error(`Edit ${editId} validation failed`);
        }
      }

      // Apply each edit
      for (const editId of editIds) {
        const result = await this.applyEdit(editId);
        results.push(result);

        if (result.success) {
          appliedEdits.push(editId);
        } else {
          // If any edit fails, rollback all previously applied edits
          for (const appliedEditId of appliedEdits) {
            await this.rollbackEdit(appliedEditId);
          }
          throw new Error(`Edit ${editId} failed: ${result.error}`);
        }
      }

      return results;

    } catch (error) {
      logger.error('Failed to apply edit batch:', error);

      // Return error for failed edit, success for any that were applied before rollback
      return editIds.map(editId => ({
        success: false,
        editId,
        error: normalizeError(error).message
      }));
    }
  }

  /**
   * Rollback an applied edit
   */
  async rollbackEdit(editId: string): Promise<EditResult> {
    const edit = this.appliedEdits.get(editId);
    if (!edit) {
      return {
        success: false,
        editId,
        error: 'Edit not found or not applied'
      };
    }

    try {
      // Restore from backup or original content
      const contentToRestore = edit.backup
        ? await fs.readFile(edit.backup, 'utf-8')
        : edit.originalContent;

      await this.atomicWrite(edit.filePath, contentToRestore);

      // Move back to pending edits (but mark as rolled back)
      edit.applied = false;
      this.pendingEdits.set(editId, edit);
      this.appliedEdits.delete(editId);

      logger.info('Rolled back edit successfully', {
        editId,
        filePath: edit.filePath,
        description: edit.description
      });

      return {
        success: true,
        editId
      };

    } catch (error) {
      logger.error('Failed to rollback edit:', error);
      return {
        success: false,
        editId,
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Validate code content with specified validation level
   */
  async validateContent(filePath: string, content: string, level: ValidationLevel = ValidationLevel.SYNTAX): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic syntax validation based on file extension
      const ext = path.extname(filePath).toLowerCase();

      switch (ext) {
        case '.js':
        case '.mjs':
        case '.jsx':
          await this.validateJavaScript(content, errors, warnings);
          break;
        case '.ts':
        case '.tsx':
          await this.validateTypeScript(content, errors, warnings);
          break;
        case '.json':
          await this.validateJSON(content, errors, warnings);
          break;
        case '.md':
          await this.validateMarkdown(content, errors, warnings);
          break;
        default:
          // For unknown file types, just check for basic issues
          await this.validateGeneric(content, errors, warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Validation error: ${normalizeError(error).message}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Validate JavaScript content
   */
  private async validateJavaScript(content: string, errors: string[], warnings: string[]): Promise<void> {
    try {
      // Check if content appears to be JSX
      const isJSX = content.includes('<') && content.includes('>') &&
                    (content.includes('React') || content.includes('Component') ||
                     content.includes('import') || content.includes('export'));

      if (!isJSX) {
        // Only use strict VM validation for plain JavaScript
        const vm = await import('vm');
        vm.compileFunction(content);
      } else {
        // For JSX, do basic validation only
        // Check for balanced brackets
        const openBrackets = (content.match(/\{/g) || []).length;
        const closeBrackets = (content.match(/\}/g) || []).length;
        if (openBrackets !== closeBrackets) {
          errors.push('Unbalanced curly braces in JSX');
        }

        // Check for balanced JSX tags
        const openTags = (content.match(/<[^/][^>]*>/g) || []).filter(tag => !tag.endsWith('/>'));
        const closeTags = (content.match(/<\/[^>]+>/g) || []);
        if (openTags.length !== closeTags.length) {
          warnings.push('Possibly unbalanced JSX tags');
        }
      }
    } catch (error) {
      const errorMsg = normalizeError(error).message;
      // Don't fail on JSX-related syntax errors
      if (!errorMsg.includes('Unexpected token') && !errorMsg.includes('<')) {
        errors.push(`JavaScript syntax error: ${errorMsg}`);
      } else {
        warnings.push('JSX syntax detected - ensure proper transpilation');
      }
    }

    // Check for common issues
    if (content.includes('console.log') && !content.includes('debug')) {
      warnings.push('Consider using logger instead of console.log');
    }
  }

  /**
   * Validate TypeScript content
   */
  private async validateTypeScript(content: string, errors: string[], warnings: string[]): Promise<void> {
    // Basic TypeScript validation - in a real implementation,
    // this would use the TypeScript compiler API

    // Check for basic syntax issues
    if (!content.match(/^(?:(?:export|import|\s|\/\*|\*\/|\/\/|type|interface|class|function|const|let|var)\s)/)) {
      if (content.trim() && !content.startsWith('//') && !content.startsWith('/*')) {
        warnings.push('File does not start with a TypeScript declaration');
      }
    }

    // Check for missing exports
    if (content.includes('class ') && !content.includes('export')) {
      warnings.push('Class declaration without export');
    }
  }

  /**
   * Validate JSON content
   */
  private async validateJSON(content: string, errors: string[], warnings: string[]): Promise<void> {
    try {
      JSON.parse(content);
    } catch (error) {
      errors.push(`JSON syntax error: ${normalizeError(error).message}`);
    }
  }

  /**
   * Validate Markdown content
   */
  private async validateMarkdown(content: string, errors: string[], warnings: string[]): Promise<void> {
    // Basic markdown validation
    const lines = content.split('\n');
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track code blocks
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
      }

      // Check for unmatched brackets outside code blocks
      if (!inCodeBlock && line.includes('[') && !line.includes(']')) {
        warnings.push(`Line ${i + 1}: Unmatched bracket`);
      }
    }

    if (inCodeBlock) {
      warnings.push('Unclosed code block');
    }
  }

  /**
   * Generic validation for unknown file types
   */
  private async validateGeneric(content: string, errors: string[], warnings: string[]): Promise<void> {
    // Check for null bytes or other binary content
    if (content.includes('\0')) {
      errors.push('Content appears to be binary');
    }

    // Check for extremely long lines
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 10000);
    if (longLines.length > 0) {
      warnings.push(`${longLines.length} extremely long line(s) detected`);
    }
  }

  /**
   * Create a backup of the original content
   */
  private async createBackup(edit: CodeEdit): Promise<string> {
    // Ensure backup directory exists
    await fs.mkdir(this.backupDir, { recursive: true });

    const timestamp = edit.timestamp.toISOString().replace(/[:.]/g, '-');
    const fileName = `${path.basename(edit.filePath)}-${timestamp}-${edit.id}.backup`;
    const backupPath = path.join(this.backupDir, fileName);

    await fs.writeFile(backupPath, edit.originalContent, 'utf-8');

    logger.debug('Created backup', {
      editId: edit.id,
      filePath: edit.filePath,
      backupPath
    });

    return backupPath;
  }

  /**
   * Atomic write operation
   */
  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp-${uuidv4()}`;

    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, content, 'utf-8');

      // Atomically move to final location
      await fs.rename(tempPath, filePath);

    } catch (error) {
      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Get all pending edits
   */
  getPendingEdits(): CodeEdit[] {
    return Array.from(this.pendingEdits.values());
  }

  /**
   * Get all applied edits
   */
  getAppliedEdits(): CodeEdit[] {
    return Array.from(this.appliedEdits.values());
  }

  /**
   * Get edit by ID
   */
  getEdit(editId: string): CodeEdit | undefined {
    return this.pendingEdits.get(editId) || this.appliedEdits.get(editId);
  }

  /**
   * Cancel a pending edit
   */
  cancelEdit(editId: string): boolean {
    return this.pendingEdits.delete(editId);
  }

  /**
   * Clean up old backups
   */
  async cleanupBackups(maxAge = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const now = Date.now();

      for (const file of files) {
        if (file.endsWith('.backup')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            logger.debug('Cleaned up old backup', { filePath });
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup backups:', error);
    }
  }
}
