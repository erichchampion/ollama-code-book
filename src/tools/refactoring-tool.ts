/**
 * Refactoring Tool
 *
 * Code refactoring operations: rename (symbol in file), extract, inline.
 * Uses string-based rename in file content; can be extended with AST later.
 */

import { BaseTool, ToolMetadata, ToolResult, ToolExecutionContext } from './types.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';

const OPERATIONS = ['rename', 'extract', 'inline'] as const;
type Operation = (typeof OPERATIONS)[number];

export class RefactoringTool extends BaseTool {
  metadata: ToolMetadata = {
    name: 'refactoring',
    description:
      'Refactor code: rename (rename a symbol in a file), extract (extract to function/variable), inline (inline a symbol).',
    category: 'code',
    version: '1.0.0',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        description: 'Operation: rename, extract, inline',
        required: true,
        enum: [...OPERATIONS],
        validation: (v) => typeof v === 'string' && OPERATIONS.includes(v as Operation),
      },
      {
        name: 'path',
        type: 'string',
        description: 'File path relative to project root',
        required: true,
      },
      {
        name: 'oldName',
        type: 'string',
        description: 'Current symbol name (for rename)',
        required: false,
      },
      {
        name: 'newName',
        type: 'string',
        description: 'New symbol name (for rename)',
        required: false,
      },
    ],
    examples: [
      {
        description: 'Rename a function in a file',
        parameters: { operation: 'rename', path: 'src/utils.js', oldName: 'oldFn', newName: 'newFn' },
      },
    ],
  };

  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const { projectRoot } = context;

    try {
      const operation = parameters?.operation as string;
      if (!operation || !OPERATIONS.includes(operation as Operation)) {
        return {
          success: false,
          error: `Invalid or missing operation. Valid operations: ${OPERATIONS.join(', ')}`,
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      if (operation === 'rename') {
        return this.executeRename(parameters, projectRoot, startTime);
      }

      if (operation === 'extract' || operation === 'inline') {
        return {
          success: false,
          error: `${operation} operation not yet implemented`,
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      return {
        success: false,
        error: `Unhandled operation: ${operation}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.debug('RefactoringTool error:', message);
      return {
        success: false,
        error: message,
        metadata: { executionTime: Date.now() - startTime },
      };
    }
  }

  private async executeRename(
    parameters: Record<string, any>,
    projectRoot: string,
    startTime: number
  ): Promise<ToolResult> {
    const filePath = parameters.path as string;
    const oldName = parameters.oldName as string;
    const newName = parameters.newName as string;

    if (!filePath) {
      return {
        success: false,
        error: 'Parameter "path" is required.',
        metadata: { executionTime: Date.now() - startTime },
      };
    }
    if (!oldName || !newName) {
      return {
        success: false,
        error: 'Parameters "oldName" and "newName" are required for rename.',
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    const fullPath = path.join(projectRoot, filePath);
    let content: string;
    try {
      content = await fs.readFile(fullPath, 'utf-8');
    } catch (e) {
      return {
        success: false,
        error: `File not found: ${filePath}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escaped + '\\b', 'g');
    const newContent = content.replace(re, newName);
    const replacements = (content.match(re) || []).length;

    if (replacements === 0) {
      return {
        success: false,
        error: `Symbol "${oldName}" not found in file.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    await fs.writeFile(fullPath, newContent, 'utf-8');

    return {
      success: true,
      data: {
        path: filePath,
        replacements,
        summary: `Renamed "${oldName}" to "${newName}" (${replacements} occurrence(s)).`,
      },
      metadata: { executionTime: Date.now() - startTime },
    };
  }
}
