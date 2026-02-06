/**
 * Documentation Tool
 *
 * Generate or add documentation: readme (README snippet), jsdoc (JSDoc for functions),
 * comments (block comments). Uses filesystem for writing.
 */

import { BaseTool, ToolMetadata, ToolResult, ToolExecutionContext } from './types.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';

const OPERATIONS = ['readme', 'jsdoc', 'comments'] as const;
type Operation = (typeof OPERATIONS)[number];

export class DocumentationTool extends BaseTool {
  metadata: ToolMetadata = {
    name: 'documentation',
    description:
      'Generate or add documentation: readme (README snippet for a path), jsdoc (add JSDoc to a function), comments (add block comments).',
    category: 'code',
    version: '1.0.0',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        description: 'Operation: readme, jsdoc, comments',
        required: true,
        enum: [...OPERATIONS],
        validation: (v) => typeof v === 'string' && OPERATIONS.includes(v as Operation),
      },
      {
        name: 'path',
        type: 'string',
        description: 'File or directory path relative to project root',
        required: true,
      },
      {
        name: 'functionName',
        type: 'string',
        description: 'Name of function to add JSDoc to (for jsdoc operation)',
        required: false,
      },
      {
        name: 'comment',
        type: 'string',
        description: 'Comment text to add (for comments operation)',
        required: false,
      },
      {
        name: 'write',
        type: 'boolean',
        description: 'If true, write README to file; otherwise return content (readme operation)',
        required: false,
        default: false,
      },
    ],
    examples: [
      { description: 'Generate README snippet', parameters: { operation: 'readme', path: '.' } },
      { description: 'Add JSDoc to function', parameters: { operation: 'jsdoc', path: 'src/utils.js', functionName: 'parse' } },
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

      const filePath = parameters.path as string;
      if (!filePath) {
        return {
          success: false,
          error: 'Parameter "path" is required.',
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      if (operation === 'readme') {
        return this.executeReadme(parameters, projectRoot, startTime);
      }
      if (operation === 'jsdoc') {
        return this.executeJsdoc(parameters, projectRoot, startTime);
      }
      if (operation === 'comments') {
        return this.executeComments(parameters, projectRoot, startTime);
      }

      return {
        success: false,
        error: `Unhandled operation: ${operation}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.debug('DocumentationTool error:', message);
      return {
        success: false,
        error: message,
        metadata: { executionTime: Date.now() - startTime },
      };
    }
  }

  private async executeReadme(
    parameters: Record<string, any>,
    projectRoot: string,
    startTime: number
  ): Promise<ToolResult> {
    const relPath = parameters.path as string;
    const fullPath = path.join(projectRoot, relPath);
    const doWrite = Boolean(parameters.write);

    try {
      await fs.stat(fullPath);
    } catch {
      return {
        success: false,
        error: `Path not found: ${relPath}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    const title = path.basename(relPath || projectRoot) || 'Project';
    const snippet = `# ${title}\n\nDescription of ${relPath || 'this directory'}.\n\n## Usage\n\n(Add usage instructions here.)\n`;

    if (doWrite) {
      const readmePath = path.join(fullPath, 'README.md');
      await fs.writeFile(readmePath, snippet, 'utf-8');
      return {
        success: true,
        data: { path: path.join(relPath, 'README.md'), summary: 'README.md written.' },
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    return {
      success: true,
      data: { path: relPath, content: snippet, summary: 'README snippet generated.' },
      metadata: { executionTime: Date.now() - startTime },
    };
  }

  private async executeJsdoc(
    parameters: Record<string, any>,
    projectRoot: string,
    startTime: number
  ): Promise<ToolResult> {
    const relPath = parameters.path as string;
    const functionName = parameters.functionName as string;
    const fullPath = path.join(projectRoot, relPath);

    if (!functionName) {
      return {
        success: false,
        error: 'Parameter "functionName" is required for jsdoc operation.',
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    let content: string;
    try {
      content = await fs.readFile(fullPath, 'utf-8');
    } catch {
      return {
        success: false,
        error: `File not found: ${relPath}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const functionPattern = new RegExp(
      `(\\s*)function\\s+${escaped}\\s*\\(([^)]*)\\)`,
      'm'
    );
    const match = content.match(functionPattern);
    if (!match) {
      return {
        success: false,
        error: `Function "${functionName}" not found in file.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    const params = match[2].split(',').map((p) => p.trim().split(/\s+/).pop() || p.trim()).filter(Boolean);
    const jsdocLines = [
      '/**',
      ` * ${functionName}`,
      ...params.map((p) => ` * @param {*} ${p}`),
      ' * @returns {*}',
      ' */',
    ];
    const indent = match[1] || '';
    const jsdocBlock = jsdocLines.map((l) => indent + l).join('\n') + '\n';
    const newContent = content.replace(functionPattern, jsdocBlock + match[0]);

    await fs.writeFile(fullPath, newContent, 'utf-8');

    return {
      success: true,
      data: { path: relPath, summary: `JSDoc added for function "${functionName}".` },
      metadata: { executionTime: Date.now() - startTime },
    };
  }

  private async executeComments(
    parameters: Record<string, any>,
    projectRoot: string,
    startTime: number
  ): Promise<ToolResult> {
    const relPath = parameters.path as string;
    const commentText = (parameters.comment as string) || 'Documentation.';
    const fullPath = path.join(projectRoot, relPath);

    let content: string;
    try {
      content = await fs.readFile(fullPath, 'utf-8');
    } catch {
      return {
        success: false,
        error: `File not found: ${relPath}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    const block = `/**\n * ${commentText.split('\n').join('\n * ')}\n */\n\n`;
    const newContent = block + content;
    await fs.writeFile(fullPath, newContent, 'utf-8');

    return {
      success: true,
      data: { path: relPath, summary: 'Block comment added.' },
      metadata: { executionTime: Date.now() - startTime },
    };
  }
}
